import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await req.json()
    const pretData = body?.pretData || {}

    const { error: upsertPretError } = await supabaseClient
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

    const { error: updateDossierError } = await supabaseClient
      .from('dossiers')
      .update({
        montant_capital: pretData.montant_capital,
        updated_at: new Date().toISOString()
      })
      .eq('id', dossierId)

    if (updateDossierError) throw updateDossierError

    await supabaseClient
      .from('devis')
      .update({ needs_recalculation: true })
      .eq('dossier_id', dossierId)

    await supabaseClient
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'update_pret_data',
        dossier_id: dossierId,
        details: { updated_fields: Object.keys(pretData) }
      })

    return NextResponse.json({ success: true, recalculation_needed: true })
  } catch (error: any) {
    console.error('[API] PUT /api/dossiers/[id]/pret error', error)
    return NextResponse.json({ error: error?.message || 'Erreur interne' }, { status: 400 })
  }
}


