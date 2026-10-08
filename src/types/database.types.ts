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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          assists: number
          attendance: Database["public"]["Enums"]["attendance_status"]
          goals: number
          id: string
          joined_at: string
          match_id: string
          profile_id: string
          team: Database["public"]["Enums"]["team_side"] | null
          updated_at: string
        }
        Insert: {
          assists?: number
          attendance?: Database["public"]["Enums"]["attendance_status"]
          goals?: number
          id?: string
          joined_at?: string
          match_id: string
          profile_id: string
          team?: Database["public"]["Enums"]["team_side"] | null
          updated_at?: string
        }
        Update: {
          assists?: number
          attendance?: Database["public"]["Enums"]["attendance_status"]
          goals?: number
          id?: string
          joined_at?: string
          match_id?: string
          profile_id?: string
          team?: Database["public"]["Enums"]["team_side"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results: {
        Row: {
          match_id: string
          mvp_profile_id: string | null
          notes: string | null
          recorded_at: string
          recorded_by: string | null
          team_a_score: number
          team_b_score: number
        }
        Insert: {
          match_id: string
          mvp_profile_id?: string | null
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          team_a_score: number
          team_b_score: number
        }
        Update: {
          match_id?: string
          mvp_profile_id?: string | null
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          team_a_score?: number
          team_b_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_mvp_profile_id_fkey"
            columns: ["mvp_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_mvp_profile_id_fkey"
            columns: ["mvp_profile_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          created_by: string | null
          format: Database["public"]["Enums"]["match_format"]
          id: string
          location: string
          match_date: string
          max_players: number
          notes: string | null
          reminder_sent_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          team_a_name: string
          team_b_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          format?: Database["public"]["Enums"]["match_format"]
          id?: string
          location: string
          match_date: string
          max_players?: number
          notes?: string | null
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_a_name?: string
          team_b_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          format?: Database["public"]["Enums"]["match_format"]
          id?: string
          location?: string
          match_date?: string
          max_players?: number
          notes?: string | null
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_a_name?: string
          team_b_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          label: string
          poll_id: string
          sort_order: number
          starts_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          poll_id: string
          sort_order?: number
          starts_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          poll_id?: string
          sort_order?: number
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_poll_id_fkey"
            columns: ["option_id", "poll_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id", "poll_id"]
          },
          {
            foreignKeyName: "poll_votes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple: boolean
          closes_at: string | null
          created_at: string
          created_by: string
          details: string | null
          id: string
          is_closed: boolean
          parent_option_id: string | null
          question: string
          updated_at: string
          week_start: string | null
        }
        Insert: {
          allow_multiple?: boolean
          closes_at?: string | null
          created_at?: string
          created_by: string
          details?: string | null
          id?: string
          is_closed?: boolean
          parent_option_id?: string | null
          question: string
          updated_at?: string
          week_start?: string | null
        }
        Update: {
          allow_multiple?: boolean
          closes_at?: string | null
          created_at?: string
          created_by?: string
          details?: string | null
          id?: string
          is_closed?: boolean
          parent_option_id?: string | null
          question?: string
          updated_at?: string
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_parent_option_id_fkey"
            columns: ["parent_option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          code: string
          format: Database["public"]["Enums"]["match_format"]
          label: string
          role_group: Database["public"]["Enums"]["player_role"]
          short_label: string
          sort_order: number
          x: number
          y: number
        }
        Insert: {
          code: string
          format: Database["public"]["Enums"]["match_format"]
          label: string
          role_group: Database["public"]["Enums"]["player_role"]
          short_label: string
          sort_order?: number
          x: number
          y: number
        }
        Update: {
          code?: string
          format?: Database["public"]["Enums"]["match_format"]
          label?: string
          role_group?: Database["public"]["Enums"]["player_role"]
          short_label?: string
          sort_order?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      profile_positions: {
        Row: {
          created_at: string
          position_code: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          position_code: string
          profile_id: string
        }
        Update: {
          created_at?: string
          position_code?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_positions_position_code_fkey"
            columns: ["position_code"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profile_positions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_positions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          is_admin: boolean
          is_organizer: boolean
          jersey_number: number | null
          nickname: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          is_admin?: boolean
          is_organizer?: boolean
          jersey_number?: number | null
          nickname: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          is_organizer?: boolean
          jersey_number?: number | null
          nickname?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      telegram_deliveries: {
        Row: {
          chat_id: number
          error: string | null
          notification_id: string
          ok: boolean
          sent_at: string
        }
        Insert: {
          chat_id: number
          error?: string | null
          notification_id: string
          ok: boolean
          sent_at?: string
        }
        Update: {
          chat_id?: number
          error?: string | null
          notification_id?: string
          ok?: boolean
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "telegram_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_link_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          profile_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          profile_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_link_codes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_link_codes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_notifications: {
        Row: {
          audience: string
          button_label: string | null
          button_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          kind: string
          profile_ids: string[]
          ref_id: string | null
          text: string
        }
        Insert: {
          audience?: string
          button_label?: string | null
          button_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kind: string
          profile_ids?: string[]
          ref_id?: string | null
          text: string
        }
        Update: {
          audience?: string
          button_label?: string | null
          button_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          profile_ids?: string[]
          ref_id?: string | null
          text?: string
        }
        Relationships: []
      }
      telegram_subscribers: {
        Row: {
          chat_id: number
          created_at: string
          first_name: string | null
          last_error: string | null
          last_error_at: string | null
          last_sent_at: string | null
          notifications_enabled: boolean
          profile_id: string
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          first_name?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_sent_at?: string | null
          notifications_enabled?: boolean
          profile_id: string
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          first_name?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_sent_at?: string | null
          notifications_enabled?: boolean
          profile_id?: string
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_subscribers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_subscribers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      player_stats: {
        Row: {
          assists: number | null
          draws: number | null
          goals: number | null
          last_played_at: string | null
          losses: number | null
          matches_played: number | null
          profile_id: string | null
          win_rate: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
        ]
      }
      standings: {
        Row: {
          assists: number | null
          avatar_url: string | null
          draws: number | null
          full_name: string | null
          goals: number | null
          id: string | null
          is_active: boolean | null
          jersey_number: number | null
          last_played_at: string | null
          losses: number | null
          matches_played: number | null
          nickname: string | null
          win_rate: number | null
          wins: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_organizer: { Args: never; Returns: boolean }
    }
    Enums: {
      attendance_status: "present" | "absent" | "maybe"
      match_format: "five_a_side" | "eight_a_side" | "eleven_a_side"
      match_status: "scheduled" | "teams_set" | "played" | "cancelled"
      player_role: "goalkeeper" | "defender" | "midfielder" | "forward"
      team_side: "a" | "b"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attendance_status: ["present", "absent", "maybe"],
      match_format: ["five_a_side", "eight_a_side", "eleven_a_side"],
      match_status: ["scheduled", "teams_set", "played", "cancelled"],
      player_role: ["goalkeeper", "defender", "midfielder", "forward"],
      team_side: ["a", "b"],
    },
  },
} as const
