import { supabase } from '@/lib/supabase';

// Types d'événements trackés
export type AnalyticsEventType = 
  // Onboarding
  | 'user_signup'
  | 'broker_keys_entered'
  | 'broker_first_apporteur_invited'
  | 'apporteur_first_dossier_created'
  | 'apporteur_linked_to_broker'
  // Dossiers
  | 'dossier_created'
  | 'dossier_finalized'
  | 'dossier_cancelled'
  // Devis
  | 'devis_generated'
  | 'devis_sent_to_apporteur'
  | 'devis_viewed_by_apporteur'
  | 'devis_accepted'
  | 'devis_refused'
  | 'devis_pushed_exade'
  // Anti-contournement
  | 'client_lock_triggered'
  | 'client_auto_linked'
  | 'suspicious_refusal_pattern'
  // Revenus
  | 'commission_earned'
  | 'payment_processed'
  | 'withdrawal_requested';

export type AnalyticsEventCategory = 
  | 'onboarding'
  | 'dossier'
  | 'devis'
  | 'payment'
  | 'security';

export interface AnalyticsEventData {
  event_type: AnalyticsEventType;
  event_category: AnalyticsEventCategory;
  user_id?: string;
  broker_id?: string;
  apporteur_id?: string;
  dossier_id?: string;
  devis_id?: string;
  event_data?: Record<string, unknown>;
  duration_ms?: number;
  email?: string; // Sera hashé automatiquement
  phone?: string; // Sera hashé automatiquement
  session_id?: string;
}

/**
 * Service de tracking analytics RGPD-compliant
 * 
 * - Les emails et téléphones sont hashés en SHA256
 * - Pas de stockage d'IP exacte
 * - Données anonymisables
 */
export class AnalyticsService {
  /**
   * Hash une chaîne en SHA256 (côté client)
   */
  private static async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Tracker un événement
   */
  static async track(event: AnalyticsEventData): Promise<void> {
    try {
      // Hash des données sensibles
      const hashedEmail = event.email ? await this.hashString(event.email) : null;
      const hashedPhone = event.phone ? await this.hashString(event.phone) : null;

      const { error } = await supabase
        .from('analytics_events')
        .insert({
          event_type: event.event_type,
          event_category: event.event_category,
          user_id: event.user_id || null,
          broker_id: event.broker_id || null,
          apporteur_id: event.apporteur_id || null,
          dossier_id: event.dossier_id || null,
          devis_id: event.devis_id || null,
          event_data: event.event_data || {},
          duration_ms: event.duration_ms || null,
          hashed_email: hashedEmail,
          hashed_phone: hashedPhone,
          session_id: event.session_id || this.getSessionId(),
          user_agent: typeof window !== 'undefined' ? navigator.userAgent : null,
        });

      if (error) {
        console.warn('[Analytics] Erreur tracking:', error.message);
      }
    } catch (err) {
      // Ne pas bloquer l'app si analytics échoue
      console.warn('[Analytics] Erreur silencieuse:', err);
    }
  }

