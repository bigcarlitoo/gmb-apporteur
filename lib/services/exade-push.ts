import { supabase } from '@/lib/supabase';
import { AnalyticsService } from '@/lib/services/analytics';

export interface ExadePushResult {
  success: boolean;
  simulation_id?: string;
  error?: string;
}

/**
 * Service pour pusher un devis vers Exade Production
 * 
 * À utiliser UNIQUEMENT après acceptation du devis par l'apporteur.
 * Une fois pushé, le devis est verrouillé et ne peut plus être modifié.
 */
export class ExadePushService {
  /**
   * Pousse un devis vers le compte Exade du courtier
   * 
   * @param devisId - ID du devis à pusher
   * @param brokerId - ID du broker/courtier
   * @returns Résultat du push avec l'ID de simulation
   */
  static async pushDevisToExade(
    devisId: string,
    brokerId: string
  ): Promise<ExadePushResult> {
    try {
      // 1. Vérifier que le devis n'est pas déjà pushé
      const { data: devis, error: devisError } = await supabase
        .from('devis')
        .select(`
          *,
          dossier:dossiers!inner(
            id,
            statut_canon,
            broker_id,
            client_infos:client_infos!inner(*),
            pret_data:pret_data!inner(*)
          )
        `)
        .eq('id', devisId)
        .single();

      if (devisError || !devis) {
        return { success: false, error: 'Devis non trouvé' };
      }

      if (devis.exade_locked) {
        return { success: false, error: 'Ce devis est déjà verrouillé (déjà pushé vers Exade)' };
      }

      // 2. Vérifier que le dossier est bien accepté
      const dossier = devis.dossier;
      if (dossier.statut_canon !== 'devis_accepte') {
        return { 
          success: false, 
          error: 'Le dossier doit être au statut "devis_accepte" pour pusher vers Exade' 
        };
      }

      // 3. Vérifier que le broker correspond
      if (dossier.broker_id !== brokerId) {
        return { success: false, error: 'Ce devis n\'appartient pas à ce courtier' };
      }

      // 4. Récupérer la config Exade du broker
      const { data: exadeConfig, error: configError } = await supabase
        .from('broker_exade_configs')
        .select('code_courtier, licence_key, endpoint_url, is_enabled')
        .eq('broker_id', brokerId)
        .eq('is_enabled', true)
        .single();

      if (configError || !exadeConfig) {
        return { 
          success: false, 
          error: 'Configuration Exade non trouvée pour ce courtier' 
        };
      }

      // 5. Appeler l'API Exade pour pusher le devis
      // Note: L'API /api/exade/tarifs est réutilisée avec type_operation = 2
      // Le code_courtier dans l'appel crée la simulation sur le compte du courtier
      const clientInfo = Array.isArray(dossier.client_infos) 
        ? dossier.client_infos[0] 
        : dossier.client_infos;
      const pretData = Array.isArray(dossier.pret_data) 
        ? dossier.pret_data[0] 
        : dossier.pret_data;
      
      // Récupérer l'id_tarif du devis pour cibler le même tarif
      // L'id_tarif est directement sur l'objet devis (pas dans donnees_devis)
      const idTarif = (devis as Record<string, unknown>).id_tarif as string | undefined;
      
      // Log pour vérifier les données envoyées
      console.log('[ExadePushService] Push avec:', {
        devisId,
        idTarif,
        commissionCode: devis.commission_exade_code,
        fraisCourtier: devis.frais_courtier,
        compagnie: (devis as Record<string, unknown>).compagnie,
        produit: (devis as Record<string, unknown>).produit
      });

      if (!idTarif) {
        console.warn('[ExadePushService] Attention: id_tarif non trouvé sur le devis, le push créera une nouvelle tarification');
      }

      // IMPORTANT: useProductionUrl = true pour créer le devis sur le compte Exade du courtier
      // Cela utilise l'URL de production (www.exade.fr) qui rend la simulation VISIBLE sur le dashboard
      const response = await fetch('/api/exade/tarifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_id: brokerId,
          clientInfo,
          pretData,
          idTarif, // Cibler le même tarif
          useProductionUrl: true, // ← PRODUCTION pour que le devis soit visible sur le dashboard courtier
          commission: {
            frais_adhesion_apporteur: devis.frais_courtier,
            commissionnement: devis.commission_exade_code
          }
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: payload?.error || 'Erreur lors du push vers Exade' 
        };
      }

      // 6. Récupérer l'id_simulation de la réponse
      const tarifs = payload?.tarifs || [];
      const simulationId = tarifs[0]?.id_simulation;

      if (!simulationId) {
        return { 
          success: false, 
          error: 'ID de simulation non retourné par Exade' 
        };
      }

      // 7. Mettre à jour le devis avec l'ID et le verrouiller
      const { error: updateError } = await supabase
        .from('devis')
        .update({
          exade_simulation_id: simulationId,
          exade_pushed_at: new Date().toISOString(),
          exade_locked: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', devisId);

      if (updateError) {
        console.error('[ExadePushService] Erreur mise à jour devis:', updateError);
        return { 
          success: false, 
          error: 'Devis pushé mais erreur lors de la mise à jour locale' 
        };
      }

      // 8. Créer une activité pour tracer
      await supabase
        .from('activities')
        .insert({
          broker_id: brokerId,
          dossier_id: dossier.id,
          activity_type: 'devis_pushed_exade',
          activity_title: 'Devis envoyé vers Exade',
          activity_description: `Le devis ${devis.numero_devis} a été envoyé sur le compte Exade du courtier. ID simulation: ${simulationId}`,
          activity_data: {
            devis_id: devisId,
            simulation_id: simulationId,
            action: 'devis_pushed_exade'
          }
        });

      // 9. Tracking analytics
      try {
        await AnalyticsService.trackDevisPushedExade(
          devisId,
          dossier.id,
          brokerId,
          simulationId
        );
      } catch (analyticsError) {
        console.warn('[ExadePushService] Erreur non critique analytics:', analyticsError);
      }

      return { 
        success: true, 
        simulation_id: simulationId 
      };

    } catch (error) {
      console.error('[ExadePushService.pushDevisToExade] Erreur:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * Vérifie si un devis peut être pushé vers Exade
   */
  static async canPushToExade(devisId: string): Promise<{ canPush: boolean; reason?: string }> {
    try {
      const { data: devis, error } = await supabase
        .from('devis')
        .select(`
          exade_locked,
          dossier:dossiers!inner(statut_canon)
        `)
        .eq('id', devisId)
        .single();

      if (error || !devis) {
        return { canPush: false, reason: 'Devis non trouvé' };
      }

      if (devis.exade_locked) {
        return { canPush: false, reason: 'Devis déjà envoyé vers Exade' };
      }

      const dossierData = devis.dossier;
      const dossier = Array.isArray(dossierData) ? dossierData[0] : dossierData;
      if (!dossier || dossier.statut_canon !== 'devis_accepte') {
        return { canPush: false, reason: 'Le dossier doit être au statut "devis_accepte"' };
      }

      return { canPush: true };
    } catch (error) {
      return { canPush: false, reason: 'Erreur de vérification' };
    }
  }
}

