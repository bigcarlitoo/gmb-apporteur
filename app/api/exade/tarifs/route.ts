import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ExadeCommissionOptions } from '@/lib/services/exade'
import { 
  formatDateForExade, 
  formatFumeurForExade 
} from '@/lib/constants/exade'

// URLs Exade
// STAGING: Pour tarification - simulations NON visibles sur le dashboard courtier
const EXADE_STAGING_URL = 'https://stage-product.exade.fr/4DSOAP'
// PRODUCTION: Pour création de devis - simulations VISIBLES sur le dashboard courtier
const EXADE_PRODUCTION_URL = 'https://www.exade.fr/4DSOAP'

/**
 * API Route pour récupérer les tarifs Exade
 * 
 * Cette route utilise les credentials du broker stockés en DB,
 * permettant à chaque courtier d'être autonome avec ses propres accès.
 * 
 * Par défaut, utilise l'URL de STAGING pour la tarification :
 * - Les simulations ne sont PAS visibles sur le dashboard du courtier
 * - Les prix sont identiques à la production
 * 
 * Pour créer un devis en PRODUCTION (visible sur le dashboard), passer:
 * - useProductionUrl: true dans le body de la requête
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { broker_id, clientInfo, pretData, commission, idTarif, useProductionUrl } = body

    if (!clientInfo || !pretData) {
      return NextResponse.json(
        { error: 'Données manquantes (clientInfo ou pretData)' },
        { status: 400 }
      )
    }

    // broker_id est OBLIGATOIRE - pas de fallback vers les variables d'environnement
    if (!broker_id) {
      return NextResponse.json(
        { error: 'broker_id est obligatoire pour utiliser l\'API Exade' },
        { status: 400 }
      )
    }

    // Log si on recalcule un tarif spécifique
    if (idTarif) {
      console.log('[API Exade] Recalcul ciblé pour id_tarif:', idTarif, 'avec commission:', commission?.commissionnement)
    }

    // Récupérer la configuration Exade du broker (obligatoire)
    const { data: exadeConfig, error: configError } = await supabase
      .from('broker_exade_configs')
      .select('code_courtier, licence_key, endpoint_url, is_enabled')
      .eq('broker_id', broker_id)
      .eq('is_enabled', true)
      .single()
    
    if (configError || !exadeConfig) {
      console.error('[API Exade] Config non trouvée pour broker:', broker_id, configError)
      return NextResponse.json(
        { error: 'Configuration Exade non trouvée pour ce courtier. Veuillez configurer vos accès Exade dans les paramètres.' },
        { status: 400 }
      )
    }

    const licenceKey = exadeConfig.licence_key
    const codeCourtier = exadeConfig.code_courtier
    
    // Choix de l'URL selon le contexte :
    // - Par défaut (useProductionUrl = false/undefined) : URL STAGING pour tarification
    //   → Les simulations NE SONT PAS visibles sur le dashboard courtier
    // - Si useProductionUrl = true : URL PRODUCTION pour créer le devis réel
    //   → Les simulations SONT visibles sur le dashboard courtier
    const soapUrl = useProductionUrl 
      ? (exadeConfig.endpoint_url || EXADE_PRODUCTION_URL)
      : EXADE_STAGING_URL
    
    console.log('[API Exade] URL utilisée:', soapUrl, useProductionUrl ? '(PRODUCTION)' : '(STAGING/TARIFICATION)')

    if (!licenceKey) {
      return NextResponse.json(
        { error: 'Configuration Exade incomplète: clé de licence manquante' },
        { status: 400 }
      )
    }

    // 2. Construire le XML de requête
    // Construction du conjoint si couple
    let conjoint = null
    if (clientInfo.is_couple && clientInfo.conjoint_nom && clientInfo.conjoint_prenom) {
      conjoint = {
        nom: clientInfo.conjoint_nom,
        prenom: clientInfo.conjoint_prenom,
        nom_naissance: clientInfo.conjoint_nom_naissance || clientInfo.conjoint_nom,
        date_naissance: clientInfo.conjoint_date_naissance,
        lieu_naissance: clientInfo.conjoint_lieu_naissance || 'France',
        fumeur: clientInfo.conjoint_fumeur || false,
        categorie_professionnelle: clientInfo.conjoint_categorie_professionnelle || 1,
        deplacement_pro: clientInfo.conjoint_deplacement_pro || 1,
        travaux_manuels: clientInfo.conjoint_travaux_manuels || 0,
      }
    }

    // Options de commissionnement
    const commissionOptions: ExadeCommissionOptions | undefined = commission ? {
      frais_adhesion_apporteur: commission.frais_adhesion_apporteur,
      commissionnement: commission.commissionnement,
      typecommissionnement: commission.typecommissionnement
    } : undefined

    // Dates
    const dateEffet = pretData.date_effet
      ? formatDateForExade(pretData.date_effet)
      : new Date().toISOString().slice(0, 10).replace(/-/g, '')

    // Données prêt - Utiliser les codes Exade de la DB avec fallback
    const capitalCentimes = Math.round((pretData.montant_capital || pretData.montant || 0) * 100)
    const tauxCentiemes = Math.round((pretData.taux_nominal || pretData.taux || 0) * 100)
    const dureeMois = pretData.duree_mois || pretData.duree || 240
    
    // Codes Exade depuis la DB
    const typePret = pretData.type_pret_code ?? 1  // Code type de prêt (1-10)
    const typeTaux = pretData.type_taux_code ?? 1  // Code type de taux (1=Fixe, 2=Variable)
    const typeCredit = pretData.type_credit ?? 0   // Code type de crédit (0=Immobilier, 1=Non immobilier)
    const objetFinancement = pretData.objet_financement_code ?? 1  // Code objet financement (1-8)
    const typeAdhesion = pretData.type_adhesion ?? 0  // Code type adhésion (0, 3, 4)

    console.log('[API Exade] Codes utilisés:', { typePret, typeTaux, typeCredit, objetFinancement, typeAdhesion })

    // Construction du XML assuré - passer le type_adhesion depuis pretData
    const assure1Xml = buildAssureXml(clientInfo, 1, commissionOptions, typeAdhesion)
    const assure2Xml = conjoint ? buildAssureXml(conjoint, 2, commissionOptions, typeAdhesion) : ''

    // Garanties
    const garantieCode = 2 // DC/PTIA/ITT/IPT par défaut
    const quotite = 100

    // Balise id_tarif optionnelle pour recalcul ciblé d'un seul tarif
    const idTarifXml = idTarif ? `<id_tarif>${idTarif}</id_tarif>` : ''

    const innerXml = `
<licence>${licenceKey}</licence>
<code_courtier>${codeCourtier}</code_courtier>
<type_operation>2</type_operation>
<type_operation_document>0</type_operation_document>
<retournerLesErreurs />
${idTarifXml}

<simulation>
  <date_effet>${dateEffet}</date_effet>
  <frac_assurance>${pretData.frac_assurance || 12}</frac_assurance>
  <type_credit>${typeCredit}</type_credit>
  <id_objetdufinancement>${objetFinancement}</id_objetdufinancement>

  ${assure1Xml}
  ${assure2Xml}

  <pret>
    <id_pret>1</id_pret>
    <numero>1</numero>
    <type_pret>${typePret}</type_pret>
    <capital>${capitalCentimes}</capital>
    <taux>${tauxCentiemes}</taux>
    <type_taux>${typeTaux}</type_taux>
    <duree>${dureeMois}</duree>
    <differe>${pretData.differe || 0}</differe>
    <amortissement>12</amortissement>
    <date_deblocage>${dateEffet}</date_deblocage>
  </pret>

  <garantie_pret>
    <id_assure>1</id_assure>
    <id_pret>1</id_pret>
    <garantie>${garantieCode}</garantie>
    <quotite>${conjoint ? Math.round(quotite / 2) : quotite}</quotite>
  </garantie_pret>
  ${conjoint ? `
  <garantie_pret>
    <id_assure>2</id_assure>
    <id_pret>1</id_pret>
    <garantie>${garantieCode}</garantie>
    <quotite>${Math.round(quotite / 2)}</quotite>
  </garantie_pret>
  ` : ''}
</simulation>
`.trim()

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:def="http://www.4d.com/namespace/default">
  <soapenv:Header/>
  <soapenv:Body>
    <def:webservice_tarificateur soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
      <webservice_tarificateurRequest xsi:type="xsd:string">
        <![CDATA[
${innerXml}
        ]]>
      </webservice_tarificateurRequest>
    </def:webservice_tarificateur>
  </soapenv:Body>
</soapenv:Envelope>`

    // 3. Appeler l'API Exade
    const response = await fetch(soapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=utf-8',
        'SOAPAction': 'A_WebService#webservice_tarificateur',
      },
      body: soapEnvelope,
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[API] Erreur Exade HTTP:', response.status, text.substring(0, 500))
      return NextResponse.json(
        { error: `Erreur Exade: ${response.status}` },
        { status: 502 }
      )
    }

    const xmlText = await response.text()
    
    // 4. Parser la réponse en passant la durée pour calculer la mensualité
    const tarifs = parseExadeResponse(xmlText, dureeMois)

    if (tarifs.length === 0) {
      console.warn('[API] Aucun tarif retourné par Exade')
    }

    return NextResponse.json({ tarifs })

  } catch (error: any) {
    console.error('[API] Erreur Exade:', error)

    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des tarifs' },
      { status: 502 }
    )
  }
}

/**
 * Construit le bloc XML pour un assuré
 * Utilise les codes Exade stockés en DB, avec fallback sur les valeurs par défaut
 */
