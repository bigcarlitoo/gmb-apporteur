import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type ApporteurProfile = Database['public']['Tables']['apporteur_profiles']['Row']
type ApporteurProfileInsert = Database['public']['Tables']['apporteur_profiles']['Insert']
type ApporteurProfileUpdate = Database['public']['Tables']['apporteur_profiles']['Update']

export class ApporteursService {
  /**
   * Récupère tous les apporteurs liés au broker de l'utilisateur avec leurs statistiques
   * ✅ Utilise statut_canon (source de vérité unique)
   * ✅ Filtre via broker_apporteurs pour le broker_id
   */
  static async getAllApporteurs(brokerId?: string) {
    // Si pas de brokerId fourni, récupérer via le contexte de l'utilisateur
    if (!brokerId) {
      // Récupérer le broker de l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('Utilisateur non connecté')
        return []
      }
      
      // Vérifier si c'est un courtier
      const { data: brokerUser } = await supabase
        .from('broker_users')
        .select('broker_id')
        .eq('user_id', user.id)
        .single()
      
      if (brokerUser) {
        brokerId = brokerUser.broker_id
      }
    }
    
    if (!brokerId) {
      console.error('Aucun broker_id trouvé')
      return []
    }
    
    // Récupérer les apporteurs liés à ce broker
    const { data: brokerApporteurs, error: baError } = await supabase
      .from('broker_apporteurs')
      .select('apporteur_profile_id')
      .eq('broker_id', brokerId)
    
    if (baError) {
      console.error('Erreur lors de la récupération des liens broker-apporteurs:', baError)
      throw baError
    }
    
    const apporteurIds = brokerApporteurs?.map(ba => ba.apporteur_profile_id) || []
    
    if (apporteurIds.length === 0) {
      return []
    }
    
    // Récupérer les profils des apporteurs
    const { data, error } = await supabase
      .from('apporteur_profiles')
      .select(`
        *,
        dossiers (
          id,
          statut:statut_canon,
          date_creation,
          economie_generee
        )
      `)
      .in('id', apporteurIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la récupération des apporteurs:', error)
      throw error
    }

