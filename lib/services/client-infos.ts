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
    console.log('═══════════════════════════════════════════')
    console.log('[ClientInfosService.upsert] 🔄 DÉBUT UPSERT')
    
    // Logs de contexte
    const { data: authUser } = await supabase.auth.getUser()
    console.log('[ClientInfosService.upsert] User ID:', authUser?.user?.id)
    console.log('[ClientInfosService.upsert] Dossier ID:', clientData.dossier_id)
    console.log('[ClientInfosService.upsert] Payload:', JSON.stringify(clientData, null, 2))
    console.log('[ClientInfosService.upsert] Nombre de champs:', Object.keys(clientData).length)

    // Certains environnements n'ont pas de contrainte unique sur dossier_id.
    // Éviter .single()/maybeSingle() qui peuvent retourner 406 s'il y a des doublons.
    console.log('[ClientInfosService.upsert] 🔍 Vérification existence...')
    const { data: rows, error: selectError } = await supabase
      .from('client_infos')
      .select('id')
      .eq('dossier_id', clientData.dossier_id as string)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (selectError) {
      console.error('[ClientInfosService.upsert] ❌ ERREUR select:', selectError)
      console.error('[ClientInfosService.upsert] Code:', selectError.code)
      console.error('[ClientInfosService.upsert] Message:', selectError.message)
      console.error('[ClientInfosService.upsert] Details:', selectError.details)
      throw selectError
    }

    const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    console.log('[ClientInfosService.upsert] Enregistrement existant:', existing ? `Oui (ID: ${existing.id})` : 'Non')

    if (existing) {
      console.log('[ClientInfosService.upsert] 📝 MODE UPDATE')
      const { data, error } = await supabase
        .from('client_infos')
        .update({ ...(clientData as ClientInfoUpdate), updated_at: new Date().toISOString() })
        .eq('dossier_id', clientData.dossier_id as string)
        .select()
        .limit(1)

      if (error) {
        console.error('[ClientInfosService.upsert] ❌ ERREUR UPDATE:', error)
        console.error('[ClientInfosService.upsert] Code:', error.code)
        console.error('[ClientInfosService.upsert] Message:', error.message)
        console.error('[ClientInfosService.upsert] Details:', error.details)
        console.error('[ClientInfosService.upsert] Hint:', error.hint)
        throw error
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.error('[ClientInfosService.upsert] ❌ Aucune ligne mise à jour (RLS bloqué?)')
        throw new Error('Aucune ligne mise à jour (RLS a probablement bloqué la requête)')
      }

      const updated = Array.isArray(data) ? data[0] : (data as any)
      console.log('[ClientInfosService.upsert] ✅ UPDATE réussi')
      console.log('[ClientInfosService.upsert] Données mises à jour:', updated)
      console.log('═══════════════════════════════════════════')
      return updated
    }

    console.log('[ClientInfosService.upsert] ➕ MODE INSERT')
    const { data, error } = await supabase
      .from('client_infos')
      .insert({ ...clientData, updated_at: new Date().toISOString() })
      .select()
      .limit(1)

    if (error) {
      console.error('[ClientInfosService.upsert] ❌ ERREUR INSERT:', error)
      console.error('[ClientInfosService.upsert] Code:', error.code)
      console.error('[ClientInfosService.upsert] Message:', error.message)
      console.error('[ClientInfosService.upsert] Details:', error.details)
      console.error('[ClientInfosService.upsert] Hint:', error.hint)
      throw error
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.error('[ClientInfosService.upsert] ❌ Aucune ligne insérée (RLS bloqué?)')
      throw new Error('Aucune ligne insérée (RLS a probablement bloqué la requête)')
    }

    const inserted = Array.isArray(data) ? data[0] : (data as any)
    console.log('[ClientInfosService.upsert] ✅ INSERT réussi')
    console.log('[ClientInfosService.upsert] Données insérées:', inserted)
    console.log('═══════════════════════════════════════════')
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
          statut:statut_canon,
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
   * Valide les données client avant sauvegarde (validation minimale, non bloquante)
   */
  static validateClientData(data: Partial<ClientInfoInsert>): string[] {
    const errors: string[] = []

    // Validation uniquement pour les champs critiques de l'emprunteur principal
    if (!data.client_nom?.trim()) {
      errors.push('Le nom du client est requis')
    }
    if (!data.client_prenom?.trim()) {
      errors.push('Le prénom du client est requis')
    }
    
    // Validation email uniquement si fourni
    if (data.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.client_email)) {
      errors.push('L\'email du client n\'est pas valide')
    }

    // Validation email conjoint uniquement si fourni
    if (data.conjoint_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.conjoint_email)) {
      errors.push('L\'email du conjoint n\'est pas valide')
    }

    // NOTE: Les autres champs sont optionnels pour permettre la modification partielle
    // L'admin peut modifier n'importe quel champ sans être bloqué

    return errors
  }
}
