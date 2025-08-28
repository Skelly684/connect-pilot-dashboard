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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      call_logs: {
        Row: {
          attempt_number: number | null
          call_duration: number | null
          call_status: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          external_call_id: string | null
          id: string
          lead_id: string
          notes: string | null
          provider: string | null
          provider_call_id: string | null
          recording_url: string | null
          started_at: string | null
        }
        Insert: {
          attempt_number?: number | null
          call_duration?: number | null
          call_status: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_call_id?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          provider?: string | null
          provider_call_id?: string | null
          recording_url?: string | null
          started_at?: string | null
        }
        Update: {
          attempt_number?: number | null
          call_duration?: number | null
          call_status?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_call_id?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          provider?: string | null
          provider_call_id?: string | null
          recording_url?: string | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          call_window_end: number
          call_window_start: number
          caller_prompt: string
          created_at: string
          email_daily_cap: number
          email_template_id: string | null
          from_email: string
          from_name: string
          id: string
          is_active: boolean
          is_default: boolean | null
          max_call_retries: number
          name: string
          retry_minutes: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          call_window_end?: number
          call_window_start?: number
          caller_prompt?: string
          created_at?: string
          email_daily_cap?: number
          email_template_id?: string | null
          from_email: string
          from_name?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          max_call_retries?: number
          name: string
          retry_minutes?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          call_window_end?: number
          call_window_start?: number
          caller_prompt?: string
          created_at?: string
          email_daily_cap?: number
          email_template_id?: string | null
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          max_call_retries?: number
          name?: string
          retry_minutes?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body: string
          created_at: string
          email_to: string
          error: string | null
          id: string
          lead_id: string
          provider: string | null
          status: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          email_to: string
          error?: string | null
          id?: string
          lead_id: string
          provider?: string | null
          status: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          email_to?: string
          error?: string | null
          id?: string
          lead_id?: string
          provider?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      google_tokens: {
        Row: {
          access_token: string | null
          client_id: string | null
          client_secret: string | null
          expiry: string | null
          refresh_token: string | null
          scopes: string[] | null
          token_uri: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          expiry?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_uri?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          expiry?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_uri?: string | null
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          accepted_at: string | null
          call_attempts: number | null
          campaign_id: string | null
          city_name: string | null
          company: string | null
          company_name: string | null
          contact_phone_numbers: Json | null
          country_name: string | null
          created_at: string
          email: string | null
          email_address: string | null
          emailed_at: string | null
          first_name: string | null
          headline: string | null
          id: string
          job_title: string | null
          last_call_status: string | null
          last_email_status: string | null
          last_name: string | null
          location: string | null
          name: string | null
          next_call_at: string | null
          notes: string | null
          phone: string | null
          raw_address: string | null
          reviewed_at: string | null
          scraped_at: string
          sent_for_contact_at: string | null
          state_name: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          call_attempts?: number | null
          campaign_id?: string | null
          city_name?: string | null
          company?: string | null
          company_name?: string | null
          contact_phone_numbers?: Json | null
          country_name?: string | null
          created_at?: string
          email?: string | null
          email_address?: string | null
          emailed_at?: string | null
          first_name?: string | null
          headline?: string | null
          id?: string
          job_title?: string | null
          last_call_status?: string | null
          last_email_status?: string | null
          last_name?: string | null
          location?: string | null
          name?: string | null
          next_call_at?: string | null
          notes?: string | null
          phone?: string | null
          raw_address?: string | null
          reviewed_at?: string | null
          scraped_at?: string
          sent_for_contact_at?: string | null
          state_name?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          call_attempts?: number | null
          campaign_id?: string | null
          city_name?: string | null
          company?: string | null
          company_name?: string | null
          contact_phone_numbers?: Json | null
          country_name?: string | null
          created_at?: string
          email?: string | null
          email_address?: string | null
          emailed_at?: string | null
          first_name?: string | null
          headline?: string | null
          id?: string
          job_title?: string | null
          last_call_status?: string | null
          last_email_status?: string | null
          last_name?: string | null
          location?: string | null
          name?: string | null
          next_call_at?: string | null
          notes?: string | null
          phone?: string | null
          raw_address?: string | null
          reviewed_at?: string | null
          scraped_at?: string
          sent_for_contact_at?: string | null
          state_name?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
