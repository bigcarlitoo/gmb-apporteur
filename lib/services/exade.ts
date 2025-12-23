import { XMLParser } from 'fast-xml-parser'
import { EXADE_CONFIG, validateExadeConfig, getExadeUrl } from '@/lib/config/exade'
import {
  formatDateForExade,
  formatFumeurForExade,
  getCiviliteCodeExade,
  EXADE_SEXE
} from '@/lib/constants/exade'

export type ExadeTarif = {
  id_simulation: string
  id_tarif: string
  compagnie: string
  nom: string
  type_tarif: string
  /** Mensualité approximative (basée sur la première période des garanties) */
  mensualite: number
  cout_total: number
  frais_adhesion: number
  frais_adhesion_apporteur: number
  /** Frais de fractionnement (en euros, converti depuis centimes Exade) */
  frais_frac: number
  /** Détails des garanties avec coûts et caractéristiques */
  garanties: Array<{
    nom: string
    taxe?: string
    appreciation?: string | null
    cout_mensuel?: number
    cout_total?: number
    crd?: number
  }>
  erreurs?: string[]
  compatible_lemoine?: boolean
  /** Taux sur capital assuré pour le tarif (en %, converti depuis ×10000 Exade) */
  taux_capital_assure?: number
}

/**
 * Options de commissionnement pour l'API Exade
 * Utilisé pour personnaliser les frais et commissions par devis
 */
export type ExadeCommissionOptions = {
  /** Frais d'adhésion apporteur en centimes (ex: 15000 = 150€) */
  frais_adhesion_apporteur?: number
  /** Code de commissionnement Exade (ex: "1T4", "2T1") */
  commissionnement?: string
  /** Type de commissionnement (ex: "ESC", "V2") */
  typecommissionnement?: string
}

/**
 * Construit le XML interne (contenu du CDATA) pour la requête de tarification Exade
 * Documentation: WebService_Exade_ASSUREA_Avec_commissionnement_-_3.8.pdf
 * 
 * Utilise systématiquement les codes Exade stockés en DB avec fallback sur les valeurs par défaut.
 */
