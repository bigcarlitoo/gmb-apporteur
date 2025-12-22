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
          broker_id: string | null
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
          broker_id?: string | null
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
          broker_id?: string | null
          created_at?: string | null
          dossier_id?: string | null
          id?: string
          is_read?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_process_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "apporteur_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          apporteur_id: string | null
          broker_id: string | null
          created_at: string
          devis_id: string | null
          dossier_id: string | null
          duration_ms: number | null
          event_category: string
          event_data: Json | null
          event_type: string
          hashed_email: string | null
          hashed_phone: string | null
          id: string
          ip_country: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          apporteur_id?: string | null
          broker_id?: string | null
          created_at?: string
          devis_id?: string | null
          dossier_id?: string | null
          duration_ms?: number | null
          event_category: string
          event_data?: Json | null
          event_type: string
          hashed_email?: string | null
          hashed_phone?: string | null
          id?: string
          ip_country?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          apporteur_id?: string | null
          broker_id?: string | null
          created_at?: string
          devis_id?: string | null
          dossier_id?: string | null
          duration_ms?: number | null
          event_category?: string
          event_data?: Json | null
          event_type?: string
          hashed_email?: string | null
          hashed_phone?: string | null
          id?: string
          ip_country?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["devis_id"]
          },
          {
            foreignKeyName: "analytics_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_process_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "broker_apporteurs_apporteur_profile_id_fkey"
            columns: ["apporteur_profile_id"]
            isOneToOne: false
            referencedRelation: "apporteur_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_apporteurs_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_apporteurs_default_commission_rule_id_fkey"
            columns: ["default_commission_rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "broker_commission_settings_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: true
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_exade_configs: {
        Row: {
          broker_id: string
          code_courtier: string
          configured_at: string | null
          created_at: string
          endpoint_url: string | null
          environment: Database["public"]["Enums"]["exade_environment"]
          id: string
          is_enabled: boolean
          last_test_status: string | null
          last_tested_at: string | null
          licence_key: string | null
          point_de_vente_code: string | null
          sso_key: string | null
          updated_at: string
          vault_secret_id: string | null
          vault_secret_name: string | null
        }
        Insert: {
          broker_id: string
          code_courtier: string
          configured_at?: string | null
          created_at?: string
          endpoint_url?: string | null
          environment?: Database["public"]["Enums"]["exade_environment"]
          id?: string
          is_enabled?: boolean
          last_test_status?: string | null
          last_tested_at?: string | null
          licence_key?: string | null
          point_de_vente_code?: string | null
          sso_key?: string | null
          updated_at?: string
          vault_secret_id?: string | null
          vault_secret_name?: string | null
        }
        Update: {
          broker_id?: string
          code_courtier?: string
          configured_at?: string | null
          created_at?: string
          endpoint_url?: string | null
          environment?: Database["public"]["Enums"]["exade_environment"]
          id?: string
          is_enabled?: boolean
          last_test_status?: string | null
          last_tested_at?: string | null
          licence_key?: string | null
          point_de_vente_code?: string | null
          sso_key?: string | null
          updated_at?: string
          vault_secret_id?: string | null
          vault_secret_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_exade_configs_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_invites: {
        Row: {
          broker_id: string
          created_at: string
          created_by_user_id: string
          expires_at: string
          id: string
          invite_type: Database["public"]["Enums"]["broker_invite_type"]
          max_uses: number
          revoked_at: string | null
          token: string
          uses: number
        }
        Insert: {
          broker_id: string
          created_at?: string
          created_by_user_id: string
          expires_at: string
          id?: string
          invite_type?: Database["public"]["Enums"]["broker_invite_type"]
          max_uses?: number
          revoked_at?: string | null
          token: string
          uses?: number
        }
        Update: {
          broker_id?: string
          created_at?: string
          created_by_user_id?: string
          expires_at?: string
          id?: string
          invite_type?: Database["public"]["Enums"]["broker_invite_type"]
          max_uses?: number
          revoked_at?: string | null
          token?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "broker_invites_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_users: {
        Row: {
          broker_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["broker_user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["broker_user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["broker_user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_users_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      brokers: {
        Row: {
          billing_address: string | null
          billing_email: string | null
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          exade_default_environment:
            | Database["public"]["Enums"]["exade_environment"]
            | null
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
          exade_default_environment?:
            | Database["public"]["Enums"]["exade_environment"]
            | null
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
          exade_default_environment?:
            | Database["public"]["Enums"]["exade_environment"]
            | null
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
      client_infos: {
        Row: {
          categorie_professionnelle: number | null
          client_adresse: string | null
          client_civilite: string | null
          client_code_postal: string | null
          client_complement_adresse: string | null
          client_date_naissance: string
          client_deplacement_pro: number | null
          client_email: string
          client_fumeur: boolean | null
          client_lieu_naissance: string | null
          client_nom: string
          client_nom_naissance: string | null
          client_prenom: string
          client_profession: string | null
          client_telephone: string | null
          client_travaux_manuels: number | null
          client_ville: string | null
          conjoint_categorie_professionnelle: number | null
          conjoint_civilite: string | null
          conjoint_date_naissance: string | null
          conjoint_deplacement_pro: number | null
          conjoint_email: string | null
          conjoint_fumeur: boolean | null
          conjoint_lieu_naissance: string | null
          conjoint_nom: string | null
          conjoint_nom_naissance: string | null
          conjoint_prenom: string | null
          conjoint_profession: string | null
          conjoint_telephone: string | null
          conjoint_travaux_manuels: number | null
          created_at: string | null
          dossier_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          categorie_professionnelle?: number | null
          client_adresse?: string | null
          client_civilite?: string | null
          client_code_postal?: string | null
          client_complement_adresse?: string | null
          client_date_naissance: string
          client_deplacement_pro?: number | null
          client_email: string
          client_fumeur?: boolean | null
          client_lieu_naissance?: string | null
          client_nom: string
          client_nom_naissance?: string | null
          client_prenom: string
          client_profession?: string | null
          client_telephone?: string | null
          client_travaux_manuels?: number | null
          client_ville?: string | null
          conjoint_categorie_professionnelle?: number | null
          conjoint_civilite?: string | null
          conjoint_date_naissance?: string | null
          conjoint_deplacement_pro?: number | null
          conjoint_email?: string | null
          conjoint_fumeur?: boolean | null
          conjoint_lieu_naissance?: string | null
          conjoint_nom?: string | null
          conjoint_nom_naissance?: string | null
          conjoint_prenom?: string | null
          conjoint_profession?: string | null
          conjoint_telephone?: string | null
          conjoint_travaux_manuels?: number | null
          created_at?: string | null
          dossier_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          categorie_professionnelle?: number | null
          client_adresse?: string | null
          client_civilite?: string | null
          client_code_postal?: string | null
          client_complement_adresse?: string | null
          client_date_naissance?: string
          client_deplacement_pro?: number | null
          client_email?: string
          client_fumeur?: boolean | null
          client_lieu_naissance?: string | null
          client_nom?: string
          client_nom_naissance?: string | null
          client_prenom?: string
          client_profession?: string | null
          client_telephone?: string | null
          client_travaux_manuels?: number | null
          client_ville?: string | null
          conjoint_categorie_professionnelle?: number | null
          conjoint_civilite?: string | null
          conjoint_date_naissance?: string | null
          conjoint_deplacement_pro?: number | null
          conjoint_email?: string | null
          conjoint_fumeur?: boolean | null
          conjoint_lieu_naissance?: string | null
          conjoint_nom?: string | null
          conjoint_nom_naissance?: string | null
          conjoint_prenom?: string | null
          conjoint_profession?: string | null
          conjoint_telephone?: string | null
          conjoint_travaux_manuels?: number | null
          created_at?: string | null
          dossier_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_infos_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_infos_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_infos_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_infos_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_process_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_infos_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "client_locks_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteur_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locks_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_process_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          apporteur_profile_id: string | null
          apporteur_share_pct: number
          broker_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          fixed_fee: number | null
          id: string
          insurance_product_id: string | null
          max_fee: number | null
          min_fee: number | null
          platform_fee_pct: number
          scope: Database["public"]["Enums"]["commission_rule_scope"]
          updated_at: string
        }
        Insert: {
          apporteur_profile_id?: string | null
          apporteur_share_pct?: number
          broker_id: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          fixed_fee?: number | null
          id?: string
          insurance_product_id?: string | null
          max_fee?: number | null
          min_fee?: number | null
          platform_fee_pct?: number
          scope?: Database["public"]["Enums"]["commission_rule_scope"]
          updated_at?: string
        }
        Update: {
          apporteur_profile_id?: string | null
          apporteur_share_pct?: number
          broker_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          fixed_fee?: number | null
          id?: string
          insurance_product_id?: string | null
          max_fee?: number | null
          min_fee?: number | null
          platform_fee_pct?: number
          scope?: Database["public"]["Enums"]["commission_rule_scope"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_apporteur_profile_id_fkey"
            columns: ["apporteur_profile_id"]
            isOneToOne: false
            referencedRelation: "apporteur_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_insurance_product_id_fkey"
            columns: ["insurance_product_id"]
            isOneToOne: false
            referencedRelation: "insurance_products"
            referencedColumns: ["id"]
          },
        ]
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
          exade_locked: boolean | null
          exade_pushed_at: string | null
          exade_simulation_id: string | null
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
          exade_locked?: boolean | null
          exade_pushed_at?: string | null
          exade_simulation_id?: string | null
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
          exade_locked?: boolean | null
          exade_pushed_at?: string | null
          exade_simulation_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "devis_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_process_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_history: {
        Row: {
          action: string
          commentaire: string | null
          created_at: string | null
          devis_id: string
          dossier_id: string
          id: string
          motif_refus: string | null
          statut_nouveau: string | null
          statut_precedent: string | null
          updated_at: string | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          action: string
          commentaire?: string | null
          created_at?: string | null
          devis_id: string
          dossier_id: string
          id?: string
          motif_refus?: string | null
          statut_nouveau?: string | null
          statut_precedent?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          action?: string
          commentaire?: string | null
          created_at?: string | null
          devis_id?: string
          dossier_id?: string
          id?: string
          motif_refus?: string | null
          statut_nouveau?: string | null
          statut_precedent?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_history_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_history_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["devis_id"]
          },
          {
            foreignKeyName: "devis_history_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_history_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_history_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_history_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_process_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_history_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string
          dossier_id: string | null
          external_ref: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          source: Database["public"]["Enums"]["document_source"] | null
          storage_bucket: string | null
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
          visibility: Database["public"]["Enums"]["document_visibility"] | null
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type: string
          dossier_id?: string | null
          external_ref?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          source?: Database["public"]["Enums"]["document_source"] | null
          storage_bucket?: string | null
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["document_visibility"] | null
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string
          dossier_id?: string | null
          external_ref?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          source?: Database["public"]["Enums"]["document_source"] | null
          storage_bucket?: string | null
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["document_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_process_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "dossiers_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteur_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_devis_selectionne_id_fkey"
            columns: ["devis_selectionne_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_devis_selectionne_id_fkey"
            columns: ["devis_selectionne_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["devis_id"]
          },
          {
            foreignKeyName: "dossiers_insurance_product_id_fkey"
            columns: ["insurance_product_id"]
            isOneToOne: false
            referencedRelation: "insurance_products"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_products: {
        Row: {
          code: string
          created_at: string
          id: string
          is_enabled: boolean
          label: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_stats: {
        Row: {
          apporteur_id: string
          classement_position: number | null
          created_at: string | null
          id: string
          month_year: string
          total_dossiers: number | null
          total_economies: number | null
          updated_at: string | null
        }
        Insert: {
          apporteur_id: string
          classement_position?: number | null
          created_at?: string | null
          id?: string
          month_year: string
          total_dossiers?: number | null
          total_economies?: number | null
          updated_at?: string | null
        }
        Update: {
          apporteur_id?: string
          classement_position?: number | null
          created_at?: string | null
          id?: string
          month_year?: string
          total_dossiers?: number | null
          total_economies?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_stats_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteur_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "apporteur_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          iban_hash: string | null
          id: string
          payout_method_id: string | null
          status: Database["public"]["Enums"]["payout_request_status"]
          updated_at: string
          wallet_account_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          iban_hash?: string | null
          id?: string
          payout_method_id?: string | null
          status?: Database["public"]["Enums"]["payout_request_status"]
          updated_at?: string
          wallet_account_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          iban_hash?: string | null
          id?: string
          payout_method_id?: string | null
          status?: Database["public"]["Enums"]["payout_request_status"]
          updated_at?: string
          wallet_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "pret_data_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pret_data_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pret_data_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pret_data_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_process_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pret_data_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["id"]
          },
        ]
      }
      process_steps: {
        Row: {
          completed_at: string | null
          created_at: string | null
          dossier_id: string | null
          id: string
          started_at: string | null
          status: string | null
          step_description: string | null
          step_name: string
          step_order: number
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          dossier_id?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          step_description?: string | null
          step_name: string
          step_order: number
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          dossier_id?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          step_description?: string | null
          step_name?: string
          step_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_steps_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_steps_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_steps_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_steps_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_process_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_steps_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "validation_reminders_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteur_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_reminders_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_reminders_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_reminders_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_reminders_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_reminders_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_process_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_reminders_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "wallet_accounts_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["devis_id"]
          },
          {
            foreignKeyName: "wallet_transactions_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_with_process_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_dossiers_financial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      apporteur_statut: "actif" | "inactif" | "suspendu"
      broker_apporteur_status: "actif" | "inactif" | "suspendu"
      broker_invite_type: "apporteur" | "broker_user"
      broker_onboarding_status: "created" | "exade_pending" | "ready"
      broker_status: "actif" | "suspendu" | "inactif"
      broker_user_role: "owner" | "admin" | "member"
      commission_rule_scope:
        | "default"
        | "apporteur_specific"
        | "product_specific"
      document_source: "uploaded" | "exade_generated" | "system"
      document_visibility: "apporteur" | "broker_only" | "admin_only"
      dossier_statut:
        | "en_attente"
        | "devis_disponible"
        | "devis_accepte"
        | "refuse"
        | "finalise"
        | "annule"
      exade_environment: "stage" | "prod"
      payout_request_status: "requested" | "approved" | "rejected" | "paid"
      wallet_owner_type: "apporteur" | "broker" | "platform"
      wallet_transaction_status: "pending" | "available" | "cancelled"
      wallet_transaction_type:
        | "credit"
        | "debit"
        | "fee"
        | "payout"
        | "adjustment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      apporteur_statut: ["actif", "inactif", "suspendu"],
      broker_apporteur_status: ["actif", "inactif", "suspendu"],
      broker_invite_type: ["apporteur", "broker_user"],
      broker_onboarding_status: ["created", "exade_pending", "ready"],
      broker_status: ["actif", "suspendu", "inactif"],
      broker_user_role: ["owner", "admin", "member"],
      commission_rule_scope: [
        "default",
        "apporteur_specific",
        "product_specific",
      ],
      document_source: ["uploaded", "exade_generated", "system"],
      document_visibility: ["apporteur", "broker_only", "admin_only"],
      dossier_statut: [
        "en_attente",
        "devis_disponible",
        "devis_accepte",
        "refuse",
        "finalise",
        "annule",
      ],
      exade_environment: ["stage", "prod"],
      payout_request_status: ["requested", "approved", "rejected", "paid"],
      wallet_owner_type: ["apporteur", "broker", "platform"],
      wallet_transaction_status: ["pending", "available", "cancelled"],
      wallet_transaction_type: [
        "credit",
        "debit",
        "fee",
        "payout",
        "adjustment",
      ],
    },
  },
} as const
