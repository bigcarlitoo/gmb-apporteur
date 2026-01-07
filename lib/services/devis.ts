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

    data.forEach((devis: { statut: string; date_generation: string | null; donnees_devis: Record<string, unknown> | null }) => {
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
   * Met à jour les colonnes directement ET dans donnees_devis pour la cohérence
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

      // Mettre à jour les colonnes directement + donnees_devis
      const { data, error } = await supabase
        .from('devis')
        .update({
          frais_courtier: fraisCourtierCentimes,
          commission_exade_code: commissionExadeCode,
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

  /**
   * 🔄 RECALCUL TARIF VIA API EXADE
   * 
   * Appelle l'API Exade pour recalculer un tarif avec une nouvelle commission.
   * Met à jour le devis avec les nouveaux coûts (cout_total, cout_mensuel, etc.)
   * 
   * @param devisId - ID du devis à recalculer
   * @param commissionCode - Nouveau code commission Exade (ex: "10T5")
   * @param fraisCourtierCentimes - Nouveaux frais courtier en centimes
   * @param brokerId - ID du broker pour l'appel API
   * @returns Le devis mis à jour avec les nouveaux tarifs
   */
  static async recalculateTarifWithCommission(
    devisId: string,
    commissionCode: string,
    fraisCourtierCentimes: number,
    brokerId: string
  ): Promise<{
    success: boolean;
    devis?: any;
    newCoutTotal?: number;
    newCoutMensuel?: number;
    error?: string;
  }> {
    console.log('[DevisService.recalculateTarifWithCommission] Début:', {
      devisId,
      commissionCode,
      fraisCourtierCentimes,
      brokerId
    })

    try {
      // 1. Récupérer le devis actuel avec les infos du dossier
      const { data: devisData, error: devisError } = await supabase
        .from('devis')
        .select(`
          id,
          dossier_id,
          id_tarif,
          donnees_devis,
          frais_courtier,
          commission_exade_code
        `)
        .eq('id', devisId)
        .single()

      if (devisError || !devisData) {
        console.error('[recalculateTarifWithCommission] Devis non trouvé:', devisError)
        return { success: false, error: 'Devis non trouvé' }
      }

      const idTarif = devisData.id_tarif
      if (!idTarif) {
        console.error('[recalculateTarifWithCommission] Pas de id_tarif sur ce devis')
        return { success: false, error: 'Ce devis n\'a pas d\'identifiant tarif Exade' }
      }

      // 2. Récupérer les infos du dossier (client et prêt)
      const { data: dossierData, error: dossierError } = await supabase
        .from('dossiers')
        .select(`
          id,
          client_infos (
            client_nom, client_prenom, client_nom_naissance,
            client_date_naissance, client_lieu_naissance,
            client_fumeur, client_categorie_professionnelle,
            client_deplacement_pro, client_travaux_manuels,
            is_couple, conjoint_nom, conjoint_prenom,
            conjoint_date_naissance, conjoint_lieu_naissance, conjoint_fumeur
          ),
          pret_data (
            montant_capital, duree_mois, taux_nominal,
            type_pret_code, type_taux_code, type_credit,
            objet_financement_code, date_effet, frac_assurance,
            type_adhesion, differe
          )
        `)
        .eq('id', devisData.dossier_id)
        .single()

      if (dossierError || !dossierData) {
        console.error('[recalculateTarifWithCommission] Dossier non trouvé:', dossierError)
        return { success: false, error: 'Dossier non trouvé' }
      }

      const clientInfo = (dossierData.client_infos as any)?.[0] || dossierData.client_infos
      const pretData = (dossierData.pret_data as any)?.[0] || dossierData.pret_data

      if (!clientInfo || !pretData) {
        console.error('[recalculateTarifWithCommission] Données client/prêt manquantes')
        return { success: false, error: 'Données client ou prêt manquantes' }
      }

      // 3. Mapper les données pour l'API
      const clientInfoForApi = {
        nom: clientInfo.client_nom,
        prenom: clientInfo.client_prenom,
        nom_naissance: clientInfo.client_nom_naissance || clientInfo.client_nom,
        date_naissance: clientInfo.client_date_naissance,
        lieu_naissance: clientInfo.client_lieu_naissance || 'France',
        fumeur: clientInfo.client_fumeur || false,
        categorie_professionnelle: clientInfo.client_categorie_professionnelle || 1,
        deplacement_pro: clientInfo.client_deplacement_pro || 1,
        travaux_manuels: clientInfo.client_travaux_manuels || 0,
        is_couple: clientInfo.is_couple,
        conjoint_nom: clientInfo.conjoint_nom,
        conjoint_prenom: clientInfo.conjoint_prenom,
        conjoint_date_naissance: clientInfo.conjoint_date_naissance,
        conjoint_lieu_naissance: clientInfo.conjoint_lieu_naissance,
        conjoint_fumeur: clientInfo.conjoint_fumeur
      }

      const pretDataForApi = {
        montant_capital: pretData.montant_capital,
        duree_mois: pretData.duree_mois,
        taux_nominal: pretData.taux_nominal,
        type_pret_code: pretData.type_pret_code,
        type_taux_code: pretData.type_taux_code,
        type_credit: pretData.type_credit,
        objet_financement_code: pretData.objet_financement_code,
        date_effet: pretData.date_effet,
        frac_assurance: pretData.frac_assurance,
        type_adhesion: pretData.type_adhesion,
        differe: pretData.differe
      }

      console.log('[recalculateTarifWithCommission] Appel API Exade avec:', {
        idTarif,
        commissionCode,
        fraisCourtierEuros: fraisCourtierCentimes / 100
      })

      // 4. Appeler l'API Exade pour recalculer
      const response = await fetch('/api/exade/tarifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_id: brokerId,
          clientInfo: clientInfoForApi,
          pretData: pretDataForApi,
          idTarif: idTarif,
          commission: {
            frais_adhesion_apporteur: fraisCourtierCentimes / 100,
            commissionnement: commissionCode
          },
          useProductionUrl: false // Utiliser staging pour le recalcul
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[recalculateTarifWithCommission] Erreur API:', response.status, errorData)
        return { success: false, error: errorData.error || `Erreur API: ${response.status}` }
      }

      const apiResult = await response.json()
      console.log('[recalculateTarifWithCommission] Résultat API:', apiResult)

      // 5. Trouver le tarif correspondant dans la réponse
      const tarifs = apiResult.tarifs || []
      const matchingTarif = tarifs.find((t: any) => t.id_tarif === idTarif)

      if (!matchingTarif) {
        console.error('[recalculateTarifWithCommission] Tarif non trouvé dans la réponse')
        return { success: false, error: 'Tarif non trouvé dans la réponse Exade' }
      }

      console.log('[recalculateTarifWithCommission] Nouveau tarif:', {
        cout_total: matchingTarif.cout_total_tarif || matchingTarif.cout_total,
        cout_mensuel: matchingTarif.mensualite || matchingTarif.cout_mensuel
      })

      // 6. Mettre à jour le devis avec les nouvelles valeurs
      const newCoutTotal = matchingTarif.cout_total_tarif || matchingTarif.cout_total || matchingTarif.primeTotale
      const newCoutMensuel = matchingTarif.mensualite || matchingTarif.cout_mensuel || (newCoutTotal / (pretData.duree_mois || 240))

      const existingDonnees = (devisData.donnees_devis || {}) as Record<string, unknown>
      const updatedDonnees = {
        ...existingDonnees,
        ...matchingTarif,
        cout_total: newCoutTotal,
        cout_total_tarif: newCoutTotal,
        cout_mensuel: newCoutMensuel,
        mensualite: newCoutMensuel,
        frais_courtier: fraisCourtierCentimes,
        frais_adhesion_apporteur: fraisCourtierCentimes / 100,
        commission_exade_code: commissionCode,
        recalculated_at: new Date().toISOString()
      }

      const { data: updatedDevis, error: updateError } = await supabase
        .from('devis')
        .update({
          frais_courtier: fraisCourtierCentimes,
          commission_exade_code: commissionCode,
          donnees_devis: updatedDonnees,
          updated_at: new Date().toISOString()
        })
        .eq('id', devisId)
        .select()
        .single()

      if (updateError) {
        console.error('[recalculateTarifWithCommission] Erreur update:', updateError)
        return { success: false, error: 'Erreur lors de la mise à jour du devis' }
      }

      console.log('[recalculateTarifWithCommission] ✅ Devis mis à jour avec succès:', {
        devisId,
        newCoutTotal,
        newCoutMensuel,
        commissionCode,
        fraisCourtierCentimes
      })

      return {
        success: true,
        devis: updatedDevis,
        newCoutTotal,
        newCoutMensuel
      }

    } catch (error) {
      console.error('[recalculateTarifWithCommission] Erreur:', error)
      return { success: false, error: (error as Error).message || 'Erreur inconnue' }
    }
  }
}
