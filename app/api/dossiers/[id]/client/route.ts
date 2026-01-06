/**
 * API Route: Mise à jour des informations client d'un dossier
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
    const clientData = body?.clientData || {}
    
    // Utiliser le service role pour les modifications
    const serviceClient = createServiceRoleClient()
    
    const { error: updateClientError } = await serviceClient
      .from('client_infos')
      .update({
        client_nom: clientData.client_nom,
        client_prenom: clientData.client_prenom,
        client_email: clientData.client_email,
        client_telephone: clientData.client_telephone,
        client_date_naissance: clientData.client_date_naissance,
        client_adresse: clientData.client_adresse,
        client_code_postal: clientData.client_code_postal || null,
        client_ville: clientData.client_ville || null,
        client_profession: clientData.client_profession,
        client_fumeur: clientData.client_fumeur,
        updated_at: new Date().toISOString()
      })
      .eq('dossier_id', dossierId)
    
    if (updateClientError) throw updateClientError
    
    // Mettre à jour le timestamp du dossier
    await serviceClient
      .from('dossiers')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', dossierId)
    
    // Log admin
    await serviceClient
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'update_client_data',
        dossier_id: dossierId,
        details: { updated_fields: Object.keys(clientData) }
      })
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('[API] PUT /api/dossiers/[id]/client error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur interne' }, 
      { status: 500 }
    )
  }
}
