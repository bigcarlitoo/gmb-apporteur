/**
 * Configuration centralisée pour l'API Exade
 * Documentation : WebService_Exade_ASSUREA_Avec_commissionnement_-_3.8.pdf
 * 
 * IMPORTANT - Il y a deux URLs distinctes selon l'usage :
 * 
 * 1. URL de TARIFICATION (stage-product) : 
 *    - Pour obtenir les prix sans créer de dossier en production
 *    - Les simulations NE SONT PAS visibles sur le dashboard courtier
 *    - À utiliser pour les calculs de prix côté frontend
 * 
 * 2. URL de CRÉATION DE DEVIS (www.exade.fr) :
 *    - Pour créer un devis réel en production
 *    - Les simulations SONT visibles sur le dashboard courtier
 *    - À utiliser uniquement quand le client accepte le devis
 */

// URL de tarification (staging) - Ne crée PAS de simulation sur le dashboard courtier
const TARIFICATION_URL = 'https://stage-product.exade.fr/4DSOAP'

// URL de production - CRÉE une simulation visible sur le dashboard courtier
const PRODUCTION_URL = 'https://www.exade.fr/4DSOAP'

export const EXADE_CONFIG = {
  /** Clé de licence WebService (obligatoire) */
  licenceKey: process.env.EXADE_LICENCE_KEY || '',
  /** Code courtier/partenaire Exade */
  partnerCode: process.env.EXADE_PARTNER_CODE || '815178',
  /** 
   * URL pour la TARIFICATION (obtenir les prix)
   * Par défaut : stage-product (staging) pour ne pas polluer le dashboard
   * Les simulations créées ici ne sont PAS visibles par le courtier
   */
  tarifUrl: process.env.EXADE_TARIF_URL || TARIFICATION_URL,
  /** 
   * URL pour la CRÉATION DE DEVIS en production
   * À utiliser UNIQUEMENT quand le client accepte le devis
   * Les simulations créées ici SONT visibles sur le dashboard courtier
   */
  productionUrl: process.env.EXADE_PRODUCTION_URL || PRODUCTION_URL,
  /** 
   * URL du WebService SOAP (pour rétro-compatibilité)
   * @deprecated Utiliser tarifUrl ou productionUrl selon le contexte
   */
  soapUrl: process.env.EXADE_SOAP_URL || TARIFICATION_URL,
  /** Clé SSO pour authentification automatique (optionnel) */
  ssoKey: process.env.EXADE_SSO_KEY || '',
}

// Log configuration on module load (only in development, sans informations sensibles)
if (process.env.NODE_ENV === 'development') {
  console.log('[EXADE CONFIG] Loaded configuration:', {
    hasLicenceKey: !!EXADE_CONFIG.licenceKey,
    licenceKeyLength: EXADE_CONFIG.licenceKey?.length || 0,
    partnerCode: EXADE_CONFIG.partnerCode,
    tarifUrl: EXADE_CONFIG.tarifUrl,
    productionUrl: EXADE_CONFIG.productionUrl,
    hasSsoKey: !!EXADE_CONFIG.ssoKey,
  })
}

/**
 * Valide que la configuration Exade est complète
 * @throws Error si les variables obligatoires sont manquantes
 */
export function validateExadeConfig(): void {
  if (!EXADE_CONFIG.licenceKey) {
    throw new Error(
      'EXADE_LICENCE_KEY manquante dans les variables d\'environnement. ' +
      'Veuillez configurer EXADE_LICENCE_KEY dans votre fichier .env'
    )
  }
  
  if (!EXADE_CONFIG.partnerCode) {
    throw new Error(
      'EXADE_PARTNER_CODE manquant dans les variables d\'environnement. ' +
      'Veuillez configurer EXADE_PARTNER_CODE dans votre fichier .env'
    )
  }
}

/**
 * Retourne l'URL appropriée selon le contexte
 * @param isProduction - Si true, utilise l'URL de production (création de devis)
 *                       Si false, utilise l'URL de tarification (staging)
 */
export function getExadeUrl(isProduction: boolean = false): string {
  return isProduction ? EXADE_CONFIG.productionUrl : EXADE_CONFIG.tarifUrl
}

