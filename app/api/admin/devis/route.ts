import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dossierId, devis, selectedDevisId } = body

    if (!dossierId || !devis || !Array.isArray(devis)) {
      return NextResponse.json(
        { error: 'Paramètres manquants ou invalides' },
        { status: 400 }
      )
    }

    // Créer les devis en base
    const devisToInsert = devis.map((devisItem: any) => ({
      dossier_id: dossierId,
      numero_devis: `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      statut: selectedDevisId === devisItem.id ? 'envoye' : 'en_attente',
      donnees_devis: {
        compagnie: devisItem.compagnie,
        produit: devisItem.produit,
        cout_mensuel: devisItem.cout_mensuel,
        cout_total: devisItem.cout_total,
        economie_estimee: devisItem.economie_estimee,
        formalites_medicales: devisItem.formalites_medicales,
        couverture: devisItem.couverture,
        exclusions: devisItem.exclusions,
        avantages: devisItem.avantages,
        taux_assurance: devisItem.taux_assurance,
        frais_adhesion: devisItem.frais_adhesion,
        frais_frac: devisItem.frais_frac
      },
      selected: selectedDevisId === devisItem.id
    }))

    const { data: insertedDevis, error: insertError } = await supabase
      .from('devis')
      .insert(devisToInsert)
      .select()

    if (insertError) {
      console.error('Erreur insertion devis:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de la création des devis' },
        { status: 500 }
      )
    }

    // Si un devis est sélectionné, mettre à jour le dossier
    if (selectedDevisId) {
      const selectedDevis = insertedDevis?.find((d: any) => d.donnees_devis?.compagnie === devis.find((d2: any) => d2.id === selectedDevisId)?.compagnie)
      
      if (selectedDevis) {
        const { error: updateError } = await supabase
          .from('dossiers')
          .update({
            devis_selectionne_id: selectedDevis.id,
            statut_canon: 'devis_disponible'
          })
          .eq('id', dossierId)

        if (updateError) {
          console.error('Erreur mise à jour dossier:', updateError)
          // Ne pas échouer si on ne peut pas mettre à jour le dossier
        }
      }
    }

    return NextResponse.json({
      success: true,
      devis: insertedDevis,
      message: `${insertedDevis?.length || 0} devis créés avec succès`
    })

  } catch (error) {
    console.error('Erreur API admin devis:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
