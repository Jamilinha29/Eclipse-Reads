export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Permite instanciar automaticamente createClient com as opções corretas
  // em vez de createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      book_submissions: {
        Row: {
          author: string
          category: string | null
          created_at: string
          description: string | null
          file_path: string
          file_type: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          author: string
          category?: string | null
          created_at?: string
          description?: string | null
          file_path: string
          file_type: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          author?: string
          category?: string | null
          created_at?: string
          description?: string | null
          file_path?: string
          file_type?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          age_rating: string | null
          author: string
          category: string
          cover_image: string | null
          created_at: string | null
          description: string | null
          file_path: string
          file_type: string
          id: string
          rating: number | null
          submission_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          age_rating?: string | null
          author: string
          category: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          file_path: string
          file_type: string
          id?: string
          rating?: number | null
          submission_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          age_rating?: string | null
          author?: string
          category?: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string
          file_type?: string
          id?: string
          rating?: number | null
          submission_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "book_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_image: string | null
          banner_image: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string | null
          username: string
        }
        Insert: {
          avatar_image?: string | null
          banner_image?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
          username?: string
        }
        Update: {
          avatar_image?: string | null
          banner_image?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          author: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          quote: string
          updated_at: string | null
        }
        Insert: {
          author: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          quote: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          quote?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      read: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reading: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reading_goals: {
        Row: {
          completed: boolean
          created_at: string
          current_books: number
          deadline: string | null
          id: string
          target_books: number
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          current_books?: number
          deadline?: string | null
          id?: string
          target_books: number
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          current_books?: number
          deadline?: string | null
          id?: string
          target_books?: number
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          book_id: string
          created_at: string | null
          current_page: number | null
          id: string
          last_read_at: string | null
          progress_percentage: number | null
          total_pages: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          book_id: string
          created_at?: string | null
          current_page?: number | null
          id?: string
          last_read_at?: string | null
          progress_percentage?: number | null
          total_pages?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string | null
          current_page?: number | null
          id?: string
          last_read_at?: string | null
          progress_percentage?: number | null
          total_pages?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          book_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          book_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          book_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
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
      user_settings: {
        Row: {
          created_at: string
          id: string
          notifications_enabled: boolean
          sound_enabled: boolean
          theme: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notifications_enabled?: boolean
          sound_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notifications_enabled?: boolean
          sound_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id?: string | null
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
