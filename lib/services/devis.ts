import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Devis = Database['public']['Tables']['devis']['Row']
type DevisInsert = Database['public']['Tables']['devis']['Insert']
type DevisUpdate = Database['public']['Tables']['devis']['Update']

export class DevisService {
  /**
   * Récupère tous les devis avec les informations du dossier
   */
  static async getAllDevis() {
    const { data, error } = await supabase
      .from('devis')
      .select(`
        *,
        dossiers!inner (
          id,
          numero_dossier,
          statut:statut_canon,
          type_dossier,
          client_infos (
            client_nom,
            client_prenom,
            client_email
          ),
          pret_data (
            montant_capital,
            banque_preteuse,
            duree_mois
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la récupération des devis:', error)
      throw error
    }

    return data
  }

  /**
   * Récupère un devis par son ID
   */
  static async getDevisById(id: string) {
    console.log('[DevisService.getDevisById] input', { id })
    // Pour éviter PGRST201 (relations multiples entre devis et dossiers),
    // on récupère UNIQUEMENT le devis ici. Les données dossier sont inutiles
    // pour un simple refus/validation et peuvent être récupérées ailleurs si besoin.
    const { data, error } = await supabase
      .from('devis')
      .select(`*`)
      .eq('id', id)
      .single()

    if (error) {
      console.error('[DevisService.getDevisById] supabase error', error)
      throw error
    }

    console.log('[DevisService.getDevisById] output', data)
    return data
  }

  /**
   * Récupère les devis d'un dossier spécifique
   */
  static async getDevisByDossierId(dossierId: string) {
    const { data, error } = await supabase
      .from('devis')
      .select('*')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la récupération des devis du dossier:', error)
      throw error
    }

    return data
  }

  /**
   * Crée un nouveau devis
   */
  static async createDevis(devisData: DevisInsert) {
    const { data, error } = await supabase
      .from('devis')
      .insert(devisData)
      .select()
      .single()

    if (error) {
      console.error('Erreur lors de la création du devis:', error)
      throw error
    }

    return data
  }

  /**
   * Crée plusieurs devis en une seule requête
   */
  static async createMultipleDevis(devisArray: DevisInsert[]) {
    if (!Array.isArray(devisArray) || devisArray.length === 0) return []
    const { data, error } = await supabase
      .from('devis')
      .insert(devisArray)
      .select()

    if (error) {
      console.error('Erreur lors de la création multiple des devis:', error)
      throw error
    }

    return data
  }

  /**
   * Met à jour un devis
   */
  static async updateDevis(id: string, updates: DevisUpdate) {
    console.log('[DevisService.updateDevis] input', { id, updates })
    const { data, error } = await supabase
      .from('devis')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      const { code, message, details, hint } = error as any
      console.error('[DevisService.updateDevis] supabase error', { code, message, details, hint })
      throw error
    }

    if (!data) {
      console.warn('[DevisService.updateDevis] no row returned (possible RLS or id not found)', { id, updates })
      return null as unknown as Devis
    }

    console.log('[DevisService.updateDevis] output', data)
    return data
  }

  /**
   * Supprime un devis
   */
  static async deleteDevis(id: string) {
    const { error } = await supabase
      .from('devis')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erreur lors de la suppression du devis:', error)
      throw error
    }

    return true
  }

  /**
   * Marque un devis comme envoyé
   */
  static async markDevisAsSent(id: string) {
    return this.updateDevis(id, {
      statut: 'envoye',
      date_envoi: new Date().toISOString()
    })
  }

  /**
   * Marque un devis comme lu
   */
  static async markDevisAsRead(id: string) {
    return this.updateDevis(id, {
      statut: 'lu'
    })
  }

  /**
   * Marque un devis comme accepté
   */
  static async markDevisAsAccepted(id: string) {
    return this.updateDevis(id, {
      statut: 'accepte',
      date_acceptation: new Date().toISOString()
    })
  }

  /**
   * Marque un devis comme refusé
   */
  static async markDevisAsRejected(id: string, motif?: string) {
    console.log('[DevisService.markDevisAsRejected] input', { id, motif })
    
    try {
      // 1. Récupérer le devis actuel
      const { data: currentDevis, error: fetchError } = await supabase
        .from('devis')
        .select('donnees_devis')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // 2. Préparer les nouvelles données
      const currentData = currentDevis?.donnees_devis || {}
      const newData = {
        ...currentData,
        ...(motif ? { motif_refus: motif, date_refus: new Date().toISOString() } : {})
      }

      // 3. Mettre à jour le devis
      const { data, error } = await supabase
        .from('devis')
        .update({ 
          statut: 'refuse',
          donnees_devis: newData
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      console.log('[DevisService.markDevisAsRejected] success', data)
      return data
    } catch (e) {
      console.error('[DevisService.markDevisAsRejected] error', e)
      throw e
    }
  }

  /**
   * Met à jour l'URL du PDF d'un devis
   */
  static async updatePdfUrl(id: string, pdfUrl: string) {
    return this.updateDevis(id, {
      pdf_url: pdfUrl,
      pdf_created_at: new Date().toISOString()
    })
  }

  /**
   * Génère un numéro de devis unique
   */
  static async generateNumeroDevis(): Promise<string> {
    const { data, error } = await supabase.rpc('generate_numero_devis')
    
    if (error) {
      console.error('Erreur lors de la génération du numéro de devis:', error)
      throw error
    }

    return data
  }

  /**
   * Récupère les statistiques des devis
   */
  static async getDevisStats() {
    const { data, error } = await supabase
      .from('devis')
      .select('statut, date_generation, donnees_devis')

    if (error) {
      console.error('Erreur lors de la récupération des statistiques devis:', error)
      throw error
    }

    const stats = {
      total: data.length,
      parStatut: {} as Record<string, number>,
      parMois: {} as Record<string, number>,
      montantTotal: 0,
      montantMoyen: 0
    }

    data.forEach(devis => {
      // Compter par statut
      stats.parStatut[devis.statut] = (stats.parStatut[devis.statut] || 0) + 1
      
      // Compter par mois
      if (devis.date_generation) {
        const month = new Date(devis.date_generation).toISOString().slice(0, 7)
        stats.parMois[month] = (stats.parMois[month] || 0) + 1
      }

      // Calculer montants si disponibles dans les données JSON
      if (devis.donnees_devis && typeof devis.donnees_devis === 'object') {
        const donnees = devis.donnees_devis as any
        if (donnees.montant && typeof donnees.montant === 'number') {
          stats.montantTotal += donnees.montant
        }
      }
    })

    stats.montantMoyen = stats.total > 0 ? stats.montantTotal / stats.total : 0

    return stats
  }

  /**
   * Recherche des devis par critères
   */
  static async searchDevis(criteria: {
    statut?: string
    numero_devis?: string
    date_debut?: string
    date_fin?: string
    dossier_id?: string
  }) {
    let query = supabase
      .from('devis')
      .select(`
        *,
        dossiers!inner (
          numero_dossier,
          client_infos (
            client_nom,
            client_prenom
          )
        )
      `)

    // Appliquer les filtres
    if (criteria.statut) {
      query = query.eq('statut', criteria.statut)
    }
    if (criteria.numero_devis) {
      query = query.ilike('numero_devis', `%${criteria.numero_devis}%`)
    }
    if (criteria.dossier_id) {
      query = query.eq('dossier_id', criteria.dossier_id)
    }
    if (criteria.date_debut) {
      query = query.gte('date_generation', criteria.date_debut)
    }
    if (criteria.date_fin) {
      query = query.lte('date_generation', criteria.date_fin)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la recherche des devis:', error)
      throw error
    }

    return data
  }

  /**
   * Met à jour un devis unique avec de nouvelles données Exade
   * Utilisé pour le recalcul ciblé d'un seul devis
   */
  static async updateSingleDevis(
    devisId: string,
    tarifData: {
      cout_total: number;
      cout_mensuel: number;
      frais_adhesion?: number;
      frais_adhesion_apporteur?: number;
      frais_frac?: number;
      frais_courtier?: number;
      commission_exade_code?: string;
      taux_capital_assure?: number;
      compatible_lemoine?: boolean;
      formalites_medicales?: string[];
      type_tarif?: string;
      erreurs?: string[];
    },
    coutAssuranceBanque?: number
  ) {
    try {
      // Calculer l'économie estimée si on a le coût de l'assurance banque
      const economieEstimee = coutAssuranceBanque 
        ? coutAssuranceBanque - tarifData.cout_total 
        : null;

      // Récupérer les données existantes pour les fusionner
      const { data: existingDevis, error: fetchError } = await supabase
        .from('devis')
        .select('donnees_devis')
        .eq('id', devisId)
        .single()

      if (fetchError) throw fetchError

      // Fusionner les anciennes et nouvelles données
      const existingData = existingDevis?.donnees_devis || {}
      const newDonneesDevis = {
        ...existingData,
        ...tarifData,
        updated_at: new Date().toISOString()
      }

      // Mettre à jour le devis
      const { data, error } = await supabase
        .from('devis')
        .update({
          cout_total: tarifData.cout_total,
          cout_mensuel: tarifData.cout_mensuel,
          economie_estimee: economieEstimee,
          donnees_devis: newDonneesDevis,
          updated_at: new Date().toISOString()
        })
        .eq('id', devisId)
        .select()
        .single()

      if (error) throw error

      console.log('[DevisService.updateSingleDevis] Devis mis à jour:', devisId)
      return data
    } catch (error) {
      console.error('[DevisService.updateSingleDevis] Erreur:', error)
      throw error
    }
  }

  /**
   * Met à jour les paramètres financiers d'un devis (frais et commission)
   */
  static async updateDevisFinancials(
    devisId: string,
    fraisCourtierCentimes: number,
    commissionExadeCode: string | null
  ) {
    try {
      // Récupérer les données existantes
      const { data: existingDevis, error: fetchError } = await supabase
        .from('devis')
        .select('donnees_devis')
        .eq('id', devisId)
        .single()

      if (fetchError) throw fetchError

      // Mettre à jour donnees_devis avec les nouveaux paramètres
      const existingData = (existingDevis?.donnees_devis || {}) as Record<string, unknown>
      const newDonneesDevis = {
        ...existingData,
        frais_courtier: fraisCourtierCentimes,
        frais_adhesion_apporteur: fraisCourtierCentimes / 100,
        commission_exade_code: commissionExadeCode,
        financials_updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('devis')
        .update({
          donnees_devis: newDonneesDevis,
          updated_at: new Date().toISOString()
        })
        .eq('id', devisId)
        .select()
        .single()

      if (error) throw error

      console.log('[DevisService.updateDevisFinancials] Paramètres mis à jour:', { devisId, fraisCourtierCentimes, commissionExadeCode })
      return data
    } catch (error) {
      console.error('[DevisService.updateDevisFinancials] Erreur:', error)
      throw error
    }
  }

  /**
   * ✅ STATISTIQUES PAGE - Analyse par compagnie d'assurance
   */
  static async getAnalyseCompagnies(startDate: string, endDate: string, brokerId?: string) {
    try {
      // Construire la requête avec jointure sur dossiers pour broker_id et frais
      let query = supabase
        .from('devis')
        .select(`
          id, 
          compagnie, 
          statut, 
          created_at, 
          date_generation,
          frais_courtier,
          dossiers!inner (
            broker_id,
            statut_canon,
            frais_courtage
          )
        `)
        .not('compagnie', 'is', null)

      // ✅ Filtrer par broker_id si fourni
      if (brokerId) {
        query = query.eq('dossiers.broker_id', brokerId)
      }

      const { data: devis, error } = await query

      if (error) {
        console.error('[DevisService.getAnalyseCompagnies] Erreur:', error)
        throw error
      }

      // Filtrer par date (utilise date_generation ou fallback sur created_at)
      const start = new Date(startDate).getTime()
      const end = new Date(endDate).getTime()
      const devisFiltres = devis.filter((d: any) => {
        const date = new Date(d.date_generation || d.created_at).getTime()
        return date >= start && date <= end
      })

      // Grouper par compagnie
      const parCompagnie: Record<string, { envoyes: number; acceptes: number; ca: number }> = {}

      devisFiltres.forEach((d: any) => {
        const compagnie = d.compagnie
        if (!parCompagnie[compagnie]) {
          parCompagnie[compagnie] = { envoyes: 0, acceptes: 0, ca: 0 }
        }

        // Compter les devis envoyés (statut envoye, accepte ou refuse)
        if (['envoye', 'accepte', 'refuse'].includes(d.statut)) {
          parCompagnie[compagnie].envoyes++
        }

        // Compter les devis acceptés et calculer le CA pour les dossiers finalisés
        if (d.statut === 'accepte') {
          parCompagnie[compagnie].acceptes++
          
          // ✅ Ajouter le CA si le dossier est finalisé
          if (d.dossiers?.statut_canon === 'finalise') {
            const fraisDossier = d.dossiers?.frais_courtage
            const fraisDevis = d.frais_courtier

            if (fraisDossier && Number(fraisDossier) > 0) {
              parCompagnie[compagnie].ca += Number(fraisDossier)
            } else if (fraisDevis && Number(fraisDevis) > 0) {
              parCompagnie[compagnie].ca += Number(fraisDevis) / 100 // centimes → euros
            }
          }
        }
      })

      // Calculer le CA total pour les pourcentages
      const caTotal = Object.values(parCompagnie).reduce((sum, c) => sum + c.ca, 0)

      // Convertir en tableau et calculer taux d'acceptation
      return Object.entries(parCompagnie)
        .map(([nom_compagnie, stats]) => {
          const taux_acceptation = stats.envoyes > 0
            ? Math.round((stats.acceptes / stats.envoyes) * 100 * 10) / 10
            : 0

          const ca_pourcentage = caTotal > 0
            ? Math.round((stats.ca / caTotal) * 100 * 10) / 10
            : 0

          return {
            nom_compagnie,
            ca_pourcentage,
            ca_montant: Math.round(stats.ca * 100) / 100,
            nb_devis_envoyes: stats.envoyes,
            nb_devis_acceptes: stats.acceptes,
            taux_acceptation
          }
        })
        .sort((a, b) => b.ca_montant - a.ca_montant) // Trier par CA décroissant
    } catch (error) {
      console.error('[DevisService.getAnalyseCompagnies] Erreur:', error)
      return []
    }
  }
}
