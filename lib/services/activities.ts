import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Activity = Database['public']['Tables']['activities']['Row']
type ActivityInsert = Database['public']['Tables']['activities']['Insert']
type ActivityUpdate = Database['public']['Tables']['activities']['Update']

export class ActivitiesService {
  /**
   * Récupère toutes les activités avec les informations jointes
   * @param brokerId - Obligatoire pour filtrer les activités par broker
   */
  static async getAllActivities(brokerId?: string) {
    // Si pas de brokerId, retourner un tableau vide pour éviter de montrer les activités d'autres brokers
    if (!brokerId) {
      console.warn('getAllActivities: brokerId manquant, retour tableau vide')
      return []
    }

    const { data, error } = await supabase
      .from('activities_view')
      .select('*')
      .eq('broker_id', brokerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la récupération des activités:', error)
      throw error
    }

    return data
  }

  /**
   * Récupère les activités d'un utilisateur spécifique
   */
  static async getActivitiesByUserId(userId: string) {
    const { data, error } = await supabase
      .from('activities_view')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la récupération des activités utilisateur:', error)
      throw error
    }

    return data
  }

  /**
   * Récupère les activités d'un dossier spécifique
   */
  static async getActivitiesByDossierId(dossierId: string) {
    const { data, error } = await supabase
      .from('activities_view')
      .select('*')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la récupération des activités du dossier:', error)
      throw error
    }

    return data
  }

  /**
   * Récupère les activités non lues d'un utilisateur
   */
  static async getUnreadActivitiesByUserId(userId: string) {
    const { data, error } = await supabase
      .from('activities_view')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la récupération des activités non lues:', error)
      throw error
    }

    return data
  }

  /**
   * Crée une nouvelle activité
   * @param activityData Les données de l'activité
   * @param brokerId Optionnel - Le broker_id à associer à l'activité
   */
  static async createActivity(activityData: ActivityInsert, brokerId?: string) {
    const insertData = brokerId 
      ? { ...activityData, broker_id: brokerId }
      : activityData

    const { data, error } = await supabase
      .from('activities')
      .insert(insertData as any)
      .select()
      .single()

    if (error) {
      console.error('Erreur lors de la création de l\'activité:', error)
      throw error
    }

    return data
  }

  /**
   * Marque une activité comme lue
   */
  static async markActivityAsRead(activityId: string) {
    const { data, error } = await supabase
      .from('activities')
      .update({ is_read: true })
      .eq('id', activityId)
      .select()
      .single()

    if (error) {
      console.error('Erreur lors du marquage de l\'activité comme lue:', error)
      throw error
    }

    return data
  }

  /**
   * Marque toutes les activités d'un utilisateur comme lues
   */
  static async markAllActivitiesAsRead(userId: string) {
    const { error } = await supabase
      .from('activities')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Erreur lors du marquage de toutes les activités comme lues:', error)
      throw error
    }

    return true
  }

  /**
   * Supprime une activité
   */
  static async deleteActivity(activityId: string) {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId)

    if (error) {
      console.error('Erreur lors de la suppression de l\'activité:', error)
      throw error
    }

    return true
  }

  /**
   * Crée une activité de type "dossier créé"
   */
  static async createDossierCreatedActivity(
    userId: string,
    dossierId: string,
    numeroDossier: string,
    typeDossier: string,
    brokerId?: string
  ) {
    return this.createActivity({
      user_id: userId,
      dossier_id: dossierId,
      activity_type: 'dossier_created',
      activity_title: 'Nouveau dossier créé',
      activity_description: `Le dossier ${numeroDossier} (${typeDossier}) a été créé avec succès.`,
      activity_data: {
        dossier_numero: numeroDossier,
        type_dossier: typeDossier,
        action: 'created'
      }
    }, brokerId)
  }

  /**
   * Crée une activité de type "dossier attribué" (pour les apporteurs)
   * Cette activité est créée quand un admin assigne un dossier à un apporteur
   */
  static async createDossierAttribueActivity(
    apporteurId: string,
    dossierId: string,
    numeroDossier: string,
    brokerId?: string,
    clientNom?: string
  ) {
    const description = clientNom 
      ? `Un nouveau dossier pour ${clientNom} vous a été attribué par l'administrateur.`
      : `Un nouveau dossier ${numeroDossier} vous a été attribué par l'administrateur.`

    return this.createActivity({
      user_id: apporteurId,
      dossier_id: dossierId,
      activity_type: 'dossier_attribue',
      activity_title: 'Dossier attribué',
      activity_description: description,
      activity_data: {
        dossier_numero: numeroDossier,
        created_by_admin: true,
        client_nom: clientNom,
        action: 'dossier_attribue'
      }
    }, brokerId)
  }

  /**
   * Crée une activité de type "devis envoyé" (VERSION FRANÇAISE)
   */
  static async createDevisEnvoyeActivity(
    userId: string,
    dossierId: string,
    numeroDossier: string,
    numeroDevis: string,
    brokerId?: string
  ) {
    return this.createActivity({
      user_id: userId,
      dossier_id: dossierId,
      activity_type: 'devis_envoye',
      activity_title: 'Devis envoyé',
      activity_description: `Le devis ${numeroDevis} du dossier ${numeroDossier} a été envoyé au client.`,
      activity_data: {
        dossier_numero: numeroDossier,
        devis_numero: numeroDevis,
        action: 'devis_envoye'
      }
    }, brokerId)
  }

  /**
   * Crée une activité de type "devis accepté" (VERSION FRANÇAISE)
   */
  static async createDevisAccepteActivity(
    userId: string,
    dossierId: string,
    numeroDossier: string,
    numeroDevis: string,
    brokerId?: string
  ) {
    return this.createActivity({
      user_id: userId,
      dossier_id: dossierId,
      activity_type: 'devis_accepte',
      activity_title: 'Devis accepté',
      activity_description: `Le devis ${numeroDevis} du dossier ${numeroDossier} a été accepté par le client.`,
      activity_data: {
        dossier_numero: numeroDossier,
        devis_numero: numeroDevis,
        action: 'devis_accepte'
      }
    }, brokerId)
  }

  /**
   * Crée une activité de type "dossier finalisé"
   */
  static async createDossierFinaliseActivity(
    userId: string,
    dossierId: string,
    numeroDossier: string,
    brokerId?: string
  ) {
    return this.createActivity({
      user_id: userId,
      dossier_id: dossierId,
      activity_type: 'dossier_finalise',
      activity_title: 'Dossier finalisé',
      activity_description: `Le dossier ${numeroDossier} a été finalisé avec succès.`,
      activity_data: {
        dossier_numero: numeroDossier,
        action: 'dossier_finalise'
      }
    }, brokerId)
  }

  /**
   * Crée une activité de type "dossier supprimé" (pour les apporteurs)
   * Notifie l'apporteur que son dossier a été supprimé
   */
  static async createDossierSupprimeActivity(
    apporteurId: string,
    dossierId: string,
    numeroDossier: string,
    brokerId?: string,
    clientNom?: string
  ) {
    const description = clientNom 
      ? `Le dossier de ${clientNom} a été supprimé par l'administrateur.`
      : `Le dossier ${numeroDossier} a été supprimé par l'administrateur.`

    return this.createActivity({
      user_id: apporteurId,
      dossier_id: dossierId,
      activity_type: 'dossier_supprime',
      activity_title: 'Dossier supprimé',
      activity_description: description,
      activity_data: {
        dossier_numero: numeroDossier,
        deleted_by: 'admin',
        client_nom: clientNom,
        action: 'dossier_supprime'
      }
    }, brokerId)
  }

  /**
   * Crée une activité de type "statut mis à jour"
   */
  static async createStatusUpdatedActivity(
    userId: string,
    dossierId: string,
    numeroDossier: string,
    ancienStatut: string,
    nouveauStatut: string,
    brokerId?: string
  ) {
    return this.createActivity({
      user_id: userId,
      dossier_id: dossierId,
      activity_type: 'status_updated',
      activity_title: 'Statut mis à jour',
      activity_description: `Le statut du dossier ${numeroDossier} a été modifié de "${ancienStatut}" vers "${nouveauStatut}".`,
      activity_data: {
        dossier_numero: numeroDossier,
        ancien_statut: ancienStatut,
        nouveau_statut: nouveauStatut,
        action: 'status_updated'
      }
    }, brokerId)
  }

  /**
   * Récupère les statistiques des activités
   */
  static async getActivityStats(userId?: string, brokerId?: string) {
    let query = supabase
      .from('activities')
      .select('activity_type, is_read, created_at')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erreur lors de la récupération des statistiques d\'activités:', error)
      throw error
    }

    const stats = {
      total: data.length,
      nonLues: 0,
      parType: {} as Record<string, number>,
      parMois: {} as Record<string, number>
    }

    data.forEach((activity: Activity) => {
      // Compter les non lues
      if (!activity.is_read) {
        stats.nonLues++
      }

      // Compter par type
      stats.parType[activity.activity_type] = (stats.parType[activity.activity_type] || 0) + 1

      // Compter par mois
      if (activity.created_at) {
        const month = new Date(activity.created_at).toISOString().slice(0, 7)
        stats.parMois[month] = (stats.parMois[month] || 0) + 1
      }
    })

    return stats
  }

  /**
   * S'abonne aux nouvelles activités en temps réel
   */
  static subscribeToActivities(userId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel('activities_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()

    return channel
  }

  /**
   * Se désabonne des activités en temps réel
   */
  static unsubscribeFromActivities(channel: any) {
    supabase.removeChannel(channel)
  }

  /**
   * Récupère les notifications filtrées pour un APPORTEUR
   * Affiche les actions pertinentes pour l'apporteur :
   * - dossier_attribue: quand un admin lui assigne un dossier
   * - dossier_supprime: quand un de ses dossiers est supprimé
   * - classement_updated: quand son classement change
   * - dossier_created: quand il crée lui-même un dossier (confirmation)
   * - dossier_finalise: quand un de ses dossiers est finalisé
   * - devis_envoye: quand un devis est envoyé pour son dossier
   * - commission_paid: quand il reçoit une commission
   */
  static async getNotificationsForApporteur(userId: string, limit: number = 10) {
    // Validation de l'UUID pour éviter les erreurs de syntaxe PostgreSQL
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!userId || !uuidRegex.test(userId)) {
      console.warn('getNotificationsForApporteur: userId invalide, retour tableau vide')
      return []
    }

    const { data, error } = await supabase
      .from('activities_view')
      .select('*')
      .eq('user_id', userId)
      .in('activity_type', [
        'dossier_attribue',      // Admin assigne un dossier
        'dossier_supprime',      // Dossier supprimé
        'classement_updated',    // Classement modifié
        'dossier_created',       // Dossier créé par l'apporteur
        'dossier_finalise',      // Dossier finalisé (commission bientôt disponible)
        'devis_envoye',          // Devis envoyé au client
        'commission_paid'        // Commission payée
      ])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Erreur lors de la récupération des notifications apporteur:', error)
      throw error
    }

    return data
  }

  /**
   * Récupère les notifications filtrées pour un ADMIN
   * N'affiche QUE les actions faites par les apporteurs DE CE BROKER
   */
  static async getNotificationsForAdmin(limit: number = 10, brokerId?: string) {
    // Si pas de brokerId, on ne peut pas filtrer correctement
    if (!brokerId) {
      console.warn('getNotificationsForAdmin: brokerId manquant, retour tableau vide')
      return []
    }

    const { data, error } = await supabase
      .from('activities_view')
      .select('*')
      .eq('broker_id', brokerId)
      .in('activity_type', ['dossier_created', 'devis_accepte', 'devis_refuse', 'dossier_finalise'])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Erreur lors de la récupération des notifications admin:', error)
      throw error
    }

    return data
  }

  /**
   * Récupère les activités avec pagination
   */
  static async getActivitiesByUserIdPaginated(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ) {
    const { data, error } = await supabase
      .from('activities_view')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Erreur lors de la récupération des activités paginées:', error)
      throw error
    }

    return data
  }

  /**
   * Récupère toutes les activités avec pagination (pour admin)
   * @param brokerId - Obligatoire pour filtrer les activités par broker
   */
  static async getAllActivitiesPaginated(
    limit: number = 20,
    offset: number = 0,
    brokerId?: string
  ) {
    // Si pas de brokerId, retourner un tableau vide pour éviter de montrer les activités d'autres brokers
    if (!brokerId) {
      console.warn('getAllActivitiesPaginated: brokerId manquant, retour tableau vide')
      return []
    }

    const { data, error } = await supabase
      .from('activities_view')
      .select('*')
      .eq('broker_id', brokerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Erreur lors de la récupération de toutes les activités paginées:', error)
      throw error
    }

    return data
  }

  /**
   * Compte le nombre total d'activités d'un utilisateur
   */
  static async countActivitiesByUserId(userId: string) {
    const { count, error } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      console.error('Erreur lors du comptage des activités:', error)
      throw error
    }

    return count || 0
  }

  /**
   * Compte le nombre total d'activités (pour admin)
   * @param brokerId - Obligatoire pour filtrer les activités par broker
   */
  static async countAllActivities(brokerId?: string) {
    // Si pas de brokerId, retourner 0 pour éviter de compter les activités d'autres brokers
    if (!brokerId) {
      console.warn('countAllActivities: brokerId manquant, retour 0')
      return 0
    }

    const { count, error } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('broker_id', brokerId)

    if (error) {
      console.error('Erreur lors du comptage de toutes les activités:', error)
      throw error
    }

    return count || 0
  }
}
