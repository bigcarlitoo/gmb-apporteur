import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Dossier = Database['public']['Tables']['dossiers']['Row']
type DossierInsert = Database['public']['Tables']['dossiers']['Insert']
type DossierUpdate = Database['public']['Tables']['dossiers']['Update']

export class DossiersService {
  /**
   * Récupère tous les dossiers avec les informations jointes
   */
  static async getAllDossiers(brokerId?: string) {
    // Lire la vue pour centraliser le statut affiché
    const { data: viewRows, error: viewError } = await supabase
      .from('dossiers_with_computed_status')
      .select('*')
      .order('created_at', { ascending: false })

    if (viewError) {
      console.error('[DossiersService.getAllDossiers] view error', viewError)
      throw viewError
    }

    // Joindre les informations complémentaires depuis les tables sources
    const { data, error } = await supabase
      .from('dossiers')
      .select(`
        id,
        numero_dossier,
        apporteur_id,
        type_dossier,
        is_couple,
        date_creation,
        created_at,
        updated_at,
        statut:statut_canon,
        devis_selectionne_id,
        is_read,
        client_infos (
          client_nom,
          client_prenom,
          client_email,
          client_telephone
        ),
        pret_data (
          banque_preteuse,
          montant_capital,
          duree_mois,
          type_pret
        ),
        devis:devis!devis_dossier_id_fkey (
          id,
          numero_devis,
          statut,
          date_generation
        ),
        devis_selectionne:devis!dossiers_devis_selectionne_id_fkey (
          id,
          numero_devis,
          statut,
          date_generation
        ),
        apporteur_profiles (
          nom,
          prenom,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la récupération des dossiers:', error)
      throw error
    }

    // Fusionner computed_statut de la vue
    const computedById = new Map((viewRows || []).map((r: any) => [r.id, r.computed_statut]))
    return (data || []).map((row: any) => ({
      ...row,
      computed_statut: computedById.get(row.id) || row.statut
    }))
  }

  /**
   * Récupère un dossier par son ID avec toutes les informations
   */
  static async getDossierById(id: string) {
    const [{ data: viewRow }, { data, error }] = await Promise.all([
      supabase.from('dossiers_with_computed_status').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('dossiers')
        .select(`
          id,
          numero_dossier,
          apporteur_id,
          type_dossier,
          is_couple,
          commentaire,
          date_creation,
          created_at,
          updated_at,
          statut:statut_canon,
          devis_selectionne_id,
          is_read,
          client_infos (*),
          pret_data (*),
          devis:devis!devis_dossier_id_fkey (
            id,
            numero_devis,
            statut,
            donnees_devis,
            motif_refus,
            date_generation,
            date_envoi,
            date_acceptation,
            date_expiration,
            pdf_url,
            created_at,
            updated_at
          ),
          devis_selectionne:devis!dossiers_devis_selectionne_id_fkey (*),
          process_steps (*),
          documents (*)
        `)
        .eq('id', id)
        .single()
    ])

    if (error) {
      console.error('Erreur lors de la récupération du dossier:', error)
      throw error
    }

    return { ...data, computed_statut: (viewRow as any)?.computed_statut }
  }

  /**
   * Récupère les dossiers d'un apporteur spécifique
   */
  static async getDossiersByApporteur(apporteurId: string) {
    const [{ data: viewRows }, { data, error }] = await Promise.all([
      supabase.from('dossiers_with_computed_status').select('*').in('apporteur_id', [apporteurId]),
      supabase
        .from('dossiers')
        .select(`
          id,
          numero_dossier,
          apporteur_id,
          type_dossier,
          date_creation,
          created_at,
          updated_at,
          statut:statut_canon,
          devis_selectionne_id,
          is_read,
          client_infos (
            client_nom,
            client_prenom,
            client_email,
            client_telephone
          ),
          pret_data (
            banque_preteuse,
            montant_capital,
            duree_mois,
            type_pret
          ),
          devis:devis!devis_dossier_id_fkey (
            id,
            numero_devis,
            statut
          )
        `)
        .eq('apporteur_id', apporteurId)
        .order('created_at', { ascending: false })
    ])

    if (error) {
      console.error('Erreur lors de la récupération des dossiers apporteur:', error)
      throw error
    }

    const computedById = new Map((viewRows || []).map((r: any) => [r.id, r.computed_statut]))
    return (data || []).map((row: any) => ({
      ...row,
      computed_statut: computedById.get(row.id) || row.statut
    }))
  }

  /**
   * Crée un nouveau dossier
   */
  static async createDossier(dossierData: DossierInsert) {
    const { data, error } = await supabase
      .from('dossiers')
      .insert(dossierData)
      .select()
      .single()

    if (error) {
      console.error('Erreur lors de la création du dossier:', error)
      throw error
    }

    return data
  }

  /**
   * Met à jour un dossier
   */
  static async updateDossier(id: string, updates: DossierUpdate) {
    console.log('[DossiersService.updateDossier] input', { id, updates })
    // Rediriger les mises à jour de statut vers la colonne canonique
    const payload: any = { ...updates }
    if ((updates as any)?.statut !== undefined) {
      payload.statut_canon = (updates as any).statut
      delete payload.statut
      console.log('[DossiersService.updateDossier] remapped statut -> statut_canon', { statut_canon: payload.statut_canon })
    }

    const { data, error } = await supabase
      .from('dossiers')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[DossiersService.updateDossier] supabase error', error)
      throw error
    }

    if (!data) {
      console.warn('[DossiersService.updateDossier] no row returned (possible RLS or id not found)', { id, updates })
      return null as unknown as Dossier
    }

    console.log('[DossiersService.updateDossier] output', data)
    return data
  }

  /**
   * Supprime un dossier
   * Crée une activité dossier_supprime AVANT la suppression
   */
  static async deleteDossier(id: string) {
    console.log(`[DossiersService.deleteDossier] Début suppression dossier ${id}`)

    // 1. Récupérer les infos du dossier AVANT suppression
    const { data: dossierData, error: fetchError } = await supabase
      .from('dossiers')
      .select(`
        numero_dossier, 
        apporteur_id,
        client_infos(client_prenom, client_nom)
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('[DossiersService.deleteDossier] Erreur récupération dossier:', fetchError)
      throw fetchError
    }

    console.log(`[DossiersService.deleteDossier] Dossier trouvé: ${dossierData.numero_dossier}`)

    // 2. Créer l'activité de suppression pour l'apporteur (si existe)
    if (dossierData.apporteur_id) {
      try {
        console.log(`[DossiersService.deleteDossier] Création activité dossier_supprime pour apporteur ${dossierData.apporteur_id}`)

        // Extraire les infos client (peut être un array ou un objet)
        const clientInfo = Array.isArray(dossierData.client_infos)
          ? dossierData.client_infos[0]
          : dossierData.client_infos

        const clientPrenom = (clientInfo as any)?.client_prenom || ''
        const clientNom = (clientInfo as any)?.client_nom || ''

        const description = clientPrenom && clientNom
          ? `Le dossier de ${clientPrenom} ${clientNom} a été supprimé par l'administrateur.`
          : `Le dossier ${dossierData.numero_dossier} a été supprimé par l'administrateur.`

        await supabase
          .from('activities')
          .insert({
            user_id: dossierData.apporteur_id,
            dossier_id: id,
            activity_type: 'dossier_supprime',
            activity_title: 'Dossier supprimé',
            activity_description: description,
            activity_data: {
              dossier_numero: dossierData.numero_dossier,
              client_prenom: clientPrenom,
              client_nom: clientNom,
              deleted_by: 'admin',
              deleted_at: new Date().toISOString()
            }
          })

        console.log('[DossiersService.deleteDossier] Activité dossier_supprime créée')
      } catch (activityError) {
        console.warn('[DossiersService.deleteDossier] Erreur création activité (non bloquante):', activityError)
      }
    } else {
      console.log('[DossiersService.deleteDossier] Pas d\'apporteur associé, pas d\'activité créée')
    }

    // 3. Supprimer le dossier (cascade delete géré par la DB)
    console.log(`[DossiersService.deleteDossier] Suppression du dossier ${id}`)
    const { error } = await supabase
      .from('dossiers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DossiersService.deleteDossier] Erreur lors de la suppression du dossier:', error)
      throw error
    }

