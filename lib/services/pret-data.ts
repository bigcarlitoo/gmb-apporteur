import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type PretData = Database['public']['Tables']['pret_data']['Row']
type PretDataInsert = Database['public']['Tables']['pret_data']['Insert']
type PretDataUpdate = Database['public']['Tables']['pret_data']['Update']

export class PretDataService {
  static async getByDossierId(dossierId: string) {
    const { data, error } = await supabase
      .from('pret_data')
      .select('*')
      .eq('dossier_id', dossierId)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[PretDataService.getByDossierId] error', error)
      throw error
    }

    return Array.isArray(data) && data.length > 0 ? data[0] as PretData : null
  }

  static async upsertByDossierId(dossierId: string, payload: Partial<PretDataInsert>) {
    // Déterminer s'il existe déjà des données
    const existing = await this.getByDossierId(dossierId)

    const record: PretDataInsert = {
      dossier_id: dossierId,
      banque_preteuse: payload.banque_preteuse as string,
      montant_capital: payload.montant_capital as number,
      duree_mois: payload.duree_mois as number,
      type_pret: payload.type_pret as string,
      cout_assurance_banque: payload.cout_assurance_banque ?? null,
      taux_effectif: (payload as any)?.taux_effectif ?? null,
      taux_nominal: (payload as any)?.taux_nominal ?? null,
      type_garantie: (payload as any)?.type_garantie ?? null,
      apport_personnel: (payload as any)?.apport_personnel ?? null,
      // Nouveaux champs d'extraction
      date_debut: (payload as any)?.date_debut ?? null,
      date_fin: (payload as any)?.date_fin ?? null,
      date_debut_effective: (payload as any)?.date_debut_effective ?? null,
      duree_restante_mois: (payload as any)?.duree_restante_mois ?? null,
      capital_restant_du: (payload as any)?.capital_restant_du ?? null,
    }

    if (existing) {
      const { data, error } = await supabase
        .from('pret_data')
        .update({ ...(record as PretDataUpdate), updated_at: new Date().toISOString() })
        .eq('dossier_id', dossierId)
        .select()
        .limit(1)

      if (error) {
        console.error('[PretDataService.upsertByDossierId] update error', error)
        throw error
      }
      if (!data || data.length === 0) {
        throw new Error('Aucune ligne mise à jour (RLS a probablement bloqué la requête)')
      }
      return data[0] as PretData
    }

    const { data, error } = await supabase
      .from('pret_data')
      .insert({ ...record, updated_at: new Date().toISOString() })
      .select()
      .limit(1)

    if (error) {
      console.error('[PretDataService.upsertByDossierId] insert error', error)
      throw error
    }
    if (!data || data.length === 0) {
      throw new Error('Aucune ligne insérée (RLS a probablement bloqué la requête)')
    }

    return data[0] as PretData
  }
}


