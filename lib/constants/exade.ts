/**
 * Constantes et utilitaires pour l'API Exade
 * Documentation : WebService_Exade_ASSUREA_Avec_commissionnement_-_3.8-1
 */

// Catégories professionnelles Exade (page 16 de la documentation)
export const EXADE_CATEGORIES = {
  1: 'Salarié cadre',
  2: 'Salarié non cadre',
  3: 'Profession libérale',
  4: 'Chirurgien',
  5: 'Chirurgien-dentiste',
  6: 'Médecin spécialiste',
  7: 'Vétérinaire',
  8: 'Artisan',
  9: 'Commerçant',
  10: 'Retraité, pré-retraité',
  11: 'Sans activité professionnelle'
} as const;

export type ExadeCategoryCode = keyof typeof EXADE_CATEGORIES;

// Civilité Exade : M, Mme, Mlle (Alphanumérique selon exemple XML Part 2)
export const EXADE_CIVILITE = {
  'M': 'M',
  'Mme': 'Mme',
  'Mlle': 'Mlle'
} as const;

// Sexe Exade : H, F
export const EXADE_SEXE = {
  'H': 'H',
  'F': 'F'
} as const;

// Type de prêt (Part 3B)
export const EXADE_TYPE_PRET = {
  1: 'Amortissable',
  2: 'In fine',
  3: 'Relais',
  4: 'Crédit-bail',
  5: 'LOA',
  6: 'Taux 0%',
  7: 'Palier',
  8: 'Prêt d’honneur',
  9: 'Restructuration',
  10: 'Amortissable professionnel'
} as const;

// Objet du financement (Part 3D)
export const EXADE_OBJET_FINANCEMENT = {
  1: 'Résidence principale',
  2: 'Résidence secondaire',
  3: 'Travaux',
  4: 'Investissement locatif',
  5: 'Crédit professionnel',
  6: 'Autre projet',
  7: 'Construction',
  8: 'Restructuration'
} as const;

// Garanties (Part 3C)
export const EXADE_GARANTIES = {
  1: 'Décès / PTIA',
  2: 'Décès / PTIA / ITT / IPT',
  3: 'Décès / PTIA / ITT / IPT / ITP / IPP',
  4: 'Décès / PTIA / ITT / IPT (rachat dos/psy)',
  5: 'Décès / PTIA / ITT / IPT / ITP / IPP (rachat dos/psy)',
  6: 'Décès / PTIA / ITT / IPT / PE',
  7: 'Décès / PTIA / ITT / IPT / ITP / IPP / PE',
  8: 'Décès / PTIA / ITT / IPT (rachat) / PE',
  9: 'Décès / PTIA / ITT / IPT / ITP / IPP (rachat) / PE',
  10: 'Décès / PTIA / IPPRO (SwissLife)',
  11: 'Décès / PTIA / IPT',
  12: 'Décès / PTIA / IPT / IPP',
  13: 'Décès / PTIA / IPT / IPP (rachat)'
} as const;

// Type d'adhésion (Part 3A)
export const EXADE_TYPE_ADHESION = {
  0: 'Nouveau prêt',
  3: 'Résiliation Banque',
  4: 'Résiliation délégation'
} as const;

// Fractionnement de l'assurance (Part 3 - frac_assurance)
// Détermine comment sont payées les primes d'assurance
export const EXADE_FRAC_ASSURANCE = {
  1: 'Annuel',
  2: 'Semestriel',
  4: 'Trimestriel',
  12: 'Mensuel',
  10: 'Prime unique'
} as const;

export type ExadeFracAssurance = keyof typeof EXADE_FRAC_ASSURANCE;

// Options pour le fractionnement dans les formulaires
export const FRAC_ASSURANCE_OPTIONS = [
  { value: 12, label: 'Mensuel', description: 'Paiement mensuel de l\'assurance (plus courant)' },
  { value: 10, label: 'Prime unique', description: 'Paiement en une seule fois (capital plus important mais pas de mensualité)' },
] as const;

/**
 * Codes de commissionnement Exade (Section III.7 de la documentation)
 * Format : {code}T{palier} ex: "1T4" = Tarif GENERALI, Palier 4
 * 
 * Les taux sont triés par ordre croissant : T1 < T2 < T3 < T4
 * Plus le palier est élevé, plus la commission Exade est élevée
 */
