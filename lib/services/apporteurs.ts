import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type ApporteurProfile = Database['public']['Tables']['apporteur_profiles']['Row']
type ApporteurProfileInsert = Database['public']['Tables']['apporteur_profiles']['Insert']
type ApporteurProfileUpdate = Database['public']['Tables']['apporteur_profiles']['Update']

export class ApporteursService {
  /**
   * Récupère tous les apporteurs avec leurs statistiques
   */
  static async getAllApporteurs() {
    const { data, error } = await supabase
      .from('apporteur_profiles')
      .select(`
        *,
        dossiers (
          id,
          statut,
          date_creation
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la récupération des apporteurs:', error)
      throw error
    }

    return data
  }

  /**
   * Récupère un apporteur par son ID
   */
  static async getApporteurById(id: string) {
    const { data, error } = await supabase
      .from('apporteur_profiles')
      .select(`
        *,
        dossiers (
          id,
          numero_dossier,
          statut,
          date_creation,
          client_infos (
            client_prenom,
            client_nom
          ),
          pret_data (
            montant_capital
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
   * Supprime un profil apporteur
   */
  static async deleteApporteur(id: string) {
    const { error } = await supabase
      .from('apporteur_profiles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erreur lors de la suppression de l\'apporteur:', error)
      throw error
    }
  }

  /**
   * Récupère les statistiques d'un apporteur avec classement réel
   */
  static async getApporteurStats(apporteurId: string) {
    console.log('🔍 getApporteurStats - Apporteur ID:', apporteurId);
    
    try {
      // Utiliser la fonction de classement pour obtenir les vraies statistiques
      const { data: rankingData, error: rankingError } = await supabase
        .rpc('get_apporteur_ranking');

      if (rankingError) {
        console.error('❌ Erreur lors de la récupération du classement:', rankingError);
        throw rankingError;
      }

      console.log('📊 getApporteurStats - Données de classement:', rankingData);

      // Trouver l'apporteur dans le classement
      const apporteurStats = rankingData?.find((a: any) => a.apporteur_id === apporteurId);

      if (!apporteurStats) {
        console.warn('⚠️ getApporteurStats - Apporteur non trouvé dans le classement');
        return {
          totalDossiers: 0,
          dossiersFinalises: 0,
          economiesGenerees: 0,
          classement: 0,
          progressionDossiers: 0,
          progressionEconomies: 0,
          progressionClassement: 'Non classé'
        };
      }

      const totalApporteurs = rankingData?.length || 0;
      const progressionClassement = apporteurStats.classement <= 3 
        ? `Top ${apporteurStats.classement}` 
        : `#${apporteurStats.classement}`;

      console.log('✅ getApporteurStats - Stats calculées:', {
        totalDossiers: apporteurStats.total_dossiers,
        dossiersFinalises: apporteurStats.dossiers_finalises,
        economiesGenerees: apporteurStats.total_economies,
        classement: apporteurStats.classement,
        progressionDossiers: apporteurStats.progression_dossiers,
        progressionEconomies: apporteurStats.progression_economies
      });

      return {
        totalDossiers: Number(apporteurStats.total_dossiers),
        dossiersFinalises: Number(apporteurStats.dossiers_finalises),
        economiesGenerees: Number(apporteurStats.total_economies),
        classement: Number(apporteurStats.classement),
        progressionDossiers: Number(apporteurStats.progression_dossiers),
        progressionEconomies: Number(apporteurStats.progression_economies),
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
  static async getFullRanking() {
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
}
