/**
 * 🎯 SOURCE DE VÉRITÉ UNIQUE POUR LES STATUTS DE DOSSIERS
 * 
 * Ce fichier centralise TOUTE la logique de mapping des statuts.
 * À utiliser PARTOUT dans l'application pour garantir la cohérence.
 * 
 * RÈGLES :
 * 1. TOUJOURS sélectionner `statut_canon` dans les requêtes DB
 * 2. TOUJOURS utiliser mapStatutForDisplay() pour l'affichage
 * 3. JAMAIS créer de mapping local ailleurs dans le code
 */

/**
 * Type des statuts canoniques (source DB - ENUM dossier_statut)
 */
export type StatutCanonique = 
  | 'en_attente'
  | 'devis_disponible'
  | 'devis_accepte'
  | 'refuse'
  | 'finalise'
  | 'annule';

/**
 * Type des statuts pour l'affichage UI
 */
export type StatutDisplay = 
  | 'nouveau'
  | 'devis_envoye'
  | 'valide'
  | 'refuse'
  | 'finalise'
  | 'annule';

/**
 * Mapping canonique : DB → UI
 * C'est LA source de vérité pour toute l'application
 */
export const STATUT_CANONIQUE_TO_DISPLAY: Record<StatutCanonique, StatutDisplay> = {
  'en_attente': 'nouveau',
  'devis_disponible': 'devis_envoye',
  'devis_accepte': 'valide',
  'refuse': 'refuse',
  'finalise': 'finalise',
  'annule': 'annule',
} as const;

/**
 * 🎯 FONCTION PRINCIPALE DE MAPPING
 * À utiliser PARTOUT pour convertir un statut canonique en statut d'affichage
 * 
 * @param statutCanonique - Valeur de `statut_canon` depuis la DB
 * @returns Statut formaté pour l'affichage
 * 
 * @example
 * ```typescript
 * const displayStatut = mapStatutForDisplay(dossier.statut_canon);
 * // 'en_attente' → 'nouveau'
 * // 'devis_accepte' → 'valide'
 * ```
 */
export function mapStatutForDisplay(statutCanonique: string): StatutDisplay {
  return STATUT_CANONIQUE_TO_DISPLAY[statutCanonique as StatutCanonique] || 'nouveau';
}

/**
 * 🔧 NORMALISATION DES VALEURS LEGACY (avec accents)
 * 
 * Certaines valeurs dans la DB legacy contiennent des accents français.
 * Cette fonction les normalise vers les valeurs canoniques.
 * 
 * ⚠️ À utiliser UNIQUEMENT si vous DEVEZ lire le champ 'statut' (legacy)
 * Dans 99% des cas, utilisez 'statut_canon' directement !
 * 
 * @param statutLegacy - Valeur du champ 'statut' (legacy, peut contenir accents)
 * @returns Valeur normalisée sans accent
 */
export function normalizeLegacyStatut(statutLegacy: string): StatutCanonique {
  const normalizeMap: Record<string, StatutCanonique> = {
    // Valeurs avec accents (legacy)
    'finalisé': 'finalise',
    'refusé': 'refuse',
    'annulé': 'annule',
    // Valeurs canoniques (passthrough)
    'en_attente': 'en_attente',
    'devis_envoye': 'devis_disponible', // Mapping historique
    'devis_accepte': 'devis_accepte',
    'devis_disponible': 'devis_disponible',
    'finalise': 'finalise',
    'refuse': 'refuse',
    'annule': 'annule',
  };
  
  return normalizeMap[statutLegacy] || 'en_attente';
}

/**
 * 🎨 CONFIGURATION DES BADGES UI
 * Centralise les couleurs et icônes pour chaque statut
 */
export const STATUT_BADGE_CONFIG = {
  nouveau: { 
    color: 'bg-[#335FAD]/10 text-[#335FAD] dark:bg-[#335FAD]/30 dark:text-[#335FAD]', 
    text: 'Nouveau', 
    icon: 'ri-file-add-line' 
  },
  devis_envoye: { 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', 
    text: 'Devis envoyé', 
    icon: 'ri-send-plane-line' 
  },
  valide: { 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', 
    text: 'Validé', 
    icon: 'ri-check-line' 
  },
  refuse: { 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', 
    text: 'Refusé', 
    icon: 'ri-close-line' 
  },
  finalise: { 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', 
    text: 'Finalisé', 
    icon: 'ri-checkbox-circle-line' 
  },
  annule: { 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', 
    text: 'Annulé', 
    icon: 'ri-close-circle-line' 
  },
} as const;

/**
 * 🏷️ Génère un badge JSX pour un statut
 * 
 * @param statutCanonique - Statut canonique depuis la DB
 * @returns Configuration du badge (color, text, icon)
 */
export function getStatutBadgeConfig(statutCanonique: string) {
  const displayStatut = mapStatutForDisplay(statutCanonique);
  return STATUT_BADGE_CONFIG[displayStatut];
}

/**
 * ✅ VALIDATION : Vérifie si un statut est "validé" (pour calculs stats)
 * Un dossier est considéré validé s'il est finalisé OU accepté
 */
export function isStatutValide(statutCanonique: string): boolean {
  return ['finalise', 'devis_accepte'].includes(statutCanonique);
}

/**
 * ✅ VALIDATION : Vérifie si un dossier est finalisé
 */
export function isStatutFinalise(statutCanonique: string): boolean {
  return statutCanonique === 'finalise';
}

/**
 * ✅ VALIDATION : Vérifie si un dossier est dans un état final (pas de retour possible)
 */
export function isStatutFinal(statutCanonique: string): boolean {
  return ['finalise', 'annule'].includes(statutCanonique);
}

/**
 * ✅ VALIDATION : Vérifie si un dossier peut être annulé
 * Un dossier peut être annulé s'il est en devis_accepte ou refuse
 */
export function canBeAnnule(statutCanonique: string): boolean {
  return ['devis_accepte', 'refuse'].includes(statutCanonique);
}


