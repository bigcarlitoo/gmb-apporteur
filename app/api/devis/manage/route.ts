/**
 * API Route: Gestion des devis (validation/refus)
 * Accès: Apporteur propriétaire du dossier
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  createApiRouteClient, 
  createServiceRoleClient,
  getAuthenticatedUser 
} from '@/lib/supabase/server'
import { AnalyticsService } from '@/lib/services/analytics'

type DevisAction = 'validate' | 'refuse'

export async function POST(request: NextRequest) {
  try {
    // Authentification
    const supabase = await createApiRouteClient(request)
    const user = await getAuthenticatedUser(supabase)
    
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    
    const body = await request.json()
    const action: DevisAction = body?.action
    const devisId: string = body?.devisId
    const dossierId: string = body?.dossierId
    const reason: string | undefined = body?.reason
    
    if (!action || !devisId || !dossierId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }
    
    const serviceClient = createServiceRoleClient()
    
    // Vérifier que l'utilisateur a accès au dossier
    // Pour les apporteurs: vérifier que le dossier leur appartient
    // Pour les admins/broker_users: accès autorisé
    if (user.role === 'apporteur') {
      const { data: dossier, error: dossierError } = await serviceClient
        .from('dossiers')
        .select('apporteur_id')
        .eq('id', dossierId)
        .single()
      
      if (dossierError || !dossier) {
        return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
      }
      
      if (dossier.apporteur_id !== user.apporteurId) {
        return NextResponse.json({ error: 'Accès non autorisé au dossier' }, { status: 403 })
      }
    }
    
    if (action === 'validate') {
      // Mettre à jour le devis
      const { error: devisError } = await serviceClient
        .from('devis')
        .update({
          statut: 'accepte',
          validated_at: new Date().toISOString(),
          validated_by: user.id
        })
        .eq('id', devisId)
      
      if (devisError) throw devisError
      
      // Mettre à jour le statut du dossier
      await serviceClient
        .from('dossiers')
        .update({
          statut_canon: 'devis_accepte',
          updated_at: new Date().toISOString()
        })
        .eq('id', dossierId)
      
      // Mettre à jour les étapes du processus
      await serviceClient
        .from('process_steps')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('dossier_id', dossierId)
        .eq('step_order', 5)
      
      await serviceClient
        .from('process_steps')
        .update({ status: 'current' })
        .eq('dossier_id', dossierId)
        .eq('step_order', 6)
      
      // Récupérer les informations pour les notifications
      const { data: dossierInfo } = await serviceClient
        .from('dossiers')
        .select('numero_dossier, apporteur_id, broker_id')
        .eq('id', dossierId)
        .single()
      
      const { data: devisInfo } = await serviceClient
        .from('devis')
        .select('numero_devis')
        .eq('id', devisId)
        .single()
      
      // Créer une activité pour l'apporteur
      if (dossierInfo?.apporteur_id) {
        await serviceClient
          .from('activities')
          .insert({
            user_id: dossierInfo.apporteur_id,
            dossier_id: dossierId,
            broker_id: dossierInfo.broker_id,
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
        
        // Notification
        await serviceClient
          .from('notifications')
          .insert({
            type: 'devis_accepte',
            dossier_id: dossierId,
            user_id: dossierInfo.apporteur_id,
            title: 'Devis accepté',
            message: 'Le devis a été accepté'
          })
      }
      
      // Analytics
      try {
        await AnalyticsService.trackDevisAccepted(
          devisId,
          dossierId,
          dossierInfo?.apporteur_id
        )
      } catch (analyticsError) {
        console.warn('[API Devis Manage] Erreur analytics:', analyticsError)
      }
      
      return NextResponse.json({ success: true, action, message: 'Devis validé avec succès' })
    }
    
    if (action === 'refuse') {
      if (!reason) {
        return NextResponse.json({ error: 'Raison du refus obligatoire' }, { status: 400 })
      }
      
      // Récupérer les données actuelles du devis
      const { data: currentDevis, error: fetchError } = await serviceClient
        .from('devis')
        .select('donnees_devis')
        .eq('id', devisId)
        .single()
      
      if (fetchError) throw fetchError
      
      // Mettre à jour le devis avec le motif de refus
      const { error: devisError } = await serviceClient
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
      
      // Mettre à jour le dossier
      await serviceClient
        .from('dossiers')
        .update({
          statut_canon: 'refuse',
          commentaire: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', dossierId)
      
      // Mettre à jour les étapes du processus
      await serviceClient
        .from('process_steps')
        .update({ status: 'error', completed_at: new Date().toISOString() })
        .eq('dossier_id', dossierId)
        .eq('step_order', 5)
      
      // Récupérer les informations pour les notifications
      const { data: dossierInfo } = await serviceClient
        .from('dossiers')
        .select('numero_dossier, apporteur_id, broker_id')
        .eq('id', dossierId)
        .single()
      
      const { data: devisInfo } = await serviceClient
        .from('devis')
        .select('numero_devis')
        .eq('id', devisId)
        .single()
      
      // Créer une activité
      if (dossierInfo?.apporteur_id) {
        await serviceClient
          .from('activities')
          .insert({
            user_id: dossierInfo.apporteur_id,
            dossier_id: dossierId,
            broker_id: dossierInfo.broker_id,
            activity_type: 'devis_refuse',
            activity_title: 'Devis refusé',
            activity_description: `Le devis ${devisInfo?.numero_devis || devisId} du dossier ${dossierInfo?.numero_dossier || dossierId} a été refusé. Motif: ${reason}`,
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
      
      // Notification
      await serviceClient
        .from('notifications')
        .insert({
          type: 'devis_refuse',
          dossier_id: dossierId,
          user_id: user.id,
          title: 'Devis refusé',
          message: 'Le devis a été refusé',
          details: { reason }
        })
      
      // Analytics
      try {
        await AnalyticsService.trackDevisRefused(
          devisId,
          dossierId,
          dossierInfo?.apporteur_id,
          reason
        )
      } catch (analyticsError) {
        console.warn('[API Devis Manage] Erreur analytics:', analyticsError)
      }
      
      return NextResponse.json({ success: true, action, message: 'Devis refusé' })
    }
    
    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    
  } catch (error: any) {
    console.error('[API Devis Manage] Erreur:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur interne' }, 
      { status: 500 }
    )
  }
}