export const EXADE_COMMISSION_CODES = {
  // ============================================================================
  // 1 - GENERALI ASSUREA PRET 7301 CI
  // ============================================================================
  '1T1': { label: 'GENERALI CI - Palier 1 (0%)', tarif: 'GENERALI 7301 CI', taux: '0% linéaire' },
  '1T2': { label: 'GENERALI CI - Palier 2 (5%)', tarif: 'GENERALI 7301 CI', taux: '5% linéaire' },
  '1T3': { label: 'GENERALI CI - Palier 3 (10%)', tarif: 'GENERALI 7301 CI', taux: '10% linéaire' },
  '1T4': { label: 'GENERALI CI - Palier 4 (30%/10%)', tarif: 'GENERALI 7301 CI', taux: '30%/10%', default: true },
  '1T4bis': { label: 'GENERALI CI - Palier 4bis (55%/20%)', tarif: 'GENERALI 7301 CI', taux: '55%/20%' },
  '1T5': { label: 'GENERALI CI - Palier 5 (15%)', tarif: 'GENERALI 7301 CI', taux: '15% linéaire' },
  '1T6': { label: 'GENERALI CI - Palier 6 (20%)', tarif: 'GENERALI 7301 CI', taux: '20% linéaire' },
  '1T7': { label: 'GENERALI CI - Palier 7 (25%)', tarif: 'GENERALI 7301 CI', taux: '25% linéaire' },
  '1T8': { label: 'GENERALI CI - Palier 8 (30%)', tarif: 'GENERALI 7301 CI', taux: '30% linéaire' },
  '1T9': { label: 'GENERALI CI - Palier 9 (35%)', tarif: 'GENERALI 7301 CI', taux: '35% linéaire' },
  '1T10': { label: 'GENERALI CI - Palier 10 (40%)', tarif: 'GENERALI 7301 CI', taux: '40% linéaire' },
  '1PU1': { label: 'GENERALI CI - Prime unique 1 (10%)', tarif: 'GENERALI 7301 CI', taux: '10% linéaire', primeUnique: true },
  '1PU2': { label: 'GENERALI CI - Prime unique 2 (20%)', tarif: 'GENERALI 7301 CI', taux: '20% linéaire', primeUnique: true },

  // ============================================================================
  // 2 - ASSUREA PREMIUM L1047 (SwissLife)
  // ============================================================================
  '2T1': { label: 'SWISSLIFE - Palier 1 (30%/5%)', tarif: 'SWISSLIFE L1047', taux: '30%/5%' },
  '2T2': { label: 'SWISSLIFE - Palier 2 (40%/10%)', tarif: 'SWISSLIFE L1047', taux: '40%/10%', default: true },
  '2T3': { label: 'SWISSLIFE - Palier 3 (40%/15%)', tarif: 'SWISSLIFE L1047', taux: '40%/15%' },
  '2T4': { label: 'SWISSLIFE - Palier 4 (18% linéaire)', tarif: 'SWISSLIFE L1047', taux: '18% linéaire' },
  '2T5': { label: 'SWISSLIFE - Palier 5 (40%/30%)', tarif: 'SWISSLIFE L1047', taux: '40%/30%' },
  '2T6': { label: 'SWISSLIFE - Palier 6 (40% linéaire)', tarif: 'SWISSLIFE L1047', taux: '40% linéaire' },
  '2PR1': { label: 'SWISSLIFE - Prêt relais 1 (5%)', tarif: 'SWISSLIFE L1047', taux: '5% linéaire', pretRelais: true },
  '2PR2': { label: 'SWISSLIFE - Prêt relais 2 (10%)', tarif: 'SWISSLIFE L1047', taux: '10% linéaire', pretRelais: true },
  '2PR3': { label: 'SWISSLIFE - Prêt relais 3 (15%)', tarif: 'SWISSLIFE L1047', taux: '15% linéaire', pretRelais: true },
  '2PU1': { label: 'SWISSLIFE - Prime unique 1 (5%)', tarif: 'SWISSLIFE L1047', taux: '5%', primeUnique: true },
  '2PU2': { label: 'SWISSLIFE - Prime unique 2 (10%)', tarif: 'SWISSLIFE L1047', taux: '10%', primeUnique: true },
  '2PU3': { label: 'SWISSLIFE - Prime unique 3 (15%)', tarif: 'SWISSLIFE L1047', taux: '15%', primeUnique: true },

  // ============================================================================
  // 3 - MNCAP ASSUREA ALTERNATIVE 1350
  // ============================================================================
  '3T1': { label: 'MNCAP - Palier 1 (0%)', tarif: 'MNCAP ALTERNATIVE', taux: '0% linéaire' },
  '3T2': { label: 'MNCAP - Palier 2 (5%)', tarif: 'MNCAP ALTERNATIVE', taux: '5% linéaire' },
  '3T3': { label: 'MNCAP - Palier 3 (10%)', tarif: 'MNCAP ALTERNATIVE', taux: '10% linéaire' },
  '3T4': { label: 'MNCAP - Palier 4 (40%/10%)', tarif: 'MNCAP ALTERNATIVE', taux: '40%/10%', default: true },
  '3T5': { label: 'MNCAP - Palier 5 (15%)', tarif: 'MNCAP ALTERNATIVE', taux: '15% linéaire' },
  '3T6': { label: 'MNCAP - Palier 6 (20%)', tarif: 'MNCAP ALTERNATIVE', taux: '20% linéaire' },
  '3T7': { label: 'MNCAP - Palier 7 (25%)', tarif: 'MNCAP ALTERNATIVE', taux: '25% linéaire' },
  '3T8': { label: 'MNCAP - Palier 8 (30%)', tarif: 'MNCAP ALTERNATIVE', taux: '30% linéaire' },
  '3T9': { label: 'MNCAP - Palier 9 (35%)', tarif: 'MNCAP ALTERNATIVE', taux: '35% linéaire' },
  '3T10': { label: 'MNCAP - Palier 10 (40%)', tarif: 'MNCAP ALTERNATIVE', taux: '40% linéaire' },

  // ============================================================================
  // 4 - CNP ASSUREA CREDIT +
  // ============================================================================
  '4T1': { label: 'CNP - Palier 1 (0%)', tarif: 'CNP CREDIT +', taux: '0% linéaire' },
  '4T2': { label: 'CNP - Palier 2 (5%)', tarif: 'CNP CREDIT +', taux: '5% linéaire' },
  '4T3': { label: 'CNP - Palier 3 (10%)', tarif: 'CNP CREDIT +', taux: '10% linéaire' },
  '4T4': { label: 'CNP - Palier 4 (30%/10%)', tarif: 'CNP CREDIT +', taux: '30%/10%', default: true },
  '4T5': { label: 'CNP - Palier 5 (15%)', tarif: 'CNP CREDIT +', taux: '15% linéaire' },
  '4T6': { label: 'CNP - Palier 6 (20%)', tarif: 'CNP CREDIT +', taux: '20% linéaire' },
  '4T7': { label: 'CNP - Palier 7 (25%)', tarif: 'CNP CREDIT +', taux: '25% linéaire' },
  '4T8': { label: 'CNP - Palier 8 (30%)', tarif: 'CNP CREDIT +', taux: '30% linéaire' },
  '4T9': { label: 'CNP - Palier 9 (35%)', tarif: 'CNP CREDIT +', taux: '35% linéaire' },
  '4T10': { label: 'CNP - Palier 10 (40%)', tarif: 'CNP CREDIT +', taux: '40% linéaire' },
  '4PR1': { label: 'CNP - Prêt relais', tarif: 'CNP CREDIT +', taux: 'Taux relais', pretRelais: true },

  // ============================================================================
  // 5 - ASSUREA DIGITAL 4044 CRD
  // ============================================================================
  '5T1': { label: 'DIGITAL CRD - Palier 1 (0%)', tarif: 'ASSUREA DIGITAL CRD', taux: '0% linéaire' },
  '5T2': { label: 'DIGITAL CRD - Palier 2 (5%)', tarif: 'ASSUREA DIGITAL CRD', taux: '5% linéaire' },
  '5T3': { label: 'DIGITAL CRD - Palier 3 (10%)', tarif: 'ASSUREA DIGITAL CRD', taux: '10% linéaire' },
  '5T4': { label: 'DIGITAL CRD - Palier 4 (40%/10%)', tarif: 'ASSUREA DIGITAL CRD', taux: '40%/10%', default: true },
  '5T5': { label: 'DIGITAL CRD - Palier 5 (15%)', tarif: 'ASSUREA DIGITAL CRD', taux: '15% linéaire' },
  '5T6': { label: 'DIGITAL CRD - Palier 6 (20%)', tarif: 'ASSUREA DIGITAL CRD', taux: '20% linéaire' },
  '5T7': { label: 'DIGITAL CRD - Palier 7 (25%)', tarif: 'ASSUREA DIGITAL CRD', taux: '25% linéaire' },
  '5T8': { label: 'DIGITAL CRD - Palier 8 (30%)', tarif: 'ASSUREA DIGITAL CRD', taux: '30% linéaire' },
  '5T9': { label: 'DIGITAL CRD - Palier 9 (35%)', tarif: 'ASSUREA DIGITAL CRD', taux: '35% linéaire' },
  '5T10': { label: 'DIGITAL CRD - Palier 10 (40%)', tarif: 'ASSUREA DIGITAL CRD', taux: '40% linéaire' },

  // ============================================================================
  // 6 - ASSUREA DIGITAL 4044 CI
  // ============================================================================
  '6T1': { label: 'DIGITAL CI - Palier 1 (0%)', tarif: 'ASSUREA DIGITAL CI', taux: '0% linéaire' },
  '6T2': { label: 'DIGITAL CI - Palier 2 (5%)', tarif: 'ASSUREA DIGITAL CI', taux: '5% linéaire' },
  '6T3': { label: 'DIGITAL CI - Palier 3 (10%)', tarif: 'ASSUREA DIGITAL CI', taux: '10% linéaire' },
  '6T4': { label: 'DIGITAL CI - Palier 4 (40%/10%)', tarif: 'ASSUREA DIGITAL CI', taux: '40%/10%', default: true },
  '6T5': { label: 'DIGITAL CI - Palier 5 (15%)', tarif: 'ASSUREA DIGITAL CI', taux: '15% linéaire' },
  '6T6': { label: 'DIGITAL CI - Palier 6 (20%)', tarif: 'ASSUREA DIGITAL CI', taux: '20% linéaire' },
  '6T7': { label: 'DIGITAL CI - Palier 7 (25%)', tarif: 'ASSUREA DIGITAL CI', taux: '25% linéaire' },
  '6T8': { label: 'DIGITAL CI - Palier 8 (30%)', tarif: 'ASSUREA DIGITAL CI', taux: '30% linéaire' },
  '6T9': { label: 'DIGITAL CI - Palier 9 (35%)', tarif: 'ASSUREA DIGITAL CI', taux: '35% linéaire' },
  '6T10': { label: 'DIGITAL CI - Palier 10 (40%)', tarif: 'ASSUREA DIGITAL CI', taux: '40% linéaire' },

  // ============================================================================
  // 7 - ASSUREA PROTECTION +
  // ============================================================================
  '7T1': { label: 'PROTECTION+ - Palier 1 (0%)', tarif: 'ASSUREA PROTECTION+', taux: '0% linéaire' },
  '7T2': { label: 'PROTECTION+ - Palier 2 (5%)', tarif: 'ASSUREA PROTECTION+', taux: '5% linéaire' },
  '7T3': { label: 'PROTECTION+ - Palier 3 (10%)', tarif: 'ASSUREA PROTECTION+', taux: '10% linéaire' },
  '7T4': { label: 'PROTECTION+ - Palier 4 (30%/10%)', tarif: 'ASSUREA PROTECTION+', taux: '30%/10%', default: true },
  '7T5': { label: 'PROTECTION+ - Palier 5 (15%)', tarif: 'ASSUREA PROTECTION+', taux: '15% linéaire' },
  '7T6': { label: 'PROTECTION+ - Palier 6 (20%)', tarif: 'ASSUREA PROTECTION+', taux: '20% linéaire' },
  '7T7': { label: 'PROTECTION+ - Palier 7 (25%)', tarif: 'ASSUREA PROTECTION+', taux: '25% linéaire' },
  '7T8': { label: 'PROTECTION+ - Palier 8 (30%)', tarif: 'ASSUREA PROTECTION+', taux: '30% linéaire' },
  '7T9': { label: 'PROTECTION+ - Palier 9 (35%)', tarif: 'ASSUREA PROTECTION+', taux: '35% linéaire' },
  '7T10': { label: 'PROTECTION+ - Palier 10 (40%)', tarif: 'ASSUREA PROTECTION+', taux: '40% linéaire' },
  '7PR1': { label: 'PROTECTION+ - Prêt relais', tarif: 'ASSUREA PROTECTION+', taux: 'Taux relais', pretRelais: true },

  // ============================================================================
  // 8 - GENERALI ASSUREA PRET 7301 CRD
  // ============================================================================
  '8T1': { label: 'GENERALI CRD - Palier 1 (0%)', tarif: 'GENERALI 7301 CRD', taux: '0% linéaire' },
  '8T2': { label: 'GENERALI CRD - Palier 2 (5%)', tarif: 'GENERALI 7301 CRD', taux: '5% linéaire' },
  '8T3': { label: 'GENERALI CRD - Palier 3 (10%)', tarif: 'GENERALI 7301 CRD', taux: '10% linéaire' },
  '8T4': { label: 'GENERALI CRD - Palier 4 (30%/10%)', tarif: 'GENERALI 7301 CRD', taux: '30%/10%', default: true },
  '8T4bis': { label: 'GENERALI CRD - Palier 4bis (55%/20%)', tarif: 'GENERALI 7301 CRD', taux: '55%/20%' },
  '8T5': { label: 'GENERALI CRD - Palier 5 (15%)', tarif: 'GENERALI 7301 CRD', taux: '15% linéaire' },
  '8T6': { label: 'GENERALI CRD - Palier 6 (20%)', tarif: 'GENERALI 7301 CRD', taux: '20% linéaire' },
  '8T7': { label: 'GENERALI CRD - Palier 7 (25%)', tarif: 'GENERALI 7301 CRD', taux: '25% linéaire' },
  '8T8': { label: 'GENERALI CRD - Palier 8 (30%)', tarif: 'GENERALI 7301 CRD', taux: '30% linéaire' },
  '8T9': { label: 'GENERALI CRD - Palier 9 (35%)', tarif: 'GENERALI 7301 CRD', taux: '35% linéaire' },
  '8T10': { label: 'GENERALI CRD - Palier 10 (40%)', tarif: 'GENERALI 7301 CRD', taux: '40% linéaire' },
  '8PU1': { label: 'GENERALI CRD - Prime unique 1 (10%)', tarif: 'GENERALI 7301 CRD', taux: '10% linéaire', primeUnique: true },
  '8PU2': { label: 'GENERALI CRD - Prime unique 2 (20%)', tarif: 'GENERALI 7301 CRD', taux: '20% linéaire', primeUnique: true },

  // ============================================================================
  // 9 - ASSUREA OPEN EMPRUNTEUR CRD
  // ============================================================================
  '9T1': { label: 'OPEN CRD - Palier 1 (0%)', tarif: 'ASSUREA OPEN CRD', taux: '0% linéaire' },
  '9T2': { label: 'OPEN CRD - Palier 2 (5%)', tarif: 'ASSUREA OPEN CRD', taux: '5% linéaire' },
  '9T3': { label: 'OPEN CRD - Palier 3 (10%)', tarif: 'ASSUREA OPEN CRD', taux: '10% linéaire' },
  '9T4': { label: 'OPEN CRD - Palier 4 (30%/10%)', tarif: 'ASSUREA OPEN CRD', taux: '30%/10%', default: true },
  '9T5': { label: 'OPEN CRD - Palier 5 (15%)', tarif: 'ASSUREA OPEN CRD', taux: '15% linéaire' },
  '9T6': { label: 'OPEN CRD - Palier 6 (20%)', tarif: 'ASSUREA OPEN CRD', taux: '20% linéaire' },
  '9T7': { label: 'OPEN CRD - Palier 7 (25%)', tarif: 'ASSUREA OPEN CRD', taux: '25% linéaire' },
  '9T8': { label: 'OPEN CRD - Palier 8 (30%)', tarif: 'ASSUREA OPEN CRD', taux: '30% linéaire' },

  // ============================================================================
  // 10 - MAIF AVANTAGE EMPRUNTEUR ASSUREA
  // ============================================================================
  '10T1': { label: 'MAIF - Palier 1 (0%)', tarif: 'MAIF AVANTAGE', taux: '0% linéaire' },
  '10T2': { label: 'MAIF - Palier 2 (5%)', tarif: 'MAIF AVANTAGE', taux: '5% linéaire' },
  '10T3': { label: 'MAIF - Palier 3 (10%)', tarif: 'MAIF AVANTAGE', taux: '10% linéaire' },
  '10T4': { label: 'MAIF - Palier 4 (30%/10%)', tarif: 'MAIF AVANTAGE', taux: '30%/10%', default: true },
  '10T5': { label: 'MAIF - Palier 5 (15%)', tarif: 'MAIF AVANTAGE', taux: '15% linéaire' },
  '10T6': { label: 'MAIF - Palier 6 (20%)', tarif: 'MAIF AVANTAGE', taux: '20% linéaire' },
  '10T7': { label: 'MAIF - Palier 7 (25%)', tarif: 'MAIF AVANTAGE', taux: '25% linéaire' },
  '10T8': { label: 'MAIF - Palier 8 (30%)', tarif: 'MAIF AVANTAGE', taux: '30% linéaire' },
  '10T9': { label: 'MAIF - Palier 9 (35%)', tarif: 'MAIF AVANTAGE', taux: '35% linéaire' },
  '10T10': { label: 'MAIF - Palier 10 (40%)', tarif: 'MAIF AVANTAGE', taux: '40% linéaire' },

  // ============================================================================
  // 11 - MALAKOFF HUMANIS EMPRUNTEUR CI
  // ============================================================================
  '11T1': { label: 'HUMANIS - Palier 1 (0%)', tarif: 'MALAKOFF HUMANIS', taux: '0% linéaire' },
  '11T2': { label: 'HUMANIS - Palier 2 (5%)', tarif: 'MALAKOFF HUMANIS', taux: '5% linéaire' },
  '11T3': { label: 'HUMANIS - Palier 3 (10%)', tarif: 'MALAKOFF HUMANIS', taux: '10% linéaire' },
  '11T4': { label: 'HUMANIS - Palier 4 (40%/10%)', tarif: 'MALAKOFF HUMANIS', taux: '40%/10%', default: true },
  '11T5': { label: 'HUMANIS - Palier 5 (15%)', tarif: 'MALAKOFF HUMANIS', taux: '15% linéaire' },
  '11T6': { label: 'HUMANIS - Palier 6 (20%)', tarif: 'MALAKOFF HUMANIS', taux: '20% linéaire' },
  '11T7': { label: 'HUMANIS - Palier 7 (25%)', tarif: 'MALAKOFF HUMANIS', taux: '25% linéaire' },
  '11T8': { label: 'HUMANIS - Palier 8 (30%)', tarif: 'MALAKOFF HUMANIS', taux: '30% linéaire' },
  '11T9': { label: 'HUMANIS - Palier 9 (35%)', tarif: 'MALAKOFF HUMANIS', taux: '35% linéaire' },
  '11T10': { label: 'HUMANIS - Palier 10 (40%)', tarif: 'MALAKOFF HUMANIS', taux: '40% linéaire' },

  // ============================================================================
  // 12 - ASSUREA PERFORMANCE 6092/200164
  // ============================================================================
  '12T1': { label: 'PERFORMANCE - Palier 1 (0%)', tarif: 'ASSUREA PERFORMANCE', taux: '0% linéaire' },
  '12T2': { label: 'PERFORMANCE - Palier 2 (5%)', tarif: 'ASSUREA PERFORMANCE', taux: '5% linéaire' },
  '12T3': { label: 'PERFORMANCE - Palier 3 (10%)', tarif: 'ASSUREA PERFORMANCE', taux: '10% linéaire' },
  '12T4': { label: 'PERFORMANCE - Palier 4 (30%/10%)', tarif: 'ASSUREA PERFORMANCE', taux: '30%/10%', default: true },
  '12T5': { label: 'PERFORMANCE - Palier 5 (15%)', tarif: 'ASSUREA PERFORMANCE', taux: '15% linéaire' },
  '12T6': { label: 'PERFORMANCE - Palier 6 (20%)', tarif: 'ASSUREA PERFORMANCE', taux: '20% linéaire' },
  '12T7': { label: 'PERFORMANCE - Palier 7 (25%)', tarif: 'ASSUREA PERFORMANCE', taux: '25% linéaire' },
  '12T8': { label: 'PERFORMANCE - Palier 8 (30%)', tarif: 'ASSUREA PERFORMANCE', taux: '30% linéaire' },
  '12T9': { label: 'PERFORMANCE - Palier 9 (35%)', tarif: 'ASSUREA PERFORMANCE', taux: '35% linéaire' },
  '12T10': { label: 'PERFORMANCE - Palier 10 (40%)', tarif: 'ASSUREA PERFORMANCE', taux: '40% linéaire' },
} as const;

