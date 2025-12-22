import { supabase } from '@/lib/supabase'
import { DocumentsService } from './documents'
import { PretDataService } from './pret-data'
import { GeminiExtractionService } from './gemini-extraction'
import { addMonths, differenceInMonths, differenceInDays, parseISO, format } from 'date-fns'
import { 
  normalizeCategoryPro, 
  normalizeTypePret, 
  normalizeObjetFinancement,
  normalizeCivilite,
  normalizeTypeCredit,
  normalizeTypeAdhesion
} from '@/lib/utils/exade-normalizer'

// Charger les variables d'environnement côté serveur
if (typeof window === 'undefined') {
  require('dotenv').config()
}

// Types pour l'extraction
// Note: L'IA est configurée pour retourner des codes numériques Exade directement
interface EmprunteurInfo {
  civilite: 'M' | 'Mme' | 'Mlle' | null
  nom: string | null
  prenom: string | null
  nomNaissance: string | null
  dateNaissance: string | null
  fumeur: boolean | null
  categorieProfessionnelle: number | null  // Code Exade 1-11
  profession: string | null
  email: string | null
  telephone: string | null
}

interface PretInfo {
  montantInitial: number | null
  dureeInitialeMois: number | null
  dateDebut: string | null
  dateFin: string | null
  tauxNominal: number | null
  banquePreteuse: string | null
  typePret: number | string | null  // Code numérique (1-10) ou texte fallback
  objetFinancement: number | null   // Code numérique (1-8)
  coutAssuranceMensuel: number | null
}

interface Echeance {
  numero: number
  date: string
  capitalRestantDu: number
  interets: number
  assurance: number
  capital: number
  mensualite: number
}

interface ExtractedData {
  emprunteurs: {
    principal: EmprunteurInfo | null
    conjoint: EmprunteurInfo | null
  }
  pret: PretInfo | null
  tableauAmortissement: Echeance[]
  metadata: {
    confidence: number
    warnings: string[]
    sourcesUtilisees: string[]
  }
}

interface CalculatedData {
  dateDebutEffective: string
  dureeRestanteMois: number
  capitalRestantDu: number
}

interface ExtractedDataCiblee {
  emprunteurs: {
    principal: EmprunteurInfo | null
    conjoint: EmprunteurInfo | null
  }
  pret: PretInfo | null
  lignesAmortissementCibles: {
    echeanceAvant: {
      date: string
      capitalRestantDu: number
    } | null
    echeanceApres: {
      date: string
      capitalRestantDu: number
    } | null
  }
  metadata: {
    confidence: number
    warnings: string[]
  }
}

interface ConsolidatedDataCiblee extends ExtractedDataCiblee {
  calculs: CalculatedData | null
}

interface ConsolidatedData extends ExtractedData {
  calculs: CalculatedData | null
}

interface DocumentSource {
  type: 'offrePret' | 'tableauAmortissement' | 'carteIdentite'
  content: string
  confidence: number
}