function buildInnerTarifXml(payload: {
  assure: any
  pret: any
  garanties?: any
  idTarif?: number
  /** Options de commissionnement (frais courtier, code commission) */
  commission?: ExadeCommissionOptions
}): string {
  const assure = payload.assure || {}
  const pret = payload.pret || {}
  const conjoint = assure.conjoint || null // Si structure { principal: ..., conjoint: ... } ou juste assure

  // 1. Dates
  const dateEffet = pret.date_effet
    ? formatDateForExade(pret.date_effet)
    : new Date().toISOString().slice(0, 10).replace(/-/g, '')

  // 2. Données Prêt - Codes Exade depuis la DB avec fallback
  const capitalCentimes = Math.round((pret.montant_capital || pret.montant || pret.montantInitial || 0) * 100)
  const tauxCentièmes = Math.round((pret.taux_nominal || pret.taux || pret.tauxNominal || 0) * 100)
  const dureeMois = pret.duree_mois || pret.duree || pret.dureeInitialeMois || 240
  
  // Codes Exade - utiliser les colonnes de la DB ou fallback sur valeurs par défaut
  const typePret = pret.type_pret_code ?? 1      // Code type de prêt (1-10), défaut: Amortissable
  const typeTaux = pret.type_taux_code ?? 1      // Code type de taux (1-2), défaut: Fixe
  const typeCredit = pret.type_credit ?? 0       // Code type crédit (0-1), défaut: Immobilier
  const objetFinancement = pret.objet_financement_code ?? 1  // Code objet (1-8), défaut: Résidence principale
  const typeAdhesion = pret.type_adhesion ?? 0   // Code adhésion (0,3,4), défaut: Nouveau prêt
  const amortissement = 12 // Mensuel par défaut
  // Fractionnement de l'assurance: 10 = Prime unique, 12 = Mensuel
  const fracAssurance = pret.frac_assurance ?? 12 // Par défaut: Mensuel

  // 3. Construction des blocs Assurés
  // On gère 1 ou 2 assurés
  const assuresList = []

  // Options de commissionnement (si fournies)
  const commissionOptions = payload.commission || {}

  // Assuré 1 (Principal) - passer le type_adhesion depuis pret_data
  assuresList.push(buildAssureBlock(assure, 1, commissionOptions, typeAdhesion))

  // Assuré 2 (Conjoint) si présent - même type_adhesion
  if (conjoint) {
    assuresList.push(buildAssureBlock(conjoint, 2, commissionOptions, typeAdhesion))
  }

  // 4. Construction du bloc Prêt
  const pretBlock = `
    <pret>
      <id_pret>1</id_pret>
      <numero>1</numero>
      <type_pret>${typePret}</type_pret>
      <capital>${capitalCentimes}</capital>
      <taux>${tauxCentièmes}</taux>
      <type_taux>${typeTaux}</type_taux>
      <duree>${dureeMois}</duree>
      <differe>${pret.differe || 0}</differe>
      <amortissement>${amortissement}</amortissement>
      <date_deblocage>${dateEffet}</date_deblocage>
    </pret>
  `

  // 5. Construction des blocs Garantie_Pret
  // Il faut lier chaque assuré au prêt avec une garantie et une quotité
  const garantieCode = payload.garanties?.code || 2 // Par défaut 2 (DC/PTIA/ITT/IPT)
  const quotite = payload.garanties?.quotite || 100 // Par défaut 100%

  let garantiePretBlocks = ''

  // Pour l'assuré 1
  garantiePretBlocks += `
    <garantie_pret>
      <id_assure>1</id_assure>
      <id_pret>1</id_pret>
      <garantie>${garantieCode}</garantie>
      <quotite>${conjoint ? Math.round(quotite / 2) : quotite}</quotite> 
    </garantie_pret>
  `

  // Pour l'assuré 2 (si présent, on divise la quotité par défaut ou on applique la règle)
  if (conjoint) {
    garantiePretBlocks += `
    <garantie_pret>
      <id_assure>2</id_assure>
      <id_pret>1</id_pret>
      <garantie>${garantieCode}</garantie>
      <quotite>${Math.round(quotite / 2)}</quotite>
    </garantie_pret>
    `
  }

  // XML Global - IMPORTANT: PAS de wrapper supplémentaire dans le CDATA (comme dans Postman)
  // Log uniquement en développement et sans informations sensibles
  if (process.env.NODE_ENV === 'development') {
    console.log('[EXADE] Request configuration:', {
      partnerCode: EXADE_CONFIG.partnerCode,
      hasLicenceKey: !!EXADE_CONFIG.licenceKey,
      licenceKeyLength: EXADE_CONFIG.licenceKey?.length || 0,
      soapUrl: EXADE_CONFIG.soapUrl,
      codes: { typePret, typeTaux, typeCredit, objetFinancement, typeAdhesion }
    })
  }

  // IMPORTANT: code_courtier est OBLIGATOIRE pour la production !
  // C'est l'identifiant du courtier chez Exade qui permet de tracer les dossiers
  return `
<licence>${EXADE_CONFIG.licenceKey}</licence>
<code_courtier>${EXADE_CONFIG.partnerCode}</code_courtier>
<type_operation>2</type_operation>
${payload.idTarif ? `<id_tarif>${payload.idTarif}</id_tarif>` : ''}
<retournerLesErreurs />

<simulation>
  <date_effet>${dateEffet}</date_effet>
  <frac_assurance>${fracAssurance}</frac_assurance>
  <type_credit>${typeCredit}</type_credit>
  <id_objetdufinancement>${objetFinancement}</id_objetdufinancement>

  ${assuresList.join('\n')}

  ${pretBlock}

  ${garantiePretBlocks}
</simulation>
`.trim()
}

