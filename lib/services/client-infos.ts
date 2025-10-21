import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type ClientInfo = Database['public']['Tables']['client_infos']['Row']
type ClientInfoInsert = Database['public']['Tables']['client_infos']['Insert']
type ClientInfoUpdate = Database['public']['Tables']['client_infos']['Update']

export class ClientInfosService {
  /**
   * Récupère les informations client d'un dossier
   */
  static async getClientInfoByDossierId(dossierId: string) {
    const { data, error } = await supabase
      .from('client_infos')
      .select('*')
      .eq('dossier_id', dossierId)
      .single()

    if (error) {
      console.error('Erreur lors de la récupération des infos client:', error)
      throw error
    }

    return data
  }

  /**
   * Crée ou met à jour les informations client
   */
  static async upsertClientInfo(clientData: ClientInfoInsert) {
    // Logs de contexte
    const { data: authUser } = await supabase.auth.getUser()
    console.log('[ClientInfosService.upsert] input', { clientData, authUser: authUser?.user?.id })

    // Certains environnements n'ont pas de contrainte unique sur dossier_id.
    // Éviter .single()/maybeSingle() qui peuvent retourner 406 s'il y a des doublons.
    const { data: rows, error: selectError } = await supabase
      .from('client_infos')
      .select('id')
      .eq('dossier_id', clientData.dossier_id as string)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (selectError) {
      console.error('[ClientInfosService.upsert] select existing error', selectError)
      throw selectError
    }

    const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null

    if (existing) {
      console.log('[ClientInfosService.upsert] existing found', existing)
      const { data, error } = await supabase
        .from('client_infos')
        .update({ ...(clientData as ClientInfoUpdate), updated_at: new Date().toISOString() })
        .eq('dossier_id', clientData.dossier_id as string)
        .select()
        .limit(1)

      if (error) {
        console.error('[ClientInfosService.upsert] update error', error)
        throw error
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error('Aucune ligne mise à jour (RLS a probablement bloqué la requête)')
      }

      const updated = Array.isArray(data) ? data[0] : (data as any)
      console.log('[ClientInfosService.upsert] update ok', updated)
      return updated
    }

    const { data, error } = await supabase
      .from('client_infos')
      .insert({ ...clientData, updated_at: new Date().toISOString() })
      .select()
      .limit(1)

    if (error) {
      console.error('[ClientInfosService.upsert] insert error', error)
      throw error
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('Aucune ligne insérée (RLS a probablement bloqué la requête)')
    }

    const inserted = Array.isArray(data) ? data[0] : (data as any)
    console.log('[ClientInfosService.upsert] insert ok', inserted)
    return inserted
  }

  /**
   * Met à jour les informations client
   */
  static async updateClientInfo(dossierId: string, updates: ClientInfoUpdate) {
    const { data, error } = await supabase
      .from('client_infos')
      .update(updates)
      .eq('dossier_id', dossierId)
      .select()
      .single()

    if (error) {
      console.error('Erreur lors de la mise à jour des infos client:', error)
      throw error
    }

    return data
  }

  /**
   * Supprime les informations client d'un dossier
   */
  static async deleteClientInfo(dossierId: string) {
    const { error } = await supabase
      .from('client_infos')
      .delete()
      .eq('dossier_id', dossierId)

    if (error) {
      console.error('Erreur lors de la suppression des infos client:', error)
      throw error
    }

    return true
  }

  /**
   * Recherche des clients par nom ou email
   */
  static async searchClients(searchTerm: string) {
    const { data, error } = await supabase
      .from('client_infos')
      .select(`
        *,
        dossiers (
          id,
          numero_dossier,
          statut,
          type_dossier
        )
      `)
      .or(`client_nom.ilike.%${searchTerm}%,client_prenom.ilike.%${searchTerm}%,client_email.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Erreur lors de la recherche des clients:', error)
      throw error
    }

    return data
  }

  /**
   * Valide les données client avant sauvegarde
   */
  static validateClientData(data: Partial<ClientInfoInsert>): string[] {
    const errors: string[] = []

    if (!data.client_nom?.trim()) {
      errors.push('Le nom du client est requis')
    }
    if (!data.client_prenom?.trim()) {
      errors.push('Le prénom du client est requis')
    }
    if (!data.client_email?.trim()) {
      errors.push('L\'email du client est requis')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.client_email)) {
      errors.push('L\'email du client n\'est pas valide')
    }
    if (!data.client_date_naissance) {
      errors.push('La date de naissance du client est requise')
    }

    // Validation optionnelle du conjoint si des données sont fournies
    if (data.conjoint_nom || data.conjoint_prenom || data.conjoint_email) {
      if (!data.conjoint_nom?.trim()) {
        errors.push('Le nom du conjoint est requis si des informations conjoint sont fournies')
      }
      if (!data.conjoint_prenom?.trim()) {
        errors.push('Le prénom du conjoint est requis si des informations conjoint sont fournies')
      }
      if (!data.conjoint_email?.trim()) {
        errors.push('L\'email du conjoint est requis si des informations conjoint sont fournies')
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.conjoint_email)) {
        errors.push('L\'email du conjoint n\'est pas valide')
      }
      if (!data.conjoint_date_naissance) {
        errors.push('La date de naissance du conjoint est requise si des informations conjoint sont fournies')
      }
    }

    return errors
  }
}