// Prompt système optimisé pour extraction ciblée
// IMPORTANT: Les valeurs des champs codifiés (civilite, categorieProfessionnelle, typePret) 
// DOIVENT correspondre EXACTEMENT aux codes Exade pour éviter tout problème de mapping
const SYSTEM_PROMPT = `
Tu es un expert en analyse de documents bancaires français.

CONTEXTE : Tu vas recevoir un ou plusieurs fichiers de prêt et une date clé appelée "date_effective".

MISSION : Ta mission est double :
1. Analyse l'ensemble des documents pour extraire les informations générales sur les emprunteurs et le prêt.
2. Localise le tableau d'amortissement et extrais UNIQUEMENT les deux lignes qui encadrent la "date_effective" fournie.

FORMAT DE SORTIE JSON STRICT :
Tu dois retourner UNIQUEMENT un objet JSON valide, sans aucun texte explicatif avant ou après.
Retourne directement l'objet JSON suivant :

{
  "emprunteurs": {
    "principal": {
      "civilite": "M" | "Mme" | "Mlle" | null,
      "nom": "string | null",
      "prenom": "string | null",
      "nomNaissance": "string | null (nom de jeune fille)",
      "dateNaissance": "YYYY-MM-DD | null",
      "fumeur": boolean | null,
      "categorieProfessionnelle": number | null (CODE 1-11, voir liste ci-dessous),
      "profession": "string | null (intitulé du poste)",
      "email": "string | null",
      "telephone": "string | null"
    },
    "conjoint": null | {
      "civilite": "M" | "Mme" | "Mlle" | null,
      "nom": "string | null",
      "prenom": "string | null",
      "nomNaissance": "string | null",
      "dateNaissance": "YYYY-MM-DD | null",
      "fumeur": boolean | null,
      "categorieProfessionnelle": number | null (CODE 1-11),
      "profession": "string | null",
      "email": "string | null",
      "telephone": "string | null"
    }
  },
  "nombreAssures": number (1 ou 2 - nombre d'assurés détecté),
  "pret": {
    "montantInitial": number | null,
    "dureeInitialeMois": number | null,
    "dateDebut": "YYYY-MM-DD | null",
    "dateFin": "YYYY-MM-DD | null", 
    "tauxNominal": number | null,
    "banquePreteuse": "string | null",
    "typePret": number | null (CODE 1-10, voir liste ci-dessous),
    "objetFinancement": number | null (CODE 1-8, voir liste ci-dessous),
    "coutAssuranceMensuel": number | null
  },
  "lignesAmortissementCibles": {
    "echeanceAvant": {
      "date": "YYYY-MM-DD",
      "capitalRestantDu": number
    } | null,
    "echeanceApres": {
      "date": "YYYY-MM-DD",
      "capitalRestantDu": number
    } | null
  },
  "metadata": {
    "confidence": number,
    "warnings": ["string"],
    "champsManquants": ["string (liste des champs non trouvés - NON BLOQUANT)"]
  }
}

=== CODES OBLIGATOIRES (utilise UNIQUEMENT ces valeurs numériques) ===

CATÉGORIE PROFESSIONNELLE (categorieProfessionnelle) - Retourne le CODE NUMÉRIQUE :
  1 = Salarié cadre (inclut: cadre, cadre supérieur, ingénieur, manager, directeur)
  2 = Salarié non cadre (inclut: employé, ouvrier, technicien, agent, vendeur, secrétaire)
  3 = Profession libérale (inclut: avocat, notaire, expert-comptable, architecte, consultant)
  4 = Chirurgien
  5 = Chirurgien-dentiste (dentiste)
  6 = Médecin spécialiste (inclut: médecin, docteur, cardiologue, dermatologue, psychiatre)
  7 = Vétérinaire
  8 = Artisan (inclut: plombier, électricien, menuisier, boulanger, coiffeur)
  9 = Commerçant (inclut: gérant, chef d'entreprise, entrepreneur, auto-entrepreneur)
  10 = Retraité ou pré-retraité
  11 = Sans activité professionnelle (inclut: chômeur, étudiant, au foyer)

TYPE DE PRÊT (typePret) - Retourne le CODE NUMÉRIQUE :
  1 = Amortissable (prêt classique, prêt immobilier standard, prêt habitat)
  2 = In fine
  3 = Relais (prêt relais)
  4 = Crédit-bail (leasing)
  5 = LOA (Location avec Option d'Achat)
  6 = Taux 0% (PTZ, prêt à taux zéro)
  7 = Palier (prêt à paliers)
  8 = Prêt d'honneur
  9 = Restructuration (rachat de crédit, regroupement de crédits)
  10 = Amortissable professionnel (prêt professionnel)

OBJET DU FINANCEMENT (objetFinancement) - Retourne le CODE NUMÉRIQUE :
  1 = Résidence principale (achat RP, habitation principale)
  2 = Résidence secondaire
  3 = Travaux (rénovation, aménagement)
  4 = Investissement locatif (achat locatif)
  5 = Prêt professionnel (entreprise)
  6 = Autre projet (crédit conso, prêt personnel)
  7 = Construction (construction maison, VEFA)
  8 = Restructuration (rachat de crédit)

CIVILITÉ (civilite) - Retourne EXACTEMENT une de ces valeurs :
  "M" = Monsieur
  "Mme" = Madame
  "Mlle" = Mademoiselle

=== FIN DES CODES ===

RÈGLES D'EXTRACTION STRICTES :

POUR LES EMPRUNTEURS (Principal ET Conjoint si présent) :
- Civilité : DOIT être "M", "Mme" ou "Mlle" exactement (pas "Monsieur", pas "Madame")
- Nom : Nom de famille actuel
- Nom de naissance : Nom de jeune fille (souvent entre parenthèses ou précédé de "née")
- Prénom : Prénom complet
- Date de naissance : Format YYYY-MM-DD
- Fumeur : Cherche "fumeur", "non-fumeur", "tabac" → retourne boolean (true/false)
- Catégorie professionnelle : DOIT être un CODE NUMÉRIQUE 1-11 (voir liste ci-dessus). Analyse la profession mentionnée et déduis la catégorie correspondante.
- Profession : Intitulé exact du poste tel qu'écrit dans le document
- Email : Adresse email
- Téléphone : Numéro de portable

POUR LE NOMBRE D'ASSURÉS :
- Compte le nombre d'emprunteurs : 1 = emprunteur seul, 2 = couple
- Si un co-emprunteur/conjoint est mentionné, nombreAssures = 2

POUR LE TABLEAU D'AMORTISSEMENT :
- L'utilisateur te fournira la "date_effective". Trouve l'échéance la plus proche AVANT cette date et l'échéance la plus proche APRÈS cette date.
- Si la "date_effective" tombe exactement sur une échéance, retourne cette même échéance pour "echeanceAvant" ET "echeanceApres".
- Si tu ne trouves pas de tableau d'amortissement, retourne null pour "echeanceAvant" et "echeanceApres" et ajoute un warning.
- **IMPORTANT** : Pour "coutAssuranceMensuel", cherche dans le tableau d'amortissement la colonne "Assurance" ou "Prime d'assurance". Cette valeur apparaît généralement pour CHAQUE échéance. Si tu la trouves, retourne le montant mensuel de l'assurance.

CHAMPS MANQUANTS (NON BLOQUANT) :
- Si une donnée n'est pas trouvée, utilise null et ajoute le nom du champ dans "champsManquants"
- L'absence d'un champ ne doit JAMAIS bloquer l'extraction
- Exemple : si l'email n'est pas dans les documents, retourne null et ajoute "email" dans champsManquants

AUTRES RÈGLES :
- Dates : Convertis-les TOUJOURS au format YYYY-MM-DD
- Montants : Retourne des nombres
- Booleans : true/false pour fumeur

RÈGLE IMPÉRATIVE : N'invente JAMAIS une information. Si une donnée n'est pas explicitement écrite dans les documents fournis, tu DOIS retourner null et l'ajouter dans champsManquants. Toute information inventée rendra ta réponse invalide

DÉTECTION DU TABLEAU D'AMORTISSEMENT :
- Le tableau d'amortissement peut être dans N'IMPORTE QUEL document
- Cherche des patterns comme : "Tableau d'amortissement", "Échéances", "Plan de remboursement", "Amortissement"
- Les colonnes peuvent être nommées différemment : "CRD", "Capital Restant Dû", "Reste à payer", "Capital dû"
- Si tu vois des lignes avec des dates et des montants, c'est probablement le tableau d'amortissement
- Même si le tableau semble incomplet, extrais les deux lignes qui encadrent la date_effective
- Si aucun tableau n'est trouvé après analyse exhaustive, retourne null pour les échéances mais ajoute un warning explicite

GESTION DU CONJOINT :
- Si les documents ne mentionnent qu'un seul emprunteur, retourne null pour le champ "conjoint"
- Si les documents mentionnent un co-emprunteur/conjoint, remplis ses informations
- En cas de doute, privilégie null pour éviter les erreurs

CONSOLIDATION DES DONNÉES :
- Si une même information apparaît dans plusieurs documents avec des valeurs différentes, privilégie la source la plus récente ou la plus détaillée
- Ajoute un warning dans metadata.warnings pour signaler les incohérences détectées
`

