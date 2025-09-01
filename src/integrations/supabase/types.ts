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
      calendar_events: {
        Row: {
          calendar_id: string
          created_at: string
          description: string | null
          end_time: string
          google_event_id: string | null
          id: string
          lead_id: string | null
          location: string | null
          meeting_link: string | null
          start_time: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          description?: string | null
          end_time: string
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          meeting_link?: string | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          description?: string | null
          end_time?: string
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          meeting_link?: string | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      campaign_email_steps: {
        Row: {
          campaign_id: string
          id: string
          is_active: boolean
          send_at: string | null
          send_offset_minutes: number | null
          step_number: number
          template_id: string | null
        }
        Insert: {
          campaign_id: string
          id?: string
          is_active?: boolean
          send_at?: string | null
          send_offset_minutes?: number | null
          step_number: number
          template_id?: string | null
        }
        Update: {
          campaign_id?: string
          id?: string
          is_active?: boolean
          send_at?: string | null
          send_offset_minutes?: number | null
          step_number?: number
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_email_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_email_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
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
          delivery_rules: Json | null
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
          delivery_rules?: Json | null
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
          delivery_rules?: Json | null
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
          campaign_id: string | null
          created_at: string
          error: string | null
          id: string
          idem_key: string | null
          lead_id: string | null
          notes: string | null
          provider: string | null
          status: string
          step_number: number | null
          subject: string
          template_id: string | null
          to_email: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          idem_key?: string | null
          lead_id?: string | null
          notes?: string | null
          provider?: string | null
          status: string
          step_number?: number | null
          subject: string
          template_id?: string | null
          to_email?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          idem_key?: string | null
          lead_id?: string | null
          notes?: string | null
          provider?: string | null
          status?: string
          step_number?: number | null
          subject?: string
          template_id?: string | null
          to_email?: string | null
          user_id?: string | null
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
          campaign_id: string | null
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
          campaign_id?: string | null
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
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendars: {
        Row: {
          access_role: string | null
          calendar_id: string
          color: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          is_selected: boolean | null
          summary: string | null
          time_zone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_role?: string | null
          calendar_id: string
          color?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          is_selected?: boolean | null
          summary?: string | null
          time_zone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_role?: string | null
          calendar_id?: string
          color?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          is_selected?: boolean | null
          summary?: string | null
          time_zone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_oauth_states: {
        Row: {
          created_at: string
          redirect_path: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          redirect_path?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          redirect_path?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      google_oauth_tokens: {
        Row: {
          access_token: string
          client_id: string | null
          client_secret: string | null
          created_at: string
          expires_at: string | null
          expiry: string | null
          id: string
          provider: string
          refresh_token: string | null
          scope: string | null
          scopes: string[] | null
          token_type: string | null
          token_uri: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          expires_at?: string | null
          expiry?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          scopes?: string[] | null
          token_type?: string | null
          token_uri?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          expires_at?: string | null
          expiry?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          scopes?: string[] | null
          token_type?: string | null
          token_uri?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: number
          id: string
          id_token: string | null
          provider: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: number
          id?: string
          id_token?: string | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: number
          id?: string
          id_token?: string | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_email_sends: {
        Row: {
          id: string
          lead_id: string
          sent_at: string
          step_id: string
        }
        Insert: {
          id?: string
          lead_id: string
          sent_at?: string
          step_id: string
        }
        Update: {
          id?: string
          lead_id?: string
          sent_at?: string
          step_id?: string
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
          email_sequence_stopped: boolean
          emailed_at: string | null
          first_name: string | null
          headline: string | null
          id: string
          job_title: string | null
          last_call_status: string | null
          last_email_reply_at: string | null
          last_email_status: string | null
          last_name: string | null
          location: string | null
          name: string | null
          next_call_at: string | null
          next_email_at: string | null
          next_email_step: number | null
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
          email_sequence_stopped?: boolean
          emailed_at?: string | null
          first_name?: string | null
          headline?: string | null
          id?: string
          job_title?: string | null
          last_call_status?: string | null
          last_email_reply_at?: string | null
          last_email_status?: string | null
          last_name?: string | null
          location?: string | null
          name?: string | null
          next_call_at?: string | null
          next_email_at?: string | null
          next_email_step?: number | null
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
          email_sequence_stopped?: boolean
          emailed_at?: string | null
          first_name?: string | null
          headline?: string | null
          id?: string
          job_title?: string | null
          last_call_status?: string | null
          last_email_reply_at?: string | null
          last_email_status?: string | null
          last_name?: string | null
          location?: string | null
          name?: string | null
          next_call_at?: string | null
          next_email_at?: string | null
          next_email_step?: number | null
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
      profiles: {
        Row: {
          created_at: string | null
          email: string
          email_mode: string | null
          id: string
          is_admin: boolean
          smtp_host: string | null
          smtp_password_ciphertext: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string | null
          vapi_assistant_id: string | null
          vapi_phone_number_id: string | null
          voice_provider: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          email_mode?: string | null
          id: string
          is_admin?: boolean
          smtp_host?: string | null
          smtp_password_ciphertext?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_number_id?: string | null
          voice_provider?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          email_mode?: string | null
          id?: string
          is_admin?: boolean
          smtp_host?: string | null
          smtp_password_ciphertext?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_number_id?: string | null
          voice_provider?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { u: string }
        Returns: boolean
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
