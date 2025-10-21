import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClientData {
  dossierId: string;
  clientData: {
    client_nom: string;
    client_prenom: string;
    client_email: string;
    client_telephone: string;
    client_date_naissance: string;
    client_adresse: string;
    client_profession: string;
    client_fumeur: boolean;
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

    const { dossierId, clientData }: ClientData = await req.json()

    // Vérifier que le dossier existe
    const { data: dossierExists, error: dossierError } = await supabaseClient
      .from('dossiers')
      .select('id')
      .eq('id', dossierId)
      .single()

    if (dossierError || !dossierExists) {
      throw new Error('Dossier non trouvé')
    }

    // Mettre à jour les informations client dans la table client_infos
    const { error: updateClientError } = await supabaseClient
      .from('client_infos')
      .update({
        nom: clientData.client_nom,
        prenom: clientData.client_prenom,
        email: clientData.client_email,
        telephone: clientData.client_telephone,
        date_naissance: clientData.client_date_naissance,
        adresse: clientData.client_adresse,
        profession: clientData.client_profession,
        fumeur: clientData.client_fumeur,
        updated_at: new Date().toISOString()
      })
      .eq('dossier_id', dossierId)

    if (updateClientError) throw updateClientError

    // Mettre à jour également la table dossiers pour les champs directs
    const { error: updateDossierError } = await supabaseClient
      .from('dossiers')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', dossierId)

    if (updateDossierError) throw updateDossierError

    // Log de l'action admin
    await supabaseClient
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'update_client_data',
        dossier_id: dossierId,
        details: { updated_fields: Object.keys(clientData) }
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Données client mises à jour avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Erreur mise à jour données client:', error)
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