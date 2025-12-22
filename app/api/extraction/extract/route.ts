import { NextRequest, NextResponse } from 'next/server'
import { DocumentExtractionService } from '@/lib/services/document-extraction'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { dossierId } = await request.json()
    
    if (!dossierId) {
      return NextResponse.json(
        { error: 'dossierId requis' },
        { status: 400 }
      )
    }

    console.log('[API] POST /api/extraction/extract - Début')
    console.log('[API] Variables OpenRouter:', {
      apiKey: process.env.OPENROUTER_API_KEY ? '✅ Définie' : '❌ Non définie',
      model: process.env.OPENROUTER_MODEL || '❌ Non défini'
    })

    // Vérifier que les variables d'environnement sont configurées
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY non configurée' },
        { status: 500 }
      )
    }

    if (!process.env.OPENROUTER_MODEL) {
      return NextResponse.json(
        { error: 'OPENROUTER_MODEL non configuré' },
        { status: 500 }
      )
    }

    // Appel au service d'extraction avec les variables d'environnement
    console.log('[API] Appel au service d\'extraction...')
    const extractedData = await DocumentExtractionService.extractFromDossier(dossierId, {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL
    })

    console.log('[API] Résultat extraction:', extractedData ? 'Succès' : 'Échec')

    if (!extractedData) {
      console.log('[API] ❌ Aucune donnée extraite')
      return NextResponse.json(
        { error: 'Échec de l\'extraction des documents' },
        { status: 500 }
      )
    }

    // Sauvegarder les données extraites
    console.log('[API] Sauvegarde des données extraites...')
    const saveSuccess = await DocumentExtractionService.saveExtractedData(dossierId, extractedData)
    console.log('[API] Sauvegarde:', saveSuccess ? 'Succès' : 'Échec')

    // ========================================================================
    // APPEL AUTOMATIQUE : Analyse des commissions en arrière-plan
    // ========================================================================
    // On lance l'analyse des commissions de manière non-bloquante pour que
    // les recommandations soient prêtes quand l'admin ouvre le dossier.
    // Utilisation de fetch interne (next.js) avec waitUntil pattern
    if (saveSuccess) {
      console.log('[API] Lancement de l\'analyse des commissions en arrière-plan...')
      
      // On ne bloque pas la réponse - l'analyse se fait en parallèle
      const analyzeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dossiers/${dossierId}/analyze-commissions`
      
      fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
        .then(res => res.json())
        .then(data => {
          console.log('[API] Analyse commissions terminée:', data.success ? 'Succès' : 'Échec')
        })
        .catch(err => {
          // On log l'erreur mais on ne bloque pas le flux principal
          console.error('[API] Erreur analyse commissions (non bloquant):', err.message)
        })
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
      saved: saveSuccess,
      message: 'Extraction réussie'
    })

  } catch (error: any) {
    console.error('[API] Erreur extraction:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Erreur lors de l\'extraction',
        success: false 
      },
      { status: 500 }
    )
  }
}