function buildAssureBlock(data: any, numero: number, commissionOptions?: ExadeCommissionOptions, typeAdhesionOverride?: number): string {
  const dateNaissance = formatDateForExade(data.client_date_naissance || data.date_naissance || data.dateNaissance || '19800101')
  const civilite = getCiviliteCodeExade(data.civilite || data.client_civilite)
  const sexe = data.sexe || (civilite === 'M' ? 'H' : 'F')
  
  // Catégorie professionnelle: utiliser le code de la DB
  // Pour le conjoint, le champ est conjoint_categorie_professionnelle, pour le principal c'est categorie_professionnelle
  const categPro = data.categorie_professionnelle || data.client_categorie_professionnelle || data.conjoint_categorie_professionnelle || 1

  // Extraction des champs d'adresse depuis la DB
  const adresse = data.client_adresse || data.adresse || ''
  const codePostal = data.client_code_postal || data.code_postal || adresse?.match(/\d{5}/)?.[0] || '75001'
  const ville = data.client_ville || data.ville || 'PARIS'
  const lieuNaissance = data.client_lieu_naissance || data.lieu_naissance || data.conjoint_lieu_naissance || ville
  
  // Nom de naissance depuis la DB
  const nomNaissance = data.client_nom_naissance || data.nom_naissance || data.conjoint_nom_naissance || data.nom || data.client_nom || 'CLIENT'

  // Nationalité et pays (valeurs par défaut: France)
  // 118 = France dans la table des pays Exade (pour velIdPaysNaissance)
  // 84 = France dans la table des nationalités Exade
  const velIdPaysNaissance = data.velIdPaysNaissance || data.pays_naissance_id || 118
  const idNationalite = data.idnationalite || data.nationalite_id || 84
  const idPaysResidenceFiscale = data.idPaysResidenceFiscale || data.pays_residence_id || 84
  
  // Codes risques métier depuis la DB
  const deplacementPro = data.client_deplacement_pro ?? data.deplacement_pro ?? data.conjoint_deplacement_pro ?? 1
  const travauxManuels = data.client_travaux_manuels ?? data.travaux_manuels ?? data.conjoint_travaux_manuels ?? 0
  
  // Type d'adhésion: priorité à l'override (depuis pret_data), sinon depuis les données assuré
  const typeAdhesion = typeAdhesionOverride ?? data.type_adhesion ?? 0

  // Construction des balises de commissionnement (optionnelles)
  // Ces balises permettent de personnaliser les frais et commissions Exade
  let commissionXml = ''
  
  if (commissionOptions?.frais_adhesion_apporteur !== undefined) {
    // frais_adhesion_apporteur : Montant en centimes (sans décimales)
    // Ex: 15000 = 150€ de frais courtier
    commissionXml += `
    <frais_adhesion_apporteur>${Math.round(commissionOptions.frais_adhesion_apporteur)}</frais_adhesion_apporteur>`
  }
  
  if (commissionOptions?.commissionnement) {
    // commissionnement : Code du taux de commission (ex: "1T4", "2T1")
    // Voir table III.7 de la documentation Exade
    commissionXml += `
    <commissionnement>${commissionOptions.commissionnement}</commissionnement>`
  }
  
  if (commissionOptions?.typecommissionnement) {
    // typecommissionnement : Type de commission (ex: "ESC", "V2")
    commissionXml += `
    <typecommissionnement>${commissionOptions.typecommissionnement}</typecommissionnement>`
  }

  return `
  <assure>
    <numero>${numero}</numero>
    <statut>1</statut>
    <type_adhesion>${typeAdhesion}</type_adhesion>
    <sexe>${sexe}</sexe>
    <nom>${data.nom || data.client_nom || 'CLIENT'}</nom>
    <nom_naissance>${nomNaissance}</nom_naissance>
    <prenom>${data.prenom || data.client_prenom || 'Prenom'}</prenom>
    <adresse>${adresse}</adresse>
    <ville>${ville}</ville>
    <code_postal>${codePostal}</code_postal>
    <lieu_naissance>${lieuNaissance}</lieu_naissance>
    <velIdPaysNaissance>${velIdPaysNaissance}</velIdPaysNaissance>
    <idnationalite>${idNationalite}</idnationalite>
    <idPaysResidenceFiscale>${idPaysResidenceFiscale}</idPaysResidenceFiscale>
    <codepostalvillenaissance></codepostalvillenaissance>
    <date_naissance>${dateNaissance}</date_naissance>
    <franchise>${data.franchise ?? 90}</franchise>
    <fumeur>${formatFumeurForExade(data.fumeur ?? data.client_fumeur ?? false)}</fumeur>
    <deplacement_pro>${deplacementPro}</deplacement_pro>
    <travaux_manuels>${travauxManuels}</travaux_manuels>
    <travaux_hauteur>${data.travaux_hauteur ?? 1}</travaux_hauteur>
    <manip_produit_dangereux>${data.manip_produit_dangereux ?? 1}</manip_produit_dangereux>
    <telephone>${data.telephone || ''}</telephone>
    <portable>${data.portable || data.client_telephone || '+33600000000'}</portable>
    <email>${data.email || data.client_email || 'client@example.com'}</email>
    <politique_expose>${data.politique_expose || 'N'}</politique_expose>
    <proche_politique_expose>${data.proche_politique_expose || 'N'}</proche_politique_expose>
    <encours_lemoine>${data.encours_lemoine ?? 0}</encours_lemoine>
    <categ_pro>${categPro}</categ_pro>
    <detail_profession>${data.detail_profession || data.client_profession || ''}</detail_profession>${commissionXml}
  </assure>
  `
}