export type ExadeCommissionCode = keyof typeof EXADE_COMMISSION_CODES;

/**
 * Structure des compagnies avec leurs codes de commission
 * Utilisé pour l'UI avec sélection en deux étapes
 */
export const EXADE_COMPAGNIES = {
  '1': {
    id: '1',
    name: 'GENERALI CI',
    fullName: 'GENERALI ASSUREA PRET 7301 CI',
    codes: ['1T1', '1T2', '1T3', '1T4', '1T4bis', '1T5', '1T6', '1T7', '1T8', '1T9', '1T10'],
    codesSpeciaux: ['1PU1', '1PU2'] // Prime unique
  },
  '2': {
    id: '2',
    name: 'SWISSLIFE',
    fullName: 'ASSUREA PREMIUM L1047 (SwissLife)',
    codes: ['2T1', '2T2', '2T3', '2T4', '2T5', '2T6'],
    codesSpeciaux: ['2PR1', '2PR2', '2PR3', '2PU1', '2PU2', '2PU3'] // Prêt relais + Prime unique
  },
  '3': {
    id: '3',
    name: 'MNCAP',
    fullName: 'MNCAP ASSUREA ALTERNATIVE 1350',
    codes: ['3T1', '3T2', '3T3', '3T4', '3T5', '3T6', '3T7', '3T8', '3T9', '3T10']
  },
  '4': {
    id: '4',
    name: 'CNP',
    fullName: 'CNP ASSUREA CREDIT +',
    codes: ['4T1', '4T2', '4T3', '4T4', '4T5', '4T6', '4T7', '4T8', '4T9', '4T10'],
    codesSpeciaux: ['4PR1'] // Prêt relais
  },
  '5': {
    id: '5',
    name: 'DIGITAL CRD',
    fullName: 'ASSUREA DIGITAL 4044 CRD',
    codes: ['5T1', '5T2', '5T3', '5T4', '5T5', '5T6', '5T7', '5T8', '5T9', '5T10']
  },
  '6': {
    id: '6',
    name: 'DIGITAL CI',
    fullName: 'ASSUREA DIGITAL 4044 CI',
    codes: ['6T1', '6T2', '6T3', '6T4', '6T5', '6T6', '6T7', '6T8', '6T9', '6T10']
  },
  '7': {
    id: '7',
    name: 'PROTECTION+',
    fullName: 'ASSUREA PROTECTION +',
    codes: ['7T1', '7T2', '7T3', '7T4', '7T5', '7T6', '7T7', '7T8', '7T9', '7T10'],
    codesSpeciaux: ['7PR1'] // Prêt relais
  },
  '8': {
    id: '8',
    name: 'GENERALI CRD',
    fullName: 'GENERALI ASSUREA PRET 7301 CRD',
    codes: ['8T1', '8T2', '8T3', '8T4', '8T4bis', '8T5', '8T6', '8T7', '8T8', '8T9', '8T10'],
    codesSpeciaux: ['8PU1', '8PU2'] // Prime unique
  },
  '9': {
    id: '9',
    name: 'OPEN CRD',
    fullName: 'ASSUREA OPEN EMPRUNTEUR CRD',
    codes: ['9T1', '9T2', '9T3', '9T4', '9T5', '9T6', '9T7', '9T8']
  },
  '10': {
    id: '10',
    name: 'MAIF',
    fullName: 'MAIF AVANTAGE EMPRUNTEUR ASSUREA',
    codes: ['10T1', '10T2', '10T3', '10T4', '10T5', '10T6', '10T7', '10T8', '10T9', '10T10']
  },
  '11': {
    id: '11',
    name: 'HUMANIS',
    fullName: 'MALAKOFF HUMANIS EMPRUNTEUR CI',
    codes: ['11T1', '11T2', '11T3', '11T4', '11T5', '11T6', '11T7', '11T8', '11T9', '11T10']
  },
  '12': {
    id: '12',
    name: 'PERFORMANCE',
    fullName: 'ASSUREA PERFORMANCE 6092/200164',
    codes: ['12T1', '12T2', '12T3', '12T4', '12T5', '12T6', '12T7', '12T8', '12T9', '12T10']
  }
} as const;

