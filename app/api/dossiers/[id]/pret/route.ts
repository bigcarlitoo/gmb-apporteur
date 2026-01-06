/**
 * API Route: Mise à jour des données de prêt d'un dossier
 * Accès: Admin ou Broker User uniquement
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  createApiRouteClient, 
  createServiceRoleClient,
  getAuthenticatedUser 
} from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dossierId } = await params
    
    // Authentification
    const supabase = await createApiRouteClient(request)
    const user = await getAuthenticatedUser(supabase)
    
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    
    // Vérifier que l'utilisateur est admin ou broker_user
    if (user.role !== 'admin' && user.role !== 'broker_user') {
      return NextResponse.json(
        { error: 'Accès non autorisé - Admin ou Broker User seulement' }, 
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const pretData = body?.pretData || {}
    
    // Utiliser le service role pour les modifications
    const serviceClient = createServiceRoleClient()
    
    const { error: upsertPretError } = await serviceClient
      .from('pret_data')
      .upsert({
        dossier_id: dossierId,
        banque_preteuse: pretData.banque_preteuse,
        montant_capital: pretData.montant_capital,
        duree_mois: pretData.duree_mois,
        type_pret: pretData.type_pret,
        cout_assurance_banque: pretData.cout_assurance_banque,
        updated_at: new Date().toISOString()
      })
    
    if (upsertPretError) throw upsertPretError
    
    // Mettre à jour le montant capital sur le dossier
    const { error: updateDossierError } = await serviceClient
      .from('dossiers')
      .update({
        montant_capital: pretData.montant_capital,
        updated_at: new Date().toISOString()
      })
      .eq('id', dossierId)
    
    if (updateDossierError) throw updateDossierError
    
    // Marquer les devis comme nécessitant un recalcul
    await serviceClient
      .from('devis')
      .update({ needs_recalculation: true })
      .eq('dossier_id', dossierId)
    
    // Log admin
    await serviceClient
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'update_pret_data',
        dossier_id: dossierId,
        details: { updated_fields: Object.keys(pretData) }
      })
    
    return NextResponse.json({ success: true, recalculation_needed: true })
    
  } catch (error: any) {
    console.error('[API] PUT /api/dossiers/[id]/pret error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur interne' }, 
      { status: 500 }
    )
  }
}
