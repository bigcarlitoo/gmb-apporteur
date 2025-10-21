import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PretData {
  dossierId: string;
  pretData: {
    banque_preteuse: string;
    montant_capital: number;
    duree_mois: number;
    type_pret: string;
    cout_assurance_banque?: number;
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

    const { dossierId, pretData }: PretData = await req.json()

    // Vérifier que le dossier existe
    const { data: dossierExists, error: dossierError } = await supabaseClient
      .from('dossiers')
      .select('id')
      .eq('id', dossierId)
      .single()

    if (dossierError || !dossierExists) {
      throw new Error('Dossier non trouvé')
    }

    // Mettre à jour ou créer les informations de prêt dans la table pret_infos
    const { error: upsertPretError } = await supabaseClient
      .from('pret_infos')
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

    // Mettre à jour la table dossiers avec les infos principales
    const { error: updateDossierError } = await supabaseClient
      .from('dossiers')
      .update({
        montant_capital: pretData.montant_capital,
        duree_pret: Math.round(pretData.duree_mois / 12),
        updated_at: new Date().toISOString()
      })
      .eq('id', dossierId)

    if (updateDossierError) throw updateDossierError

    // Si les données de prêt changent, il faut potentiellement recalculer les devis
    // Marquer pour une nouvelle tarification si montant ou durée ont changé
    await supabaseClient
      .from('devis')
      .update({ needs_recalculation: true })
      .eq('dossier_id', dossierId)

    // Log de l'action admin
    await supabaseClient
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'update_pret_data',
        dossier_id: dossierId,
        details: { updated_fields: Object.keys(pretData) }
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Données de prêt mises à jour avec succès',
        recalculation_needed: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Erreur mise à jour données prêt:', error)
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