function buildAssureXml(data: any, numero: number, commissionOptions?: ExadeCommissionOptions, typeAdhesion?: number): string {
  const dateNaissance = data.client_date_naissance || data.date_naissance || data.dateNaissance
  const formattedDate = dateNaissance ? formatDateForExade(dateNaissance) : '19800101'
  
  // Sexe: dérivé de la civilité si non fourni explicitement
  const civilite = data.client_civilite || data.civilite
  const sexe = data.sexe || (civilite === 'M' ? 'H' : 'F')
  
  // Catégorie professionnelle: utiliser le code DB, sinon fallback
  // La colonne DB s'appelle "categorie_professionnelle" pour le principal, "conjoint_categorie_professionnelle" pour le conjoint
  const categPro = data.categorie_professionnelle || data.client_categorie_professionnelle || data.conjoint_categorie_professionnelle || 1
  
  // Adresse: utiliser les champs séparés de la DB
  const adresse = data.client_adresse || data.adresse || ''
  const codePostal = data.client_code_postal || data.code_postal || '75001'
  const ville = data.client_ville || data.ville || 'Paris'
  const lieuNaissance = data.client_lieu_naissance || data.lieu_naissance || ville
  
  // Codes risques métier: utiliser les codes DB
  const deplacementPro = data.client_deplacement_pro ?? data.deplacement_pro ?? 1
  const travauxManuels = data.client_travaux_manuels ?? data.travaux_manuels ?? 0
  
  // Nom de naissance: utiliser le champ DB dédié
  const nomNaissance = data.client_nom_naissance || data.nom_naissance || data.nom || data.client_nom || 'CLIENT'
  
  // Type d'adhésion: passé en paramètre depuis pretData
  const adhesionCode = typeAdhesion ?? data.type_adhesion ?? 0

  let commissionXml = ''
  if (commissionOptions?.frais_adhesion_apporteur !== undefined) {
    commissionXml += `<frais_adhesion_apporteur>${Math.round(commissionOptions.frais_adhesion_apporteur)}</frais_adhesion_apporteur>`
  }
  if (commissionOptions?.commissionnement) {
    commissionXml += `<commissionnement>${commissionOptions.commissionnement}</commissionnement>`
  }
  if (commissionOptions?.typecommissionnement) {
    commissionXml += `<typecommissionnement>${commissionOptions.typecommissionnement}</typecommissionnement>`
  }

  return `
  <assure>
    <numero>${numero}</numero>
    <statut>1</statut>
    <type_adhesion>${adhesionCode}</type_adhesion>
    <sexe>${sexe}</sexe>
    <nom>${data.nom || data.client_nom || 'CLIENT'}</nom>
    <nom_naissance>${nomNaissance}</nom_naissance>
    <prenom>${data.prenom || data.client_prenom || 'Prenom'}</prenom>
    <adresse>${adresse}</adresse>
    <ville>${ville}</ville>
    <code_postal>${codePostal}</code_postal>
    <lieu_naissance>${lieuNaissance}</lieu_naissance>
    <velIdPaysNaissance>118</velIdPaysNaissance>
    <idnationalite>84</idnationalite>
    <idPaysResidenceFiscale>84</idPaysResidenceFiscale>
    <date_naissance>${formattedDate}</date_naissance>
    <franchise>90</franchise>
    <fumeur>${formatFumeurForExade(data.fumeur ?? data.client_fumeur ?? false)}</fumeur>
    <deplacement_pro>${deplacementPro}</deplacement_pro>
    <travaux_manuels>${travauxManuels}</travaux_manuels>
    <travaux_hauteur>1</travaux_hauteur>
    <manip_produit_dangereux>1</manip_produit_dangereux>
    <portable>${data.telephone || data.client_telephone || '+33600000000'}</portable>
    <email>${data.email || data.client_email || 'client@example.com'}</email>
    <politique_expose>N</politique_expose>
    <proche_politique_expose>N</proche_politique_expose>
    <encours_lemoine>0</encours_lemoine>
    <categ_pro>${categPro}</categ_pro>
    ${commissionXml}
  </assure>
  `
}

