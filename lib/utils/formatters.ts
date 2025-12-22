/**
 * 🎨 UTILITAIRES DE FORMATAGE CENTRALISÉS
 * 
 * Ce module centralise toutes les fonctions de formatage utilisées dans l'application.
 * Objectif : Cohérence totale de l'affichage et maintenance simplifiée.
 * 
 * @module lib/utils/formatters
 */

/**
 * Formate une date en français
 * 
 * @param dateString - Date ISO (YYYY-MM-DD) ou string de date valide
 * @param includeTime - Si true, inclut l'heure et les minutes (défaut: false)
 * @returns Date formatée en français (JJ/MM/AAAA ou JJ/MM/AAAA HH:MM)
 * 
 * @example
 * formatDate('2024-01-15') // "15/01/2024"
 * formatDate('2024-01-15T14:30:00', true) // "15/01/2024 14:30"
 */
export function formatDate(dateString: string, includeTime = false): string {
  if (!dateString) return '-';
  
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  } catch (error) {
    console.warn('[formatDate] Invalid date:', dateString);
    return '-';
  }
}

/**
 * Formate un montant en euros
 * 
 * @param amount - Montant numérique
 * @param options - Options de formatage
 * @param options.compact - Si true, utilise k€ et M€ pour les grands montants (défaut: false)
 * @param options.decimals - Nombre de décimales (défaut: 2)
 * @returns Montant formaté en euros
 * 
 * @example
 * formatCurrency(1234.56) // "1 234,56 €"
 * formatCurrency(1234.56, { decimals: 0 }) // "1 235 €"
 * formatCurrency(1500000, { compact: true }) // "1.5M€"
 * formatCurrency(2500, { compact: true }) // "2k€"
 */
export function formatCurrency(
  amount: number,
  options?: {
    compact?: boolean;
    decimals?: number;
  }
): string {
  if (amount === null || amount === undefined) return '-';
  
  const { compact = false, decimals = 2 } = options || {};
  
  // Mode compact (k€, M€)
  if (compact) {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M€`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}k€`;
    }
    return `${amount}€`;
  }
  
  // Mode standard avec Intl.NumberFormat
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Formate un nombre avec séparateurs de milliers
 * 
 * @param number - Nombre à formater
 * @returns Nombre formaté avec espaces comme séparateurs de milliers
 * 
 * @example
 * formatNumber(1234567) // "1 234 567"
 */
export function formatNumber(number: number): string {
  if (number === null || number === undefined) return '-';
  return new Intl.NumberFormat('fr-FR').format(number);
}

/**
 * Formate un pourcentage
 * 
 * @param percentage - Pourcentage à formater
 * @param decimals - Nombre de décimales (défaut: 1)
 * @returns Pourcentage formaté
 * 
 * @example
 * formatPercentage(12.3456) // "12.3%"
 * formatPercentage(12.3456, 2) // "12.35%"
 */
export function formatPercentage(percentage: number, decimals = 1): string {
  if (percentage === null || percentage === undefined) return '-';
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Calcule et retourne la couleur appropriée selon l'âge d'un dossier
 * 
 * @param days - Nombre de jours depuis la création
 * @returns Classe Tailwind pour la couleur du texte
 * 
 * @example
 * getAgeColor(2) // "text-green-600 dark:text-green-400"
 * getAgeColor(5) // "text-orange-600 dark:text-orange-400"
 * getAgeColor(10) // "text-red-600 dark:text-red-400"
 */
export function getAgeColor(days: number): string {
  if (days <= 3) return 'text-green-600 dark:text-green-400';
  if (days <= 7) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}


