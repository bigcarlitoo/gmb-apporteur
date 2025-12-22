/**
 * 🎨 CONFIGURATION DES TYPES D'ACTIVITÉS
 * 
 * Ce module centralise la configuration des activités pour l'affichage dans l'application.
 * Chaque type d'activité a son icône, couleur et label associé.
 * 
 * @module lib/utils/activity-config
 */

/**
 * Types d'activités reconnus dans l'application
 * Basé sur les types trackés dans la table `activities`
 */
export type ActivityType = 
  | 'dossier_created'      // Création d'un nouveau dossier
  | 'devis_envoye'         // Envoi d'un devis
  | 'devis_accepte'        // Acceptation d'un devis
  | 'devis_refuse'         // Refus d'un devis
  | 'dossier_finalise'     // Finalisation d'un dossier
  | 'dossier_supprime'     // Suppression d'un dossier
  | 'dossier_attribue'     // Attribution d'un dossier à un apporteur
  | 'classement_updated'   // Mise à jour du classement
  | 'nouveau_dossier'      // Legacy: ancien type pour dossier créé
  | 'validation_devis'     // Legacy: ancien type pour devis accepté
  | 'refus_devis'          // Legacy: ancien type pour devis refusé
  | 'finalisation'         // Legacy: ancien type pour finalisation
  | 'nouveau_apporteur'    // Nouveau apporteur enregistré
  | 'modification_dossier';// Modification d'un dossier

interface ActivityConfig {
  icon: string;
  color: string;
  bgColor: string;
  label: string;
}

/**
 * Configuration centralisée des types d'activités
 * Source de vérité unique pour l'affichage des activités
 */
export const ACTIVITY_CONFIG: Partial<Record<ActivityType, ActivityConfig>> = {
  // =========================================
  // ACTIVITÉS PRINCIPALES (standard)
  // =========================================
  dossier_created: {
    icon: 'ri-file-add-line',
    color: 'text-[#335FAD] dark:text-[#335FAD]',
    bgColor: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30',
    label: 'Nouveau dossier'
  },
  devis_envoye: {
    icon: 'ri-send-plane-line',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Devis envoyé'
  },
  devis_accepte: {
    icon: 'ri-check-double-line',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'Devis validé'
  },
  devis_refuse: {
    icon: 'ri-close-circle-line',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Devis refusé'
  },
  dossier_finalise: {
    icon: 'ri-award-line',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Dossier finalisé'
  },
  dossier_supprime: {
    icon: 'ri-delete-bin-line',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Dossier supprimé'
  },
  dossier_attribue: {
    icon: 'ri-user-add-line',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Dossier attribué'
  },
  classement_updated: {
    icon: 'ri-trophy-line',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Classement mis à jour'
  },
  
  // =========================================
  // ACTIVITÉS LEGACY (compatibilité arrière)
  // =========================================
  nouveau_dossier: {
    icon: 'ri-file-add-line',
    color: 'text-[#335FAD] dark:text-[#335FAD]',
    bgColor: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30',
    label: 'Nouveau dossier'
  },
  validation_devis: {
    icon: 'ri-check-double-line',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'Devis validé'
  },
  refus_devis: {
    icon: 'ri-close-circle-line',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Devis refusé'
  },
  finalisation: {
    icon: 'ri-award-line',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Dossier finalisé'
  },
  nouveau_apporteur: {
    icon: 'ri-user-add-line',
    color: 'text-[#335FAD] dark:text-[#335FAD]',
    bgColor: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30',
    label: 'Nouvel apporteur'
  },
  modification_dossier: {
    icon: 'ri-edit-line',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Dossier modifié'
  }
} as const;

/**
 * Configuration par défaut pour les activités inconnues
 */
const DEFAULT_ACTIVITY_CONFIG: ActivityConfig = {
  icon: 'ri-information-line',
  color: 'text-gray-600 dark:text-gray-400',
  bgColor: 'bg-gray-100 dark:bg-gray-700',
  label: 'Activité'
};

/**
 * Obtient la configuration d'un type d'activité
 * 
 * @param type - Type d'activité
 * @returns Configuration de l'activité ou configuration par défaut si inconnu
 * 
 * @example
 * const config = getActivityConfig('dossier_created');
 * // { icon: '...', color: '...', bgColor: '...', label: 'Nouveau dossier' }
 */
export function getActivityConfig(type: string): ActivityConfig {
  return ACTIVITY_CONFIG[type as ActivityType] || DEFAULT_ACTIVITY_CONFIG;
}


