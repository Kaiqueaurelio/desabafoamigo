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
      blocked_words: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          severity: string
          term: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          severity?: string
          term: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          severity?: string
          term?: string
        }
        Relationships: []
      }
      conversation_follow_ups: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          reply_note: string | null
          reply_status: string
          scheduled_for: string
          sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          reply_note?: string | null
          reply_status?: string
          scheduled_for: string
          sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          reply_note?: string | null
          reply_status?: string
          scheduled_for?: string
          sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_follow_ups_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
      crisis_escalations: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          conversation_id: string
          created_at: string
          id: string
          notes: string | null
          raised_by: string
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          notes?: string | null
          raised_by: string
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          raised_by?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crisis_escalations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_actions: {
        Row: {
          created_at: string
          id: string
          kind: string
          metadata: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      error_events: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      favorite_volunteers: {
        Row: {
          created_at: string
          user_id: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          volunteer_id?: string
        }
        Relationships: []
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
      lgpd_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          file_path: string | null
          format: string | null
          id: string
          kind: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_path?: string | null
          format?: string | null
          id?: string
          kind: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_path?: string | null
          format?: string | null
          id?: string
          kind?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      library_audios: {
        Row: {
          audio_url: string
          category: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          audio_url: string
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_images: {
        Row: {
          caption: string | null
          category: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string
          published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
          published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
          published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_phrases: {
        Row: {
          author: string | null
          category: string
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          text: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          text: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
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
      nps_responses: {
        Row: {
          comment: string | null
          conversation_id: string | null
          created_at: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
      push_delivery_log: {
        Row: {
          created_at: string
          endpoint_host: string | null
          endpoint_tail: string | null
          error_body: string | null
          id: string
          stale: boolean
          status_code: number | null
          subscription_id: string | null
          success: boolean
          tag: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint_host?: string | null
          endpoint_tail?: string | null
          error_body?: string | null
          id?: string
          stale?: boolean
          status_code?: number | null
          subscription_id?: string | null
          success?: boolean
          tag?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint_host?: string | null
          endpoint_tail?: string | null
          error_body?: string | null
          id?: string
          stale?: boolean
          status_code?: number | null
          subscription_id?: string | null
          success?: boolean
          tag?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          active: boolean
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
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
          preferred_lang: string
          status: string
          topic: string | null
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          matched_volunteer_id?: string | null
          preferred_lang?: string
          status?: string
          topic?: string | null
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          matched_volunteer_id?: string | null
          preferred_lang?: string
          status?: string
          topic?: string | null
          updated_at?: string
          urgency?: string
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
      safety_plans: {
        Row: {
          coping_strategies: string | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          reasons_to_live: string | null
          share_location_with_contact: boolean
          updated_at: string
          user_id: string
          warning_signs: string | null
        }
        Insert: {
          coping_strategies?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          reasons_to_live?: string | null
          share_location_with_contact?: boolean
          updated_at?: string
          user_id: string
          warning_signs?: string | null
        }
        Update: {
          coping_strategies?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          reasons_to_live?: string | null
          share_location_with_contact?: boolean
          updated_at?: string
          user_id?: string
          warning_signs?: string | null
        }
        Relationships: []
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
      volunteer_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          label: string
          position: number
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          label: string
          position?: number
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          label?: string
          position?: number
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: []
      }
      volunteer_training_modules: {
        Row: {
          active: boolean
          content: string
          created_at: string
          id: string
          min_score: number
          quiz: Json
          slug: string
          sort_order: number
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content?: string
          created_at?: string
          id?: string
          min_score?: number
          quiz?: Json
          slug: string
          sort_order?: number
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          id?: string
          min_score?: number
          quiz?: Json
          slug?: string
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      volunteer_training_progress: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          module_id: string
          passed: boolean
          quiz_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id: string
          passed?: boolean
          quiz_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string
          passed?: boolean
          quiz_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "volunteer_training_modules"
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
          training_completed_at: string | null
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
          training_completed_at?: string | null
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
          training_completed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          kind: string
          scope: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          kind: string
          scope?: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          kind?: string
          scope?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          backed_up: boolean
          counter: number
          created_at: string
          credential_id: string
          device_name: string
          device_type: string | null
          id: string
          last_used_at: string | null
          public_key: string
          scope: string
          transports: string[]
          user_id: string
        }
        Insert: {
          backed_up?: boolean
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          scope?: string
          transports?: string[]
          user_id: string
        }
        Update: {
          backed_up?: boolean
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          scope?: string
          transports?: string[]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _test_mfa_rate_limit: { Args: never; Returns: string }
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
      log_conversation_access: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      purge_ended_conversations: { Args: never; Returns: undefined }
      purge_old_incidents: { Args: never; Returns: undefined }
      purge_old_push_logs: { Args: never; Returns: undefined }
      record_mfa_attempt: {
        Args: { _scope: string; _success: boolean }
        Returns: undefined
      }
      run_daily_maintenance: { Args: never; Returns: Json }
      send_pending_follow_ups: { Args: never; Returns: number }
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