/**
 * Construit l'enveloppe SOAP conforme à la documentation Exade
 */
function buildSoapEnvelope(innerXml: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
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
}

/**
 * Décode les entités HTML (Exade peut renvoyer du XML encodé au lieu de CDATA)
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

/**
 * Parse la réponse SOAP Exade
 */
function parseExadeResponse(xmlText: string): any {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: false,
    trimValues: true,
  })

  const outer: any = parser.parse(xmlText)

  const body = outer['SOAP-ENV:Envelope']?.['SOAP-ENV:Body']
    || outer['soapenv:Envelope']?.['soapenv:Body']
    || outer['soap:Envelope']?.['soap:Body']
    || outer['Envelope']?.['Body']

  if (!body) {
    console.error('[EXADE] Available envelope keys:', Object.keys(outer))
    console.error('[EXADE] Outer structure:', JSON.stringify(outer, null, 2).substring(0, 1000))
    throw new Error('[EXADE] Réponse SOAP inattendue: pas de Body trouvé')
  }

  console.log('[EXADE] Body keys:', Object.keys(body))

  // Check for SOAP Fault first
  const fault = body['SOAP-ENV:Fault'] || body['soapenv:Fault'] || body['soap:Fault'] || body['Fault']
  if (fault) {
    const faultString = fault.faultstring || fault['faultstring'] || 'Erreur SOAP inconnue'
    const faultCode = fault.faultcode || fault['faultcode'] || 'Unknown'
    console.error('[EXADE] SOAP Fault detected:', { faultCode, faultString })
    throw new Error(`[EXADE] Erreur SOAP: ${faultString} (code: ${faultCode})`)
  }

  const responseNode =
    body['ns1:webservice_tarificateurResponse']
    || body['webservice_tarificateurResponse']
    || Object.values(body).find((v: any) => v && typeof v === 'object' && 'webservice_tarificateurResult' in v)

  if (!responseNode) {
    console.error('[EXADE] Available body keys:', Object.keys(body))
    console.error('[EXADE] Body structure:', JSON.stringify(body, null, 2).substring(0, 1000))
    throw new Error('[EXADE] Réponse SOAP inattendue: pas de webservice_tarificateurResponse')
  }

  // Le résultat peut avoir un préfixe namespace (ns1:) selon l'environnement (staging vs prod)
  // Et peut être soit une string directe, soit un objet { "#text": "..." }
  const extractString = (val: any): string | null => {
    if (typeof val === 'string') return val
    if (val && typeof val === 'object' && val['#text']) return val['#text']
    return null
  }

  let resultString: string | null = 
    extractString(responseNode['webservice_tarificateurResult'])
    || extractString(responseNode['ns1:webservice_tarificateurResult'])
    || extractString(responseNode['#text'])
    || extractString(responseNode)

  // Si toujours pas trouvé, chercher dans les valeurs du responseNode
  if (!resultString) {
    for (const [key, val] of Object.entries(responseNode)) {
      if (key.toLowerCase().includes('result')) {
        const extracted = extractString(val)
        if (extracted) {
          resultString = extracted
          console.log('[EXADE] Found result under key:', key)
          break
        }
      }
    }
  }

  if (!resultString || typeof resultString !== 'string') {
    console.error('[EXADE] responseNode keys:', Object.keys(responseNode))
    console.error('[EXADE] responseNode structure:', JSON.stringify(responseNode, null, 2).substring(0, 500))
    throw new Error('[EXADE] Pas de webservice_tarificateurResult (string) dans la réponse')
  }

  // Exade peut renvoyer le XML encodé en HTML entities au lieu de CDATA
  // On détecte et décode si nécessaire
  if (resultString.includes('&lt;') || resultString.includes('&gt;')) {
    resultString = decodeHtmlEntities(resultString)
  }

  const inner = parser.parse(resultString)
  const simulation = inner.simulation

  if (!simulation) {
    if (inner.listeErreurs) {
      const erreurs = Array.isArray(inner.listeErreurs.erreur)
        ? inner.listeErreurs.erreur
        : [inner.listeErreurs.erreur]
      throw new Error(`[EXADE] Erreurs retournées par l'API: ${erreurs.map((e: any) => e.libelle || e.message || e).join(', ')}`)
    }
    throw new Error('[EXADE] Pas de noeud <simulation> dans la réponse')
  }

  return simulation
}

