import { supabase } from '@/lib/supabase'

export class DossierReadStatusService {
  /**
   * Marque un dossier comme lu
   */
  static async markAsRead(dossierId: string) {
    const { error } = await supabase
      .from('dossiers')
      .update({ is_read: true })
      .eq('id', dossierId)

    if (error) {
      console.error('Erreur lors du marquage du dossier comme lu:', error)
      throw error
    }
  }

  /**
   * Marque un dossier comme non lu
   */
  static async markAsUnread(dossierId: string) {
    const { error } = await supabase
      .from('dossiers')
      .update({ is_read: false })
      .eq('id', dossierId)

    if (error) {
      console.error('Erreur lors du marquage du dossier comme non lu:', error)
      throw error
    }
  }

  /**
   * Marque plusieurs dossiers comme lus
   */
  static async markMultipleAsRead(dossierIds: string[]) {
    if (dossierIds.length === 0) return

    const { error } = await supabase
      .from('dossiers')
      .update({ is_read: true })
      .in('id', dossierIds)

    if (error) {
      console.error('Erreur lors du marquage multiple des dossiers comme lus:', error)
      throw error
    }
  }

  /**
   * Récupère les statistiques de dossiers non lus par apporteur
   */
  static async getUnreadStatsByApporteur() {
    const { data, error } = await supabase
      .from('dossiers')
      .select(`
        apporteur_id,
        apporteur_profiles!inner(
          id,
          nom,
          prenom
        )
      `)
      .eq('is_read', false)

    if (error) {
      console.error('Erreur lors de la récupération des stats non lus:', error)
      throw error
    }

    // Compter par apporteur
    const stats: Record<string, number> = {}
    data?.forEach(dossier => {
      const apporteurId = dossier.apporteur_id
      if (apporteurId) {
        stats[apporteurId] = (stats[apporteurId] || 0) + 1
      }
    })

    return stats
  }
}
