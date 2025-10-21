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
          statut,
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
   * Crée un devis à partir d'un objet mock local pour un dossier donné
   */
  static async createDevisFromMock(mock: any, dossierId: string) {
    // Générer un numero_devis si absent
    let numero: string
    try {
      numero = await this.generateNumeroDevis()
    } catch {
      numero = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`
    }

    const record: DevisInsert = {
      dossier_id: dossierId,
      numero_devis: mock?.numero_devis || numero,
      statut: (mock?.statut && ['en_attente','envoye','lu','accepte','refuse','expire'].includes(mock?.statut)) ? mock?.statut : 'en_attente',
      donnees_devis: {
        compagnie: mock?.compagnie,
        produit: mock?.produit,
        mensualite: mock?.cout_mensuel,
        primeTotale: mock?.cout_total,
        economie_estimee: mock?.economie_estimee,
        garanties: (mock?.formalites_medicales || []).map((x: any) => ({ libelle: String(x) })),
        couverture: mock?.couverture,
        exclusions: mock?.exclusions,
        avantages: mock?.avantages,
        id_simulation: mock?.id_simulation,
        reference: mock?.id_tarif,
        cout_total_tarif: mock?.cout_total_tarif,
        frais_adhesion: mock?.frais_adhesion,
        frais_frac: mock?.frais_frac,
        detail_pret: mock?.detail_pret,
        formalites_detaillees: mock?.formalites_detaillees,
        erreurs: mock?.erreurs,
      } as any,
      date_generation: new Date().toISOString(),
      date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const created = await this.createDevis(record)
    return created
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
}