    return data
  }

  /**
   * Récupère un apporteur par son ID
   * ✅ Utilise statut_canon (source de vérité unique)
   */
  static async getApporteurById(id: string, brokerId?: string) {
    const { data, error } = await supabase
      .from('apporteur_profiles')
      .select(`
        *,
        dossiers (
          id,
          numero_dossier,
          statut:statut_canon,
          date_creation,
          is_couple,
          type_dossier,
          economie_generee,
          client_infos (
            client_prenom,
            client_nom
          ),
          pret_data (
            montant_capital,
            type_pret
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erreur lors de la récupération de l\'apporteur:', error)
      throw error
    }

    return data
  }

  /**
   * Crée un nouveau profil apporteur
   */
  static async createApporteur(apporteur: ApporteurProfileInsert) {
    const { data, error } = await supabase
      .from('apporteur_profiles')
      .insert(apporteur)
      .select()
      .single()

    if (error) {
      console.error('Erreur lors de la création de l\'apporteur:', error)
      throw error
    }

    return data
  }

  /**
   * Met à jour un profil apporteur
   */
  static async updateApporteur(id: string, updates: ApporteurProfileUpdate) {
    const { data, error } = await supabase
      .from('apporteur_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erreur lors de la mise à jour de l\'apporteur:', error)
      throw error
    }

    return data
  }

  /**
   * Supprime un profil apporteur (détache ses dossiers)
   */
  static async deleteApporteur(id: string) {
    try {
      // 1. Détacher les dossiers de l'apporteur (ils restent visibles admin)
      const { error: dossiersError } = await supabase
        .from('dossiers')
        .update({ apporteur_id: null })
        .eq('apporteur_id', id)

      if (dossiersError) throw dossiersError

      // 2. Supprimer le profil apporteur
      const { error: deleteError } = await supabase
        .from('apporteur_profiles')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // TODO: Une fois auth implémenté, supprimer aussi de auth.users
      // await supabase.auth.admin.deleteUser(user_id)
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'apporteur:', error)
      throw error
    }
  }

  /**
   * DÉTERMINE SI UN APPORTEUR EST INACTIF
   * Un apporteur est considéré inactif si :
   * - Il ne s'est pas connecté depuis 2 mois OU
   * - Il n'a pas déposé de dossier depuis 2 mois
   * 
   * @param lastLoginAt - Date de dernière connexion
   * @param dossiers - Liste des dossiers de l'apporteur
   * @returns true si l'apporteur doit être marqué comme inactif
   */
  static isApporteurInactif(lastLoginAt: string | null, dossiers: any[]): boolean {
    const deuxMoisEnMs = 60 * 24 * 60 * 60 * 1000; // 60 jours en millisecondes
    const maintenant = new Date().getTime();

    // Vérifier la dernière connexion
    const derniereConnexion = lastLoginAt ? new Date(lastLoginAt).getTime() : 0;
    const inactifConnexion = maintenant - derniereConnexion > deuxMoisEnMs;

    // Vérifier le dernier dossier déposé
    let inactifDossier = true;
    if (dossiers.length > 0) {
      const dossiersTries = [...dossiers].sort((a, b) =>
        new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime()
      );
      const dernierDossier = dossiersTries[0];
      const dateDernierDossier = new Date(dernierDossier.date_creation).getTime();
      inactifDossier = maintenant - dateDernierDossier > deuxMoisEnMs;
    }

    // Inactif si AUCUNE activité (connexion OU dépôt de dossier) depuis 2 mois
    return inactifConnexion && inactifDossier;
  }

  /**
   * MÉTHODE CENTRALISÉE DE CALCUL DES STATISTIQUES D'UN APPORTEUR
   * Cette méthode unique assure la cohérence entre la page liste et la page détail
   * 
   * ⚠️ IMPORTANT : Les dossiers doivent avoir le champ 'statut' provenant de 'statut_canon'
   * 
   * @param dossiers - Liste des dossiers de l'apporteur (avec statut = statut_canon)
   * @returns Statistiques calculées de manière standardisée
   */
  static calculateApporteurStats(dossiers: any[]) {
    const totalDossiers = dossiers.length;

    // ✅ Utilise les fonctions de validation de l'utilitaire centralisé
    // Dossiers validés = finalise OU devis_accepte
    const dossiersValides = dossiers.filter((d: any) =>
      d.statut === 'finalise' || d.statut === 'devis_accepte'
    );

    // Dossiers finalisés = uniquement ceux avec statut 'finalise'
    const dossiersFinalises = dossiers.filter((d: any) =>
      d.statut === 'finalise'
    );

    // Économies générées = somme des economie_generee des dossiers finalisés uniquement
    const economiesGenerees = dossiersFinalises.reduce(
      (sum: number, d: any) => sum + Number(d.economie_generee || 0),
      0
    );

    // Taux de conversion = (dossiers validés / total dossiers) * 100
    const tauxConversion = totalDossiers > 0
      ? Number(((dossiersValides.length / totalDossiers) * 100).toFixed(1))
      : 0;

    return {
      totalDossiers,
      dossiersValides: dossiersValides.length,
      dossiersFinalises: dossiersFinalises.length,
      economiesGenerees,
      tauxConversion
    };
  }

  /**
   * Récupère les statistiques d'un apporteur avec classement réel
   * ✅ Utilise statut_canon (source de vérité unique)
   */
  static async getApporteurStats(apporteurId: string, brokerId?: string) {
    console.log('🔍 getApporteurStats - Apporteur ID:', apporteurId);

    try {
      // Récupérer les dossiers de l'apporteur avec statut_canon
      const { data: apporteurData, error: apporteurError } = await supabase
        .from('apporteur_profiles')
        .select(`
          id,
          dossiers (
            id,
            statut:statut_canon,
            economie_generee
          )
        `)
        .eq('id', apporteurId)
        .single();

      if (apporteurError) {
        console.error('❌ Erreur lors de la récupération de l\'apporteur:', apporteurError);
        throw apporteurError;
      }

      const dossiers = apporteurData?.dossiers || [];

      // Utiliser la méthode centralisée de calcul
      const stats = this.calculateApporteurStats(dossiers);

      // Récupérer le classement via RPC
      const { data: rankingData, error: rankingError } = await supabase
        .rpc('get_apporteur_ranking');

      let classement = 0;
      let progressionClassement = 'Non classé';
      let totalApporteurs = 0;

      if (!rankingError && rankingData) {
        totalApporteurs = rankingData.length;
        const apporteurRank = rankingData.find((a: any) => a.apporteur_id === apporteurId);

        if (apporteurRank) {
          classement = Number(apporteurRank.classement);
          progressionClassement = classement <= 3
            ? `Top ${classement}`
            : `#${classement}`;
        }
      }

      console.log('✅ getApporteurStats - Stats calculées (méthode centralisée):', stats);

      return {
        totalDossiers: stats.totalDossiers,
        dossiersFinalises: stats.dossiersFinalises,
        dossiersValides: stats.dossiersValides,
        economiesGenerees: stats.economiesGenerees,
        tauxConversion: stats.tauxConversion,
        classement,
        progressionDossiers: 0, // À calculer si nécessaire
        progressionEconomies: 0, // À calculer si nécessaire
        progressionClassement,
        totalApporteurs
      };
    } catch (error) {
      console.error('❌ getApporteurStats - Erreur détaillée:', error);
      throw error;
    }
  }

  /**
   * Récupère le classement complet de tous les apporteurs
   */
  static async getFullRanking(brokerId?: string) {
    console.log('🏆 getFullRanking - Récupération du classement complet');

    try {
      const { data, error } = await supabase
        .rpc('get_apporteur_ranking');

      if (error) {
        console.error('❌ Erreur lors de la récupération du classement:', error);
        throw error;
      }

      console.log('📊 getFullRanking - Classement récupéré:', data?.length, 'apporteurs');

      return data || [];
    } catch (error) {
      console.error('❌ getFullRanking - Erreur détaillée:', error);
      throw error;
    }
  }

  /**
   * Récupère la performance mensuelle détaillée d'un apporteur
   * @param apporteurId - ID de l'apporteur
   * @param months - Nombre de mois à récupérer (par défaut 24)
   */
  static async getMonthlyPerformance(apporteurId: string, months: number = 24, brokerId?: string) {
    try {
      const { data, error } = await supabase
        .from('dossiers')
        .select(`
          id,
          date_creation,
          statut_canon,
          economie_generee,
          montant_capital
        `)
        .eq('apporteur_id', apporteurId)
        .order('date_creation', { ascending: false })

      if (error) throw error

      // Grouper par mois
      const monthlyData: Record<string, any> = {}

      data.forEach((dossier: any) => {
        const date = new Date(dossier.date_creation)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthDisplay = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthDisplay,
            monthKey,
            dossiers_traites: 0,
            dossiers_valides: 0,
            economies_generees: 0
          }
        }

        monthlyData[monthKey].dossiers_traites++
        if (['finalise', 'devis_accepte'].includes(dossier.statut_canon)) {
          monthlyData[monthKey].dossiers_valides++
        }
        monthlyData[monthKey].economies_generees += Number(dossier.economie_generee || 0)
      })

      // Trier par date décroissante et limiter au nombre de mois demandé
      return Object.values(monthlyData)
        .sort((a: any, b: any) => b.monthKey.localeCompare(a.monthKey))
        .slice(0, months)
    } catch (error) {
      console.error('Erreur lors de la récupération de la performance mensuelle:', error)
      throw error
    }
  }

  /**
   * Suspend un apporteur
   * @param id - ID de l'apporteur
   * @param raison - Raison de la suspension
   */
  static async suspendApporteur(id: string, raison: string) {
    try {
      // 1. Mettre à jour le statut
      const { data, error } = await supabase
        .from('apporteur_profiles')
        .update({
          statut: 'suspendu',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // 2. Créer une activité pour traçabilité
      await supabase.from('activities').insert({
        user_id: id,
        activity_type: 'compte_suspendu',
        activity_title: 'Compte suspendu',
        activity_description: `Votre compte a été suspendu. Raison: ${raison}`,
        activity_data: { raison, date_suspension: new Date().toISOString() }
      })

      // TODO: Une fois Resend intégré, envoyer un email de notification
      // await sendSuspensionEmail(data.email, data.prenom, data.nom, raison)

      return data
    } catch (error) {
      console.error('Erreur lors de la suspension de l\'apporteur:', error)
      throw error
    }
  }

  /**
   * Réactive un apporteur suspendu
   * @param id - ID de l'apporteur
   */
  static async reactivateApporteur(id: string) {
    try {
      // 1. Mettre à jour le statut
      const { data, error } = await supabase
        .from('apporteur_profiles')
        .update({
          statut: 'actif',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // 2. Créer une activité pour traçabilité
      await supabase.from('activities').insert({
        user_id: id,
        activity_type: 'compte_reactive',
        activity_title: 'Compte réactivé',
        activity_description: 'Votre compte a été réactivé avec succès. Vous pouvez maintenant soumettre de nouveaux dossiers.',
        activity_data: { date_reactivation: new Date().toISOString() }
      })

      // TODO: Une fois Resend intégré, envoyer un email de notification
      // await sendReactivationEmail(data.email, data.prenom, data.nom)

      return data
    } catch (error) {
      console.error('Erreur lors de la réactivation de l\'apporteur:', error)
      throw error
    }
  }

  /**
   * Récupère les statistiques des apporteurs pour le dashboard admin
   * ✅ Calcule les nouveaux apporteurs du mois en cours
   */
  static async getApporteursDashboardStats(brokerId?: string) {
    const { data: apporteurs, error } = await supabase
      .from('apporteur_profiles')
      .select('id, statut, created_at')

    if (error) {
      console.error('Erreur lors de la récupération des stats apporteurs:', error)
      throw error
    }

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const totalApporteurs = apporteurs.length
    const apporteursActifs = apporteurs.filter((a: any) => a.statut === 'actif').length
    const nouveauxApporteursCeMois = apporteurs.filter((a: any) => {
      const dateCreation = new Date(a.created_at)
      return dateCreation >= currentMonthStart
    }).length

    return {
      totalApporteurs,
      apporteursActifs,
      nouveauxApporteursCeMois
    }
  }
}
