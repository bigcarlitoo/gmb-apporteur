import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Activity = Database['public']['Tables']['activities']['Row']
type ActivityInsert = Database['public']['Tables']['activities']['Insert']
type ActivityUpdate = Database['public']['Tables']['activities']['Update']

export class ActivitiesService {
  /**
   * Récupère toutes les activités avec les informations jointes
   */
  static async getAllActivities() {
    const { data, error } = await supabase
      .from('activities_view')
      .select('*')
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
   */
  static async createActivity(activityData: ActivityInsert) {
    const { data, error } = await supabase
      .from('activities')
      .insert(activityData)
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
    typeDossier: string
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
    })
  }

  /**
   * Crée une activité de type "devis généré"
   */
  static async createDevisGeneratedActivity(
    userId: string,
    dossierId: string,
    numeroDossier: string,
    numeroDevis: string
  ) {
    return this.createActivity({
      user_id: userId,
      dossier_id: dossierId,
      activity_type: 'devis_generated',
      activity_title: 'Devis généré',
      activity_description: `Un devis (${numeroDevis}) a été généré pour le dossier ${numeroDossier}.`,
      activity_data: {
        dossier_numero: numeroDossier,
        devis_numero: numeroDevis,
        action: 'devis_generated'
      }
    })
  }

  /**
   * Crée une activité de type "devis envoyé"
   */
  static async createDevisSentActivity(
    userId: string,
    dossierId: string,
    numeroDossier: string,
    numeroDevis: string
  ) {
    return this.createActivity({
      user_id: userId,
      dossier_id: dossierId,
      activity_type: 'devis_sent',
      activity_title: 'Devis envoyé',
      activity_description: `Le devis ${numeroDevis} du dossier ${numeroDossier} a été envoyé au client.`,
      activity_data: {
        dossier_numero: numeroDossier,
        devis_numero: numeroDevis,
        action: 'devis_sent'
      }
    })
  }

  /**
   * Crée une activité de type "devis accepté"
   */
  static async createDevisAcceptedActivity(
    userId: string,
    dossierId: string,
    numeroDossier: string,
    numeroDevis: string
  ) {
    return this.createActivity({
      user_id: userId,
      dossier_id: dossierId,
      activity_type: 'devis_accepted',
      activity_title: 'Devis accepté',
      activity_description: `Le devis ${numeroDevis} du dossier ${numeroDossier} a été accepté par le client.`,
      activity_data: {
        dossier_numero: numeroDossier,
        devis_numero: numeroDevis,
        action: 'devis_accepted'
      }
    })
  }

  /**
   * Crée une activité de type "statut mis à jour"
   */
  static async createStatusUpdatedActivity(
    userId: string,
    dossierId: string,
    numeroDossier: string,
    ancienStatut: string,
    nouveauStatut: string
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
    })
  }

  /**
   * Récupère les statistiques des activités
   */
  static async getActivityStats(userId?: string) {
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

    data.forEach(activity => {
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
}
