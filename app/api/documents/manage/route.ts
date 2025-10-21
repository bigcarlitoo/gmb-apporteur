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

    // Vérifier rôle admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé - Admin seulement' }, { status: 403 })
    }

    const body = await req.json()
    const action: 'delete' | 'add' = body?.action
    const dossierId: string = body?.dossierId
    const documentType: string = body?.documentType
    const documentData: { nom: string; url: string; taille: string; type_mime: string } | undefined = body?.documentData

    if (!action || !dossierId || !documentType) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Vérifier dossier
    const { data: dossierExists, error: dossierError } = await supabaseClient
      .from('dossiers')
      .select('id')
      .eq('id', dossierId)
      .single()

    if (dossierError || !dossierExists) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    if (action === 'delete') {
      const { error: deleteError } = await supabaseClient
        .from('documents')
        .delete()
        .eq('dossier_id', dossierId)
        .eq('type_document', documentType)

      if (deleteError) throw deleteError

      await supabaseClient
        .from('admin_logs')
        .insert({
          admin_id: user.id,
          action: 'delete_document',
          dossier_id: dossierId,
          details: { document_type: documentType }
        })

      return NextResponse.json({ success: true, message: 'Document supprimé avec succès' })
    }

    if (action === 'add') {
      if (!documentData) {
        return NextResponse.json({ error: 'Données du document manquantes' }, { status: 400 })
      }

      const { error: insertError } = await supabaseClient
        .from('documents')
        .insert({
          dossier_id: dossierId,
          type_document: documentType,
          nom_fichier: documentData.nom,
          url_fichier: documentData.url,
          taille_fichier: documentData.taille,
          type_mime: documentData.type_mime,
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString()
        })

      if (insertError) throw insertError

      await supabaseClient
        .from('admin_logs')
        .insert({
          admin_id: user.id,
          action: 'add_document',
          dossier_id: dossierId,
          details: { document_type: documentType, document_name: documentData.nom }
        })

      return NextResponse.json({ success: true, message: 'Document ajouté avec succès' })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (error: any) {
    console.error('[API] /api/documents/manage error', error)
    return NextResponse.json({ error: error?.message || 'Erreur interne' }, { status: 400 })
  }
}
