import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { dossierId, devisId } = await req.json()
    if (!dossierId || !devisId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const { data: dossierData, error: dossierError } = await supabaseClient
      .from('dossiers')
      .select(`
        *,
        client_info:client_infos(*),
        devis:devis(*)
      `)
      .eq('id', dossierId)
      .single()

    if (dossierError || !dossierData) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // HTML simple de démonstration (remplacer par moteur PDF réel en prod)
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Devis ${dossierData.numero_dossier}</title></head><body><h1>Devis ${dossierData.numero_dossier}</h1></body></html>`
    const pdfFileName = `devis_${dossierData.numero_dossier}_${Date.now()}.pdf`

    // Simuler sauvegarde (à remplacer par upload Storage + URL signée)
    await supabaseClient
      .from('devis')
      .update({ pdf_url: `/storage/pdfs/${pdfFileName}`, updated_at: new Date().toISOString() })
      .eq('id', devisId)

    return NextResponse.json({ success: true, pdfUrl: `/storage/pdfs/${pdfFileName}`, htmlContent })
  } catch (error: any) {
    console.error('[API] /api/pdf/generate error', error)
    return NextResponse.json({ error: error?.message || 'Erreur génération PDF' }, { status: 400 })
  }
}


