import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CommissionOptimizerService, CommissionAnalysisResult } from '@/lib/services/commission-optimizer'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/dossiers/[id]/analyze-commissions
 * 
 * Analyse les commissions pour un dossier et retourne les recommandations.
 * Cette API fait des appels multiples à Exade pour trouver les meilleures options.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: dossierId } = await context.params

  // Client Supabase avec service role pour bypasser RLS (créé dans la fonction pour éviter les erreurs au build)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    console.log('[API analyze-commissions] Démarrage pour dossier:', dossierId)

    // ========================================================================
    // 1. Récupérer les données du dossier
    // ========================================================================
    const { data: dossier, error: dossierError } = await supabaseAdmin
      .from('dossiers')
      .select(`
        id,
        numero_dossier,
        is_couple,
        client_infos (
          client_civilite,
          client_nom,
          client_prenom,
          client_nom_naissance,
          client_date_naissance,
          client_email,
          client_telephone,
          client_adresse,
          client_code_postal,
          client_ville,
          client_lieu_naissance,
          client_fumeur,
          categorie_professionnelle,
          client_deplacement_pro,
          client_travaux_manuels,
          conjoint_civilite,
          conjoint_nom,
          conjoint_prenom,
          conjoint_nom_naissance,
          conjoint_date_naissance,
          conjoint_fumeur,
          conjoint_categorie_professionnelle,
          conjoint_lieu_naissance,
          conjoint_deplacement_pro,
          conjoint_travaux_manuels
        ),
        pret_data (
          montant_capital,
          capital_restant_du,
          duree_mois,
          duree_restante_mois,
          taux_nominal,
          type_pret_code,
          type_taux_code,
          type_credit,
          objet_financement_code,
          type_adhesion,
          cout_assurance_banque,
          date_debut_effective
        )
      `)
      .eq('id', dossierId)
      .single()

    if (dossierError || !dossier) {
      console.error('[API analyze-commissions] Erreur récupération dossier:', dossierError)
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404 }
      )
    }

    const clientInfoArray = dossier.client_infos
    const clientInfo = Array.isArray(clientInfoArray) ? clientInfoArray[0] : clientInfoArray
    const pretDataArray = dossier.pret_data
    const pretData = Array.isArray(pretDataArray) ? pretDataArray[0] : pretDataArray

    if (!clientInfo || !pretData) {
      return NextResponse.json(
        { error: 'Données client ou prêt manquantes' },
        { status: 400 }
      )
    }

    // ========================================================================
    // 2. Vérifier le coût d'assurance actuel
    // ========================================================================
    const coutAssuranceActuelle = Number(pretData?.cout_assurance_banque) || 0

    if (coutAssuranceActuelle <= 0) {
      console.warn('[API analyze-commissions] Pas de coût assurance banque, analyse limitée')
    }

    // ========================================================================
    // 3. Préparer les données pour l'API Exade
    // ========================================================================
    // Structure client pour Exade
    const clientExade: any = {
      client_civilite: clientInfo.client_civilite,
      client_nom: clientInfo.client_nom,
      client_prenom: clientInfo.client_prenom,
      client_nom_naissance: clientInfo.client_nom_naissance,
      client_date_naissance: clientInfo.client_date_naissance,
      client_email: clientInfo.client_email,
      client_telephone: clientInfo.client_telephone,
      client_adresse: clientInfo.client_adresse,
      client_code_postal: clientInfo.client_code_postal,
      client_ville: clientInfo.client_ville,
      client_lieu_naissance: clientInfo.client_lieu_naissance,
      client_fumeur: clientInfo.client_fumeur,
      categorie_professionnelle: clientInfo.categorie_professionnelle,
      client_deplacement_pro: clientInfo.client_deplacement_pro,
      client_travaux_manuels: clientInfo.client_travaux_manuels,
    }

    // Ajouter le conjoint si dossier couple
    if (dossier.is_couple && clientInfo.conjoint_nom) {
      clientExade.conjoint = {
        client_civilite: clientInfo.conjoint_civilite,
        client_nom: clientInfo.conjoint_nom,
        client_prenom: clientInfo.conjoint_prenom,
        client_nom_naissance: clientInfo.conjoint_nom_naissance,
        client_date_naissance: clientInfo.conjoint_date_naissance,
        client_fumeur: clientInfo.conjoint_fumeur,
        categorie_professionnelle: clientInfo.conjoint_categorie_professionnelle,
        client_lieu_naissance: clientInfo.conjoint_lieu_naissance,
        client_deplacement_pro: clientInfo.conjoint_deplacement_pro,
        client_travaux_manuels: clientInfo.conjoint_travaux_manuels,
      }
    }

    // Structure prêt pour Exade
    const pretExade = {
      montant_capital: pretData.capital_restant_du || pretData.montant_capital,
      duree_mois: pretData.duree_restante_mois || pretData.duree_mois,
      taux_nominal: pretData.taux_nominal,
      type_pret_code: pretData.type_pret_code || 1,
      type_taux_code: pretData.type_taux_code || 1,
      type_credit: pretData.type_credit || 0,
      objet_financement_code: pretData.objet_financement_code || 1,
      type_adhesion: pretData.type_adhesion || 0,
      date_effet: pretData.date_debut_effective || new Date().toISOString().split('T')[0],
    }

    // ========================================================================
    // 4. Lancer l'analyse des commissions
    // ========================================================================
    console.log('[API analyze-commissions] Lancement analyse Exade...')
    
    const analysisResult = await CommissionOptimizerService.analyzeCommissions({
      clientInfo: clientExade,
      pretData: pretExade,
      coutAssuranceActuelle
    })

    console.log('[API analyze-commissions] Analyse terminée:', {
      topTarifs: analysisResult.top_tarifs.length,
      meilleureEconomie: analysisResult.meilleure_economie_client?.economie,
      meilleurCompromis: analysisResult.meilleur_compromis?.commission_courtier
    })

    // ========================================================================
    // 5. Sauvegarder l'analyse dans le dossier (optionnel)
    // ========================================================================
    // On stocke le résultat dans extracted_client_data ou un nouveau champ
    // Pour l'instant on le retourne simplement

    return NextResponse.json({
      success: true,
      analysis: analysisResult
    })

  } catch (error: any) {
    console.error('[API analyze-commissions] Erreur:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'analyse des commissions',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/dossiers/[id]/analyze-commissions
 * 
 * Récupère l'analyse des commissions existante pour un dossier
 * (stockée dans les devis ou le dossier)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id: dossierId } = await context.params

  // Client Supabase avec service role pour bypasser RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Récupérer les devis avec leur analyse de commission
    const { data: devis, error } = await supabaseAdmin
      .from('devis')
      .select('id, compagnie, produit, cout_total, donnees_devis')
      .eq('dossier_id', dossierId)
      .order('cout_total', { ascending: true })

    if (error) {
      console.error('[API analyze-commissions GET] Erreur:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération' },
        { status: 500 }
      )
    }

    // Extraire les analyses de commission des devis
    const analyses = devis
      ?.map(d => {
        const donnees = d.donnees_devis as any
        if (donnees?.commission_analysis) {
          return {
            devis_id: d.id,
            compagnie: d.compagnie,
            produit: d.produit,
            cout_total: d.cout_total,
            analysis: donnees.commission_analysis
          }
        }
        return null
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      analyses: analyses || []
    })

  } catch (error: any) {
    console.error('[API analyze-commissions GET] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}