/**
 * Options pour le select des compagnies
 */
export const COMPAGNIE_OPTIONS = Object.entries(EXADE_COMPAGNIES).map(([id, data]) => ({
  value: id,
  label: data.name,
  fullName: data.fullName,
  codes: data.codes
}));

/**
 * Obtenir l'ID de compagnie à partir du nom de la compagnie
 * @param compagnieName Nom de la compagnie (ex: "MAIF VIE", "GENERALI", "SWISSLIFE")
 * @returns ID de la compagnie (1-12) ou null si non trouvé
 */
export function getCompagnieIdFromName(compagnieName: string): string | null {
  if (!compagnieName) return null;
  
  const normalizedName = compagnieName.toUpperCase().trim();
  
  // Mapping des noms de compagnies retournés par Exade vers les IDs
  const mappings: Record<string, string> = {
    'GENERALI': '1',
    'GENERALI VIE': '1',
    'SWISSLIFE': '2',
    'SWISS LIFE': '2',
    'MNCAP': '3',
    'CNP': '4',
    'CNP ASSURANCES': '4',
    'DIGITAL': '5',
    'ASSUREA DIGITAL': '5',
    'PROTECTION': '7',
    'ASSUREA PROTECTION': '7',
    'MAIF': '10',
    'MAIF VIE': '10',
    'HUMANIS': '11',
    'MALAKOFF': '11',
    'MALAKOFF HUMANIS': '11',
    'PERFORMANCE': '12',
    'GAN': '12',
  };
  
  // Chercher une correspondance exacte d'abord
  for (const [key, id] of Object.entries(mappings)) {
    if (normalizedName === key || normalizedName.includes(key)) {
      return id;
    }
  }
  
  // Chercher dans les noms des compagnies définies
  for (const [id, data] of Object.entries(EXADE_COMPAGNIES)) {
    if (normalizedName.includes(data.name.toUpperCase())) {
      return id;
    }
  }
  
  return null;
}

