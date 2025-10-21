import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Dossier = Database['public']['Tables']['dossiers']['Row']
type DossierInsert = Database['public']['Tables']['dossiers']['Insert']
type DossierUpdate = Database['public']['Tables']['dossiers']['Update']

export class DossiersService {
  /**
   * Récupère tous les dossiers avec les informations jointes
   */
  static async getAllDossiers() {
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
   */
  static async deleteDossier(id: string) {
    const { error } = await supabase
      .from('dossiers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erreur lors de la suppression du dossier:', error)
      throw error
    }

    return true
  }

  /**
   * Récupère les statistiques des dossiers
   */
  static async getDossierStats() {
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
  }) {
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
}
