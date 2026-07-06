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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      case_conversations: {
        Row: {
          case_id: string
          created_at: string
          id: string
          title: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          title?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_conversations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_documents: {
        Row: {
          case_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_members: {
        Row: {
          added_by: string
          case_id: string
          created_at: string
          id: string
          member_email: string
        }
        Insert: {
          added_by: string
          case_id: string
          created_at?: string
          id?: string
          member_email: string
        }
        Update: {
          added_by?: string
          case_id?: string
          created_at?: string
          id?: string
          member_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_members_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          case_ref: string | null
          case_type: Database["public"]["Enums"]["case_type_enum"]
          created_at: string
          id: string
          last_activity_at: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          case_ref?: string | null
          case_type?: Database["public"]["Enums"]["case_type_enum"]
          created_at?: string
          id?: string
          last_activity_at?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          case_ref?: string | null
          case_type?: Database["public"]["Enums"]["case_type_enum"]
          created_at?: string
          id?: string
          last_activity_at?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments: Json
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          case_id: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      extractions: {
        Row: {
          case_id: string | null
          columns: Json
          created_at: string
          error: string | null
          id: string
          name: string
          protocol: string
          rows: Json
          source_documents: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          columns?: Json
          created_at?: string
          error?: string | null
          id?: string
          name: string
          protocol: string
          rows?: Json
          source_documents?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          columns?: Json
          created_at?: string
          error?: string | null
          id?: string
          name?: string
          protocol?: string
          rows?: Json
          source_documents?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extractions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_connectors: {
        Row: {
          bearer_token: string | null
          created_at: string
          enabled: boolean
          headers: Json
          id: string
          label: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          bearer_token?: string | null
          created_at?: string
          enabled?: boolean
          headers?: Json
          id?: string
          label: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          bearer_token?: string | null
          created_at?: string
          enabled?: boolean
          headers?: Json
          id?: string
          label?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_model: string
          ai_model_secondary: string | null
          anthropic_api_key: string | null
          auto_signout_hours: number
          avatar_url: string | null
          created_at: string
          full_name: string | null
          google_api_key: string | null
          id: string
          openai_api_key: string | null
          organization: string | null
          preferences: Json
          role: string | null
          updated_at: string
        }
        Insert: {
          ai_model?: string
          ai_model_secondary?: string | null
          anthropic_api_key?: string | null
          auto_signout_hours?: number
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          google_api_key?: string | null
          id: string
          openai_api_key?: string | null
          organization?: string | null
          preferences?: Json
          role?: string | null
          updated_at?: string
        }
        Update: {
          ai_model?: string
          ai_model_secondary?: string | null
          anthropic_api_key?: string | null
          auto_signout_hours?: number
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          google_api_key?: string | null
          id?: string
          openai_api_key?: string | null
          organization?: string | null
          preferences?: Json
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_case_member: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      is_case_owner: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      case_type_enum: "patient" | "department" | "research" | "general"
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
      case_type_enum: ["patient", "department", "research", "general"],
    },
  },
} as const
