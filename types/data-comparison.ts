// Types pour la comparaison de données extraites vs données actuelles

export interface FieldDifference {
  field: string
  label: string
  currentValue: any
  extractedValue: any
  isDifferent: boolean
  isNew: boolean // Champ vide actuellement, nouvelle valeur proposée
  category: 'principal' | 'conjoint' | 'pret'
}

export interface DiffReport {
  // Indicateurs de présence de différences
  hasClientDifferences: boolean
  hasTypeMismatch: boolean
  
  // Liste des différences par catégorie
  principalDiffs: FieldDifference[]
  conjointDiffs: FieldDifference[]
  
  // Conflit de type de dossier
  currentType: 'seul' | 'couple'
  detectedType: 'seul' | 'couple'
  
  // Champs non trouvés par l'IA (non bloquants)
  champsManquants: string[]
  
  // Métadonnées
  totalDifferences: number
  confidence: number
}

export interface ExtractedClientData {
  // Emprunteur principal
  principal: {
    civilite?: 'M' | 'Mme' | 'Mlle' | null
    nom?: string | null
    prenom?: string | null
    nomNaissance?: string | null
    dateNaissance?: string | null
    fumeur?: boolean | null
    categorieProfessionnelle?: string | null
    profession?: string | null
    email?: string | null
    telephone?: string | null
  }
  
  // Conjoint (si couple)
  conjoint?: {
    civilite?: 'M' | 'Mme' | 'Mlle' | null
    nom?: string | null
    prenom?: string | null
    nomNaissance?: string | null
    dateNaissance?: string | null
    fumeur?: boolean | null
    categorieProfessionnelle?: string | null
    profession?: string | null
    email?: string | null
    telephone?: string | null
  } | null
  
  // Métadonnées
  nombreAssures: number
  champsManquants: string[]
}

export interface CurrentClientData {
  // Emprunteur principal
  client_civilite?: string | null
  client_nom: string
  client_prenom: string
  client_nom_naissance?: string | null
  client_date_naissance: string
  client_fumeur: boolean
  categorie_professionnelle?: number | null  // Code Exade 1-11
  client_email: string
  client_telephone?: string | null
  
  // Conjoint
  conjoint_civilite?: string | null
  conjoint_nom?: string | null
  conjoint_prenom?: string | null
  conjoint_nom_naissance?: string | null
  conjoint_date_naissance?: string | null
  conjoint_fumeur?: boolean | null
  conjoint_categorie_professionnelle?: number | null  // Code Exade 1-11
  conjoint_email?: string | null
  conjoint_telephone?: string | null
}

export interface ApplyChangesPayload {
  selectedFields: string[]
  updateType: boolean // true si on doit changer le type de dossier
  newType?: 'seul' | 'couple'
  extractedData: ExtractedClientData
}

