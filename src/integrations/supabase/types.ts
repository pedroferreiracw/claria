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
      meetime_metrics: {
        Row: {
          agendamentos: number
          data_referencia: string
          id: string
          no_show: number
          sdr_id: string
          sdr_nome: string
          tempo_resposta_5min: number
        }
        Insert: {
          agendamentos: number
          data_referencia: string
          id: string
          no_show: number
          sdr_id: string
          sdr_nome: string
          tempo_resposta_5min: number
        }
        Update: {
          agendamentos?: number
          data_referencia?: string
          id?: string
          no_show?: number
          sdr_id?: string
          sdr_nome?: string
          tempo_resposta_5min?: number
        }
        Relationships: []
      }
      pipedrive_metrics: {
        Row: {
          clientes_fechados: number
          data_referencia: string
          id: string
          sdr_id: string
          sdr_nome: string
          taxa_conversao_final: number
        }
        Insert: {
          clientes_fechados: number
          data_referencia: string
          id: string
          sdr_id: string
          sdr_nome: string
          taxa_conversao_final: number
        }
        Update: {
          clientes_fechados?: number
          data_referencia?: string
          id?: string
          sdr_id?: string
          sdr_nome?: string
          taxa_conversao_final?: number
        }
        Relationships: []
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
      squads: {
        Row: {
          id: string
          sdr_id: string
          sdr_nome: string
          time: string
        }
        Insert: {
          id: string
          sdr_id: string
          sdr_nome: string
          time: string
        }
        Update: {
          id?: string
          sdr_id?: string
          sdr_nome?: string
          time?: string
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
