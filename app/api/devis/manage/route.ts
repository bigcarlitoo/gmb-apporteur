import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AnalyticsService } from '@/lib/services/analytics'

type DevisAction = 'validate' | 'refuse'

export async function POST(req: NextRequest) {
  try {
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Auth utilisateur via header Authorization
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const action: DevisAction = body?.action
    const devisId: string = body?.devisId
    const dossierId: string = body?.dossierId
    const reason: string | undefined = body?.reason

    if (!action || !devisId || !dossierId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Vérifier que l'utilisateur est bien rattaché au dossier via son profil apporteur
    const { data: ownership, error: ownErr } = await supabaseClient
      .from('dossiers')
      .select('id')
      .eq('id', dossierId)
      .in('apporteur_id', (
        await supabaseClient
          .from('apporteur_profiles')
          .select('id')
          .eq('user_id', user.id)
      ).data?.map((r: any) => r.id) || [] )
      .maybeSingle()

    if (ownErr || !ownership) {
      return NextResponse.json({ error: 'Accès non autorisé au dossier' }, { status: 403 })
    }

    if (action === 'validate') {
      const { error: devisError } = await supabaseClient
        .from('devis')
        .update({
          statut: 'accepte',
          validated_at: new Date().toISOString(),
          validated_by: user.id
        })
        .eq('id', devisId)

      if (devisError) throw devisError

      await supabaseClient
        .from('dossiers')
        .update({
          statut_canon: 'devis_accepte',
          updated_at: new Date().toISOString()
        })
        .eq('id', dossierId)

      await supabaseClient
        .from('process_steps')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('dossier_id', dossierId)
        .eq('step_order', 5)

      await supabaseClient
        .from('process_steps')
        .update({ status: 'current' })
        .eq('dossier_id', dossierId)
        .eq('step_order', 6)

      // Récupérer les informations du dossier et du devis pour l'activité
      const { data: dossierInfo } = await supabaseClient
        .from('dossiers')
        .select('numero_dossier, apporteur_id')
        .eq('id', dossierId)
        .single()

      const { data: devisInfo } = await supabaseClient
        .from('devis')
        .select('numero_devis')
        .eq('id', devisId)
        .single()

      // Créer une activité pour l'apporteur
      if (dossierInfo?.apporteur_id) {
        await supabaseClient
          .from('activities')
          .insert({
            user_id: dossierInfo.apporteur_id,
            dossier_id: dossierId,
            activity_type: 'devis_accepte',
            activity_title: 'Devis accepté',
            activity_description: `Le devis ${devisInfo?.numero_devis || devisId} du dossier ${dossierInfo?.numero_dossier || dossierId} a été accepté par le client.`,
            activity_data: {
              dossier_id: dossierId,
              devis_id: devisId,
              numero_dossier: dossierInfo?.numero_dossier,
              numero_devis: devisInfo?.numero_devis,
              action: 'devis_accepte'
            }
          })
      }

      // Notifier l'apporteur (pas l'utilisateur qui a accepté)
      if (dossierInfo?.apporteur_id) {
        await supabaseClient
          .from('notifications')
          .insert({
            type: 'devis_accepte',
            dossier_id: dossierId,
            user_id: dossierInfo.apporteur_id,
            title: 'Devis accepté',
            message: 'Le devis a été accepté'
          })
      }

      // Tracking analytics
      try {
        await AnalyticsService.trackDevisAccepted(
          devisId,
          dossierId,
          dossierInfo?.apporteur_id
        );
      } catch (analyticsError) {
        console.warn('[API] Erreur non critique analytics:', analyticsError);
      }

      return NextResponse.json({ success: true, action, message: 'Devis validé avec succès' })
    }

    if (action === 'refuse') {
      if (!reason) {
        return NextResponse.json({ error: 'Raison du refus obligatoire' }, { status: 400 })
      }

      // Récupérer les données actuelles du devis
      const { data: currentDevis, error: fetchError } = await supabaseClient
        .from('devis')
        .select('donnees_devis')
        .eq('id', devisId)
        .single()

      if (fetchError) throw fetchError

      // Mettre à jour le devis avec le motif de refus dans donnees_devis
      const { error: devisError } = await supabaseClient
        .from('devis')
        .update({
          statut: 'refuse',
          refused_at: new Date().toISOString(),
          donnees_devis: {
            ...currentDevis?.donnees_devis,
            motif_refus: reason
          }
        })
        .eq('id', devisId)

      if (devisError) throw devisError

      await supabaseClient
        .from('dossiers')
        .update({
          statut_canon: 'refuse',
          commentaire: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', dossierId)

      await supabaseClient
        .from('process_steps')
        .update({ status: 'error', completed_at: new Date().toISOString() })
        .eq('dossier_id', dossierId)
        .eq('step_order', 5)

      // Récupérer les informations du dossier et du devis pour l'activité
      const { data: dossierInfo } = await supabaseClient
        .from('dossiers')
        .select('numero_dossier, apporteur_id')
        .eq('id', dossierId)
        .single()

      const { data: devisInfo } = await supabaseClient
        .from('devis')
        .select('numero_devis')
        .eq('id', devisId)
        .single()

      // Créer une activité pour l'apporteur
      if (dossierInfo?.apporteur_id) {
        await supabaseClient
          .from('activities')
          .insert({
            user_id: dossierInfo.apporteur_id,
            dossier_id: dossierId,
            activity_type: 'devis_refuse',
            activity_title: 'Devis refusé',
            activity_description: `Le devis ${devisInfo?.numero_devis || devisId} du dossier ${dossierInfo?.numero_dossier || dossierId} a été refusé par le client. Motif: ${reason}`,
            activity_data: {
              dossier_id: dossierId,
              devis_id: devisId,
              numero_dossier: dossierInfo?.numero_dossier,
              numero_devis: devisInfo?.numero_devis,
              motif_refus: reason,
              action: 'devis_refuse'
            }
          })
      }

      await supabaseClient
        .from('notifications')
        .insert({
          type: 'devis_refuse',
          dossier_id: dossierId,
          user_id: user.id,
          title: 'Devis refusé',
          message: 'Le devis a été refusé',
          details: { reason }
        })

      // Tracking analytics
      try {
        await AnalyticsService.trackDevisRefused(
          devisId,
          dossierId,
          dossierInfo?.apporteur_id,
          reason
        );
      } catch (analyticsError) {
        console.warn('[API] Erreur non critique analytics:', analyticsError);
      }

      return NextResponse.json({ success: true, action, message: 'Devis refusé' })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (error: any) {
    console.error('[API] /api/devis/manage error', error)
    return NextResponse.json({ error: error?.message || 'Erreur interne' }, { status: 400 })
  }
}


