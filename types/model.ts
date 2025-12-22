/**
 * DOMAIN TYPES - Based on db.md
 * These types serve as the interface for the application Logic.
 * They are designed to be mapped to Supabase DB types later.
 */

export type BrokerStatus = 'actif' | 'suspendu' | 'inactif';
export type BrokerOnboardingStatus = 'created' | 'exade_pending' | 'ready';
export type BrokerUserRole = 'owner' | 'admin' | 'member';

export interface Broker {
  id: string;
  name: string;
  status: BrokerStatus;
  onboarding_status: BrokerOnboardingStatus;
  // Minimal fields for UI
}

export type BrokerInviteType = 'apporteur' | 'broker_user';

export interface BrokerInvite {
  id: string;
  broker_id: string;
  invite_type: BrokerInviteType;
  token: string;
  expires_at: string;
  max_uses: number;
  uses: number;
  revoked_at?: string | null;
  // Link generation helper
  link_url?: string; 
}

// Configuration complète Exade - les courtiers entrent leurs propres credentials
export interface ExadeConfig {
  id: string;
  broker_id: string;
  code_courtier: string;
  licence_key: string;           // Clé de licence WebService (obligatoire)
  sso_key?: string;              // Clé SSO (optionnel)
  soap_url: string;              // URL du WebService (par défaut: https://www.exade.fr/4DSOAP)
  is_enabled: boolean;
  last_tested_at?: string | null;
  last_test_status?: 'success' | 'error' | null;
}

export interface WalletSummary {
  broker_id: string;
  balance_available: number;
  balance_pending: number;
  total_earnings: number;
  recent_history: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  date: string;
  amount: number;
  label: string;
  status: 'completed' | 'pending';
}

export type DocumentSource = 'uploaded' | 'exade_generated' | 'system';
export type DocumentVisibility = 'apporteur' | 'broker_only' | 'admin_only';

export interface DocumentItem {
  id: string;
  dossier_id?: string;
  document_name: string;
  document_type: string;
  url?: string; // For stub/preview
  source?: DocumentSource;
  visibility?: DocumentVisibility;
  created_at?: string;
}
