/**
 * Service d'optimisation des commissions
 * 
 * Ce service analyse les tarifs Exade et propose des recommandations
 * de codes de commission optimisés pour maximiser les gains courtier
 * tout en garantissant des économies au client.
 */

import { getExadeTarifs, ExadeTarif, ExadeCommissionOptions } from './exade'
import { EXADE_COMMISSION_CODES } from '@/lib/constants/exade'

// ============================================================================
// TYPES
// ============================================================================

export interface CommissionVariante {
  code: string
  label: string
  cout_client_total: number // en euros
  economie_client: number // en euros (peut être négatif si surcoût)
  economie_client_pct: number // en pourcentage
  commission_courtier_estimee: number // en euros (approximation)
  recommendation: 'economique' | 'recommande' | 'premium'
}

export interface TarifAnalysis {
  id_tarif: string
  compagnie: string
  nom: string
  cout_default: number // coût avec commission par défaut
  variantes: CommissionVariante[]
  best_for_client: CommissionVariante | null // meilleure pour le client
  best_for_broker: CommissionVariante | null // meilleure pour le courtier avec économie client > 0
}

export interface CommissionAnalysisResult {
  analyzed_at: string
  assurance_actuelle_mensuelle: number // €/mois
  assurance_actuelle_total: number // € sur la durée du prêt
  duree_mois: number
  top_tarifs: TarifAnalysis[]
  meilleure_economie_client: {
    tarif: string
    compagnie: string
    economie: number
    code_commission: string
  } | null
  meilleur_compromis: {
    tarif: string
    compagnie: string
    economie_client: number
    commission_courtier: number
    code_commission: string
  } | null
}

// Codes de commission par tarif (id_tarif) - triés du moins cher au plus cher pour le client
const COMMISSION_CODES_BY_TARIF: Record<string, string[]> = {
  '1': ['1T1', '1T2', '1T3', '1T4', '1T5', '1T6', '1T7', '1T8', '1T9', '1T10'], // GENERALI CI
  '2': ['2T1', '2T2', '2T3', '2T4', '2T5', '2T6'], // SWISSLIFE
  '3': ['3T1', '3T2', '3T3', '3T4', '3T5', '3T6', '3T7', '3T8', '3T9', '3T10'], // MNCAP
  '4': ['4T1', '4T2', '4T3', '4T4', '4T5', '4T6', '4T7', '4T8', '4T9', '4T10'], // CNP
  '5': ['5T1', '5T2', '5T3', '5T4', '5T5', '5T6', '5T7', '5T8', '5T9', '5T10'], // DIGITAL CRD
  '6': ['6T1', '6T2', '6T3', '6T4', '6T5', '6T6', '6T7', '6T8', '6T9', '6T10'], // DIGITAL CI
  '7': ['7T1', '7T2', '7T3', '7T4', '7T5', '7T6', '7T7', '7T8', '7T9', '7T10'], // PROTECTION+
  '8': ['8T1', '8T2', '8T3', '8T4', '8T5', '8T6', '8T7', '8T8', '8T9', '8T10'], // GENERALI CRD
  '9': ['9T1', '9T2', '9T3', '9T4', '9T5', '9T6', '9T7', '9T8'], // OPEN CRD
  '10': ['10T1', '10T2', '10T3', '10T4', '10T5', '10T6', '10T7', '10T8', '10T9', '10T10'], // MAIF
  '11': ['11T1', '11T2', '11T3', '11T4', '11T5', '11T6', '11T7', '11T8', '11T9', '11T10'], // HUMANIS
  '12': ['12T1', '12T2', '12T3', '12T4', '12T5', '12T6', '12T7', '12T8', '12T9', '12T10'], // PERFORMANCE
}

// ============================================================================
// SERVICE
// ============================================================================

