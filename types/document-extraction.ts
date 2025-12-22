// Types pour le service d'extraction de documents
export interface EmprunteurInfo {
  nom: string | null
  prenom: string | null
  dateNaissance: string | null
}

export interface PretInfo {
  montantInitial: number | null
  dureeInitialeMois: number | null
  dateDebut: string | null
  dateFin: string | null
  tauxNominal: number | null
  banquePreteuse: string | null
  typePret: string | null
}

export interface Echeance {
  numero: number
  date: string
  capitalRestantDu: number
  interets: number
  assurance: number
  capital: number
  mensualite: number
}

export interface ExtractionMetadata {
  confidence: number
  warnings: string[]
  sourcesUtilisees?: string[]
  champsManquants?: string[]
}

export interface LigneAmortissementCible {
  date: string
  capitalRestantDu: number
}

export interface LignesAmortissementCibles {
  echeanceAvant: LigneAmortissementCible | null
  echeanceApres: LigneAmortissementCible | null
}

export interface ExtractedDataCiblee {
  emprunteurs: {
    principal: EmprunteurInfo | null
    conjoint: EmprunteurInfo | null
  }
  nombreAssures?: number
  pret: PretInfo | null
  lignesAmortissementCibles: LignesAmortissementCibles
  metadata: ExtractionMetadata
}

export interface ExtractedData {
  emprunteurs: {
    principal: EmprunteurInfo | null
    conjoint: EmprunteurInfo | null
  }
  pret: PretInfo | null
  tableauAmortissement: Echeance[]
  metadata: ExtractionMetadata
}

export interface CalculatedData {
  dateDebutEffective: string
  dureeRestanteMois: number
  capitalRestantDu: number
}

export interface ConsolidatedDataCiblee extends ExtractedDataCiblee {
  calculs: CalculatedData | null
}

export interface ConsolidatedData extends ExtractedData {
  calculs: CalculatedData | null
}

export interface DocumentSource {
  type: 'offrePret' | 'tableauAmortissement' | 'carteIdentite'
  content: string
  confidence: number
}

export interface ExtractionError {
  type: 'critical' | 'warning' | 'info'
  code: string
  message: string
  field?: string
  suggestion?: string
  source?: string
}

// Types pour l'intégration avec l'API Exade
export interface ExadeCompatibleData {
  assure: {
    nom: string
    prenom: string
    date_naissance: string
    fumeur?: boolean
    profession?: string
    revenus?: number
  }
  conjoint?: {
    nom: string
    prenom: string
    date_naissance: string
    fumeur?: boolean
    profession?: string
    revenus?: number
  }
  pret: {
    montant: number
    duree: number
    taux: number
    type?: string
  }
}