export class DocumentExtractionService {
  
  /**
   * Extrait un code numérique depuis une valeur retournée par l'IA
   * PRIORITÉ 1: Si c'est déjà un nombre valide, on l'utilise directement
   * PRIORITÉ 2: Sinon, on essaie de normaliser le texte
   * PRIORITÉ 3: Sinon, on utilise la valeur par défaut
   */
  private static extractNumericCode(
    value: any, 
    normalizeFn: (val: any) => number | null, 
    defaultValue: number | null
  ): number | null {
    // Cas 1: L'IA a retourné directement un nombre (comportement attendu)
    if (typeof value === 'number' && !isNaN(value)) {
      console.log(`[ExtractionCode] Valeur numérique directe: ${value}`)
      return value
    }
    
    // Cas 2: L'IA a retourné une string qui est un nombre (ex: "1")
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10)
      if (!isNaN(parsed)) {
        console.log(`[ExtractionCode] String parsée en nombre: "${value}" → ${parsed}`)
        return parsed
      }
    }
    
    // Cas 3: Fallback - essayer la normalisation textuelle
    if (value) {
      const normalized = normalizeFn(value)
      if (normalized !== null) {
        console.log(`[ExtractionCode] Normalisation fallback: "${value}" → ${normalized}`)
        return normalized
      }
    }
    
    // Cas 4: Valeur par défaut
    if (defaultValue !== null) {
      console.log(`[ExtractionCode] Utilisation valeur défaut: ${defaultValue}`)
    }
    return defaultValue
  }
  
  /**
   * Extrait et valide une civilité (doit être exactement "M", "Mme" ou "Mlle")
   */
  private static extractCivilite(value: any): string | null {
    if (!value) return null
    
    const str = String(value).trim()
    
    // Valeurs exactes attendues
    if (str === 'M' || str === 'Mme' || str === 'Mlle') {
      return str
    }
    
    // Fallback normalisation
    return normalizeCivilite(str)
  }
  
  /**
   * Méthode principale d'extraction depuis un dossier
   */
  static async extractFromDossier(dossierId: string, config?: { apiKey?: string, model?: string }): Promise<ConsolidatedDataCiblee | null> {
    try {
      console.log(`[DocumentExtractionService] Début extraction pour dossier ${dossierId}`)
      
      // 1. Récupérer tous les documents du dossier avec un client Supabase server-side
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseServer = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: documents, error: docsError } = await supabaseServer
        .from('documents')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false })
      
      if (docsError) {
        console.error('[DocumentExtractionService] Erreur récupération documents:', docsError)
        throw new Error(`Impossible de récupérer les documents: ${docsError.message}`)
      }
      
      // 2. Utiliser TOUS les documents pour l'extraction (pas de filtrage)
      const relevantDocuments = documents || []
      
      if (relevantDocuments.length === 0) {
        throw new Error('Aucun document pertinent trouvé pour l\'extraction')
      }
      
      console.log(`[DocumentExtractionService] ${relevantDocuments.length} document(s) pertinent(s) trouvé(s)`)
      
      // 3. Calculer la date effective AVANT d'appeler l'IA
      const dateDemande = new Date()
      const dateDebutEffective = addMonths(dateDemande, 3)
      const dateEffectiveStr = format(dateDebutEffective, 'yyyy-MM-dd')
      console.log(`[DocumentExtractionService] Date effective calculée: ${dateEffectiveStr}`)
      
      // 4. Utiliser Google Gemini 3 Flash pour tous les fichiers (modèle principal)
      console.log('[DocumentExtractionService] Utilisation de Google Gemini 3 Flash')
      
      const userPrompt = `Voici les documents à analyser. La date effective pour laquelle je cherche les lignes du tableau d'amortissement est : ${dateEffectiveStr}.\n\nConsolide toutes ces informations dans un seul objet JSON.`
      
      const extractedData = await GeminiExtractionService.extractFromDocuments(
        relevantDocuments.map(doc => ({
          id: doc.id,
          storage_path: doc.storage_path,
          document_name: doc.document_name,
          mime_type: doc.mime_type || 'application/pdf'
        })),
        SYSTEM_PROMPT,
        userPrompt
      )
      
      // 7. Validation et calculs métier
      const validatedData = this.validateAndCalculate(extractedData, dateDebutEffective)
      
      console.log(`[DocumentExtractionService] Extraction réussie avec confidence ${validatedData.metadata.confidence}`)
      
      return validatedData
      
    } catch (error) {
      console.error('[DocumentExtractionService] Erreur extraction:', error)
      return null
    }
  }

  /**
   * Extraction du texte depuis un document Supabase Storage
   */
  private static async extractTextFromDocument(doc: any): Promise<string> {
    try {
      console.log(`[DocumentExtractionService] Extraction texte du document ${doc.document_name}`)
      
      // Télécharger le document depuis Supabase Storage
      const { supabase } = await import('@/lib/supabase')
      
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storage_path)
      
      if (error) {
        console.error(`[DocumentExtractionService] Erreur téléchargement ${doc.document_name}:`, error)
        throw new Error(`Impossible de télécharger le document: ${error.message}`)
      }
      
      // Pour les PDFs et images, retourner l'URL publique pour analyse multimodale
      if (doc.mime_type === 'application/pdf' || doc.mime_type?.startsWith('image/')) {
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(doc.storage_path)
        
        console.log(`[DocumentExtractionService] URL publique générée pour ${doc.document_name}: ${urlData.publicUrl}`)
        return `[DOCUMENT_URL:${urlData.publicUrl}]`
      } else {
        // Pour les autres types, essayer de lire le contenu texte
        const arrayBuffer = await data.arrayBuffer()
        const text = Buffer.from(arrayBuffer).toString('utf-8')
        return text
      }
      
    } catch (error: any) {
      console.error(`[DocumentExtractionService] Erreur extraction ${doc.document_name}:`, error)
      throw new Error(`Erreur lors de l'extraction du document: ${error.message}`)
    }
  }

  /**
   * Calcul de la confiance basé sur les métadonnées du document
   */
  private static calculateDocumentConfidence(doc: any): number {
    let confidence = 0.8 // Base de confiance
    
    // Ajuster selon le type de document
    if (doc.type === 'offrePret') confidence += 0.1
    if (doc.type === 'tableauAmortissement') confidence += 0.1
    
    // Ajuster selon la taille du fichier
    if (doc.file_size && doc.file_size > 100000) confidence += 0.05
    
    return Math.min(confidence, 1.0)
  }

  /**
   * Appel à OpenRouter avec plusieurs documents
   */
  private static async callOpenRouterWithMultipleDocuments(sources: DocumentSource[], config?: { apiKey?: string, model?: string }): Promise<ExtractedData> {
    const openRouterApiKey = config?.apiKey || process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
    const openRouterModel = config?.model || process.env.OPENROUTER_MODEL || process.env.NEXT_PUBLIC_OPENROUTER_MODEL
    
    if (!openRouterModel) {
      throw new Error('OPENROUTER_MODEL non configuré. Vérifiez votre fichier .env')
    }
    
    console.log('[DocumentExtractionService] Variables OpenRouter:', {
      apiKey: openRouterApiKey ? '✅ Définie' : '❌ Non définie',
      model: openRouterModel,
      fromConfig: !!config?.apiKey,
      fromEnv: !!process.env.OPENROUTER_API_KEY
    })
    
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY non configurée. Vérifiez votre fichier .env')
    }
    
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: `Voici ${sources.length} document(s) à analyser :\n\n${sources.map((source, index) => 
          `=== DOCUMENT ${index + 1} (${source.type}) ===\n${source.content}\n`
        ).join('\n')}\n\nConsolide toutes ces informations dans un seul objet JSON.`
      }
    ]

    console.log(`[DocumentExtractionService] Appel OpenRouter avec modèle ${openRouterModel}`)
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'GMB Apporteur - Extraction Documents'
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages,
        temperature: 0.1, // Faible température pour plus de cohérence
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Réponse OpenRouter invalide')
    }

    const content = data.choices[0].message.content
    
    try {
      // Parser la réponse JSON en nettoyant les backticks
      let cleanContent = content.trim()
      
      // Supprimer les backticks markdown si présents
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Chercher le JSON dans le contenu (entre accolades) si le contenu commence par du texte
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanContent = jsonMatch[0]
      }
      
      console.log('[DocumentExtractionService] Contenu nettoyé:', cleanContent.substring(0, 200) + '...')
      
      const parsedData = JSON.parse(cleanContent)
      
      // Validation spécifique du conjoint
      return this.validateConjointData(parsedData)
      
    } catch (parseError) {
      console.error('[DocumentExtractionService] Erreur parsing JSON:', parseError)
      console.error('[DocumentExtractionService] Contenu reçu:', content)
      throw new Error('Impossible de parser la réponse JSON d\'OpenRouter')
    }
  }

  /**
   * Validation spécifique des données conjoint
   */
  private static validateConjointData(extractedData: any): ExtractedData {
    // Vérifier la cohérence des données conjoint
    if (extractedData.emprunteurs?.conjoint) {
      const conjoint = extractedData.emprunteurs.conjoint
      
      // Si le conjoint a des données partielles, vérifier la cohérence
      if (conjoint.nom && !conjoint.prenom) {
        extractedData.metadata.warnings.push('Données conjoint incomplètes - nom sans prénom')
      }
      
      if (conjoint.prenom && !conjoint.nom) {
        extractedData.metadata.warnings.push('Données conjoint incomplètes - prénom sans nom')
      }
      
      // Si les données sont trop incomplètes, considérer comme null
      if (!conjoint.nom && !conjoint.prenom && !conjoint.dateNaissance) {
        extractedData.emprunteurs.conjoint = null
        extractedData.metadata.warnings.push('Conjoint détecté mais données insuffisantes - ignoré')
      }
    }
    
    return extractedData
  }

  /**
   * Appel à OpenRouter avec extraction ciblée (date effective fournie)
   */
  private static async callOpenRouterWithData(sources: DocumentSource[], dateEffective: string, config?: { apiKey?: string, model?: string }): Promise<any> {
    const openRouterApiKey = config?.apiKey || process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
    const openRouterModel = config?.model || process.env.OPENROUTER_MODEL || process.env.NEXT_PUBLIC_OPENROUTER_MODEL
    
    if (!openRouterModel) {
      throw new Error('OPENROUTER_MODEL non configuré. Vérifiez votre fichier .env')
    }
    
    console.log('[DocumentExtractionService] Variables OpenRouter:', {
      apiKey: openRouterApiKey ? '✅ Définie' : '❌ Non définie',
      model: openRouterModel,
      fromConfig: !!config?.apiKey,
      fromEnv: !!process.env.OPENROUTER_API_KEY
    })
    
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY non configurée. Vérifiez votre fichier .env')
    }

    console.log(`[DocumentExtractionService] Appel OpenRouter avec modèle ${openRouterModel}`)

    // Construire le contenu du message utilisateur avec format structuré
    const userContent = [
      {
        type: 'text',
        text: `Analyse les documents suivants. La date effective pour laquelle je cherche les lignes du tableau d'amortissement est : ${dateEffective}.\n\nConsolide toutes ces informations dans un seul objet JSON.`
      }
    ]

    // Ajouter chaque document au format OpenRouter
    for (const source of sources) {
      // Extraire l'URL de la chaîne [DOCUMENT_URL:...]
      const urlMatch = source.content.match(/\[DOCUMENT_URL:(.*?)\]/)
      if (urlMatch && urlMatch[1]) {
        console.log(`[DocumentExtractionService] Ajout document OpenRouter: ${urlMatch[1]}`)
        userContent.push({
          type: 'file', // Format OpenRouter pour les documents
          file: {
            filename: `${source.type}.pdf`,
            file_data: urlMatch[1]
          }
        } as any) // Type assertion pour compatibilité avec différents formats d'API
      } else {
        // Si ce n'est pas une URL, traiter comme du texte
        userContent.push({
          type: 'text',
          text: `=== DOCUMENT (${source.type}) ===\n${source.content}\n`
        })
      }
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ]

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gmb-apporteur.vercel.app',
        'X-Title': 'GMB Apporteur - Extraction Documents'
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages,
        temperature: 0.1,
        max_tokens: 4000,
        plugins: [
          {
            id: "file-parser",
            pdf: {
              engine: "pdf-text" // Gratuit pour les PDF bien structurés
            }
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erreur OpenRouter ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('Réponse vide d\'OpenRouter')
    }

    try {
      // Parser la réponse JSON en nettoyant les backticks
      let cleanContent = content.trim()
      
      // Supprimer les backticks markdown si présents
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Chercher le JSON dans le contenu (entre accolades) si le contenu commence par du texte
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanContent = jsonMatch[0]
      }
      
      console.log('[DocumentExtractionService] Contenu nettoyé:', cleanContent.substring(0, 200) + '...')
      
      const parsedData = JSON.parse(cleanContent)
      
      // Validation spécifique du conjoint
      return this.validateConjointData(parsedData)
      
    } catch (parseError) {
      console.error('[DocumentExtractionService] Erreur parsing JSON:', parseError)
      console.error('[DocumentExtractionService] Contenu reçu:', content)
      throw new Error('Impossible de parser la réponse JSON d\'OpenRouter')
    }
  }

  /**
   * Validation et calculs métier
   */
  private static validateAndCalculate(extractedData: any, dateEffective?: Date): ConsolidatedDataCiblee {
    const consolidated: ConsolidatedDataCiblee = {
      ...extractedData,
      calculs: null
    }

    try {
      // NOUVELLE LOGIQUE : Calculer avec la date effective fournie et les lignes ciblées
      if (dateEffective && extractedData.pret?.dateFin) {
        console.log('[DocumentExtractionService] Calculs métier avec extraction ciblée')
        
        const dureeRestanteMois = this.calculateDureeRestante(
          parseISO(extractedData.pret.dateFin),
          dateEffective
        )
        
        // Calcul du CRD avec les lignes ciblées
        const capitalRestantDu = this.calculateCRDEffective(
          extractedData.lignesAmortissementCibles?.echeanceAvant,
          extractedData.lignesAmortissementCibles?.echeanceApres,
          dateEffective
        )
        
        consolidated.calculs = {
          dateDebutEffective: format(dateEffective, 'yyyy-MM-dd'),
          dureeRestanteMois,
          capitalRestantDu
        }
      } else {
        consolidated.metadata.warnings.push('Données prêt ou date effective manquantes - calculs métier impossibles')
      }
      
    } catch (error: any) {
      console.error('[DocumentExtractionService] Erreur calculs métier:', error)
      consolidated.metadata.warnings.push(`Erreur calculs métier: ${error.message}`)
    }

    return consolidated
  }


  /**
   * Calcul de la durée restante en mois
   */
  private static calculateDureeRestante(dateFin: Date, dateEffective: Date): number {
    const dureeRestante = differenceInMonths(dateFin, dateEffective)
    
    if (dureeRestante <= 0) {
      throw new Error('La date de début effective est postérieure à la date de fin du prêt')
    }
    
    return dureeRestante
  }

  /**
   * Calcul du CRD par interpolation linéaire
   */
  private static calculateCRDEffective(
    echeanceAvant: any,
    echeanceApres: any,
    dateEffective: Date
  ): number {
    if (!echeanceAvant || !echeanceApres) {
      throw new Error('Lignes d\'amortissement cibles manquantes pour le calcul du CRD')
    }
    
    // Si la date effective correspond exactement à une échéance
    if (echeanceAvant.date === echeanceApres.date) {
      return echeanceAvant.capitalRestantDu
    }
    
    // Calculer l'amortissement journalier moyen
    const dateAvant = parseISO(echeanceAvant.date)
    const dateApres = parseISO(echeanceApres.date)
    const joursEntreEcheances = differenceInDays(dateApres, dateAvant)
    
    const amortissementEntreEcheances = echeanceAvant.capitalRestantDu - echeanceApres.capitalRestantDu
    const amortissementJournalier = amortissementEntreEcheances / joursEntreEcheances
    
    // Calculer le nombre de jours depuis l'échéance précédente
    const joursDepuisEcheanceAvant = differenceInDays(dateEffective, dateAvant)
    
    // Calculer le CRD à la date effective
    const crdEffective = echeanceAvant.capitalRestantDu - (amortissementJournalier * joursDepuisEcheanceAvant)
    
    console.log(`[DocumentExtractionService] Calcul CRD optimisé: ${echeanceAvant.capitalRestantDu} - (${amortissementJournalier} × ${joursDepuisEcheanceAvant}) = ${crdEffective}`)
    
    return Math.round(crdEffective)
  }

  /**
   * Trouve l'échéance juste avant la date effective
   */
  private static findEcheanceBefore(tableau: Echeance[], dateEffective: Date): Echeance | null {
    const dateEffectiveStr = format(dateEffective, 'yyyy-MM-dd')
    
    return tableau
      .filter(echeance => echeance.date <= dateEffectiveStr)
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null
  }

  /**
   * Trouve l'échéance juste après la date effective
   */
  private static findEcheanceAfter(tableau: Echeance[], dateEffective: Date): Echeance | null {
    const dateEffectiveStr = format(dateEffective, 'yyyy-MM-dd')
    
    return tableau
      .filter(echeance => echeance.date >= dateEffectiveStr)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null
  }

  /**
   * Sauvegarde des données extraites dans pret_data ET dans dossiers (données client)
   * 
   * L'IA est désormais configurée pour retourner directement les codes numériques Exade.
   * La normalisation est conservée en FALLBACK au cas où l'IA retournerait du texte.
   */
  static async saveExtractedData(dossierId: string, extractedData: ConsolidatedDataCiblee): Promise<boolean> {
    try {
      if (!extractedData.pret) {
        throw new Error('Données prêt manquantes pour la sauvegarde')
      }
      
      // Les calculs peuvent être partiels si le tableau d'amortissement est manquant
      if (!extractedData.calculs) {
        console.warn('[DocumentExtractionService] Calculs métier manquants - sauvegarde partielle')
      }

      const pret = extractedData.pret as any
      
      // PRIORITÉ 1: Utiliser les codes numériques retournés directement par l'IA
      // PRIORITÉ 2: Fallback sur la normalisation si l'IA a retourné du texte
      const typePretCode = this.extractNumericCode(pret.typePret, normalizeTypePret, 1)
      const objetFinancementCode = this.extractNumericCode(pret.objetFinancement, normalizeObjetFinancement, 1)
      const typeCreditCode = this.extractNumericCode(pret.typePret, normalizeTypeCredit, 0)
      
      console.log(`[DocumentExtractionService] Codes Exade (direct ou normalisés) - Type prêt: ${typePretCode}, Objet: ${objetFinancementCode}, Type crédit: ${typeCreditCode}`)

      const pretData = {
        banque_preteuse: pret.banquePreteuse || 'Non spécifiée',
        montant_capital: pret.montantInitial || 0,
        duree_mois: pret.dureeInitialeMois || 0, // Durée totale INITIALE du prêt
        type_pret: typeof pret.typePret === 'number' ? String(pret.typePret) : (pret.typePret || 'immobilier'), // Libellé ou code
        // Codes Exade (directement de l'IA ou normalisés)
        type_pret_code: typePretCode,
        objet_financement_code: objetFinancementCode,
        type_credit: typeCreditCode,
        type_adhesion: 0, // Par défaut nouveau prêt (sera modifiable par l'admin)
        type_taux_code: 1, // Par défaut fixe
        // Autres données
        taux_nominal: pret.tauxNominal || 0,
        cout_assurance_banque: pret.coutAssuranceMensuel || null, // Coût mensuel de l'assurance actuelle
        date_debut: pret.dateDebut,
        date_fin: pret.dateFin,
        date_debut_effective: extractedData.calculs?.dateDebutEffective || null,
        duree_restante_mois: extractedData.calculs?.dureeRestanteMois || null, // Durée RESTANTE calculée
        capital_restant_du: extractedData.calculs?.capitalRestantDu || null
      }

      await PretDataService.upsertByDossierId(dossierId, pretData)
      
      // Sauvegarder les données client extraites pour comparaison ultérieure
      // ET mettre à jour client_infos avec les codes Exade
      if (extractedData.emprunteurs) {
        const { supabase } = await import('@/lib/supabase')
        
        const principal = extractedData.emprunteurs.principal as any
        const conjoint = extractedData.emprunteurs.conjoint as any
        
        // PRIORITÉ 1: Code numérique direct de l'IA
        // PRIORITÉ 2: Fallback normalisation si texte
        const principalCategPro = this.extractNumericCode(
          principal?.categorieProfessionnelle, 
          normalizeCategoryPro, 
          null
        )
        const principalCivilite = this.extractCivilite(principal?.civilite)
          
        const conjointCategPro = this.extractNumericCode(
          conjoint?.categorieProfessionnelle, 
          normalizeCategoryPro, 
          null
        )
        const conjointCivilite = this.extractCivilite(conjoint?.civilite)
        
        console.log(`[DocumentExtractionService] Catégories pro (direct/normalisé) - Principal: ${principalCategPro}, Conjoint: ${conjointCategPro}`)
        
        // Construire les données client à mettre à jour (seulement les champs extraits)
        const clientInfoUpdates: Record<string, any> = {}
        
        // Principal
        if (principalCivilite) clientInfoUpdates.client_civilite = principalCivilite
        if (principal?.nom) clientInfoUpdates.client_nom = principal.nom
        if (principal?.prenom) clientInfoUpdates.client_prenom = principal.prenom
        if (principal?.nomNaissance) clientInfoUpdates.client_nom_naissance = principal.nomNaissance
        if (principal?.dateNaissance) clientInfoUpdates.client_date_naissance = principal.dateNaissance
        if (principalCategPro) clientInfoUpdates.categorie_professionnelle = principalCategPro
        if (principal?.fumeur !== undefined && principal?.fumeur !== null) {
          clientInfoUpdates.client_fumeur = principal.fumeur
        }
        
        // Conjoint
        if (conjointCivilite) clientInfoUpdates.conjoint_civilite = conjointCivilite
        if (conjoint?.nom) clientInfoUpdates.conjoint_nom = conjoint.nom
        if (conjoint?.prenom) clientInfoUpdates.conjoint_prenom = conjoint.prenom
        if (conjoint?.nomNaissance) clientInfoUpdates.conjoint_nom_naissance = conjoint.nomNaissance
        if (conjoint?.dateNaissance) clientInfoUpdates.conjoint_date_naissance = conjoint.dateNaissance
        if (conjointCategPro) clientInfoUpdates.conjoint_categorie_professionnelle = conjointCategPro
        if (conjoint?.fumeur !== undefined && conjoint?.fumeur !== null) {
          clientInfoUpdates.conjoint_fumeur = conjoint.fumeur
        }
        
        // Mettre à jour client_infos avec les codes normalisés (si des données existent)
        if (Object.keys(clientInfoUpdates).length > 0) {
          clientInfoUpdates.updated_at = new Date().toISOString()
          
          const { error: clientUpdateError } = await supabase
            .from('client_infos')
            .update(clientInfoUpdates)
            .eq('dossier_id', dossierId)
          
          if (clientUpdateError) {
            console.error('[DocumentExtractionService] Erreur mise à jour client_infos:', clientUpdateError)
          } else {
            console.log(`[DocumentExtractionService] client_infos mis à jour avec ${Object.keys(clientInfoUpdates).length} champs`)
          }
        }
        
        // Sauvegarder également dans dossiers.extracted_client_data pour comparaison
        const extractedClientData = {
          principal: extractedData.emprunteurs.principal || null,
          conjoint: extractedData.emprunteurs.conjoint || null,
          nombreAssures: (extractedData as any).nombreAssures || (extractedData.emprunteurs.conjoint ? 2 : 1),
          champsManquants: (extractedData.metadata as any).champsManquants || [],
          // Inclure les codes normalisés pour traçabilité
          codesExade: {
            principal: { categorie_professionnelle: principalCategPro },
            conjoint: { categorie_professionnelle: conjointCategPro },
            pret: { type_pret_code: typePretCode, objet_financement_code: objetFinancementCode }
          }
        }
        
        const { error: updateError } = await supabase
          .from('dossiers')
          .update({
            extracted_client_data: extractedClientData,
            last_extraction_at: new Date().toISOString(),
            comparison_modal_seen: false // Reset le flag pour afficher la modale
          })
          .eq('id', dossierId)
        
        if (updateError) {
          console.error('[DocumentExtractionService] Erreur sauvegarde données client:', updateError)
        } else {
          console.log('[DocumentExtractionService] Données client extraites sauvegardées pour comparaison future')
        }
      }
      
      console.log(`[DocumentExtractionService] Données sauvegardées pour dossier ${dossierId}`)
      return true
      
    } catch (error) {
      console.error('[DocumentExtractionService] Erreur sauvegarde:', error)
      return false
    }
  }
}