/**
 * Convertit la structure <simulation> Exade en tableau de tarifs
 */
function mapSimulationToTarifs(simulation: any): ExadeTarif[] {
  const tarifs: ExadeTarif[] = []
  const idSimulation = simulation.id_simulation

  // On prend le premier assuré pour itérer sur les tarifs (car les tarifs sont dupliqués par assuré)
  // Dans une simulation multi-assurés, les tarifs sont généralement les mêmes produits
  const assures = Array.isArray(simulation.assure) ? simulation.assure : [simulation.assure].filter(Boolean)
  const assurePrincipal = assures[0]

  if (!assurePrincipal || !assurePrincipal.tarif) return []

  const tarifsRaw = Array.isArray(assurePrincipal.tarif) ? assurePrincipal.tarif : [assurePrincipal.tarif]

  for (const t of tarifsRaw) {
    // Calcul du coût total global (tous assurés confondus pour ce tarif)
    // Pour l'instant on prend celui de l'assuré principal, mais idéalement il faudrait sommer
    // Cependant, Exade renvoie souvent le coût total du dossier dans chaque bloc tarif ? A vérifier.
    // Selon doc Part 3E: cout_total_tarif = Coût total du tarif pour l'assuré.

    let coutTotalGlobal = 0
    let mensualiteGlobale = 0
    let fraisAdhesionGlobal = 0

    // Pour récupérer le coût total du dossier, il faut sommer les coûts de ce tarif pour CHAQUE assuré
    // IMPORTANT: Exade renvoie tous les montants en CENTIMES, il faut diviser par 100
    
    // Map pour agréger les garanties par nom (éviter les doublons)
    const garantiesDetailMap = new Map<string, {
      nom: string
      taxe?: string
      appreciation?: string | null
      cout_mensuel?: number
      cout_total?: number
      crd?: number
    }>()
    
    for (const ass of assures) {
      const tAss = Array.isArray(ass.tarif) ? ass.tarif.find((x: any) => x.id_tarif == t.id_tarif) : ass.tarif
      if (tAss) {
        // Conversion centimes -> euros
        coutTotalGlobal += Number(tAss.cout_total_tarif || 0) / 100
        fraisAdhesionGlobal += Number(tAss.frais_adhesion || 0) / 100

        // Calcul mensualité depuis garantie_pret et extraction des détails de garanties
        // ATTENTION: C'est une approximation basée sur la première période
        // Pour un calcul exact, il faudrait utiliser l'échéancier complet d'Exade
        const prets = Array.isArray(tAss.pret) ? tAss.pret : [tAss.pret].filter(Boolean)
        for (const p of prets) {
          const garantiesPret = Array.isArray(p.garantie_pret) ? p.garantie_pret : [p.garantie_pret].filter(Boolean)
          // On prend uniquement la première période (plus petite valeur de "periode")
          // pour éviter de sommer plusieurs périodes si Exade en renvoie plusieurs
          // IMPORTANT: Exade renvoie en centimes, conversion nécessaire
          if (garantiesPret.length > 0) {
            // Trier par période pour prendre la première
            const sorted = [...garantiesPret].sort((a: any, b: any) => 
              String(a.periode || '').localeCompare(String(b.periode || ''))
            )
            // Prendre uniquement les garanties de la première période
            const firstPeriode = sorted[0]?.periode
            for (const g of sorted) {
              if (g.periode === firstPeriode || !firstPeriode) {
                mensualiteGlobale += Number(g.cout || 0) / 100
                
                // Ajouter les détails de la garantie si pas déjà présente
                const existingGarantie = garantiesDetailMap.get(g.nom)
                if (!existingGarantie) {
                  garantiesDetailMap.set(g.nom, {
                    nom: g.nom || 'Garantie',
                    taxe: g.taxe === 'O' ? 'Oui' : g.taxe === 'N' ? 'Non' : g.taxe,
                    appreciation: g.appreciation || null,
                    cout_mensuel: Number(g.cout || 0) / 100,
                    crd: Number(g.crd || 0) / 100,
                  })
                } else {
                  // Additionner les coûts si plusieurs assurés
                  existingGarantie.cout_mensuel += Number(g.cout || 0) / 100
                }
              }
            }
          }
          
          // Extraction des cout_total_garantie (coût total sur toute la durée)
          const coutTotalGaranties = Array.isArray(p.cout_total_garantie) 
            ? p.cout_total_garantie 
            : [p.cout_total_garantie].filter(Boolean)
          for (const ctg of coutTotalGaranties) {
            const existingGarantie = garantiesDetailMap.get(ctg.nom)
            if (existingGarantie) {
              existingGarantie.cout_total = (existingGarantie.cout_total || 0) + Number(ctg.cout || 0) / 100
            } else {
              garantiesDetailMap.set(ctg.nom, {
                nom: ctg.nom,
                cout_total: Number(ctg.cout || 0) / 100,
              })
            }
          }
        }
      }
    }

    // Conversion de la Map en liste de garanties
    const garantiesList = Array.from(garantiesDetailMap.values())

    // Extraction des erreurs par tarif (si présentes)
    const erreursTarif: string[] = []
    if (t.listeErreurs) {
      const erreurs = Array.isArray(t.listeErreurs.erreur) 
        ? t.listeErreurs.erreur 
        : [t.listeErreurs.erreur].filter(Boolean)
      erreursTarif.push(...erreurs.map((e: any) => e.libelle || e.message || String(e)))
    }

    tarifs.push({
      id_simulation: idSimulation,
      id_tarif: t.id_tarif,
      compagnie: t.compagnie,
      nom: t.nom,
      type_tarif: t.type_tarif,
      mensualite: mensualiteGlobale,
      cout_total: coutTotalGlobal,
      frais_adhesion: fraisAdhesionGlobal,
      // IMPORTANT: Exade renvoie en centimes, conversion nécessaire
      frais_adhesion_apporteur: Number(t.frais_adhesion_apporteur || 0) / 100,
      // Frais de fractionnement (centimes → euros)
      frais_frac: Number(t.frais_frac || 0) / 100,
      garanties: garantiesList,
      compatible_lemoine: t.compatible_lemoine == 1,
      erreurs: erreursTarif.length > 0 ? erreursTarif : undefined,
      // Taux sur capital assuré (×10000 → %)
      taux_capital_assure: t.taux_capital_assure_tarif 
        ? Number(t.taux_capital_assure_tarif) / 10000 
        : undefined
    })
  }

  return tarifs
}