/**
 * Obtenir les codes de commission pour une compagnie
 * @param compagnieId ID de la compagnie (1-12)
 * @param includeSpecialCodes Inclure les codes spéciaux (prêt relais, prime unique)
 */
export function getCommissionCodesForCompagnie(compagnieId: string, includeSpecialCodes: boolean = false) {
  const compagnie = EXADE_COMPAGNIES[compagnieId as keyof typeof EXADE_COMPAGNIES];
  if (!compagnie) return [];
  
  // Codes standards
  const allCodes = [...compagnie.codes];
  
  // Ajouter codes spéciaux si demandé
  if (includeSpecialCodes && 'codesSpeciaux' in compagnie) {
    allCodes.push(...(compagnie as any).codesSpeciaux);
  }
  
  return allCodes.map(code => {
    const codeData = EXADE_COMMISSION_CODES[code as ExadeCommissionCode];
    if (!codeData) return null;
    return {
      value: code,
      label: codeData.taux,
      fullLabel: codeData.label,
      isDefault: 'default' in codeData && (codeData as any).default,
      isPrimeUnique: 'primeUnique' in codeData,
      isPretRelais: 'pretRelais' in codeData
    };
  }).filter(Boolean) as Array<{
    value: string;
    label: string;
    fullLabel: string;
    isDefault: boolean;
    isPrimeUnique: boolean;
    isPretRelais: boolean;
  }>;
}