export class CommissionOptimizerService {
  /**
   * Analyse complète des commissions pour un dossier
   * 
   * Étapes :
   * 1. Appel initial Exade (sans id_tarif) pour récupérer tous les tarifs avec commission par défaut
   * 2. Identification des TOP 3 tarifs les moins chers
   * 3. Pour chaque tarif top, appels ciblés avec différents codes de commission
   * 4. Calcul des économies client et commissions courtier
   * 5. Génération des recommandations
   */
  static async analyzeCommissions(params: {
    clientInfo: any
    pretData: any
    coutAssuranceActuelle: number // Coût mensuel actuel de l'assurance banque en €
  }): Promise<CommissionAnalysisResult> {
    const { clientInfo, pretData, coutAssuranceActuelle } = params
    
    // Durée du prêt en mois
    const dureeMois = pretData.duree_mois || pretData.duree_restante_mois || 240
    
    // Coût total de l'assurance actuelle
    const assuranceActuelleTotal = coutAssuranceActuelle * dureeMois

    console.log('[CommissionOptimizer] Démarrage analyse avec:', {
      coutAssuranceActuelle,
      dureeMois,
      assuranceActuelleTotal
    })

    // ========================================================================
    // ÉTAPE 1 : Appel initial pour récupérer tous les tarifs
    // ========================================================================
    let allTarifs: ExadeTarif[]
    try {
      allTarifs = await getExadeTarifs({
        assure: clientInfo,
        pret: pretData
      })
      console.log('[CommissionOptimizer] Tarifs récupérés:', allTarifs.length)
    } catch (error) {
      console.error('[CommissionOptimizer] Erreur appel Exade initial:', error)
      throw error
    }

    // ========================================================================
    // ÉTAPE 2 : Trier et identifier les TOP 3 tarifs les moins chers
    // ========================================================================
    const tarifsSorted = [...allTarifs]
      .filter(t => !t.erreurs || t.erreurs.length === 0)
      .sort((a, b) => a.cout_total - b.cout_total)
      .slice(0, 3)

    console.log('[CommissionOptimizer] Top 3 tarifs:', tarifsSorted.map(t => ({
      id: t.id_tarif,
      compagnie: t.compagnie,
      cout: t.cout_total
    })))

    // ========================================================================
    // ÉTAPE 3 : Analyser les variantes de commission pour chaque tarif top
    // ========================================================================
    const topTarifsAnalysis: TarifAnalysis[] = []

    for (const tarif of tarifsSorted) {
      const analysis = await this.analyzeTarifCommissions({
        tarif,
        clientInfo,
        pretData,
        assuranceActuelleTotal
      })
      topTarifsAnalysis.push(analysis)
    }

    // ========================================================================
    // ÉTAPE 4 : Déterminer les meilleures options globales
    // ========================================================================
    let meilleureEconomieClient: CommissionAnalysisResult['meilleure_economie_client'] = null
    let meilleurCompromis: CommissionAnalysisResult['meilleur_compromis'] = null

    for (const analysis of topTarifsAnalysis) {
      // Meilleure économie client (variante la moins chère)
      if (analysis.best_for_client) {
        if (!meilleureEconomieClient || analysis.best_for_client.economie_client > meilleureEconomieClient.economie) {
          meilleureEconomieClient = {
            tarif: analysis.nom,
            compagnie: analysis.compagnie,
            economie: analysis.best_for_client.economie_client,
            code_commission: analysis.best_for_client.code
          }
        }
      }

      // Meilleur compromis (économie client + commission courtier)
      if (analysis.best_for_broker && analysis.best_for_broker.economie_client > 0) {
        if (!meilleurCompromis || 
            analysis.best_for_broker.commission_courtier_estimee > meilleurCompromis.commission_courtier) {
          meilleurCompromis = {
            tarif: analysis.nom,
            compagnie: analysis.compagnie,
            economie_client: analysis.best_for_broker.economie_client,
            commission_courtier: analysis.best_for_broker.commission_courtier_estimee,
            code_commission: analysis.best_for_broker.code
          }
        }
      }
    }

    return {
      analyzed_at: new Date().toISOString(),
      assurance_actuelle_mensuelle: coutAssuranceActuelle,
      assurance_actuelle_total: assuranceActuelleTotal,
      duree_mois: dureeMois,
      top_tarifs: topTarifsAnalysis,
      meilleure_economie_client: meilleureEconomieClient,
      meilleur_compromis: meilleurCompromis
    }
  }

