/**
 * 🎨 CONFIGURATION DES BADGES DE STATUT APPORTEUR
 * 
 * Ce module centralise la configuration des badges pour les statuts des apporteurs.
 * Similaire à statut-mapping.ts, mais spécifique aux apporteurs.
 * 
 * @module lib/utils/apporteur-badges
 */

export type ApporteurStatut = 'actif' | 'inactif' | 'en_attente' | 'suspendu' | 'refuse';

interface BadgeConfig {
  color: string;
  text: string;
  icon: string;
}

/**
 * Configuration des badges de statut apporteur
 * Source de vérité unique pour l'affichage des statuts apporteurs
 */
export const APPORTEUR_BADGE_CONFIG: Record<ApporteurStatut, BadgeConfig> = {
  actif: { 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', 
    text: 'Actif', 
    icon: 'ri-check-line' 
  },
  inactif: { 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', 
    text: 'Inactif', 
    icon: 'ri-close-line' 
  },
  en_attente: { 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', 
    text: 'En attente', 
    icon: 'ri-time-line' 
  },
  suspendu: { 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', 
    text: 'Suspendu', 
    icon: 'ri-pause-line' 
  },
  refuse: { 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', 
    text: 'Refusé', 
    icon: 'ri-close-line' 
  }
} as const;

/**
 * Obtient la configuration du badge pour un statut apporteur
 * 
 * @param statut - Statut de l'apporteur
 * @returns Configuration du badge ou null si statut inconnu
 * 
 * @example
 * const config = getApporteurBadgeConfig('actif');
 * // { color: '...', text: 'Actif', icon: 'ri-check-line' }
 */
export function getApporteurBadgeConfig(statut: string): BadgeConfig | null {
  return APPORTEUR_BADGE_CONFIG[statut as ApporteurStatut] || null;
}


