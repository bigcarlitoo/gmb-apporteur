/**
 * Normaliseur Exade - Mapping des libellés textuels vers codes numériques Exade
 * 
 * Ce module permet de convertir les données textuelles (extraites par l'IA ou saisies manuellement)
 * en codes numériques conformes à l'API Exade.
 * 
 * Documentation de référence: WebService_Exade_ASSUREA_Avec_commissionnement_-_3.8
 */

import {
  EXADE_CATEGORIES,
  EXADE_TYPE_PRET,
  EXADE_OBJET_FINANCEMENT,
  EXADE_TYPE_ADHESION,
  EXADE_CIVILITE
} from '@/lib/constants/exade'

/**
 * Normalise une chaîne pour la comparaison (lowercase, sans accents, sans espaces multiples)
 */
function normalizeString(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]/g, ' ') // Remplace les caractères spéciaux par des espaces
    .replace(/\s+/g, ' ') // Supprime les espaces multiples
    .trim()
}

/**
 * Calcule un score de similarité entre deux chaînes (0-1)
 */
function similarityScore(str1: string, str2: string): number {
  const s1 = normalizeString(str1)
  const s2 = normalizeString(str2)
  
  if (s1 === s2) return 1
  if (!s1 || !s2) return 0
  
  // Vérification d'inclusion
  if (s1.includes(s2) || s2.includes(s1)) return 0.9
  
  // Calcul basique de similarité (nombre de mots communs)
  const words1 = s1.split(' ')
  const words2 = s2.split(' ')
  const commonWords = words1.filter(w => words2.includes(w))
  const score = (2 * commonWords.length) / (words1.length + words2.length)
  
  return score
}

// =============================================================================
// CATÉGORIE PROFESSIONNELLE (categ_pro)
// =============================================================================

/**
 * Mapping étendu des libellés vers codes catégorie professionnelle Exade
 */
const CATEGORY_MAPPINGS: Record<string, number> = {
  // Code 1: Salarié cadre
  'salarie cadre': 1,
  'cadre': 1,
  'cadre superieur': 1,
  'cadre dirigeant': 1,
  'ingenieur': 1,
  'manager': 1,
  'directeur': 1,
  
  // Code 2: Salarié non cadre
  'salarie non cadre': 2,
  'salarie': 2,
  'employe': 2,
  'ouvrier': 2,
  'technicien': 2,
  'agent': 2,
  'vendeur': 2,
  'assistant': 2,
  'secretaire': 2,
  'operateur': 2,
  
  // Code 3: Profession libérale
  'profession liberale': 3,
  'liberal': 3,
  'avocat': 3,
  'notaire': 3,
  'expert comptable': 3,
  'architecte': 3,
  'consultant': 3,
  
  // Code 4: Chirurgien
  'chirurgien': 4,
  
  // Code 5: Chirurgien-dentiste
  'chirurgien dentiste': 5,
  'dentiste': 5,
  
  // Code 6: Médecin spécialiste
  'medecin specialiste': 6,
  'medecin': 6,
  'docteur': 6,
  'cardiologue': 6,
  'dermatologue': 6,
  'radiologue': 6,
  'psychiatre': 6,
  'ophtalomologue': 6,
  
  // Code 7: Vétérinaire
  'veterinaire': 7,
  
  // Code 8: Artisan
  'artisan': 8,
  'plombier': 8,
  'electricien': 8,
  'menuisier': 8,
  'boulanger': 8,
  'patissier': 8,
  'coiffeur': 8,
  
  // Code 9: Commerçant
  'commercant': 9,
  'gerant': 9,
  'chef d entreprise': 9,
  'entrepreneur': 9,
  'auto entrepreneur': 9,
  
  // Code 10: Retraité
  'retraite': 10,
  'pre retraite': 10,
  'pensionnaire': 10,
  
  // Code 11: Sans activité
  'sans activite professionnelle': 11,
  'sans activite': 11,
  'chomeur': 11,
  'demandeur d emploi': 11,
  'etudiant': 11,
  'au foyer': 11,
  'homme au foyer': 11,
  'femme au foyer': 11
}