/**
 * Obtenir la compagnie à partir d'un code de commission
 */
export function getCompagnieFromCode(code: string): string | null {
  if (!code) return null;
  const prefix = code.split('T')[0];
  return EXADE_COMPAGNIES[prefix as keyof typeof EXADE_COMPAGNIES]?.id || null;
}

/**
 * Options pour le select des codes de commissionnement (LEGACY - pour compatibilité)
 */
export const COMMISSION_CODE_OPTIONS = Object.entries(EXADE_COMMISSION_CODES).map(([code, data]) => ({
  value: code,
  label: data.label,
  tarif: data.tarif,
  isDefault: 'default' in data && data.default
}));

/**
 * Obtenir le libellé d'une catégorie professionnelle
 */
export function getCategoryLabel(code: number | null | undefined): string {
  if (!code) return 'Non renseignée';
  return EXADE_CATEGORIES[code as ExadeCategoryCode] || 'Non renseignée';
}

/**
 * Formatter une date pour l'API Exade (AAAAMMJJ)
 */
export function formatDateForExade(dateString: string): string {
  if (!dateString) return '';
  const cleaned = dateString.replace(/\D/g, '');
  if (cleaned.length === 8) return cleaned;
  if (dateString.includes('-')) return dateString.replace(/-/g, '');
  return cleaned;
}

