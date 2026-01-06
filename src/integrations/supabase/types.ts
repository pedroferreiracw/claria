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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          color: string
          created_at: string
          criteria: Json
          description: string
          icon: string
          id: string
          name: string
          points: number
        }
        Insert: {
          color: string
          created_at?: string
          criteria: Json
          description: string
          icon: string
          id?: string
          name: string
          points?: number
        }
        Update: {
          color?: string
          created_at?: string
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          name?: string
          points?: number
        }
        Relationships: []
      }
      best_practices: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          evaluation_id: string
          final_score: number
          highlight_text: string | null
          id: string
          is_featured: boolean | null
          sdr_id: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          evaluation_id: string
          final_score: number
          highlight_text?: string | null
          id?: string
          is_featured?: boolean | null
          sdr_id: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          evaluation_id?: string
          final_score?: number
          highlight_text?: string | null
          id?: string
          is_featured?: boolean | null
          sdr_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "best_practices_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "best_practices_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      development_plans: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string | null
          evaluation_id: string | null
          id: string
          priority: string
          recommendation: string
          sdr_id: string
          status: string
          updated_at: string
          weak_area: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          evaluation_id?: string | null
          id?: string
          priority: string
          recommendation: string
          sdr_id: string
          status?: string
          updated_at?: string
          weak_area: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          evaluation_id?: string | null
          id?: string
          priority?: string
          recommendation?: string
          sdr_id?: string
          status?: string
          updated_at?: string
          weak_area?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_plans_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plans_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          ai_feedback: Json | null
          audio_url: string | null
          conversation_text: string | null
          created_at: string
          date: string
          final_score: number
          id: string
          lead_responses: string[]
          objections: Json
          questions_asked: string[]
          result: Database["public"]["Enums"]["prospection_result"]
          scores: Json
          sdr_id: string
          type: Database["public"]["Enums"]["prospection_type"]
          updated_at: string
        }
        Insert: {
          ai_feedback?: Json | null
          audio_url?: string | null
          conversation_text?: string | null
          created_at?: string
          date?: string
          final_score?: number
          id?: string
          lead_responses?: string[]
          objections?: Json
          questions_asked?: string[]
          result: Database["public"]["Enums"]["prospection_result"]
          scores?: Json
          sdr_id: string
          type: Database["public"]["Enums"]["prospection_type"]
          updated_at?: string
        }
        Update: {
          ai_feedback?: Json | null
          audio_url?: string | null
          conversation_text?: string | null
          created_at?: string
          date?: string
          final_score?: number
          id?: string
          lead_responses?: string[]
          objections?: Json
          questions_asked?: string[]
          result?: Database["public"]["Enums"]["prospection_result"]
          scores?: Json
          sdr_id?: string
          type?: Database["public"]["Enums"]["prospection_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: number
          description: string | null
          end_date: string
          id: string
          metric_type: string
          sdr_id: string | null
          squad: Database["public"]["Enums"]["squad_type"] | null
          start_date: string
          status: string
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          end_date: string
          id?: string
          metric_type: string
          sdr_id?: string | null
          squad?: Database["public"]["Enums"]["squad_type"] | null
          start_date?: string
          status?: string
          target_value: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          end_date?: string
          id?: string
          metric_type?: string
          sdr_id?: string | null
          squad?: Database["public"]["Enums"]["squad_type"] | null
          start_date?: string
          status?: string
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      meetime_activities: {
        Row: {
          annotation: string | null
          call_duration_seconds: number | null
          created_at: string
          execution_date: string | null
          id: string
          meetime_id: string
          prospection_id: string | null
          sdr_id: string | null
          status: string | null
          synced_at: string
          type: string | null
        }
        Insert: {
          annotation?: string | null
          call_duration_seconds?: number | null
          created_at?: string
          execution_date?: string | null
          id?: string
          meetime_id: string
          prospection_id?: string | null
          sdr_id?: string | null
          status?: string | null
          synced_at?: string
          type?: string | null
        }
        Update: {
          annotation?: string | null
          call_duration_seconds?: number | null
          created_at?: string
          execution_date?: string | null
          id?: string
          meetime_id?: string
          prospection_id?: string | null
          sdr_id?: string | null
          status?: string | null
          synced_at?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetime_activities_prospection_id_fkey"
            columns: ["prospection_id"]
            isOneToOne: false
            referencedRelation: "meetime_prospections"
            referencedColumns: ["id"]
          },
        ]
      }
      meetime_config: {
        Row: {
          api_token: string | null
          created_at: string
          created_by: string | null
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          updated_at: string
        }
        Insert: {
          api_token?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          updated_at?: string
        }
        Update: {
          api_token?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meetime_leads: {
        Row: {
          cadence_name: string | null
          company: string | null
          created_at: string
          email: string | null
          fit_score: number | null
          id: string
          meetime_id: string
          name: string | null
          phone: string | null
          sdr_id: string | null
          status: string | null
          synced_at: string
        }
        Insert: {
          cadence_name?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          fit_score?: number | null
          id?: string
          meetime_id: string
          name?: string | null
          phone?: string | null
          sdr_id?: string | null
          status?: string | null
          synced_at?: string
        }
        Update: {
          cadence_name?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          fit_score?: number | null
          id?: string
          meetime_id?: string
          name?: string | null
          phone?: string | null
          sdr_id?: string | null
          status?: string | null
          synced_at?: string
        }
        Relationships: []
      }
      meetime_meetings: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          meetime_id: string
          no_show: boolean | null
          scheduled_at: string | null
          sdr_id: string | null
          status: string | null
          synced_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          meetime_id: string
          no_show?: boolean | null
          scheduled_at?: string | null
          sdr_id?: string | null
          status?: string | null
          synced_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          meetime_id?: string
          no_show?: boolean | null
          scheduled_at?: string | null
          sdr_id?: string | null
          status?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetime_meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "meetime_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      meetime_prospections: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          lead_id: string | null
          meetime_id: string
          sdr_id: string | null
          started_at: string | null
          status: string | null
          synced_at: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          lead_id?: string | null
          meetime_id: string
          sdr_id?: string | null
          started_at?: string | null
          status?: string | null
          synced_at?: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          lead_id?: string | null
          meetime_id?: string
          sdr_id?: string | null
          started_at?: string | null
          status?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetime_prospections_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "meetime_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_scores: {
        Row: {
          average_score: number
          conversion_rate: number
          created_at: string
          evaluations_count: number
          id: string
          month: number
          rank_position: number | null
          sdr_id: string
          total_points: number
          updated_at: string
          year: number
        }
        Insert: {
          average_score?: number
          conversion_rate?: number
          created_at?: string
          evaluations_count?: number
          id?: string
          month: number
          rank_position?: number | null
          sdr_id: string
          total_points?: number
          updated_at?: string
          year: number
        }
        Update: {
          average_score?: number
          conversion_rate?: number
          created_at?: string
          evaluations_count?: number
          id?: string
          month?: number
          rank_position?: number | null
          sdr_id?: string
          total_points?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_scores_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pipedrive_config: {
        Row: {
          api_token: string | null
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          updated_at: string
        }
        Insert: {
          api_token?: string | null
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          updated_at?: string
        }
        Update: {
          api_token?: string | null
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pipedrive_deals: {
        Row: {
          add_time: string | null
          created_at: string
          currency: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          lost_time: string | null
          organization_name: string | null
          person_name: string | null
          pipedrive_id: number
          pipeline_name: string | null
          sdr_id: string | null
          stage_name: string | null
          status: string | null
          synced_at: string
          title: string
          value: number | null
          won_time: string | null
        }
        Insert: {
          add_time?: string | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          lost_time?: string | null
          organization_name?: string | null
          person_name?: string | null
          pipedrive_id: number
          pipeline_name?: string | null
          sdr_id?: string | null
          stage_name?: string | null
          status?: string | null
          synced_at?: string
          title: string
          value?: number | null
          won_time?: string | null
        }
        Update: {
          add_time?: string | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          lost_time?: string | null
          organization_name?: string | null
          person_name?: string | null
          pipedrive_id?: number
          pipeline_name?: string | null
          sdr_id?: string | null
          stage_name?: string | null
          status?: string | null
          synced_at?: string
          title?: string
          value?: number | null
          won_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipedrive_deals_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sdr_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          sdr_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          sdr_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          sdr_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdr_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_badges_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_streaks: {
        Row: {
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          sdr_id: string
          streak_type: string
          updated_at: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          sdr_id: string
          streak_type?: string
          updated_at?: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          sdr_id?: string
          streak_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdr_streaks_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: true
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      sdrs: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          role: string
          squad: Database["public"]["Enums"]["squad_type"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          role: string
          squad: Database["public"]["Enums"]["squad_type"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          role?: string
          squad?: Database["public"]["Enums"]["squad_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      prospection_result: "prosseguiu" | "recusou" | "perdeu_interesse"
      prospection_type: "Ligação" | "WhatsApp"
      squad_type: "Águia" | "Lobo"
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
      app_role: ["admin", "user"],
      prospection_result: ["prosseguiu", "recusou", "perdeu_interesse"],
      prospection_type: ["Ligação", "WhatsApp"],
      squad_type: ["Águia", "Lobo"],
    },
  },
} as const
