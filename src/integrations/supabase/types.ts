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
      ai_learnings: {
        Row: {
          content: string
          created_at: string | null
          id: string
          learning_type: string | null
          source_interview_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          learning_type?: string | null
          source_interview_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          learning_type?: string | null
          source_interview_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_learnings_source_interview_id_fkey"
            columns: ["source_interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
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
      closer_evaluations: {
        Row: {
          ai_feedback: Json | null
          closer_id: string
          created_at: string
          date: string
          deal_value: number | null
          final_score: number
          id: string
          meeting_duration_minutes: number | null
          objections: Json
          plan_sold: string | null
          result: Database["public"]["Enums"]["closer_evaluation_result"]
          scores: Json
          transcription: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ai_feedback?: Json | null
          closer_id: string
          created_at?: string
          date?: string
          deal_value?: number | null
          final_score?: number
          id?: string
          meeting_duration_minutes?: number | null
          objections?: Json
          plan_sold?: string | null
          result: Database["public"]["Enums"]["closer_evaluation_result"]
          scores?: Json
          transcription?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ai_feedback?: Json | null
          closer_id?: string
          created_at?: string
          date?: string
          deal_value?: number | null
          final_score?: number
          id?: string
          meeting_duration_minutes?: number | null
          objections?: Json
          plan_sold?: string | null
          result?: Database["public"]["Enums"]["closer_evaluation_result"]
          scores?: Json
          transcription?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closer_evaluations_closer_id_fkey"
            columns: ["closer_id"]
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
      interviewer_feedback: {
        Row: {
          ai_was_accurate: string
          created_at: string | null
          decision_reasoning: string
          final_decision: string
          id: string
          interview_id: string | null
          interviewer_name: string
          roleplay_notes: string | null
          standout_negatives: string | null
          standout_positives: string | null
          values_alignment_notes: string | null
          what_ai_missed: string | null
        }
        Insert: {
          ai_was_accurate: string
          created_at?: string | null
          decision_reasoning: string
          final_decision: string
          id?: string
          interview_id?: string | null
          interviewer_name: string
          roleplay_notes?: string | null
          standout_negatives?: string | null
          standout_positives?: string | null
          values_alignment_notes?: string | null
          what_ai_missed?: string | null
        }
        Update: {
          ai_was_accurate?: string
          created_at?: string | null
          decision_reasoning?: string
          final_decision?: string
          id?: string
          interview_id?: string | null
          interviewer_name?: string
          roleplay_notes?: string | null
          standout_negatives?: string | null
          standout_positives?: string | null
          values_alignment_notes?: string | null
          what_ai_missed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviewer_feedback_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          candidate_name: string
          created_at: string | null
          final_recommendation: string | null
          final_scores: Json | null
          id: string
          interview_date: string | null
          overall_score: number | null
          role: string
          transcript: string | null
        }
        Insert: {
          candidate_name: string
          created_at?: string | null
          final_recommendation?: string | null
          final_scores?: Json | null
          id?: string
          interview_date?: string | null
          overall_score?: number | null
          role: string
          transcript?: string | null
        }
        Update: {
          candidate_name?: string
          created_at?: string | null
          final_recommendation?: string | null
          final_scores?: Json | null
          id?: string
          interview_date?: string | null
          overall_score?: number | null
          role?: string
          transcript?: string | null
        }
        Relationships: []
      }
      meetime_backfill_runs: {
        Row: {
          error_msg: string | null
          finished_at: string | null
          id: number
          last_next: string | null
          leads_seen: number
          leads_upserted: number
          pages_done: number
          started_at: string
          status: string
        }
        Insert: {
          error_msg?: string | null
          finished_at?: string | null
          id?: never
          last_next?: string | null
          leads_seen?: number
          leads_upserted?: number
          pages_done?: number
          started_at?: string
          status?: string
        }
        Update: {
          error_msg?: string | null
          finished_at?: string | null
          id?: never
          last_next?: string | null
          leads_seen?: number
          leads_upserted?: number
          pages_done?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      meetime_dup_alerts: {
        Row: {
          contact_key: string | null
          lead_id_a: string | null
          lead_id_b: string | null
          notified_at: string
          owner_a: string | null
          owner_b: string | null
          pair_key: string
        }
        Insert: {
          contact_key?: string | null
          lead_id_a?: string | null
          lead_id_b?: string | null
          notified_at?: string
          owner_a?: string | null
          owner_b?: string | null
          pair_key: string
        }
        Update: {
          contact_key?: string | null
          lead_id_a?: string | null
          lead_id_b?: string | null
          notified_at?: string
          owner_a?: string | null
          owner_b?: string | null
          pair_key?: string
        }
        Relationships: []
      }
      meetime_prospections_idx: {
        Row: {
          email: string | null
          lead_id: string
          owner_id: string | null
          owner_name: string | null
          phone: string | null
          phone_raw: string | null
          prospection_id: string
          public_url: string | null
          updated_at: string
        }
        Insert: {
          email?: string | null
          lead_id: string
          owner_id?: string | null
          owner_name?: string | null
          phone?: string | null
          phone_raw?: string | null
          prospection_id: string
          public_url?: string | null
          updated_at?: string
        }
        Update: {
          email?: string | null
          lead_id?: string
          owner_id?: string | null
          owner_name?: string | null
          phone?: string | null
          phone_raw?: string | null
          prospection_id?: string
          public_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meetime_sdr_slack: {
        Row: {
          email: string | null
          owner_id: string
          owner_name: string | null
          slack_id: string
          updated_at: string
        }
        Insert: {
          email?: string | null
          owner_id: string
          owner_name?: string | null
          slack_id: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          owner_id?: string
          owner_name?: string | null
          slack_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      metas_panel_state: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
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
          team_type: Database["public"]["Enums"]["team_type"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          role: string
          squad: Database["public"]["Enums"]["squad_type"]
          team_type?: Database["public"]["Enums"]["team_type"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          role?: string
          squad?: Database["public"]["Enums"]["squad_type"]
          team_type?: Database["public"]["Enums"]["team_type"]
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
      meetime_detect_duplicates: {
        Args: never
        Returns: {
          contact_key: string
          details: Json
          lead_a: string
          lead_b: string
          leads: string[]
          mentions: string
          pair_key: string
          phone_display: string
          sdrs: string[]
        }[]
      }
      meetime_mark_alerted: {
        Args: {
          p_contact_key: string
          p_lead_id_a: string
          p_lead_id_b: string
          p_pair_key: string
        }
        Returns: undefined
      }
      meetime_upsert_lead: {
        Args: {
          p_email: string
          p_lead_id: string
          p_owner_id: string
          p_owner_name: string
          p_phone: string
          p_phone_raw?: string
          p_prospection_id: string
          p_public_url?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      closer_evaluation_result: "fechou" | "nao_fechou" | "follow_up"
      prospection_result: "prosseguiu" | "recusou" | "perdeu_interesse"
      prospection_type: "Ligação" | "WhatsApp"
      squad_type: "Águia" | "Lobo"
      team_type: "SDR" | "Closer"
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
      closer_evaluation_result: ["fechou", "nao_fechou", "follow_up"],
      prospection_result: ["prosseguiu", "recusou", "perdeu_interesse"],
      prospection_type: ["Ligação", "WhatsApp"],
      squad_type: ["Águia", "Lobo"],
      team_type: ["SDR", "Closer"],
    },
  },
} as const