/**
 * Parse la réponse SOAP Exade et extrait les tarifs
 */
function parseExadeResponse(xmlText: string, dureeMois: number = 240): any[] {
  // Décoder les entités HTML si nécessaire
  let xmlContent = xmlText
  if (xmlText.includes('&lt;')) {
    xmlContent = xmlText
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  }

  // Extraire l'ID simulation
  const idSimMatch = xmlContent.match(/<id_simulation>(\d+)<\/id_simulation>/)
  const idSimulation = idSimMatch ? idSimMatch[1] : ''

  // Extraire tous les tarifs
  const tarifs: any[] = []
  
  // Regex pour extraire les blocs tarif
  const tarifRegex = /<tarif>([\s\S]*?)<\/tarif>/gi
  let match
  
  while ((match = tarifRegex.exec(xmlContent)) !== null) {
    const tarifContent = match[1]
    
    // Extraire les formalités médicales
    const formalites: string[] = []
    const formaliteRegex = /<formalite>([^<]+)<\/formalite>/gi
    let formaliteMatch
    while ((formaliteMatch = formaliteRegex.exec(tarifContent)) !== null) {
      formalites.push(formaliteMatch[1].trim())
    }
    
    // Extraire les erreurs éventuelles
    const erreurs: string[] = []
    const erreurRegex = /<libelle>([^<]+)<\/libelle>/gi
    let erreurMatch
    const listeErreursMatch = tarifContent.match(/<listeErreurs>([\s\S]*?)<\/listeErreurs>/i)
    if (listeErreursMatch) {
      while ((erreurMatch = erreurRegex.exec(listeErreursMatch[1])) !== null) {
        erreurs.push(erreurMatch[1].trim())
      }
    }

    const coutTotalCentimes = parseInt(extractValue(tarifContent, 'cout_total_tarif') || '0', 10)
    const coutTotal = coutTotalCentimes / 100
    
    const tarif = {
      id_simulation: idSimulation,
      id_tarif: extractValue(tarifContent, 'id_tarif'),
      compagnie: extractValue(tarifContent, 'compagnie'),
      nom: extractValue(tarifContent, 'nom'),
      type_tarif: extractValue(tarifContent, 'type_tarif'),
      // Convertir centimes en euros
      cout_total: coutTotal,
      cout_total_tarif: coutTotal, // Alias pour compatibilité
      frais_adhesion: parseInt(extractValue(tarifContent, 'frais_adhesion') || '0', 10) / 100,
      frais_adhesion_apporteur: parseInt(extractValue(tarifContent, 'frais_adhesion_apporteur') || '0', 10) / 100,
      frais_frac: parseInt(extractValue(tarifContent, 'frais_frac') || '0', 10) / 100,
      taux_capital_assure: parseInt(extractValue(tarifContent, 'taux_capital_assure_tarif') || '0', 10) / 10000,
      compatible_lemoine: extractValue(tarifContent, 'compatible_lemoine') === '1',
      // Mensualité calculée à partir du coût total et de la durée
      mensualite: coutTotal / dureeMois,
      // Formalités médicales
      formalites_medicales: formalites,
      formalites_detaillees: formalites,
      // Coût des 8 premières années (si disponible)
      cout_premieres_annees: parseInt(extractValue(tarifContent, 'cout_premieres_annees_tarif') || '0', 10) / 100,
      // Erreurs
      erreurs: erreurs.length > 0 ? erreurs : undefined
    }

    // Ne pas ajouter de doublons (même id_tarif)
    // IMPORTANT: Filtrer les tarifs SANS id_tarif valide
    // Ces tarifs sont des produits en test sur staging qui n'existent pas en production
    // Les garder créerait une incohérence entre la tarification et la création du devis
    if (tarif.id_tarif && !tarifs.find(t => t.id_tarif === tarif.id_tarif)) {
      tarifs.push(tarif)
    }
  }

  // Log pour debug: nombre de tarifs filtrés
  console.log('[API Exade] Tarifs valides (avec id_tarif):', tarifs.length)

  return tarifs
}

/**
 * Extrait une valeur d'une balise XML
 */
function extractValue(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}>([^<]*)<\\/${tagName}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : ''
}