  /**
   * Analyse les variantes de commission pour un tarif spécifique
   */
  private static async analyzeTarifCommissions(params: {
    tarif: ExadeTarif
    clientInfo: any
    pretData: any
    assuranceActuelleTotal: number
  }): Promise<TarifAnalysis> {
    const { tarif, clientInfo, pretData, assuranceActuelleTotal } = params
    
    const idTarif = tarif.id_tarif
    const commissionCodes = COMMISSION_CODES_BY_TARIF[idTarif] || []
    
    console.log(`[CommissionOptimizer] Analyse tarif ${idTarif} (${tarif.compagnie}) avec codes:`, commissionCodes)

    const variantes: CommissionVariante[] = []

    // Appels parallèles pour chaque code de commission
    const promises = commissionCodes.map(async (code) => {
      try {
        const commission: ExadeCommissionOptions = {
          commissionnement: code
        }

        const tarifs = await getExadeTarifs({
          assure: clientInfo,
          pret: pretData,
          idTarif: parseInt(idTarif),
          commission
        })

        const tarifResult = tarifs.find(t => t.id_tarif === idTarif)
        if (!tarifResult) return null

        const codeInfo = EXADE_COMMISSION_CODES[code as keyof typeof EXADE_COMMISSION_CODES]
        const economieClient = assuranceActuelleTotal - tarifResult.cout_total
        const economiePct = assuranceActuelleTotal > 0 
          ? (economieClient / assuranceActuelleTotal) * 100 
          : 0

        // Estimation commission courtier basée sur le taux indiqué
        const commissionEstimee = this.estimateCommission(code, tarifResult.cout_total)

        return {
          code,
          label: codeInfo?.label || code,
          cout_client_total: tarifResult.cout_total,
          economie_client: economieClient,
          economie_client_pct: economiePct,
          commission_courtier_estimee: commissionEstimee,
          recommendation: this.determineRecommendation(code)
        } as CommissionVariante
      } catch (error) {
        console.error(`[CommissionOptimizer] Erreur pour code ${code}:`, error)
        return null
      }
    })

    const results = await Promise.all(promises)
    variantes.push(...results.filter((r): r is CommissionVariante => r !== null))

    // Trier par coût client (économie décroissante)
    variantes.sort((a, b) => a.cout_client_total - b.cout_client_total)

    // Déterminer les meilleures options
    const bestForClient = variantes.length > 0 ? variantes[0] : null
    
    // Meilleure pour courtier = celle avec la plus haute commission MAIS économie client > 0
    const validForBroker = variantes.filter(v => v.economie_client > 0)
    const bestForBroker = validForBroker.length > 0
      ? validForBroker.reduce((best, current) => 
          current.commission_courtier_estimee > best.commission_courtier_estimee ? current : best
        )
      : null

    return {
      id_tarif: idTarif,
      compagnie: tarif.compagnie,
      nom: tarif.nom,
      cout_default: tarif.cout_total,
      variantes,
      best_for_client: bestForClient,
      best_for_broker: bestForBroker
    }
  }

  /**
   * Estimation de la commission courtier basée sur le code
   * C'est une approximation car Exade ne renvoie pas toujours ce montant clairement
   */
  private static estimateCommission(code: string, coutTotal: number): number {
    // Extraire le taux depuis les infos du code
    const codeInfo = EXADE_COMMISSION_CODES[code as keyof typeof EXADE_COMMISSION_CODES]
    if (!codeInfo) return 0

    const taux = codeInfo.taux

    // Parser le taux
    if (taux.includes('linéaire')) {
      // Ex: "15% linéaire" -> 15% du coût total approximativement
      const pct = parseInt(taux.replace(/[^\d]/g, '')) || 0
      return (coutTotal * pct) / 100
    }
    
    if (taux.includes('/')) {
      // Ex: "30%/10%" -> moyenne pondérée approximative (première année = 1/durée)
      // Simplification: on prend la moyenne
      const parts = taux.match(/(\d+)%.*?(\d+)%/)
      if (parts) {
        const firstYear = parseInt(parts[1])
        const followingYears = parseInt(parts[2])
        // Moyenne approximative sur durée standard (20 ans)
        const avgPct = (firstYear + followingYears * 19) / 20
        return (coutTotal * avgPct) / 100
      }
    }

    // Fallback
    return 0
  }

  /**
   * Détermine le type de recommandation basé sur le code
   */
  private static determineRecommendation(code: string): 'economique' | 'recommande' | 'premium' {
    // Les codes T1 sont généralement les moins chers pour le client
    if (code.endsWith('T1') || code.endsWith('T2')) {
      return 'economique'
    }
    
    // Les codes T3/T4 sont souvent le défaut recommandé
    if (code.endsWith('T3') || code.endsWith('T4')) {
      return 'recommande'
    }
    
    // Les codes supérieurs offrent plus de commission
    return 'premium'
  }
}




