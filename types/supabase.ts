export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_data: Json | null
          activity_description: string | null
          activity_title: string
          activity_type: string
          created_at: string | null
          dossier_id: string | null
          id: string
          is_read: boolean | null
          user_id: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_description?: string | null
          activity_title: string
          activity_type: string
          created_at?: string | null
          dossier_id?: string | null
          id?: string
          is_read?: boolean | null
          user_id?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_description?: string | null
          activity_title?: string
          activity_type?: string
          created_at?: string | null
          dossier_id?: string | null
          id?: string
          is_read?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          broker_id: string | null
          created_at: string
          devis_id: string | null
          dossier_id: string | null
          duration_ms: number | null
          event_category: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          broker_id?: string | null
          created_at?: string
          devis_id?: string | null
          dossier_id?: string | null
          duration_ms?: number | null
          event_category: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          broker_id?: string | null
          created_at?: string
          devis_id?: string | null
          dossier_id?: string | null
          duration_ms?: number | null
          event_category?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      apporteur_profiles: {
        Row: {
          cgu_accepted_at: string | null
          created_at: string | null
          email: string
          id: string
          last_login_at: string | null
          nom: string
          prenom: string
          statut: Database["public"]["Enums"]["apporteur_statut"]
          telephone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cgu_accepted_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          last_login_at?: string | null
          nom: string
          prenom: string
          statut?: Database["public"]["Enums"]["apporteur_statut"]
          telephone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cgu_accepted_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          nom?: string
          prenom?: string
          statut?: Database["public"]["Enums"]["apporteur_statut"]
          telephone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      broker_apporteurs: {
        Row: {
          apporteur_profile_id: string
          broker_id: string
          created_at: string
          custom_exade_share_pct: number | null
          custom_fixed_amount: number | null
          custom_share_pct: number | null
          default_commission_rule_id: string | null
          id: string
          status: Database["public"]["Enums"]["broker_apporteur_status"]
          updated_at: string
        }
        Insert: {
          apporteur_profile_id: string
          broker_id: string
          created_at?: string
          custom_exade_share_pct?: number | null
          custom_fixed_amount?: number | null
          custom_share_pct?: number | null
          default_commission_rule_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["broker_apporteur_status"]
          updated_at?: string
        }
        Update: {
          apporteur_profile_id?: string
          broker_id?: string
          created_at?: string
          custom_exade_share_pct?: number | null
          custom_fixed_amount?: number | null
          custom_share_pct?: number | null
          default_commission_rule_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["broker_apporteur_status"]
          updated_at?: string
        }
        Relationships: []
      }
      broker_commission_settings: {
        Row: {
          broker_id: string
          created_at: string
          default_apporteur_exade_share_pct: number | null
          default_apporteur_fixed_amount: number | null
          default_apporteur_share_pct: number
          default_commission_exade_code: string | null
          default_frais_courtier: number
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          subscription_plan: string
          subscription_started_at: string | null
          updated_at: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          default_apporteur_exade_share_pct?: number | null
          default_apporteur_fixed_amount?: number | null
          default_apporteur_share_pct?: number
          default_commission_exade_code?: string | null
          default_frais_courtier?: number
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string
          subscription_started_at?: string | null
          updated_at?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          default_apporteur_exade_share_pct?: number | null
          default_apporteur_fixed_amount?: number | null
          default_apporteur_share_pct?: number
          default_commission_exade_code?: string | null
          default_frais_courtier?: number
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string
          subscription_started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brokers: {
        Row: {
          billing_address: string | null
          billing_email: string | null
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          exade_default_environment: Database["public"]["Enums"]["exade_environment"] | null
          exade_request_email_sent_at: string | null
          id: string
          is_blocked: boolean
          name: string
          onboarding_completed_at: string | null
          onboarding_status: Database["public"]["Enums"]["broker_onboarding_status"]
          orias_number: string | null
          pending_validations_count: number
          siret_number: string | null
          status: Database["public"]["Enums"]["broker_status"]
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          billing_email?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          exade_default_environment?: Database["public"]["Enums"]["exade_environment"] | null
          exade_request_email_sent_at?: string | null
          id?: string
          is_blocked?: boolean
          name: string
          onboarding_completed_at?: string | null
          onboarding_status?: Database["public"]["Enums"]["broker_onboarding_status"]
          orias_number?: string | null
          pending_validations_count?: number
          siret_number?: string | null
          status?: Database["public"]["Enums"]["broker_status"]
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          billing_email?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          exade_default_environment?: Database["public"]["Enums"]["exade_environment"] | null
          exade_request_email_sent_at?: string | null
          id?: string
          is_blocked?: boolean
          name?: string
          onboarding_completed_at?: string | null
          onboarding_status?: Database["public"]["Enums"]["broker_onboarding_status"]
          orias_number?: string | null
          pending_validations_count?: number
          siret_number?: string | null
          status?: Database["public"]["Enums"]["broker_status"]
          updated_at?: string
        }
        Relationships: []
      }
      client_locks: {
        Row: {
          apporteur_id: string
          broker_id: string
          client_hash: string
          created_at: string
          dossier_id: string | null
          expires_at: string
          id: string
        }
        Insert: {
          apporteur_id: string
          broker_id: string
          client_hash: string
          created_at?: string
          dossier_id?: string | null
          expires_at?: string
          id?: string
        }
        Update: {
          apporteur_id?: string
          broker_id?: string
          client_hash?: string
          created_at?: string
          dossier_id?: string | null
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      dossiers: {
        Row: {
          admin_id: string | null
          apporteur_amount: number | null
          apporteur_id: string | null
          broker_amount: number | null
          broker_id: string
          commentaire: string | null
          commentaire_refus: string | null
          commission_status: string | null
          comparison_modal_seen: boolean | null
          created_at: string | null
          date_creation: string | null
          date_finalisation: string | null
          date_paiement_apporteur: string | null
          date_validation: string | null
          devis_selectionne_id: string | null
          economie_generee: number | null
          extracted_client_data: Json | null
          frais_courtage: number | null
          id: string
          insurance_product_id: string
          is_couple: boolean | null
          is_read: boolean | null
          last_extraction_at: string | null
          montant_capital: number | null
          notes_interne: string | null
          numero_dossier: string
          platform_fee: number | null
          statut: string | null
          statut_canon: Database["public"]["Enums"]["dossier_statut"]
          type_dossier: string
          updated_at: string | null
          validated_at: string | null
          validation_due_at: string | null
          validation_reminder_sent_at: string | null
        }
        Insert: {
          admin_id?: string | null
          apporteur_amount?: number | null
          apporteur_id?: string | null
          broker_amount?: number | null
          broker_id: string
          commentaire?: string | null
          commentaire_refus?: string | null
          commission_status?: string | null
          comparison_modal_seen?: boolean | null
          created_at?: string | null
          date_creation?: string | null
          date_finalisation?: string | null
          date_paiement_apporteur?: string | null
          date_validation?: string | null
          devis_selectionne_id?: string | null
          economie_generee?: number | null
          extracted_client_data?: Json | null
          frais_courtage?: number | null
          id?: string
          insurance_product_id: string
          is_couple?: boolean | null
          is_read?: boolean | null
          last_extraction_at?: string | null
          montant_capital?: number | null
          notes_interne?: string | null
          numero_dossier: string
          platform_fee?: number | null
          statut?: string | null
          statut_canon?: Database["public"]["Enums"]["dossier_statut"]
          type_dossier: string
          updated_at?: string | null
          validated_at?: string | null
          validation_due_at?: string | null
          validation_reminder_sent_at?: string | null
        }
        Update: {
          admin_id?: string | null
          apporteur_amount?: number | null
          apporteur_id?: string | null
          broker_amount?: number | null
          broker_id?: string
          commentaire?: string | null
          commentaire_refus?: string | null
          commission_status?: string | null
          comparison_modal_seen?: boolean | null
          created_at?: string | null
          date_creation?: string | null
          date_finalisation?: string | null
          date_paiement_apporteur?: string | null
          date_validation?: string | null
          devis_selectionne_id?: string | null
          economie_generee?: number | null
          extracted_client_data?: Json | null
          frais_courtage?: number | null
          id?: string
          insurance_product_id?: string
          is_couple?: boolean | null
          is_read?: boolean | null
          last_extraction_at?: string | null
          montant_capital?: number | null
          notes_interne?: string | null
          numero_dossier?: string
          platform_fee?: number | null
          statut?: string | null
          statut_canon?: Database["public"]["Enums"]["dossier_statut"]
          type_dossier?: string
          updated_at?: string | null
          validated_at?: string | null
          validation_due_at?: string | null
          validation_reminder_sent_at?: string | null
        }
        Relationships: []
      }
      devis: {
        Row: {
          apporteur_amount: number | null
          apporteur_exade_amount: number | null
          apporteur_exade_share_pct: number | null
          apporteur_share_pct: number | null
          commission_exade_amount: number | null
          commission_exade_code: string | null
          compagnie: string | null
          courtier_net_amount: number | null
          cout_mensuel: number | null
          cout_total: number | null
          created_at: string | null
          date_acceptation: string | null
          date_envoi: string | null
          date_expiration: string | null
          date_generation: string | null
          date_refus: string | null
          donnees_devis: Json
          dossier_id: string | null
          economie_estimee: number | null
          financial_calculated_at: string | null
          frac_assurance: number | null
          frais_courtier: number | null
          id: string
          motif_refus: string | null
          numero_devis: string
          pdf_created_at: string | null
          pdf_url: string | null
          platform_fee_amount: number | null
          platform_fee_pct: number | null
          produit: string | null
          reference: string | null
          statut: string | null
          updated_at: string | null
        }
        Insert: {
          apporteur_amount?: number | null
          apporteur_exade_amount?: number | null
          apporteur_exade_share_pct?: number | null
          apporteur_share_pct?: number | null
          commission_exade_amount?: number | null
          commission_exade_code?: string | null
          compagnie?: string | null
          courtier_net_amount?: number | null
          cout_mensuel?: number | null
          cout_total?: number | null
          created_at?: string | null
          date_acceptation?: string | null
          date_envoi?: string | null
          date_expiration?: string | null
          date_generation?: string | null
          date_refus?: string | null
          donnees_devis: Json
          dossier_id?: string | null
          economie_estimee?: number | null
          financial_calculated_at?: string | null
          frac_assurance?: number | null
          frais_courtier?: number | null
          id?: string
          motif_refus?: string | null
          numero_devis: string
          pdf_created_at?: string | null
          pdf_url?: string | null
          platform_fee_amount?: number | null
          platform_fee_pct?: number | null
          produit?: string | null
          reference?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Update: {
          apporteur_amount?: number | null
          apporteur_exade_amount?: number | null
          apporteur_exade_share_pct?: number | null
          apporteur_share_pct?: number | null
          commission_exade_amount?: number | null
          commission_exade_code?: string | null
          compagnie?: string | null
          courtier_net_amount?: number | null
          cout_mensuel?: number | null
          cout_total?: number | null
          created_at?: string | null
          date_acceptation?: string | null
          date_envoi?: string | null
          date_expiration?: string | null
          date_generation?: string | null
          date_refus?: string | null
          donnees_devis?: Json
          dossier_id?: string | null
          economie_estimee?: number | null
          financial_calculated_at?: string | null
          frac_assurance?: number | null
          frais_courtier?: number | null
          id?: string
          motif_refus?: string | null
          numero_devis?: string
          pdf_created_at?: string | null
          pdf_url?: string | null
          platform_fee_amount?: number | null
          platform_fee_pct?: number | null
          produit?: string | null
          reference?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pret_data: {
        Row: {
          apport_personnel: number | null
          banque_preteuse: string
          capital_restant_du: number | null
          cout_assurance_banque: number | null
          created_at: string | null
          date_debut: string | null
          date_debut_effective: string | null
          date_fin: string | null
          dossier_id: string | null
          duree_mois: number
          duree_restante_mois: number | null
          frac_assurance: number | null
          id: string
          montant_capital: number
          objet_financement_code: number | null
          taux_assurance: number | null
          taux_effectif: number | null
          taux_nominal: number | null
          type_adhesion: number | null
          type_credit: number | null
          type_garantie: string | null
          type_pret: string
          type_pret_code: number | null
          type_taux_code: number | null
          updated_at: string | null
        }
        Insert: {
          apport_personnel?: number | null
          banque_preteuse: string
          capital_restant_du?: number | null
          cout_assurance_banque?: number | null
          created_at?: string | null
          date_debut?: string | null
          date_debut_effective?: string | null
          date_fin?: string | null
          dossier_id?: string | null
          duree_mois: number
          duree_restante_mois?: number | null
          frac_assurance?: number | null
          id?: string
          montant_capital: number
          objet_financement_code?: number | null
          taux_assurance?: number | null
          taux_effectif?: number | null
          taux_nominal?: number | null
          type_adhesion?: number | null
          type_credit?: number | null
          type_garantie?: string | null
          type_pret: string
          type_pret_code?: number | null
          type_taux_code?: number | null
          updated_at?: string | null
        }
        Update: {
          apport_personnel?: number | null
          banque_preteuse?: string
          capital_restant_du?: number | null
          cout_assurance_banque?: number | null
          created_at?: string | null
          date_debut?: string | null
          date_debut_effective?: string | null
          date_fin?: string | null
          dossier_id?: string | null
          duree_mois?: number
          duree_restante_mois?: number | null
          frac_assurance?: number | null
          id?: string
          montant_capital?: number
          objet_financement_code?: number | null
          taux_assurance?: number | null
          taux_effectif?: number | null
          taux_nominal?: number | null
          type_adhesion?: number | null
          type_credit?: number | null
          type_garantie?: string | null
          type_pret?: string
          type_pret_code?: number | null
          type_taux_code?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wallet_accounts: {
        Row: {
          balance_available: number
          balance_pending: number
          broker_id: string
          created_at: string
          currency: string
          id: string
          owner_id: string | null
          owner_type: Database["public"]["Enums"]["wallet_owner_type"]
          updated_at: string
        }
        Insert: {
          balance_available?: number
          balance_pending?: number
          broker_id: string
          created_at?: string
          currency?: string
          id?: string
          owner_id?: string | null
          owner_type: Database["public"]["Enums"]["wallet_owner_type"]
          updated_at?: string
        }
        Update: {
          balance_available?: number
          balance_pending?: number
          broker_id?: string
          created_at?: string
          currency?: string
          id?: string
          owner_id?: string | null
          owner_type?: Database["public"]["Enums"]["wallet_owner_type"]
          updated_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          broker_id: string
          created_at: string
          devis_id: string | null
          dossier_id: string | null
          id: string
          label: string
          meta: Json | null
          status: Database["public"]["Enums"]["wallet_transaction_status"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_account_id: string
        }
        Insert: {
          amount: number
          broker_id: string
          created_at?: string
          devis_id?: string | null
          dossier_id?: string | null
          id?: string
          label: string
          meta?: Json | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_account_id: string
        }
        Update: {
          amount?: number
          broker_id?: string
          created_at?: string
          devis_id?: string | null
          dossier_id?: string | null
          id?: string
          label?: string
          meta?: Json | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_account_id?: string
        }
        Relationships: []
      }
      validation_reminders: {
        Row: {
          apporteur_id: string | null
          broker_id: string
          dossier_id: string
          id: string
          metadata: Json | null
          reminder_type: string
          sent_at: string
          sent_to: string
          sent_via: string
        }
        Insert: {
          apporteur_id?: string | null
          broker_id: string
          dossier_id: string
          id?: string
          metadata?: Json | null
          reminder_type: string
          sent_at?: string
          sent_to: string
          sent_via: string
        }
        Update: {
          apporteur_id?: string | null
          broker_id?: string
          dossier_id?: string
          id?: string
          metadata?: Json | null
          reminder_type?: string
          sent_at?: string
          sent_to?: string
          sent_via?: string
        }
        Relationships: []
      }
    }
    Views: {
      apporteur_wallet_summary: {
        Row: {
          apporteur_id: string | null
          available_amount: number | null
          available_transactions_count: number | null
          broker_id: string | null
          email: string | null
          nom: string | null
          pending_amount: number | null
          pending_transactions_count: number | null
          prenom: string | null
          total_amount: number | null
          total_paid_out: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_broker_blocking_status: {
        Args: { p_broker_id: string }
        Returns: Json
      }
      check_client_lock: {
        Args: {
          p_broker_id: string
          p_date_naissance: string
          p_nom: string
          p_prenom: string
        }
        Returns: {
          apporteur_id: string
          apporteur_nom: string
          apporteur_prenom: string
          dossier_id: string
          is_locked: boolean
          locked_at: string
        }[]
      }
      cleanup_expired_client_locks: { Args: never; Returns: number }
      create_client_lock: {
        Args: {
          p_apporteur_id: string
          p_broker_id: string
          p_date_naissance: string
          p_dossier_id: string
          p_nom: string
          p_prenom: string
        }
        Returns: string
      }
      get_wallet_summary: {
        Args: {
          p_broker_id: string
          p_owner_id?: string
          p_owner_type: Database["public"]["Enums"]["wallet_owner_type"]
        }
        Returns: {
          balance_available: number
          balance_pending: number
          currency: string
          last_transaction_at: string
          transaction_count: number
        }[]
      }
      get_pending_validations: {
        Args: { p_broker_id: string }
        Returns: {
          apporteur_amount: number
          client_nom: string
          client_prenom: string
          days_overdue: number
          dossier_id: string
          finalized_at: string
          numero_dossier: string
          validation_due_at: string
        }[]
      }
    }
    Enums: {
      apporteur_statut: "actif" | "inactif" | "suspendu"
      broker_apporteur_status: "actif" | "inactif" | "suspendu"
      broker_invite_type: "apporteur" | "broker_user"
      broker_onboarding_status: "created" | "exade_pending" | "ready"
      broker_status: "actif" | "suspendu" | "inactif"
      broker_user_role: "owner" | "admin" | "member"
      commission_rule_scope: "default" | "apporteur_specific" | "product_specific"
      document_source: "uploaded" | "exade_generated" | "system"
      document_visibility: "apporteur" | "broker_only" | "admin_only"
      dossier_statut: "en_attente" | "devis_disponible" | "devis_accepte" | "refuse" | "finalise"
      exade_environment: "stage" | "prod"
      payout_request_status: "requested" | "approved" | "rejected" | "paid"
      wallet_owner_type: "apporteur" | "broker" | "platform"
      wallet_transaction_status: "pending" | "available" | "cancelled"
      wallet_transaction_type: "credit" | "debit" | "fee" | "payout" | "adjustment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