/**
 * Formatter le statut fumeur pour l'API Exade (O/N)
 */
export function formatFumeurForExade(fumeur: boolean): 'O' | 'N' {
  return fumeur ? 'O' : 'N';
}

/**
 * Obtenir le code civilité pour l'API Exade
 */
export function getCiviliteCodeExade(civilite: string | null | undefined): string {
  if (!civilite) return 'M'; // Par défaut
  // Normalisation
  if (civilite === 'Monsieur' || civilite === 'M.') return 'M';
  if (civilite === 'Madame' || civilite === 'Mme') return 'Mme';
  if (civilite === 'Mademoiselle' || civilite === 'Mlle') return 'Mlle';
  return (EXADE_CIVILITE as any)[civilite] || 'M';
}

/**
 * Options pour les selects de catégories professionnelles
 */
export const CATEGORY_OPTIONS = Object.entries(EXADE_CATEGORIES).map(([value, label]) => ({
  value,
  label
}));

/**
 * Options pour les selects de types de prêt
 */
export const TYPE_PRET_OPTIONS = Object.entries(EXADE_TYPE_PRET).map(([value, label]) => ({
  value,
  label
}));

/**
 * Obtenir le libellé d'un type de prêt
 */
export function getTypePretLabel(code: number | null | undefined): string {
  if (!code) return 'Non renseigné';
  return EXADE_TYPE_PRET[code as keyof typeof EXADE_TYPE_PRET] || 'Non renseigné';
}

