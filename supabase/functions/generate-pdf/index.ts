import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PDFRequest {
  dossierId: string;
  devisId: string;
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

    const pdfRequest: PDFRequest = await req.json()

    // Récupérer toutes les données nécessaires
    const { data: dossierData, error: dossierError } = await supabaseClient
      .from('dossiers')
      .select(`
        *,
        client_info:client_infos(*),
        devis:devis(*)
      `)
      .eq('id', pdfRequest.dossierId)
      .eq('user_id', user.id)
      .single()

    if (dossierError || !dossierData) {
      throw new Error('Dossier non trouvé')
    }

    // Générer le contenu HTML du PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Devis Assurance Emprunteur - ${dossierData.numero_dossier}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #4F46E5; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #4F46E5; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .info-item { margin-bottom: 10px; }
            .info-item strong { color: #374151; }
            .highlight { background-color: #F0FDF4; padding: 20px; border-radius: 8px; border-left: 4px solid #10B981; }
            .garanties { list-style: none; padding: 0; }
            .garanties li { padding: 5px 0; }
            .garanties li:before { content: "✓"; color: #10B981; font-weight: bold; margin-right: 10px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">GMB COURTAGE</div>
            <h1>Devis Assurance Emprunteur</h1>
            <p>Dossier N° ${dossierData.numero_dossier}</p>
        </div>

        <div class="section">
            <h2>Informations Client</h2>
            <div class="info-grid">
                <div>
                    <div class="info-item"><strong>Nom :</strong> ${dossierData.client_info.prenom} ${dossierData.client_info.nom}</div>
                    <div class="info-item"><strong>Email :</strong> ${dossierData.client_info.email}</div>
                    <div class="info-item"><strong>Téléphone :</strong> ${dossierData.client_info.telephone}</div>
                </div>
                <div>
                    <div class="info-item"><strong>Profession :</strong> ${dossierData.client_info.profession}</div>
                    <div class="info-item"><strong>Revenus :</strong> ${dossierData.client_info.revenus}€/mois</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Votre Devis</h2>
            <div class="highlight">
                <h3>💰 Économies Estimées : ${dossierData.devis.economies_estimees}€</h3>
                <p><strong>Coût mensuel :</strong> ${dossierData.devis.cout_assurance}€</p>
                <p><strong>Compagnie :</strong> ${dossierData.devis.compagnie}</p>
                <p><strong>Type de couverture :</strong> ${dossierData.devis.type_couverture}</p>
            </div>
        </div>

        <div class="section">
            <h2>Garanties Incluses</h2>
            <ul class="garanties">
                ${JSON.parse(dossierData.devis.details_couverture).map(garantie => `<li>${garantie}</li>`).join('')}
            </ul>
        </div>

        <div class="section">
            <h2>Informations Légales</h2>
            <p><small>
                Ce devis est valable jusqu'au ${new Date(dossierData.devis.date_expiration).toLocaleDateString('fr-FR')}.
                GMB Courtage - Société de courtage en assurances.
                Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
            </small></p>
        </div>
    </body>
    </html>
    `

    // TODO: Ici, on devrait utiliser une bibliothèque comme Puppeteer ou wkhtmltopdf
    // pour convertir le HTML en PDF. Pour cette démonstration, on retourne le HTML.
    
    // En production, vous pourriez utiliser :
    // - Une API externe comme HTMLCSStoImage
    // - Puppeteer avec Deno
    // - Un service dédié de génération PDF

    // Pour l'instant, simuler la génération PDF
    const pdfFileName = `devis_${dossierData.numero_dossier}_${Date.now()}.pdf`
    
    // TODO: Sauvegarder le PDF dans Supabase Storage
    // et mettre à jour l'URL dans la table devis
    
    await supabaseClient
      .from('devis')
      .update({ 
        pdf_url: `/storage/pdfs/${pdfFileName}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', pdfRequest.devisId)

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: `/storage/pdfs/${pdfFileName}`,
        htmlContent: htmlContent // Pour débug
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Erreur génération PDF:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur génération PDF'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})