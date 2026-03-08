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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      captures: {
        Row: {
          animal_name: string
          caption: string | null
          category: string | null
          comments_count: number
          conservation: string | null
          created_at: string
          description: string | null
          diet: string | null
          fun_fact: string | null
          habitat: string | null
          id: string
          image_url: string
          latitude: number | null
          likes_count: number
          location: string | null
          longitude: number | null
          rarity: string
          scientific_name: string | null
          shared: boolean
          user_id: string
        }
        Insert: {
          animal_name: string
          caption?: string | null
          category?: string | null
          comments_count?: number
          conservation?: string | null
          created_at?: string
          description?: string | null
          diet?: string | null
          fun_fact?: string | null
          habitat?: string | null
          id?: string
          image_url: string
          latitude?: number | null
          likes_count?: number
          location?: string | null
          longitude?: number | null
          rarity?: string
          scientific_name?: string | null
          shared?: boolean
          user_id: string
        }
        Update: {
          animal_name?: string
          caption?: string | null
          category?: string | null
          comments_count?: number
          conservation?: string | null
          created_at?: string
          description?: string | null
          diet?: string | null
          fun_fact?: string | null
          habitat?: string | null
          id?: string
          image_url?: string
          latitude?: number | null
          likes_count?: number
          location?: string | null
          longitude?: number | null
          rarity?: string
          scientific_name?: string | null
          shared?: boolean
          user_id?: string
        }
        Relationships: []
      }
      explorer_friends: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          capture_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          capture_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          capture_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_likes: {
        Row: {
          capture_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          capture_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          capture_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          capture_id: string | null
          comment_text: string | null
          created_at: string
          id: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          capture_id?: string | null
          comment_text?: string | null
          created_at?: string
          id?: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          capture_id?: string | null
          comment_text?: string | null
          created_at?: string
          id?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          level: number
          regions_explored: number
          species_count: number
          total_captures: number
          updated_at: string
          user_id: string
          username: string | null
          xp: number
          xp_to_next: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          level?: number
          regions_explored?: number
          species_count?: number
          total_captures?: number
          updated_at?: string
          user_id: string
          username?: string | null
          xp?: number
          xp_to_next?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          level?: number
          regions_explored?: number
          species_count?: number
          total_captures?: number
          updated_at?: string
          user_id?: string
          username?: string | null
          xp?: number
          xp_to_next?: number
        }
        Relationships: []
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
