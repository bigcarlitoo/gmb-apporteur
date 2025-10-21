import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DocumentAction {
  action: 'delete' | 'add';
  dossierId: string;
  documentType: string;
  documentData?: {
    nom: string;
    url: string;
    taille: string;
    type_mime: string;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get authenticated user (admin)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Non authentifié')
    }

    // Vérifier que l'utilisateur est admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Accès non autorisé - Admin seulement')
    }

    const { action, dossierId, documentType, documentData }: DocumentAction = await req.json()

    // Vérifier que le dossier existe
    const { data: dossierExists, error: dossierError } = await supabaseClient
      .from('dossiers')
      .select('id')
      .eq('id', dossierId)
      .single()

    if (dossierError || !dossierExists) {
      throw new Error('Dossier non trouvé')
    }

    if (action === 'delete') {
      // Supprimer le document de la base de données
      const { error: deleteError } = await supabaseClient
        .from('documents')
        .delete()
        .eq('dossier_id', dossierId)
        .eq('type_document', documentType)

      if (deleteError) throw deleteError

      // TODO: Supprimer aussi le fichier physique du Storage
      // const { error: storageError } = await supabaseClient.storage
      //   .from('documents')
      //   .remove([`${dossierId}/${documentType}`])

      // Log de l'action admin
      await supabaseClient
        .from('admin_logs')
        .insert({
          admin_id: user.id,
          action: 'delete_document',
          dossier_id: dossierId,
          details: { document_type: documentType }
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Document supprimé avec succès'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )

    } else if (action === 'add') {
      if (!documentData) {
        throw new Error('Données du document manquantes')
      }

      // Ajouter le document en base de données
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

      // Log de l'action admin
      await supabaseClient
        .from('admin_logs')
        .insert({
          admin_id: user.id,
          action: 'add_document',
          dossier_id: dossierId,
          details: { 
            document_type: documentType,
            document_name: documentData.nom
          }
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Document ajouté avec succès'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    throw new Error('Action non reconnue')

  } catch (error) {
    console.error('Erreur gestion documents:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur interne'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})