/**
 * Normalise une catégorie professionnelle vers un code Exade
 * @param label Libellé textuel de la catégorie (ex: "Cadre", "Salarié non cadre")
 * @returns Code Exade (1-11) ou null si non reconnu
 */
export function normalizeCategoryPro(label: string | null | undefined): number | null {
  if (!label) return null
  
  // Si c'est déjà un nombre
  const numValue = parseInt(String(label), 10)
  if (!isNaN(numValue) && numValue >= 1 && numValue <= 11) {
    return numValue
  }
  
  const normalized = normalizeString(label)
  
  // Recherche exacte d'abord
  if (CATEGORY_MAPPINGS[normalized]) {
    return CATEGORY_MAPPINGS[normalized]
  }
  
  // Recherche par similarité
  let bestMatch: { code: number; score: number } | null = null
  
  for (const [mappingKey, code] of Object.entries(CATEGORY_MAPPINGS)) {
    const score = similarityScore(normalized, mappingKey)
    if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { code, score }
    }
  }
  
  if (bestMatch) {
    console.log(`[ExadeNormalizer] Catégorie "${label}" → Code ${bestMatch.code} (score: ${bestMatch.score.toFixed(2)})`)
    return bestMatch.code
  }
  
  console.warn(`[ExadeNormalizer] Catégorie non reconnue: "${label}"`)
  return null
}

// =============================================================================
// TYPE DE PRÊT (type_pret)
// =============================================================================

const TYPE_PRET_MAPPINGS: Record<string, number> = {
  // Code 1: Amortissable
  'amortissable': 1,
  'pret amortissable': 1,
  'credit amortissable': 1,
  'pret immobilier': 1,
  'immobilier': 1,
  'pret habitat': 1,
  
  // Code 2: In fine
  'in fine': 2,
  'pret in fine': 2,
  
  // Code 3: Relais
  'relais': 3,
  'pret relais': 3,
  'credit relais': 3,
  
  // Code 4: Crédit-bail
  'credit bail': 4,
  'leasing': 4,
  
  // Code 5: LOA
  'loa': 5,
  'location avec option d achat': 5,
  
  // Code 6: Taux 0%
  'taux 0': 6,
  'ptz': 6,
  'pret taux zero': 6,
  'pret a taux zero': 6,
  
  // Code 7: Palier
  'palier': 7,
  'pret a paliers': 7,
  
  // Code 8: Prêt d'honneur
  'pret d honneur': 8,
  'pret honneur': 8,
  
  // Code 9: Restructuration
  'restructuration': 9,
  'rachat de credit': 9,
  'rachat credit': 9,
  'regroupement de credits': 9,
  
  // Code 10: Amortissable professionnel
  'amortissable professionnel': 10,
  'pret professionnel': 10,
  'credit professionnel': 10
}

/**
 * Normalise un type de prêt vers un code Exade
 * @param label Libellé textuel du type de prêt
 * @returns Code Exade (1-10) ou null si non reconnu
 */
export function normalizeTypePret(label: string | null | undefined): number | null {
  if (!label) return null
  
  // Si c'est déjà un nombre
  const numValue = parseInt(String(label), 10)
  if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
    return numValue
  }
  
  const normalized = normalizeString(label)
  
  // Recherche exacte
  if (TYPE_PRET_MAPPINGS[normalized]) {
    return TYPE_PRET_MAPPINGS[normalized]
  }
  
  // Recherche par similarité
  let bestMatch: { code: number; score: number } | null = null
  
  for (const [mappingKey, code] of Object.entries(TYPE_PRET_MAPPINGS)) {
    const score = similarityScore(normalized, mappingKey)
    if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { code, score }
    }
  }
  
  if (bestMatch) {
    console.log(`[ExadeNormalizer] Type prêt "${label}" → Code ${bestMatch.code}`)
    return bestMatch.code
  }
  
  // Par défaut: Amortissable (le plus courant)
  console.warn(`[ExadeNormalizer] Type prêt non reconnu: "${label}" → défaut 1 (Amortissable)`)
  return 1
}

