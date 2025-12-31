import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: dossierId } = await params;
    
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé - Admin seulement' }, { status: 403 })
    }
    const body = await _req.json()
    const clientData = body?.clientData || {}

    const { error: updateClientError } = await supabaseClient
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

    await supabaseClient
      .from('dossiers')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', dossierId)

    await supabaseClient
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'update_client_data',
        dossier_id: dossierId,
        details: { updated_fields: Object.keys(clientData) }
      })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] PUT /api/dossiers/[id]/client error', error)
    return NextResponse.json({ error: error?.message || 'Erreur interne' }, { status: 400 })
  }
}