/**
 * Récupère les tarifs d'assurance depuis l'API Exade
 * 
 * Par défaut, utilise l'URL de TARIFICATION (stage-product) qui ne crée PAS 
 * de simulation visible sur le dashboard du courtier.
 * 
 * Pour créer un devis en production (visible sur le dashboard), utilisez
 * le paramètre useProductionUrl: true.
 * 
 * @param payload - Données de l'assuré, du prêt et options
 * @param payload.assure - Informations de l'assuré (ou {principal, conjoint} pour un couple)
 * @param payload.pret - Informations du prêt (montant, durée, taux, etc.)
 * @param payload.garanties - Options de garanties (code, quotité)
 * @param payload.idTarif - ID d'un tarif spécifique à calculer (optionnel)
 * @param payload.commission - Options de commissionnement Exade (optionnel)
 * @param payload.useProductionUrl - Si true, crée le devis en PRODUCTION (visible sur dashboard)
 *                                   Si false/undefined, utilise l'URL de tarification (staging)
 * @returns Liste des tarifs disponibles avec leurs montants
 */
export async function getExadeTarifs(payload: {
  assure: any
  pret: any
  garanties?: any
  idTarif?: number
  /** Options de commissionnement (frais courtier, code commission Exade) */
  commission?: ExadeCommissionOptions
  /** 
   * Si true, utilise l'URL de production (www.exade.fr) - les devis seront visibles sur le dashboard courtier
   * Si false/undefined, utilise l'URL de tarification (stage-product) - les simulations ne sont PAS visibles
   * @default false
   */
  useProductionUrl?: boolean
}): Promise<ExadeTarif[]> {
  validateExadeConfig()

  const innerXml = buildInnerTarifXml(payload)
  const envelope = buildSoapEnvelope(innerXml)
  
  // Choix de l'URL selon le contexte
  const apiUrl = getExadeUrl(payload.useProductionUrl || false)

  // Logs de debug uniquement en développement (pas en prod pour éviter d'exposer des données clients)
  if (process.env.NODE_ENV === 'development') {
    console.log('[EXADE] --- START REQUEST DEBUG ---')
    console.log('[EXADE] Simulation Parameters:', {
      date_effet: payload.pret?.date_effet,
      objet_financement: payload.pret?.objet_financement_code || 1,
      type_pret: payload.pret?.type_pret_code || 1,
      capital: payload.pret?.montant_capital || payload.pret?.montant,
      duree_mois: payload.pret?.duree_mois || payload.pret?.duree,
      taux: payload.pret?.taux_nominal || payload.pret?.taux,
    })

    const assure1 = payload.assure || {}
    console.log('[EXADE] Assure 1:', {
      date_naissance: assure1.client_date_naissance || assure1.date_naissance,
      profession_code: assure1.client_categorie_professionnelle || assure1.categorie_professionnelle,
      fumeur: assure1.fumeur || assure1.client_fumeur,
      type_adhesion: assure1.type_adhesion,
      encours_lemoine: assure1.encours_lemoine,
    })

    if (assure1.conjoint) {
      console.log('[EXADE] Assure 2 (Conjoint):', {
        date_naissance: assure1.conjoint.client_date_naissance || assure1.conjoint.date_naissance,
        profession_code: assure1.conjoint.client_categorie_professionnelle || assure1.conjoint.categorie_professionnelle,
      })
    }

    console.log('[EXADE] Garanties requested:', {
      code: payload.garanties?.code,
      quotite: payload.garanties?.quotite
    })

    // Écriture fichier debug uniquement en développement
    if (typeof window === 'undefined') {
      try {
        const fs = require('fs')
        const path = require('path')
        const logPath = path.join(process.cwd(), 'exade_request_debug.xml')
        fs.writeFileSync(logPath, envelope, 'utf-8')
        console.log('[EXADE] Full request written to:', logPath)
      } catch (err) {
        console.error('[EXADE] Could not write debug file:', err)
      }
    }
    
    // Log de l'URL utilisée pour débugger
    console.log('[EXADE] Using URL:', apiUrl, payload.useProductionUrl ? '(PRODUCTION)' : '(TARIFICATION/STAGING)')
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=utf-8',
      'SOAPAction': 'A_WebService#webservice_tarificateur',
    },
    body: envelope,
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[EXADE] HTTP Error Response:', text.substring(0, 1000))
    throw new Error(`[EXADE] HTTP ${res.status}: ${text.substring(0, 500)}`)
  }

  const xmlText = await res.text()
  // console.log('[EXADE] Raw SOAP Response (first 2000 chars):', xmlText.substring(0, 2000))


  const simulation = parseExadeResponse(xmlText)
  const tarifs = mapSimulationToTarifs(simulation)

  if (tarifs.length === 0) {
    throw new Error('[EXADE] Aucun tarif retourné par l\'API')
  }

  return tarifs
}