// =============================================================================
// OBJET DU FINANCEMENT (id_objetdufinancement)
// =============================================================================

const OBJET_FINANCEMENT_MAPPINGS: Record<string, number> = {
  // Code 1: Résidence principale
  'residence principale': 1,
  'achat residence principale': 1,
  'acquisition residence principale': 1,
  'rp': 1,
  'habitation principale': 1,
  
  // Code 2: Résidence secondaire
  'residence secondaire': 2,
  'achat residence secondaire': 2,
  'acquisition residence secondaire': 2,
  'rs': 2,
  
  // Code 3: Travaux
  'travaux': 3,
  'pret travaux': 3,
  'renovation': 3,
  'amenagement': 3,
  
  // Code 4: Investissement locatif
  'investissement locatif': 4,
  'locatif': 4,
  'achat locatif': 4,
  'location': 4,
  
  // Code 5: Prêt professionnel
  'professionnel': 5,
  'pret professionnel': 5,
  'credit professionnel': 5,
  'entreprise': 5,
  
  // Code 6: Crédit à objet divers
  'divers': 6,
  'objet divers': 6,
  'credit conso': 6,
  'consommation': 6,
  'pret personnel': 6,
  
  // Code 7: Construction
  'construction': 7,
  'construction maison': 7,
  'faire construire': 7,
  'vefa': 7,
  
  // Code 8: Restructuration
  'restructuration': 8,
  'rachat de credit': 8,
  'rachat': 8,
  'regroupement': 8
}

/**
 * Normalise un objet de financement vers un code Exade
 * @param label Libellé textuel de l'objet
 * @returns Code Exade (1-8) ou null si non reconnu
 */
export function normalizeObjetFinancement(label: string | null | undefined): number | null {
  if (!label) return null
  
  // Si c'est déjà un nombre
  const numValue = parseInt(String(label), 10)
  if (!isNaN(numValue) && numValue >= 1 && numValue <= 8) {
    return numValue
  }
  
  const normalized = normalizeString(label)
  
  // Recherche exacte
  if (OBJET_FINANCEMENT_MAPPINGS[normalized]) {
    return OBJET_FINANCEMENT_MAPPINGS[normalized]
  }
  
  // Recherche par similarité
  let bestMatch: { code: number; score: number } | null = null
  
  for (const [mappingKey, code] of Object.entries(OBJET_FINANCEMENT_MAPPINGS)) {
    const score = similarityScore(normalized, mappingKey)
    if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { code, score }
    }
  }
  
  if (bestMatch) {
    console.log(`[ExadeNormalizer] Objet financement "${label}" → Code ${bestMatch.code}`)
    return bestMatch.code
  }
  
  // Par défaut: Résidence principale (le plus courant)
  console.warn(`[ExadeNormalizer] Objet financement non reconnu: "${label}" → défaut 1 (Résidence principale)`)
  return 1
}

// =============================================================================
// TYPE D'ADHÉSION (type_adhesion)
// =============================================================================

/**
 * Normalise un type d'adhésion vers un code Exade
 * @param label Libellé textuel ou numérique
 * @returns Code Exade (0, 3, 4)
 */
export function normalizeTypeAdhesion(label: string | number | null | undefined): number {
  if (label === null || label === undefined) return 0
  
  // Si c'est déjà un nombre valide
  const numValue = typeof label === 'number' ? label : parseInt(String(label), 10)
  if (!isNaN(numValue) && [0, 3, 4].includes(numValue)) {
    return numValue
  }
  
  const normalized = normalizeString(String(label))
  
  if (normalized.includes('nouveau') || normalized.includes('new')) {
    return 0 // Nouveau prêt
  }
  
  if (normalized.includes('resiliation banque') || normalized.includes('substitution banque')) {
    return 3 // Résiliation Banque
  }
  
  if (normalized.includes('resiliation delegation') || normalized.includes('substitution') || normalized.includes('delegation')) {
    return 4 // Résiliation délégation
  }
  
  // Par défaut: Nouveau prêt
  return 0
}

