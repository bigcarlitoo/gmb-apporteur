import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DevisAction {
  action: 'validate' | 'refuse';
  devisId: string;
  dossierId: string;
  reason?: string; // Pour le refus
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

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Non authentifié')
    }

    const actionData: DevisAction = await req.json()

    // Vérifier que l'utilisateur possède bien ce dossier
    const { data: dossier, error: dossierError } = await supabaseClient
      .from('dossiers')
      .select('id, numero_dossier')
      .eq('id', actionData.dossierId)
      .eq('user_id', user.id)
      .single()

    if (dossierError || !dossier) {
      throw new Error('Dossier non trouvé ou accès non autorisé')
    }

    if (actionData.action === 'validate') {
      // Valider le devis
      const { error: devisError } = await supabaseClient
        .from('devis')
        .update({ 
          statut: 'accepte',
          validated_at: new Date().toISOString(),
          validated_by: user.id
        })
        .eq('id', actionData.devisId)

      if (devisError) throw devisError

      // Mettre à jour le statut du dossier
      await supabaseClient
        .from('dossiers')
        .update({ 
          statut_canon: 'devis_accepte',
          updated_at: new Date().toISOString()
        })
        .eq('id', actionData.dossierId)

      // Mettre à jour les étapes de processus
      await supabaseClient
        .from('process_steps')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('dossier_id', actionData.dossierId)
        .eq('step_order', 5)

      await supabaseClient
        .from('process_steps')
        .update({ status: 'current' })
        .eq('dossier_id', actionData.dossierId)
        .eq('step_order', 6)

      // Créer une notification pour GMB
      await supabaseClient
        .from('notifications')
        .insert({
          type: 'devis_accepte',
          dossier_id: actionData.dossierId,
          user_id: user.id,
          title: 'Devis accepté',
          message: `Devis accepté pour le dossier ${dossier.numero_dossier}`
        })

    } else if (actionData.action === 'refuse') {
      if (!actionData.reason) {
        throw new Error('Raison du refus obligatoire')
      }

      // Refuser le devis
      const { error: devisError } = await supabaseClient
        .from('devis')
        .update({ 
          statut: 'refuse',
          refused_at: new Date().toISOString(),
          refuse_reason: actionData.reason
        })
        .eq('id', actionData.devisId)

      if (devisError) throw devisError

      // Mettre à jour le statut du dossier
      await supabaseClient
        .from('dossiers')
        .update({ 
          statut_canon: 'refuse',
          commentaires: actionData.reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', actionData.dossierId)

      // Mettre à jour l'étape de processus
      await supabaseClient
        .from('process_steps')
        .update({ 
          status: 'error', 
          completed_at: new Date().toISOString() 
        })
        .eq('dossier_id', actionData.dossierId)
        .eq('step_order', 5)

      // Créer une notification pour GMB avec le commentaire
      await supabaseClient
        .from('notifications')
        .insert({
          type: 'devis_refuse',
          dossier_id: actionData.dossierId,
          user_id: user.id,
          title: 'Devis refusé',
          message: `Devis refusé pour le dossier ${dossier.numero_dossier}`,
          details: { reason: actionData.reason }
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: actionData.action,
        message: actionData.action === 'validate' 
          ? 'Devis validé avec succès' 
          : 'Devis refusé, votre commentaire a été transmis'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Erreur gestion devis:', error)
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