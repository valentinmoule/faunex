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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      animal_departments: {
        Row: {
          animal_name: string
          created_at: string
          department_code: string
          taxon_id: string | null
        }
        Insert: {
          animal_name: string
          created_at?: string
          department_code: string
          taxon_id?: string | null
        }
        Update: {
          animal_name?: string
          created_at?: string
          department_code?: string
          taxon_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_departments_taxon_id_fkey"
            columns: ["taxon_id"]
            isOneToOne: false
            referencedRelation: "taxa"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_departments_backup_20260819: {
        Row: {
          animal_name: string | null
          created_at: string | null
          department_code: string | null
        }
        Insert: {
          animal_name?: string | null
          created_at?: string | null
          department_code?: string | null
        }
        Update: {
          animal_name?: string | null
          created_at?: string | null
          department_code?: string | null
        }
        Relationships: []
      }
      animal_merge_map: {
        Row: {
          created_at: string
          mode: string
          new_name: string
          old_name: string
        }
        Insert: {
          created_at?: string
          mode?: string
          new_name: string
          old_name: string
        }
        Update: {
          created_at?: string
          mode?: string
          new_name?: string
          old_name?: string
        }
        Relationships: []
      }
      animals: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          rarity: string
          scientific_name: string | null
          taxon_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          rarity?: string
          scientific_name?: string | null
          taxon_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          rarity?: string
          scientific_name?: string | null
          taxon_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_taxon_id_fkey"
            columns: ["taxon_id"]
            isOneToOne: false
            referencedRelation: "taxa"
            referencedColumns: ["id"]
          },
        ]
      }
      animals_backup_20260819: {
        Row: {
          category: string | null
          created_at: string | null
          id: string | null
          name: string | null
          rarity: string | null
          scientific_name: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          rarity?: string | null
          scientific_name?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          rarity?: string | null
          scientific_name?: string | null
        }
        Relationships: []
      }
      animals_phase7_backup_20260819: {
        Row: {
          category: string | null
          created_at: string | null
          id: string | null
          name: string | null
          rarity: string | null
          scientific_name: string | null
          taxon_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          rarity?: string | null
          scientific_name?: string | null
          taxon_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          rarity?: string | null
          scientific_name?: string | null
          taxon_id?: string | null
        }
        Relationships: []
      }
      background_jobs: {
        Row: {
          consecutive_failures: number
          created_at: string
          job_key: string
          last_error: string | null
          last_run_at: string | null
          lease_until: string | null
          paused_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          job_key: string
          last_error?: string | null
          last_run_at?: string | null
          lease_until?: string | null
          paused_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          job_key?: string
          last_error?: string | null
          last_run_at?: string | null
          lease_until?: string | null
          paused_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      capture_attempts: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
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
          note: string | null
          rarity: string
          scientific_name: string | null
          shared: boolean
          status: string
          subject_bbox: Json | null
          taxon_id: string | null
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
          note?: string | null
          rarity?: string
          scientific_name?: string | null
          shared?: boolean
          status?: string
          subject_bbox?: Json | null
          taxon_id?: string | null
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
          note?: string | null
          rarity?: string
          scientific_name?: string | null
          shared?: boolean
          status?: string
          subject_bbox?: Json | null
          taxon_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "captures_taxon_id_fkey"
            columns: ["taxon_id"]
            isOneToOne: false
            referencedRelation: "taxa"
            referencedColumns: ["id"]
          },
        ]
      }
      captures_phase7_backup_20260819: {
        Row: {
          animal_name: string | null
          category: string | null
          id: string | null
          rarity: string | null
          snapshot_at: string | null
          taxon_id: string | null
          user_id: string | null
        }
        Insert: {
          animal_name?: string | null
          category?: string | null
          id?: string | null
          rarity?: string | null
          snapshot_at?: string | null
          taxon_id?: string | null
          user_id?: string | null
        }
        Update: {
          animal_name?: string | null
          category?: string | null
          id?: string | null
          rarity?: string | null
          snapshot_at?: string | null
          taxon_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      collection_rules: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          include: boolean
          is_core: boolean
          params: Json
          rule_type: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          include?: boolean
          is_core?: boolean
          params?: Json
          rule_type: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          include?: boolean
          is_core?: boolean
          params?: Json
          rule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_rules_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_rules_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "my_collection_progress"
            referencedColumns: ["collection_id"]
          },
        ]
      }
      collection_taxa: {
        Row: {
          collection_id: string
          created_at: string
          is_core: boolean
          taxon_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          is_core?: boolean
          taxon_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          is_core?: boolean
          taxon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_taxa_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_taxa_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "my_collection_progress"
            referencedColumns: ["collection_id"]
          },
          {
            foreignKeyName: "collection_taxa_taxon_id_fkey"
            columns: ["taxon_id"]
            isOneToOne: false
            referencedRelation: "taxa"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_taxa_phase7_backup_20260819: {
        Row: {
          collection_id: string | null
          created_at: string | null
          is_core: boolean | null
          taxon_id: string | null
        }
        Insert: {
          collection_id?: string | null
          created_at?: string | null
          is_core?: boolean | null
          taxon_id?: string | null
        }
        Update: {
          collection_id?: string | null
          created_at?: string | null
          is_core?: boolean | null
          taxon_id?: string | null
        }
        Relationships: []
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_premium: boolean
          kind: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_premium?: boolean
          kind?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_premium?: boolean
          kind?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_quests: {
        Row: {
          claimed: boolean
          completed: boolean
          created_at: string
          description: string
          icon: string
          id: string
          progress: number
          quest_date: string
          quest_type: string
          target: number
          title: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          claimed?: boolean
          completed?: boolean
          created_at?: string
          description: string
          icon?: string
          id?: string
          progress?: number
          quest_date?: string
          quest_type: string
          target?: number
          title: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          claimed?: boolean
          completed?: boolean
          created_at?: string
          description?: string
          icon?: string
          id?: string
          progress?: number
          quest_date?: string
          quest_type?: string
          target?: number
          title?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      explorer_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
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
          {
            foreignKeyName: "feed_comments_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "ml_dataset_captures"
            referencedColumns: ["capture_id"]
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
          {
            foreignKeyName: "feed_likes_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "ml_dataset_captures"
            referencedColumns: ["capture_id"]
          },
        ]
      }
      inactivity_notifications_log: {
        Row: {
          failure_count: number
          id: string
          sent_at: string
          success_count: number
          user_id: string
        }
        Insert: {
          failure_count?: number
          id?: string
          sent_at?: string
          success_count?: number
          user_id: string
        }
        Update: {
          failure_count?: number
          id?: string
          sent_at?: string
          success_count?: number
          user_id?: string
        }
        Relationships: []
      }
      login_events: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ml_dataset_events: {
        Row: {
          alternatives: Json | null
          animal_id: string | null
          capture_id: string | null
          confidence: number | null
          created_at: string
          decision_reason: string | null
          event_type: string
          forced_name: boolean
          id: string
          image_hash: string | null
          image_url: string | null
          is_ground_truth: boolean
          label_category: string | null
          label_name: string | null
          label_rarity: string | null
          label_scientific_name: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          model: string | null
          moderator_id: string | null
          payload: Json | null
          predicted_category: string | null
          predicted_name: string | null
          predicted_rarity: string | null
          predicted_scientific_name: string | null
          source: string
          subject_bbox: Json | null
          taxon_id: string | null
          user_description: string | null
          user_id: string | null
        }
        Insert: {
          alternatives?: Json | null
          animal_id?: string | null
          capture_id?: string | null
          confidence?: number | null
          created_at?: string
          decision_reason?: string | null
          event_type: string
          forced_name?: boolean
          id?: string
          image_hash?: string | null
          image_url?: string | null
          is_ground_truth?: boolean
          label_category?: string | null
          label_name?: string | null
          label_rarity?: string | null
          label_scientific_name?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          model?: string | null
          moderator_id?: string | null
          payload?: Json | null
          predicted_category?: string | null
          predicted_name?: string | null
          predicted_rarity?: string | null
          predicted_scientific_name?: string | null
          source: string
          subject_bbox?: Json | null
          taxon_id?: string | null
          user_description?: string | null
          user_id?: string | null
        }
        Update: {
          alternatives?: Json | null
          animal_id?: string | null
          capture_id?: string | null
          confidence?: number | null
          created_at?: string
          decision_reason?: string | null
          event_type?: string
          forced_name?: boolean
          id?: string
          image_hash?: string | null
          image_url?: string | null
          is_ground_truth?: boolean
          label_category?: string | null
          label_name?: string | null
          label_rarity?: string | null
          label_scientific_name?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          model?: string | null
          moderator_id?: string | null
          payload?: Json | null
          predicted_category?: string | null
          predicted_name?: string | null
          predicted_rarity?: string | null
          predicted_scientific_name?: string | null
          source?: string
          subject_bbox?: Json | null
          taxon_id?: string | null
          user_description?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_dataset_events_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_dataset_events_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "ml_dataset_captures"
            referencedColumns: ["animal_id"]
          },
          {
            foreignKeyName: "ml_dataset_events_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_dataset_events_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "ml_dataset_captures"
            referencedColumns: ["capture_id"]
          },
          {
            foreignKeyName: "ml_dataset_events_taxon_id_fkey"
            columns: ["taxon_id"]
            isOneToOne: false
            referencedRelation: "taxa"
            referencedColumns: ["id"]
          },
        ]
      }
      nearby_search_attempts: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "notifications_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "ml_dataset_captures"
            referencedColumns: ["capture_id"]
          },
        ]
      }
      paddle_customers: {
        Row: {
          created_at: string
          email: string | null
          environment: string
          name: string | null
          paddle_customer_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          environment?: string
          name?: string | null
          paddle_customer_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          environment?: string
          name?: string | null
          paddle_customer_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_share_captures: boolean
          display_name: string | null
          id: string
          is_private: boolean
          last_login_at: string | null
          level: number
          marketing_emails: boolean
          notify_email_comments: boolean
          notify_email_follows: boolean
          notify_email_likes: boolean
          notify_push_comments: boolean
          notify_push_follows: boolean
          notify_push_likes: boolean
          regions_explored: number
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
          default_share_captures?: boolean
          display_name?: string | null
          id?: string
          is_private?: boolean
          last_login_at?: string | null
          level?: number
          marketing_emails?: boolean
          notify_email_comments?: boolean
          notify_email_follows?: boolean
          notify_email_likes?: boolean
          notify_push_comments?: boolean
          notify_push_follows?: boolean
          notify_push_likes?: boolean
          regions_explored?: number
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
          default_share_captures?: boolean
          display_name?: string | null
          id?: string
          is_private?: boolean
          last_login_at?: string | null
          level?: number
          marketing_emails?: boolean
          notify_email_comments?: boolean
          notify_email_follows?: boolean
          notify_email_likes?: boolean
          notify_push_comments?: boolean
          notify_push_follows?: boolean
          notify_push_likes?: boolean
          regions_explored?: number
          total_captures?: number
          updated_at?: string
          user_id?: string
          username?: string | null
          xp?: number
          xp_to_next?: number
        }
        Relationships: []
      }
      profiles_counters_backup_20260819: {
        Row: {
          level: number | null
          regions_explored: number | null
          snapshot_at: string | null
          total_captures: number | null
          user_id: string | null
          xp: number | null
          xp_to_next: number | null
        }
        Insert: {
          level?: number | null
          regions_explored?: number | null
          snapshot_at?: string | null
          total_captures?: number | null
          user_id?: string | null
          xp?: number | null
          xp_to_next?: number | null
        }
        Update: {
          level?: number | null
          regions_explored?: number | null
          snapshot_at?: string | null
          total_captures?: number | null
          user_id?: string | null
          xp?: number | null
          xp_to_next?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          scheduled_change_action: string | null
          scheduled_change_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          scheduled_change_action?: string | null
          scheduled_change_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          scheduled_change_action?: string | null
          scheduled_change_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      taxa: {
        Row: {
          collectible: boolean
          created_at: string
          external_ids: Json
          id: string
          is_domestic: boolean
          main_category: Database["public"]["Enums"]["main_category"]
          merged_into: string | null
          notes: string | null
          parent_id: string | null
          progress_taxon_id: string | null
          rank: Database["public"]["Enums"]["taxon_rank"]
          rarity: string
          scientific_name: string | null
          scientific_rank: string | null
          scope: Database["public"]["Enums"]["taxon_scope"]
          status: Database["public"]["Enums"]["taxon_status"]
          updated_at: string
          vernacular_name: string
        }
        Insert: {
          collectible?: boolean
          created_at?: string
          external_ids?: Json
          id?: string
          is_domestic?: boolean
          main_category: Database["public"]["Enums"]["main_category"]
          merged_into?: string | null
          notes?: string | null
          parent_id?: string | null
          progress_taxon_id?: string | null
          rank: Database["public"]["Enums"]["taxon_rank"]
          rarity?: string
          scientific_name?: string | null
          scientific_rank?: string | null
          scope?: Database["public"]["Enums"]["taxon_scope"]
          status?: Database["public"]["Enums"]["taxon_status"]
          updated_at?: string
          vernacular_name: string
        }
        Update: {
          collectible?: boolean
          created_at?: string
          external_ids?: Json
          id?: string
          is_domestic?: boolean
          main_category?: Database["public"]["Enums"]["main_category"]
          merged_into?: string | null
          notes?: string | null
          parent_id?: string | null
          progress_taxon_id?: string | null
          rank?: Database["public"]["Enums"]["taxon_rank"]
          rarity?: string
          scientific_name?: string | null
          scientific_rank?: string | null
          scope?: Database["public"]["Enums"]["taxon_scope"]
          status?: Database["public"]["Enums"]["taxon_status"]
          updated_at?: string
          vernacular_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxa_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "taxa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxa_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "taxa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxa_progress_taxon_id_fkey"
            columns: ["progress_taxon_id"]
            isOneToOne: false
            referencedRelation: "taxa"
            referencedColumns: ["id"]
          },
        ]
      }
      taxa_phase7_backup_20260819: {
        Row: {
          collectible: boolean | null
          created_at: string | null
          external_ids: Json | null
          id: string | null
          is_domestic: boolean | null
          main_category: Database["public"]["Enums"]["main_category"] | null
          merged_into: string | null
          notes: string | null
          parent_id: string | null
          rank: Database["public"]["Enums"]["taxon_rank"] | null
          rarity: string | null
          scientific_name: string | null
          scientific_rank: string | null
          scope: Database["public"]["Enums"]["taxon_scope"] | null
          status: Database["public"]["Enums"]["taxon_status"] | null
          updated_at: string | null
          vernacular_name: string | null
        }
        Insert: {
          collectible?: boolean | null
          created_at?: string | null
          external_ids?: Json | null
          id?: string | null
          is_domestic?: boolean | null
          main_category?: Database["public"]["Enums"]["main_category"] | null
          merged_into?: string | null
          notes?: string | null
          parent_id?: string | null
          rank?: Database["public"]["Enums"]["taxon_rank"] | null
          rarity?: string | null
          scientific_name?: string | null
          scientific_rank?: string | null
          scope?: Database["public"]["Enums"]["taxon_scope"] | null
          status?: Database["public"]["Enums"]["taxon_status"] | null
          updated_at?: string | null
          vernacular_name?: string | null
        }
        Update: {
          collectible?: boolean | null
          created_at?: string | null
          external_ids?: Json | null
          id?: string | null
          is_domestic?: boolean | null
          main_category?: Database["public"]["Enums"]["main_category"] | null
          merged_into?: string | null
          notes?: string | null
          parent_id?: string | null
          rank?: Database["public"]["Enums"]["taxon_rank"] | null
          rarity?: string | null
          scientific_name?: string | null
          scientific_rank?: string | null
          scope?: Database["public"]["Enums"]["taxon_scope"] | null
          status?: Database["public"]["Enums"]["taxon_status"] | null
          updated_at?: string | null
          vernacular_name?: string | null
        }
        Relationships: []
      }
      taxon_synonyms: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          lang: string
          normalized_label: string
          taxon_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label: string
          lang?: string
          normalized_label: string
          taxon_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          lang?: string
          normalized_label?: string
          taxon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxon_synonyms_taxon_id_fkey"
            columns: ["taxon_id"]
            isOneToOne: false
            referencedRelation: "taxa"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          claimed_at: string
          id: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          badge_id: string
          claimed_at?: string
          id?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          badge_id?: string
          claimed_at?: string
          id?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      user_department_subscriptions: {
        Row: {
          city_name: string | null
          city_postcode: string | null
          created_at: string
          department_code: string
          id: string
          is_home: boolean
          kind: string
          user_id: string
        }
        Insert: {
          city_name?: string | null
          city_postcode?: string | null
          created_at?: string
          department_code: string
          id?: string
          is_home?: boolean
          kind?: string
          user_id: string
        }
        Update: {
          city_name?: string | null
          city_postcode?: string | null
          created_at?: string
          department_code?: string
          id?: string
          is_home?: boolean
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_species_collections: {
        Row: {
          collection_key: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          collection_key: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          collection_key?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      bestiary_catalogue: {
        Row: {
          category: string | null
          is_breed: boolean | null
          name: string | null
          progress_name: string | null
          rarity: string | null
          scientific_name: string | null
          taxon_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_taxon_id_fkey"
            columns: ["taxon_id"]
            isOneToOne: false
            referencedRelation: "taxa"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_dataset_captures: {
        Row: {
          animal_id: string | null
          capture_id: string | null
          created_at: string | null
          image_url: string | null
          label_category: string | null
          label_name: string | null
          label_rarity: string | null
          label_scientific_name: string | null
          label_status: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          subject_bbox: Json | null
          user_description: string | null
          user_id: string | null
          user_note: string | null
        }
        Relationships: []
      }
      ml_dataset_ground_truth: {
        Row: {
          capture_id: string | null
          confidence: number | null
          created_at: string | null
          event_type: string | null
          id: string | null
          image_hash: string | null
          image_url: string | null
          label_category: string | null
          label_name: string | null
          label_rarity: string | null
          label_scientific_name: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          model: string | null
          source: string | null
          subject_bbox: Json | null
          user_description: string | null
        }
        Insert: {
          capture_id?: string | null
          confidence?: number | null
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          image_hash?: string | null
          image_url?: string | null
          label_category?: never
          label_name?: never
          label_rarity?: never
          label_scientific_name?: never
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          model?: string | null
          source?: string | null
          subject_bbox?: Json | null
          user_description?: string | null
        }
        Update: {
          capture_id?: string | null
          confidence?: number | null
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          image_hash?: string | null
          image_url?: string | null
          label_category?: never
          label_name?: never
          label_rarity?: never
          label_scientific_name?: never
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          model?: string | null
          source?: string | null
          subject_bbox?: Json | null
          user_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_dataset_events_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_dataset_events_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "ml_dataset_captures"
            referencedColumns: ["capture_id"]
          },
        ]
      }
      my_collection_progress: {
        Row: {
          collection_id: string | null
          icon: string | null
          is_premium: boolean | null
          kind: string | null
          owned: number | null
          slug: string | null
          sort_order: number | null
          title: string | null
          total: number | null
        }
        Insert: {
          collection_id?: string | null
          icon?: string | null
          is_premium?: boolean | null
          kind?: string | null
          owned?: never
          slug?: string | null
          sort_order?: number | null
          title?: string | null
          total?: never
        }
        Update: {
          collection_id?: string | null
          icon?: string | null
          is_premium?: boolean | null
          kind?: string | null
          owned?: never
          slug?: string | null
          sort_order?: number | null
          title?: string | null
          total?: never
        }
        Relationships: []
      }
    }
    Functions: {
      acquire_background_job: {
        Args: { p_job_key: string; p_lease_seconds?: number }
        Returns: string
      }
      canonical_animal_category: {
        Args: { p_category: string; p_name?: string; p_scientific?: string }
        Returns: string
      }
      canonical_animal_name: { Args: { p_name: string }; Returns: string }
      captures_remaining_today: { Args: never; Returns: number }
      category_leaderboard: {
        Args: { p_category: string; p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          is_me: boolean
          rank: number
          species: number
          user_id: string
          username: string
        }[]
      }
      claim_badge: {
        Args: { p_badge_id: string; p_xp_reward: number }
        Returns: boolean
      }
      claim_quest_reward: { Args: { p_quest_id: string }; Returns: boolean }
      collection_rule_taxa: {
        Args: { p_rule_id: string }
        Returns: {
          taxon_id: string
        }[]
      }
      ensure_weekly_quests: { Args: never; Returns: number }
      ensure_weekly_quests_for: { Args: { p_user_id: string }; Returns: number }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          created_at: string
          default_share_captures: boolean
          display_name: string | null
          id: string
          is_private: boolean
          last_login_at: string | null
          level: number
          marketing_emails: boolean
          notify_email_comments: boolean
          notify_email_follows: boolean
          notify_email_likes: boolean
          notify_push_comments: boolean
          notify_push_follows: boolean
          notify_push_likes: boolean
          regions_explored: number
          total_captures: number
          updated_at: string
          user_id: string
          username: string | null
          xp: number
          xp_to_next: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_public_recent_captures: {
        Args: { p_limit?: number }
        Returns: {
          animal_name: string
          created_at: string
          rarity: string
        }[]
      }
      grant_xp: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { p_user_id: string }; Returns: boolean }
      is_profile_private: { Args: { _user_id: string }; Returns: boolean }
      match_animal: {
        Args: { p_name: string; p_scientific?: string }
        Returns: {
          category: string
          id: string
          name: string
          rarity: string
          scientific_name: string
        }[]
      }
      match_taxon: {
        Args: { p_name: string; p_scientific?: string }
        Returns: {
          collectible: boolean
          id: string
          main_category: Database["public"]["Enums"]["main_category"]
          rank: Database["public"]["Enums"]["taxon_rank"]
          rarity: string
          scientific_name: string
          vernacular_name: string
        }[]
      }
      my_category_rank: {
        Args: { p_category: string }
        Returns: {
          rank: number
          species: number
          total_players: number
        }[]
      }
      nearby_searches_remaining_today: { Args: never; Returns: number }
      normalize_animal_label: { Args: { p_label: string }; Returns: string }
      pause_background_job: {
        Args: { p_job_key: string; p_reason: string }
        Returns: undefined
      }
      premium_user_ids: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
        }[]
      }
      progress_taxon: { Args: { p_taxon_id: string }; Returns: string }
      recompute_profile_counters: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      record_capture_attempt: { Args: never; Returns: number }
      record_nearby_search: { Args: never; Returns: number }
      refresh_collection_membership: {
        Args: { p_collection_id?: string }
        Returns: number
      }
      release_background_job: {
        Args: { p_error?: string; p_job_key: string; p_resume?: boolean }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      main_category:
        | "Mammifères"
        | "Oiseaux"
        | "Reptiles"
        | "Amphibiens"
        | "Poissons"
        | "Insectes"
        | "Arachnides"
        | "Crustacés"
        | "Mollusques"
        | "Échinodermes"
        | "Cnidaires"
        | "Autres invertébrés"
      taxon_rank: "group" | "species" | "subspecies" | "breed"
      taxon_scope: "france" | "monde"
      taxon_status: "validated" | "pending" | "deprecated"
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
      main_category: [
        "Mammifères",
        "Oiseaux",
        "Reptiles",
        "Amphibiens",
        "Poissons",
        "Insectes",
        "Arachnides",
        "Crustacés",
        "Mollusques",
        "Échinodermes",
        "Cnidaires",
        "Autres invertébrés",
      ],
      taxon_rank: ["group", "species", "subspecies", "breed"],
      taxon_scope: ["france", "monde"],
      taxon_status: ["validated", "pending", "deprecated"],
    },
  },
} as const