/**
 * Options pour les selects d'objets de financement
 */
export const OBJET_FINANCEMENT_OPTIONS = Object.entries(EXADE_OBJET_FINANCEMENT).map(([value, label]) => ({
  value,
  label
}));

/**
 * Obtenir le libellé d'un objet de financement
 */
export function getObjetFinancementLabel(code: number | null | undefined): string {
  if (!code) return 'Non renseigné';
  return EXADE_OBJET_FINANCEMENT[code as keyof typeof EXADE_OBJET_FINANCEMENT] || 'Non renseigné';
}

/**
 * Options pour les selects de types d'adhésion
 */
export const TYPE_ADHESION_OPTIONS = Object.entries(EXADE_TYPE_ADHESION).map(([value, label]) => ({
  value,
  label
}));

/**
 * Obtenir le libellé d'un type d'adhésion
 */
export function getTypeAdhesionLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) return 'Nouveau prêt';
  return EXADE_TYPE_ADHESION[code as keyof typeof EXADE_TYPE_ADHESION] || 'Nouveau prêt';
}

/**
 * Options pour les selects de garanties
 */
export const GARANTIE_OPTIONS = Object.entries(EXADE_GARANTIES).map(([value, label]) => ({
  value,
  label
}));

/**
 * Obtenir le libellé d'une garantie
 */
export function getGarantieLabel(code: number | null | undefined): string {
  if (!code) return 'Non renseignée';
  return EXADE_GARANTIES[code as keyof typeof EXADE_GARANTIES] || 'Non renseignée';
}

