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
      appointments: {
        Row: {
          conversation_id: string | null
          created_at: string
          duration_min: number
          id: string
          patient_feedback: string | null
          patient_id: string
          patient_rating: number | null
          professional_id: string
          professional_notes: string | null
          scheduled_at: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          patient_feedback?: string | null
          patient_id: string
          patient_rating?: number | null
          professional_id: string
          professional_notes?: string | null
          scheduled_at: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          patient_feedback?: string | null
          patient_id?: string
          patient_rating?: number | null
          professional_id?: string
          professional_notes?: string | null
          scheduled_at?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          kind: string
          mime_type: string
          original_name: string | null
          sender_id: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          kind: string
          mime_type: string
          original_name?: string | null
          sender_id: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          mime_type?: string
          original_name?: string | null
          sender_id?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          appointment_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          status: Database["public"]["Enums"]["conversation_status"]
          user_alias: string | null
          user_id: string
          volunteer_alias: string | null
          volunteer_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          user_alias?: string | null
          user_id: string
          volunteer_alias?: string | null
          volunteer_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          user_alias?: string | null
          user_id?: string
          volunteer_alias?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      flagged_users: {
        Row: {
          admin_notes: string | null
          cleared: boolean
          created_at: string
          flagged_at: string
          incident_count: number
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          cleared?: boolean
          created_at?: string
          flagged_at?: string
          incident_count?: number
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          cleared?: boolean
          created_at?: string
          flagged_at?: string
          incident_count?: number
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_id: string | null
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          segments: Json | null
          sender_id: string
          transcription: string | null
          translation_segments: Json
          translations: Json
        }
        Insert: {
          attachment_id?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          segments?: Json | null
          sender_id: string
          transcription?: string | null
          translation_segments?: Json
          translations?: Json
        }
        Update: {
          attachment_id?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          segments?: Json | null
          sender_id?: string
          transcription?: string | null
          translation_segments?: Json
          translations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "messages_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          created_at: string
          duration_seconds: number | null
          event: string
          id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          event: string
          id?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          event?: string
          id?: string
        }
        Relationships: []
      }
      mfa_attempts: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          scope: string
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          scope: string
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          scope?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mood_entries: {
        Row: {
          created_at: string
          id: string
          mood: number
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood: number
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mood?: number
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_year: number | null
          created_at: string
          display_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      queue: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          matched_volunteer_id: string | null
          status: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          matched_volunteer_id?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          matched_volunteer_id?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          appointment_id: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          appointment_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          appointment_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      screenshot_incidents: {
        Row: {
          admin_notes: string | null
          appointment_id: string | null
          conversation_id: string | null
          created_at: string
          id: string
          reason: string
          severity: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          appointment_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          reason: string
          severity?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          appointment_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          severity?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenshot_incidents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshot_incidents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
      user_summaries: {
        Row: {
          alias: string | null
          created_at: string
          last_conversation_id: string | null
          sessions_count: number
          summary: string
          technical_details: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          alias?: string | null
          created_at?: string
          last_conversation_id?: string | null
          sessions_count?: number
          summary?: string
          technical_details?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          alias?: string | null
          created_at?: string
          last_conversation_id?: string | null
          sessions_count?: number
          summary?: string
          technical_details?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_summaries_last_conversation_id_fkey"
            columns: ["last_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          applied_at: string
          approval_status: Database["public"]["Enums"]["volunteer_approval"]
          availability: string | null
          available_slots: Json
          bio: string | null
          credentials: string | null
          display_alias: string
          email: string | null
          experience: string | null
          full_name: string | null
          motivation: string | null
          photo_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["volunteer_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          approval_status?: Database["public"]["Enums"]["volunteer_approval"]
          availability?: string | null
          available_slots?: Json
          bio?: string | null
          credentials?: string | null
          display_alias?: string
          email?: string | null
          experience?: string | null
          full_name?: string | null
          motivation?: string | null
          photo_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["volunteer_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          approval_status?: Database["public"]["Enums"]["volunteer_approval"]
          availability?: string | null
          available_slots?: Json
          bio?: string | null
          credentials?: string | null
          display_alias?: string
          email?: string | null
          experience?: string | null
          full_name?: string | null
          motivation?: string | null
          photo_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["volunteer_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_mfa_lock: {
        Args: { _scope: string }
        Returns: {
          failed_count: number
          locked: boolean
          remaining_seconds: number
        }[]
      }
      generate_random_alias: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _metadata?: Json
          _target_id?: string
          _target_type?: string
        }
        Returns: undefined
      }
      purge_ended_conversations: { Args: never; Returns: undefined }
      purge_old_incidents: { Args: never; Returns: undefined }
      record_mfa_attempt: {
        Args: { _scope: string; _success: boolean }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "volunteer" | "psychologist"
      conversation_status: "active" | "ended"
      volunteer_approval: "pending" | "approved" | "rejected"
      volunteer_status: "available" | "busy" | "offline"
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
      app_role: ["admin", "volunteer", "psychologist"],
      conversation_status: ["active", "ended"],
      volunteer_approval: ["pending", "approved", "rejected"],
      volunteer_status: ["available", "busy", "offline"],
    },
  },
} as const
