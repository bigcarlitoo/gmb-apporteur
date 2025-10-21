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
        Relationships: [
          {
            foreignKeyName: "activities_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
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
          nom: string
          prenom: string
          siret: string | null
          statut: string | null
          telephone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cgu_accepted_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          nom: string
          prenom: string
          siret?: string | null
          statut?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cgu_accepted_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nom?: string
          prenom?: string
          siret?: string | null
          statut?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_infos: {
        Row: {
          client_adresse: string | null
          client_date_naissance: string
          client_email: string
          client_fumeur: boolean | null
          client_nom: string
          client_prenom: string
          client_profession: string | null
          client_telephone: string | null
          conjoint_date_naissance: string | null
          conjoint_email: string | null
          conjoint_fumeur: boolean | null
          conjoint_nom: string | null
          conjoint_prenom: string | null
          conjoint_profession: string | null
          conjoint_telephone: string | null
          created_at: string | null
          dossier_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          client_adresse?: string | null
          client_date_naissance: string
          client_email: string
          client_fumeur?: boolean | null
          client_nom: string
          client_prenom: string
          client_profession?: string | null
          client_telephone?: string | null
          conjoint_date_naissance?: string | null
          conjoint_email?: string | null
          conjoint_fumeur?: boolean | null
          conjoint_nom?: string | null
          conjoint_prenom?: string | null
          conjoint_profession?: string | null
          conjoint_telephone?: string | null
          created_at?: string | null
          dossier_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          client_adresse?: string | null
          client_date_naissance?: string
          client_email?: string
          client_fumeur?: boolean | null
          client_nom?: string
          client_prenom?: string
          client_profession?: string | null
          client_telephone?: string | null
          conjoint_date_naissance?: string | null
          conjoint_email?: string | null
          conjoint_fumeur?: boolean | null
          conjoint_nom?: string | null
          conjoint_prenom?: string | null
          conjoint_profession?: string | null
          conjoint_telephone?: string | null
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
        ]
      }
      devis: {
        Row: {
          created_at: string | null
          date_acceptation: string | null
          date_envoi: string | null
          date_expiration: string | null
          date_generation: string | null
          donnees_devis: Json
          dossier_id: string | null
          id: string
          numero_devis: string
          pdf_created_at: string | null
          pdf_url: string | null
          statut: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_acceptation?: string | null
          date_envoi?: string | null
          date_expiration?: string | null
          date_generation?: string | null
          donnees_devis: Json
          dossier_id?: string | null
          id?: string
          numero_devis: string
          pdf_created_at?: string | null
          pdf_url?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_acceptation?: string | null
          date_envoi?: string | null
          date_expiration?: string | null
          date_generation?: string | null
          donnees_devis?: Json
          dossier_id?: string | null
          id?: string
          numero_devis?: string
          pdf_created_at?: string | null
          pdf_url?: string | null
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
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string
          dossier_id: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          storage_bucket: string | null
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type: string
          dossier_id?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_bucket?: string | null
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string
          dossier_id?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_bucket?: string | null
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers: {
        Row: {
          admin_id: string | null
          apporteur_id: string | null
          commentaire: string | null
          created_at: string | null
          date_cloture: string | null
          date_creation: string | null
          date_devis_accepte: string | null
          date_devis_envoye: string | null
          date_devis_genere: string | null
          economie_generee: number | null
          id: string
          is_read: boolean | null
          montant_capital: number | null
          notes_interne: string | null
          numero_dossier: string
          statut: string | null
          type_dossier: string
          updated_at: string | null
        }
        Insert: {
          admin_id?: string | null
          apporteur_id?: string | null
          commentaire?: string | null
          created_at?: string | null
          date_cloture?: string | null
          date_creation?: string | null
          date_devis_accepte?: string | null
          date_devis_envoye?: string | null
          date_devis_genere?: string | null
          economie_generee?: number | null
          id?: string
          is_read?: boolean | null
          montant_capital?: number | null
          notes_interne?: string | null
          numero_dossier: string
          statut?: string | null
          type_dossier: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string | null
          apporteur_id?: string | null
          commentaire?: string | null
          created_at?: string | null
          date_cloture?: string | null
          date_creation?: string | null
          date_devis_accepte?: string | null
          date_devis_envoye?: string | null
          date_devis_genere?: string | null
          economie_generee?: number | null
          id?: string
          is_read?: boolean | null
          montant_capital?: number | null
          notes_interne?: string | null
          numero_dossier?: string
          statut?: string | null
          type_dossier?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteur_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pret_data: {
        Row: {
          apport_personnel: number | null
          banque_preteuse: string
          cout_assurance_banque: number | null
          created_at: string | null
          dossier_id: string | null
          duree_mois: number
          id: string
          montant_capital: number
          taux_effectif: number | null
          taux_nominal: number | null
          type_garantie: string | null
          type_pret: string
          updated_at: string | null
        }
        Insert: {
          apport_personnel?: number | null
          banque_preteuse: string
          cout_assurance_banque?: number | null
          created_at?: string | null
          dossier_id?: string | null
          duree_mois: number
          id?: string
          montant_capital: number
          taux_effectif?: number | null
          taux_nominal?: number | null
          type_garantie?: string | null
          type_pret: string
          updated_at?: string | null
        }
        Update: {
          apport_personnel?: number | null
          banque_preteuse?: string
          cout_assurance_banque?: number | null
          created_at?: string | null
          dossier_id?: string | null
          duree_mois?: number
          id?: string
          montant_capital?: number
          taux_effectif?: number | null
          taux_nominal?: number | null
          type_garantie?: string | null
          type_pret?: string
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
        ]
      }
    }
    Views: {
      activities_view: {
        Row: {
          activity_data: Json | null
          activity_description: string | null
          activity_title: string | null
          activity_type: string | null
          apporteur_nom: string | null
          apporteur_prenom: string | null
          created_at: string | null
          dossier_id: string | null
          dossier_statut: string | null
          id: string | null
          is_read: boolean | null
          numero_dossier: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_default_process_steps: {
        Args: { dossier_uuid: string }
        Returns: undefined
      }
      generate_numero_devis: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_numero_dossier: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const