  /**
   * Générer ou récupérer un session ID
   */
  private static getSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    
    let sessionId = sessionStorage.getItem('gmb_session_id');
    if (!sessionId) {
      sessionId = `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('gmb_session_id', sessionId);
    }
    return sessionId;
  }

  // ============================================================================
  // MÉTHODES HELPER POUR LES ÉVÉNEMENTS COURANTS
  // ============================================================================

  /**
   * Tracker une inscription utilisateur
   */
  static async trackSignup(userId: string, userType: 'broker' | 'apporteur', email?: string): Promise<void> {
    await this.track({
      event_type: 'user_signup',
      event_category: 'onboarding',
      user_id: userId,
      event_data: { user_type: userType },
      email,
    });
  }

  /**
   * Tracker la configuration Exade d'un broker
   */
  static async trackBrokerKeysEntered(brokerId: string, timeSinceSignupMs?: number): Promise<void> {
    await this.track({
      event_type: 'broker_keys_entered',
      event_category: 'onboarding',
      broker_id: brokerId,
      duration_ms: timeSinceSignupMs,
    });
  }

  /**
   * Tracker la création d'un dossier
   */
  static async trackDossierCreated(
    dossierId: string,
    brokerId?: string,
    apporteurId?: string,
    source: 'apporteur' | 'admin' = 'apporteur'
  ): Promise<void> {
    await this.track({
      event_type: 'dossier_created',
      event_category: 'dossier',
      dossier_id: dossierId,
      broker_id: brokerId,
      apporteur_id: apporteurId,
      event_data: { source },
    });
  }

  /**
   * Tracker la génération de devis
   */
  static async trackDevisGenerated(
    dossierId: string,
    brokerId: string,
    nbTarifs: number,
    durationMs?: number
  ): Promise<void> {
    await this.track({
      event_type: 'devis_generated',
      event_category: 'devis',
      dossier_id: dossierId,
      broker_id: brokerId,
      event_data: { nb_tarifs: nbTarifs },
      duration_ms: durationMs,
    });
  }

  /**
   * Tracker l'envoi d'un devis à l'apporteur
   */
  static async trackDevisSent(
    devisId: string,
    dossierId: string,
    apporteurId?: string,
    timeSinceCreationMs?: number
  ): Promise<void> {
    await this.track({
      event_type: 'devis_sent_to_apporteur',
      event_category: 'devis',
      devis_id: devisId,
      dossier_id: dossierId,
      apporteur_id: apporteurId,
      duration_ms: timeSinceCreationMs,
    });
  }

  /**
   * Tracker l'acceptation d'un devis
   */
  static async trackDevisAccepted(
    devisId: string,
    dossierId: string,
    apporteurId?: string,
    timeSinceSentMs?: number
  ): Promise<void> {
    await this.track({
      event_type: 'devis_accepted',
      event_category: 'devis',
      devis_id: devisId,
      dossier_id: dossierId,
      apporteur_id: apporteurId,
      duration_ms: timeSinceSentMs,
    });
  }

  /**
   * Tracker le refus d'un devis
   */
  static async trackDevisRefused(
    devisId: string,
    dossierId: string,
    apporteurId?: string,
    motif?: string
  ): Promise<void> {
    await this.track({
      event_type: 'devis_refused',
      event_category: 'devis',
      devis_id: devisId,
      dossier_id: dossierId,
      apporteur_id: apporteurId,
      event_data: { motif },
    });
  }

  /**
   * Tracker le push vers Exade
   */
  static async trackDevisPushedExade(
    devisId: string,
    dossierId: string,
    brokerId: string,
    simulationId?: string
  ): Promise<void> {
    await this.track({
      event_type: 'devis_pushed_exade',
      event_category: 'devis',
      devis_id: devisId,
      dossier_id: dossierId,
      broker_id: brokerId,
      event_data: { simulation_id: simulationId },
    });
  }

  /**
   * Tracker la finalisation d'un dossier
   */
  static async trackDossierFinalized(
    dossierId: string,
    brokerId?: string,
    timeSinceAcceptanceMs?: number
  ): Promise<void> {
    await this.track({
      event_type: 'dossier_finalized',
      event_category: 'dossier',
      dossier_id: dossierId,
      broker_id: brokerId,
      duration_ms: timeSinceAcceptanceMs,
    });
  }

  /**
   * Tracker l'annulation d'un dossier
   */
  static async trackDossierCancelled(
    dossierId: string,
    brokerId?: string,
    reason?: string
  ): Promise<void> {
    await this.track({
      event_type: 'dossier_cancelled',
      event_category: 'dossier',
      dossier_id: dossierId,
      broker_id: brokerId,
      event_data: { reason },
    });
  }

  /**
   * Tracker un client lock déclenché (anti-contournement)
   */
  static async trackClientLockTriggered(
    brokerId: string,
    existingApporteurId?: string,
    existingDossierId?: string
  ): Promise<void> {
    await this.track({
      event_type: 'client_lock_triggered',
      event_category: 'security',
      broker_id: brokerId,
      dossier_id: existingDossierId,
      event_data: { existing_apporteur_id: existingApporteurId },
    });
  }

  /**
   * Tracker une commission gagnée
   */
  static async trackCommissionEarned(
    dossierId: string,
    brokerId: string,
    apporteurId: string,
    amount: number,
    source: 'frais_courtier' | 'commission_exade'
  ): Promise<void> {
    await this.track({
      event_type: 'commission_earned',
      event_category: 'payment',
      dossier_id: dossierId,
      broker_id: brokerId,
      apporteur_id: apporteurId,
      event_data: { amount_cents: Math.round(amount * 100), source },
    });
  }

  // ============================================================================
  // MÉTHODES D'ANALYSE
  // ============================================================================

  /**
   * Récupérer les statistiques d'un broker
   */
  static async getBrokerStats(brokerId: string, period: 'day' | 'week' | 'month' = 'month') {
    const periodMap = {
      day: 1,
      week: 7,
      month: 30,
    };

    const daysAgo = periodMap[period];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_type, event_category, event_data, created_at')
      .eq('broker_id', brokerId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Analytics] Erreur stats broker:', error);
      return null;
    }

    // Compter par type d'événement
    const eventCounts: Record<string, number> = {};
    data?.forEach(event => {
      eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
    });

    return {
      total_events: data?.length || 0,
      event_counts: eventCounts,
      period,
    };
  }
}