    console.log(`[DossiersService.deleteDossier] ✅ Dossier ${id} supprimé avec succès`)
    return true
  }

  /**
   * Récupère les statistiques des dossiers
   */
  static async getDossierStats(brokerId?: string) {
    const { data, error } = await supabase
      .from('dossiers')
      .select('statut:statut_canon, montant_capital')

    if (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
      throw error
    }

    // Calcul des statistiques
    const stats = {
      total: data.length,
      parStatut: {} as Record<string, number>,
      montantTotal: 0,
      montantMoyen: 0
    }

    data.forEach((dossier: any) => {
      // Compter par statut
      stats.parStatut[dossier.statut] = (stats.parStatut[dossier.statut] || 0) + 1

      // Calculer montants si disponibles
      if (dossier.montant_capital) {
        stats.montantTotal += Number(dossier.montant_capital)
      }
    })

    stats.montantMoyen = stats.total > 0 ? stats.montantTotal / stats.total : 0

    return stats
  }

  /**
   * Récupère les statistiques complètes pour le dashboard admin
   * ✅ Inclut les progressions mensuelles
   */
  static async getAdminDashboardStats(brokerId?: string) {
    const { data: dossiers, error } = await supabase
      .from('dossiers')
      .select('statut:statut_canon, economie_generee, date_creation, created_at')

    if (error) {
      console.error('Erreur lors de la récupération des stats dashboard:', error)
      throw error
    }

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // Stats globales
    const totalDossiers = dossiers.length
    const dossiersEnAttente = dossiers.filter((d: any) => d.statut === 'en_attente').length
    const dossiersDevisDisponible = dossiers.filter((d: any) => d.statut === 'devis_disponible').length
    const dossiersFinalises = dossiers.filter((d: any) => d.statut === 'finalise').length

    // Stats du mois actuel
    const dossiersFinaliseCeMois = dossiers.filter((d: any) => {
      const dateCreation = new Date(d.date_creation || d.created_at)
      return d.statut === 'finalise' && dateCreation >= currentMonthStart
    }).length

    const economiesCeMois = dossiers
      .filter((d: any) => {
        const dateCreation = new Date(d.date_creation || d.created_at)
        return d.statut === 'finalise' && dateCreation >= currentMonthStart
      })
      .reduce((sum: number, d: any) => sum + Number(d.economie_generee || 0), 0)

    // Stats du mois précédent (pour progression)
    const dossiersFinaliseMoisPrecedent = dossiers.filter((d: any) => {
      const dateCreation = new Date(d.date_creation || d.created_at)
      return d.statut === 'finalise' && dateCreation >= lastMonthStart && dateCreation <= lastMonthEnd
    }).length

    const economiesMoisPrecedent = dossiers
      .filter((d: any) => {
        const dateCreation = new Date(d.date_creation || d.created_at)
        return d.statut === 'finalise' && dateCreation >= lastMonthStart && dateCreation <= lastMonthEnd
      })
      .reduce((sum: number, d: any) => sum + Number(d.economie_generee || 0), 0)

    // Calcul des progressions
    const progressionDossiers = dossiersFinaliseMoisPrecedent === 0
      ? 0
      : Math.round(((dossiersFinaliseCeMois - dossiersFinaliseMoisPrecedent) / dossiersFinaliseMoisPrecedent) * 100)

    const progressionEconomies = economiesMoisPrecedent === 0
      ? 0
      : Math.round(((economiesCeMois - economiesMoisPrecedent) / economiesMoisPrecedent) * 100)

    // Total des économies (tous les dossiers finalisés)
    const economiesTotal = dossiers
      .filter((d: any) => d.statut === 'finalise')
      .reduce((sum: number, d: any) => sum + Number(d.economie_generee || 0), 0)

    return {
      totalDossiers,
      dossiersEnAttente,
      dossiersDevisDisponible,
      dossiersFinalises,
      dossiersFinaliseCeMois,
      economiesCeMois,
      economiesTotal,
      progressionDossiers,
      progressionEconomies
    }
  }

  /**
   * ✅ STATISTIQUES PAGE - Récupère les KPIs globaux pour une période donnée
   */
  static async getStatistiquesPeriode(startDate: string, endDate: string, brokerId?: string) {
    try {
      // Construire la requête de base
      let query = supabase
        .from('dossiers')
        .select(`
          id,
          statut:statut_canon,
          economie_generee,
          created_at,
          date_creation,
          broker_id,
          frais_courtage,
          pret_data (
            montant_capital
          ),
          devis_selectionne:devis!dossiers_devis_selectionne_id_fkey (
            frais_courtier
          )
        `)
        .gte('date_creation', startDate)
        .lte('date_creation', endDate)

      // ✅ Filtrer par broker_id si fourni
      if (brokerId) {
        query = query.eq('broker_id', brokerId)
      }

      const { data: dossiers, error } = await query

      if (error) {
        console.error('[DossiersService.getStatistiquesPeriode] Erreur:', error)
        throw error
      }

      // Filtrer les dossiers finalisés
      const dossiersFinalises = dossiers.filter((d: any) => d.statut === 'finalise')

      // Calculer les KPIs
      const nb_dossiers_traites = dossiersFinalises.length

      const economie_moyenne_generee = dossiersFinalises.length > 0
        ? dossiersFinalises.reduce((sum: number, d: any) => sum + Number(d.economie_generee || 0), 0) / dossiersFinalises.length
        : 0

      const capital_total_assure = dossiersFinalises.reduce((sum: number, d: any) => {
        const capital = d.pret_data?.[0]?.montant_capital || 0
        return sum + Number(capital)
      }, 0)

      // ✅ Calculer le CA total (frais de courtage des dossiers finalisés)
      // Priorité: frais_courtage du dossier > frais_courtier du devis sélectionné
      const chiffre_affaires_total = dossiersFinalises.reduce((sum: number, d: any) => {
        // frais_courtage est stocké en euros dans dossiers
        if (d.frais_courtage && Number(d.frais_courtage) > 0) {
          return sum + Number(d.frais_courtage)
        }
        // frais_courtier est stocké en centimes dans devis
        const fraisDevis = d.devis_selectionne?.frais_courtier
        if (fraisDevis && Number(fraisDevis) > 0) {
          return sum + Number(fraisDevis) / 100 // Convertir centimes en euros
        }
        return sum
      }, 0)

      return {
        nb_dossiers_traites,
        chiffre_affaires_total: Math.round(chiffre_affaires_total * 100) / 100,
        economie_moyenne_generee: Math.round(economie_moyenne_generee),
        capital_total_assure: Math.round(capital_total_assure)
      }
    } catch (error) {
      console.error('[DossiersService.getStatistiquesPeriode] Erreur:', error)
      throw error
    }
  }

  /**
   * ✅ STATISTIQUES PAGE - Analyse de l'activité (taux de conversion, délai traitement)
   */
  static async getAnalyseActivite(startDate: string, endDate: string, brokerId?: string) {
    try {
      // Construire la requête de base
      let query = supabase
        .from('dossiers')
        .select('id, statut:statut_canon, created_at, date_creation, date_finalisation, broker_id')
        .gte('date_creation', startDate)
        .lte('date_creation', endDate)

      // ✅ Filtrer par broker_id si fourni
      if (brokerId) {
        query = query.eq('broker_id', brokerId)
      }

      const { data: dossiers, error } = await query

      if (error) {
        console.error('[DossiersService.getAnalyseActivite] Erreur:', error)
        throw error
      }

      const nb_dossiers_soumis = dossiers.length
      const dossiersFinalises = dossiers.filter((d: any) => d.statut === 'finalise')
      const nb_dossiers_finalises = dossiersFinalises.length

      const taux_conversion_global = nb_dossiers_soumis > 0
        ? Math.round((nb_dossiers_finalises / nb_dossiers_soumis) * 100 * 10) / 10
        : 0

      // Calcul du délai moyen UNIQUEMENT pour les dossiers avec date_finalisation
      const dossiersAvecDelai = dossiersFinalises.filter((d: any) => d.date_finalisation)
      const delai_traitement_moyen = dossiersAvecDelai.length > 0
        ? dossiersAvecDelai.reduce((sum: number, d: any) => {
          const created = new Date(d.created_at).getTime()
          const finalized = new Date(d.date_finalisation).getTime()
          const delaiJours = (finalized - created) / (1000 * 60 * 60 * 24)
          return sum + delaiJours
        }, 0) / dossiersAvecDelai.length
        : 0

      return {
        taux_conversion_global,
        delai_traitement_moyen: Math.round(delai_traitement_moyen * 10) / 10,
        nb_dossiers_soumis,
        nb_dossiers_finalises
      }
    } catch (error) {
      console.error('[DossiersService.getAnalyseActivite] Erreur:', error)
      throw error
    }
  }

  /**
   * ✅ STATISTIQUES PAGE - Évolution temporelle (par mois)
   */
  static async getEvolutionTemporelle(startDate: string, endDate: string, brokerId?: string) {
    try {
      // Construire la requête de base
      let query = supabase
        .from('dossiers')
        .select(`
          id, 
          statut:statut_canon, 
          economie_generee, 
          created_at, 
          date_creation, 
          broker_id,
          frais_courtage,
          devis_selectionne:devis!dossiers_devis_selectionne_id_fkey (
            frais_courtier
          )
        `)
        .eq('statut_canon', 'finalise')
        .gte('date_creation', startDate)
        .lte('date_creation', endDate)
        .order('date_creation', { ascending: true })

      // ✅ Filtrer par broker_id si fourni
      if (brokerId) {
        query = query.eq('broker_id', brokerId)
      }

      const { data: dossiers, error } = await query

      if (error) {
        console.error('[DossiersService.getEvolutionTemporelle] Erreur:', error)
        throw error
      }

      // Grouper par mois en utilisant date_creation (date métier)
      const parMois: Record<string, { nb_dossiers: number; economies_generees: number; ca_total: number }> = {}

      dossiers.forEach((d: any) => {
        const date = new Date(d.date_creation || d.created_at)
        const moisKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!parMois[moisKey]) {
          parMois[moisKey] = { nb_dossiers: 0, economies_generees: 0, ca_total: 0 }
        }

        parMois[moisKey].nb_dossiers++
        parMois[moisKey].economies_generees += Number(d.economie_generee || 0)

        // ✅ Calculer le CA (frais courtage)
        if (d.frais_courtage && Number(d.frais_courtage) > 0) {
          parMois[moisKey].ca_total += Number(d.frais_courtage)
        } else {
          const fraisDevis = d.devis_selectionne?.frais_courtier
          if (fraisDevis && Number(fraisDevis) > 0) {
            parMois[moisKey].ca_total += Number(fraisDevis) / 100
          }
        }
      })

      // Convertir en tableau
      return Object.entries(parMois).map(([periode, stats]) => ({
        periode: `${periode}-01`, // Format YYYY-MM-DD pour compatibilité
        nb_dossiers: stats.nb_dossiers,
        ca_total: Math.round(stats.ca_total * 100) / 100,
        economies_generees: Math.round(stats.economies_generees)
      }))
    } catch (error) {
      console.error('[DossiersService.getEvolutionTemporelle] Erreur:', error)
      throw error
    }
  }

  /**
   * ✅ STATISTIQUES PAGE - Motifs de refus agrégés
   */
  static async getMotifsRefus(startDate: string, endDate: string, brokerId?: string) {
    try {
      // Construire la requête de base avec jointure sur dossiers pour broker_id
      let query = supabase
        .from('devis')
        .select(`
          id, 
          donnees_devis, 
          motif_refus, 
          statut, 
          created_at, 
          date_generation,
          dossiers!inner (
            broker_id
          )
        `)
        .eq('statut', 'refuse')

      // ✅ Filtrer par broker_id si fourni
      if (brokerId) {
        query = query.eq('dossiers.broker_id', brokerId)
      }

      const { data: devis, error } = await query

      if (error) {
        console.error('[DossiersService.getMotifsRefus] Erreur:', error)
        throw error
      }

      // Filtrer par date (utilise date_generation ou fallback sur created_at)
      const start = new Date(startDate).getTime()
      const end = new Date(endDate).getTime()
      const devisFiltres = devis.filter((d: any) => {
        const date = new Date(d.date_generation || d.created_at).getTime()
        return date >= start && date <= end
      })

      // Agréger les motifs
      const compteurMotifs: Record<string, number> = {}

      devisFiltres.forEach((d: any) => {
        // Chercher le motif dans donnees_devis (JSONB) ou motif_refus (colonne directe)
        const motif = d.donnees_devis?.motif_refus || d.motif_refus || 'Non spécifié'
        compteurMotifs[motif] = (compteurMotifs[motif] || 0) + 1
      })

      const totalRefus = devisFiltres.length

      // Convertir en tableau et calculer pourcentages
      return Object.entries(compteurMotifs)
        .map(([motif, nombre]) => ({
          motif,
          nombre,
          pourcentage: totalRefus > 0 ? Math.round((nombre / totalRefus) * 100 * 10) / 10 : 0
        }))
        .sort((a, b) => b.nombre - a.nombre) // Trier par nombre décroissant
    } catch (error) {
      console.error('[DossiersService.getMotifsRefus] Erreur:', error)
      return []
    }
  }

  /**
   * Récupère l'historique complet des devis pour un dossier
   */
  static async getDevisHistory(dossierId: string) {
    const { data, error } = await supabase.rpc('get_devis_complete_history', {
      p_dossier_id: dossierId
    })

    if (error) {
      console.error('Erreur lors de la récupération de l\'historique des devis:', error)
      throw error
    }

    return data || []
  }

  /**
   * Récupère l'historique des devis pour un dossier (version apporteur - sans renvoi)
   */
  static async getDevisApporteurHistory(dossierId: string) {
    const { data, error } = await supabase.rpc('get_devis_apporteur_history', {
      p_dossier_id: dossierId
    })

    if (error) {
      console.error('Erreur lors de la récupération de l\'historique des devis apporteur:', error)
      throw error
    }

    return data || []
  }

  /**
   * Recherche des dossiers par critères
   */
  static async searchDossiers(criteria: {
    statut?: string
    type_dossier?: string
    numero_dossier?: string
    client_nom?: string
    date_debut?: string
    date_fin?: string
  }, brokerId?: string) {
    let query = supabase
      .from('dossiers')
      .select(`
        id,
        numero_dossier,
        apporteur_id,
        type_dossier,
        date_creation,
        created_at,
        updated_at,
        statut:statut_canon,
        client_infos (
          client_nom,
          client_prenom,
          client_email
        ),
        pret_data (
          montant_capital,
          banque_preteuse
        )
      `)

    // Appliquer les filtres
    if (criteria.statut) {
      query = query.eq('statut_canon', criteria.statut)
    }
    if (criteria.type_dossier) {
      query = query.eq('type_dossier', criteria.type_dossier)
    }
    if (criteria.numero_dossier) {
      query = query.ilike('numero_dossier', `%${criteria.numero_dossier}%`)
    }
    if (criteria.date_debut) {
      query = query.gte('created_at', criteria.date_debut)
    }
    if (criteria.date_fin) {
      query = query.lte('created_at', criteria.date_fin)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la recherche des dossiers:', error)
      throw error
    }

    // Filtrer par nom client côté client si nécessaire
    let filteredData = data
    if (criteria.client_nom && data) {
      filteredData = data.filter((dossier: any) =>
        dossier.client_infos?.client_nom?.toLowerCase().includes(criteria.client_nom!.toLowerCase())
      )
    }

    return filteredData
  }

  /**
   * Change le type de dossier (seul <-> couple)
   */
  static async changeDossierType(dossierId: string, newType: 'seul' | 'couple'): Promise<void> {
    console.log('═══════════════════════════════════════════')
    console.log(`[DossiersService.changeDossierType] 🔄 DÉBUT Changement type dossier`)
    console.log(`[DossiersService.changeDossierType] Dossier ID: ${dossierId}`)
    console.log(`[DossiersService.changeDossierType] Nouveau type: ${newType}`)

    // Convertir le type en boolean pour is_couple
    const isCouple = newType === 'couple'

    // 1. Mettre à jour is_couple dans la table dossiers
    console.log(`[DossiersService.changeDossierType] 📝 UPDATE dossiers SET is_couple = ${isCouple} WHERE id = '${dossierId}'`)

    const { data: updateData, error: dossierError } = await supabase
      .from('dossiers')
      .update({ is_couple: isCouple })
      .eq('id', dossierId)
      .select()

    if (dossierError) {
      console.error('[DossiersService.changeDossierType] ❌ ERREUR mise à jour dossier:', dossierError)
      console.error('[DossiersService.changeDossierType] Code erreur:', dossierError.code)
      console.error('[DossiersService.changeDossierType] Message:', dossierError.message)
      console.error('[DossiersService.changeDossierType] Détails:', dossierError.details)
      console.error('[DossiersService.changeDossierType] Hint:', dossierError.hint)
      throw dossierError
    }

    console.log('[DossiersService.changeDossierType] ✅ is_couple mis à jour')
    console.log('[DossiersService.changeDossierType] Données retournées:', updateData)

    // 2. Si passage vers "seul", supprimer les données du conjoint dans client_infos
    if (newType === 'seul') {
      console.log('[DossiersService.changeDossierType] 🧹 Nettoyage données conjoint...')

      const { data: clientData, error: clientError } = await supabase
        .from('client_infos')
        .update({
          conjoint_civilite: null,
          conjoint_nom: null,
          conjoint_prenom: null,
          conjoint_nom_naissance: null,
          conjoint_date_naissance: null,
          conjoint_email: null,
          conjoint_telephone: null,
          conjoint_fumeur: null,
          conjoint_categorie_professionnelle: null,
          conjoint_profession: null,
        })
        .eq('dossier_id', dossierId)
        .select()

      if (clientError) {
        console.error('[DossiersService.changeDossierType] ❌ ERREUR nettoyage données conjoint:', clientError)
        console.error('[DossiersService.changeDossierType] Code erreur:', clientError.code)
        console.error('[DossiersService.changeDossierType] Message:', clientError.message)
        console.error('[DossiersService.changeDossierType] Détails:', clientError.details)
        throw clientError
      }

      console.log('[DossiersService.changeDossierType] ✅ Données conjoint nettoyées')
      console.log('[DossiersService.changeDossierType] Lignes affectées:', clientData)
    }

    console.log(`[DossiersService.changeDossierType] ✅ FIN Changement type vers ${newType}`)
    console.log('═══════════════════════════════════════════')
  }
}