// =============================================================================
// TYPE DE CRÉDIT (type_credit)
// =============================================================================

/**
 * Normalise un type de crédit vers un code Exade
 * @param label Libellé textuel ou numérique
 * @returns Code Exade (0=Immobilier, 1=Non immobilier)
 */
export function normalizeTypeCredit(label: string | number | null | undefined): number {
  if (label === null || label === undefined) return 0
  
  // Si c'est déjà un nombre valide
  const numValue = typeof label === 'number' ? label : parseInt(String(label), 10)
  if (!isNaN(numValue) && [0, 1].includes(numValue)) {
    return numValue
  }
  
  const normalized = normalizeString(String(label))
  
  // Prêts non immobiliers
  const nonImmobilierKeywords = [
    'consommation', 'personnel', 'auto', 'voiture', 'moto',
    'travaux legers', 'equipement', 'mobilier', 'voyage'
  ]
  
  for (const keyword of nonImmobilierKeywords) {
    if (normalized.includes(keyword)) {
      return 1 // Non immobilier
    }
  }
  
  // Par défaut: Immobilier (le plus courant pour l'assurance emprunteur)
  return 0
}

// =============================================================================
// CIVILITÉ
// =============================================================================

/**
 * Normalise une civilité vers le format Exade (M, Mme, Mlle)
 */
export function normalizeCivilite(civilite: string | null | undefined): string {
  if (!civilite) return 'M'
  
  const normalized = normalizeString(civilite)
  
  if (normalized.includes('monsieur') || normalized === 'm' || normalized === 'mr') {
    return 'M'
  }
  
  if (normalized.includes('madame') || normalized === 'mme' || normalized === 'mme.') {
    return 'Mme'
  }
  
  if (normalized.includes('mademoiselle') || normalized === 'mlle') {
    return 'Mlle'
  }
  
  return 'M' // Défaut
}

// =============================================================================
// NORMALISATION COMPLÈTE D'UN OBJET EXTRAIT
// =============================================================================

export interface NormalizedClientData {
  civilite: string
  categorie_professionnelle: number | null
  deplacement_pro: number
  travaux_manuels: number
}

export interface NormalizedPretData {
  type_credit: number
  objet_financement_code: number
  type_pret_code: number
  type_adhesion: number
  type_taux_code: number
}

/**
 * Normalise les données client extraites vers les codes Exade
 */
export function normalizeClientData(extracted: {
  civilite?: string | null
  categorieProfessionnelle?: string | null
  deplacementPro?: string | number | null
  travauxManuels?: string | number | null
}): NormalizedClientData {
  return {
    civilite: normalizeCivilite(extracted.civilite),
    categorie_professionnelle: normalizeCategoryPro(extracted.categorieProfessionnelle),
    deplacement_pro: typeof extracted.deplacementPro === 'number' 
      ? extracted.deplacementPro 
      : (extracted.deplacementPro === '2' ? 2 : 1),
    travaux_manuels: typeof extracted.travauxManuels === 'number'
      ? extracted.travauxManuels
      : parseInt(String(extracted.travauxManuels || '0'), 10) || 0
  }
}

/**
 * Normalise les données prêt extraites vers les codes Exade
 */
export function normalizePretData(extracted: {
  typePret?: string | null
  objetFinancement?: string | null
  typeCredit?: string | number | null
  typeAdhesion?: string | number | null
  typeTaux?: string | number | null
}): NormalizedPretData {
  return {
    type_credit: normalizeTypeCredit(extracted.typeCredit),
    objet_financement_code: normalizeObjetFinancement(extracted.objetFinancement) || 1,
    type_pret_code: normalizeTypePret(extracted.typePret) || 1,
    type_adhesion: normalizeTypeAdhesion(extracted.typeAdhesion),
    type_taux_code: typeof extracted.typeTaux === 'number' && [1, 2].includes(extracted.typeTaux)
      ? extracted.typeTaux
      : 1 // Défaut: Fixe
  }
}





