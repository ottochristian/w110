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
      application_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_name: string
          metric_value: number
          recorded_at: string | null
          severity: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_value: number
          recorded_at?: string | null
          severity?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number
          recorded_at?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      athletes: {
        Row: {
          club_id: string
          created_at: string | null
          date_of_birth: string
          first_name: string
          fis_license: string | null
          gender: string | null
          household_id: string | null
          id: string
          last_name: string
          medical_notes: string | null
          updated_at: string | null
          ussa_number: string | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          date_of_birth: string
          first_name: string
          fis_license?: string | null
          gender?: string | null
          household_id?: string | null
          id?: string
          last_name: string
          medical_notes?: string | null
          updated_at?: string | null
          ussa_number?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          date_of_birth?: string
          first_name?: string
          fis_license?: string | null
          gender?: string | null
          household_id?: string | null
          id?: string
          last_name?: string
          medical_notes?: string | null
          updated_at?: string | null
          ussa_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          address: string | null
          contact_email: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          slug: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          slug: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          slug?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coach_assignments: {
        Row: {
          club_id: string
          coach_id: string | null
          created_at: string | null
          deleted_at: string | null
          group_id: string | null
          id: string
          program_id: string | null
          role: string | null
          season_id: string | null
          sub_program_id: string | null
        }
        Insert: {
          club_id: string
          coach_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          group_id?: string | null
          id?: string
          program_id?: string | null
          role?: string | null
          season_id?: string | null
          sub_program_id?: string | null
        }
        Update: {
          club_id?: string
          coach_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          group_id?: string | null
          id?: string
          program_id?: string | null
          role?: string | null
          season_id?: string | null
          sub_program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_assignments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_sub_program_id_fkey"
            columns: ["sub_program_id"]
            isOneToOne: false
            referencedRelation: "sub_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          bio: string | null
          certifications: string[] | null
          club_id: string
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          certifications?: string[] | null
          club_id: string
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          certifications?: string[] | null
          club_id?: string
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          age_max: number | null
          age_min: number | null
          club_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          status: Database["public"]["Enums"]["program_status"]
          sub_program_id: string | null
          updated_at: string | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          club_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          status?: Database["public"]["Enums"]["program_status"]
          sub_program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          club_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          status?: Database["public"]["Enums"]["program_status"]
          sub_program_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_sub_program_id_fkey"
            columns: ["sub_program_id"]
            isOneToOne: false
            referencedRelation: "sub_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_invitations: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          household_id: string
          id: string
          invited_by_user_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          household_id: string
          id?: string
          invited_by_user_id: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by_user_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_invitations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_guardians: {
        Row: {
          club_id: string | null
          created_at: string | null
          household_id: string
          id: string
          is_primary: boolean | null
          user_id: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string | null
          household_id: string
          id?: string
          is_primary?: boolean | null
          user_id: string
        }
        Update: {
          club_id?: string | null
          created_at?: string | null
          household_id?: string
          id?: string
          is_primary?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_guardians_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_guardians_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          club_id: string
          created_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          phone: string | null
          primary_email: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          club_id: string
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          phone?: string | null
          primary_email?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          club_id?: string
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          phone?: string | null
          primary_email?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "households_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      message_recipients: {
        Row: {
          created_at: string | null
          id: string
          message_id: string | null
          read_at: string | null
          recipient_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          club_id: string
          created_at: string | null
          group_id: string | null
          id: string
          program_id: string | null
          season_id: string | null
          sender_id: string | null
          sent_at: string | null
          sub_program_id: string | null
          subject: string
        }
        Insert: {
          body: string
          club_id: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          program_id?: string | null
          season_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
          sub_program_id?: string | null
          subject: string
        }
        Update: {
          body?: string
          club_id?: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          program_id?: string | null
          season_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
          sub_program_id?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sub_program_id_fkey"
            columns: ["sub_program_id"]
            isOneToOne: false
            referencedRelation: "sub_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          order_id: string
          registration_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          id?: string
          order_id: string
          registration_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          order_id?: string
          registration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          club_id: string
          created_at: string | null
          household_id: string
          id: string
          season_id: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          household_id: string
          id?: string
          season_id?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          household_id?: string
          id?: string
          season_id?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          method: string | null
          order_id: string
          processed_at: string | null
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          method?: string | null
          order_id: string
          processed_at?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          method?: string | null
          order_id?: string
          processed_at?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          club_id: string
          created_at: string | null
          email: string
          email_verified_at: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          phone_number: string | null
          phone_verified_at: string | null
          preferred_notification_method: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          club_id: string
          created_at?: string | null
          email: string
          email_verified_at?: string | null
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          preferred_notification_method?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          club_id?: string
          created_at?: string | null
          email?: string
          email_verified_at?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          preferred_notification_method?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          club_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          season_id: string
          status: Database["public"]["Enums"]["program_status"]
          updated_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          season_id: string
          status?: Database["public"]["Enums"]["program_status"]
          updated_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          season_id?: string
          status?: Database["public"]["Enums"]["program_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      race_registrations: {
        Row: {
          athlete_id: string | null
          bib_number: string | null
          club_id: string
          created_at: string | null
          id: string
          race_id: string | null
          status: string | null
          updated_at: string | null
          zone4_registration_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          bib_number?: string | null
          club_id: string
          created_at?: string | null
          id?: string
          race_id?: string | null
          status?: string | null
          updated_at?: string | null
          zone4_registration_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          bib_number?: string | null
          club_id?: string
          created_at?: string | null
          id?: string
          race_id?: string | null
          status?: string | null
          updated_at?: string | null
          zone4_registration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "race_registrations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_waiver_status"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "race_registrations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_registrations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_registrations_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      race_results: {
        Row: {
          athlete_id: string | null
          club_id: string
          created_at: string | null
          external_result_id: string | null
          id: string
          points: number | null
          position: number | null
          race_id: string | null
          source: string | null
          time: string | null
          updated_at: string | null
        }
        Insert: {
          athlete_id?: string | null
          club_id: string
          created_at?: string | null
          external_result_id?: string | null
          id?: string
          points?: number | null
          position?: number | null
          race_id?: string | null
          source?: string | null
          time?: string | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string | null
          club_id?: string
          created_at?: string | null
          external_result_id?: string | null
          id?: string
          points?: number | null
          position?: number | null
          race_id?: string | null
          source?: string | null
          time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "race_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_waiver_status"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "race_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_results_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_results_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      races: {
        Row: {
          club_id: string
          created_at: string | null
          description: string | null
          discipline: string | null
          id: string
          location: string | null
          name: string
          race_date: string
          registration_deadline: string | null
          season_id: string | null
          updated_at: string | null
          zone4_race_id: string | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          description?: string | null
          discipline?: string | null
          id?: string
          location?: string | null
          name: string
          race_date: string
          registration_deadline?: string | null
          season_id?: string | null
          updated_at?: string | null
          zone4_race_id?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          description?: string | null
          discipline?: string | null
          id?: string
          location?: string | null
          name?: string
          race_date?: string
          registration_deadline?: string | null
          season_id?: string | null
          updated_at?: string | null
          zone4_race_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "races_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "races_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          expires_at: string
          id: string
          identifier: string
          metadata: Json | null
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          action: string
          created_at?: string
          expires_at: string
          id?: string
          identifier: string
          metadata?: Json | null
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          action?: string
          created_at?: string
          expires_at?: string
          id?: string
          identifier?: string
          metadata?: Json | null
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          amount_paid: number | null
          athlete_id: string | null
          club_id: string
          created_at: string | null
          deleted_at: string | null
          group_id: string | null
          id: string
          payment_status: string | null
          registration_date: string | null
          season: string
          season_id: string
          status: string
          sub_program_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          athlete_id?: string | null
          club_id: string
          created_at?: string | null
          deleted_at?: string | null
          group_id?: string | null
          id?: string
          payment_status?: string | null
          registration_date?: string | null
          season: string
          season_id: string
          status?: string
          sub_program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          athlete_id?: string | null
          club_id?: string
          created_at?: string | null
          deleted_at?: string | null
          group_id?: string | null
          id?: string
          payment_status?: string | null
          registration_date?: string | null
          season?: string
          season_id?: string
          status?: string
          sub_program_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_waiver_status"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "registrations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_sub_program_id_fkey"
            columns: ["sub_program_id"]
            isOneToOne: false
            referencedRelation: "sub_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          club_id: string
          created_at: string | null
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_data: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          club_id: string | null
          created_at: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          expires_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          state: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          club_id?: string | null
          created_at?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          expires_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          state?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          club_id?: string | null
          created_at?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          expires_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          state?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_data_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_programs: {
        Row: {
          club_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_capacity: number | null
          name: string
          program_id: string | null
          registration_fee: number | null
          season_end: string | null
          season_id: string | null
          season_start: string | null
          status: Database["public"]["Enums"]["program_status"]
          updated_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_capacity?: number | null
          name: string
          program_id?: string | null
          registration_fee?: number | null
          season_end?: string | null
          season_id?: string | null
          season_start?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          updated_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_capacity?: number | null
          name?: string
          program_id?: string | null
          registration_fee?: number | null
          season_end?: string | null
          season_id?: string | null
          season_start?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_programs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_programs_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      used_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          jti: string
          token_type: string
          used_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          jti: string
          token_type: string
          used_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          jti?: string
          token_type?: string
          used_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_2fa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          enabled: boolean | null
          id: string
          method: string | null
          phone_number: string | null
          phone_verified_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          method?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          method?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          attempts: number | null
          code: string
          contact: string
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          max_attempts: number | null
          type: string
          user_agent: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          code: string
          contact: string
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          max_attempts?: number | null
          type: string
          user_agent?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          code?: string
          contact?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          max_attempts?: number | null
          type?: string
          user_agent?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      waiver_signatures: {
        Row: {
          athlete_id: string
          guardian_id: string
          id: string
          ip_address: unknown
          signed_at: string | null
          signed_name: string
          user_agent: string | null
          waiver_id: string
        }
        Insert: {
          athlete_id: string
          guardian_id: string
          id?: string
          ip_address?: unknown
          signed_at?: string | null
          signed_name: string
          user_agent?: string | null
          waiver_id: string
        }
        Update: {
          athlete_id?: string
          guardian_id?: string
          id?: string
          ip_address?: unknown
          signed_at?: string | null
          signed_name?: string
          user_agent?: string | null
          waiver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiver_signatures_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_waiver_status"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "waiver_signatures_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_waiver_id_fkey"
            columns: ["waiver_id"]
            isOneToOne: false
            referencedRelation: "athlete_waiver_status"
            referencedColumns: ["waiver_id"]
          },
          {
            foreignKeyName: "waiver_signatures_waiver_id_fkey"
            columns: ["waiver_id"]
            isOneToOne: false
            referencedRelation: "waivers"
            referencedColumns: ["id"]
          },
        ]
      }
      waivers: {
        Row: {
          body: string
          club_id: string
          created_at: string | null
          created_by: string | null
          id: string
          required: boolean | null
          season_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          body: string
          club_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          required?: boolean | null
          season_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          club_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          required?: boolean | null
          season_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waivers_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          processed: boolean | null
          processed_at: string | null
          stripe_event_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          stripe_event_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          stripe_event_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      athlete_waiver_status: {
        Row: {
          athlete_id: string | null
          first_name: string | null
          household_id: string | null
          last_name: string | null
          required: boolean | null
          signed_at: string | null
          signed_name: string | null
          status: string | null
          waiver_id: string | null
          waiver_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_last_24h: {
        Row: {
          avg_value: number | null
          count: number | null
          last_recorded: string | null
          max_value: number | null
          metric_name: string | null
          min_value: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit:
        | {
            Args: {
              p_action: string
              p_identifier: string
              p_max_requests: number
              p_window: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_action: string
              p_identifier: string
              p_max_requests: number
              p_window_minutes: number
            }
            Returns: Json
          }
      check_verification_status: {
        Args: { p_user_id: string }
        Returns: {
          email_verified: boolean
          needs_email_verification: boolean
          needs_phone_verification: boolean
          phone_verified: boolean
        }[]
      }
      check_waivers_batch: {
        Args: { p_athlete_ids: string[]; p_season_id: string }
        Returns: {
          athlete_id: string
          has_signed_all_required: boolean
        }[]
      }
      cleanup_expired_rate_limits: { Args: never; Returns: undefined }
      cleanup_expired_tokens: { Args: never; Returns: undefined }
      cleanup_expired_verification_codes: { Args: never; Returns: number }
      cleanup_old_metrics: { Args: never; Returns: number }
      cleanup_orphaned_records: {
        Args: never
        Returns: {
          cleanup_type: string
          records_deleted: number
        }[]
      }
      create_athlete_for_parent: {
        Args: {
          p_club_id: string
          p_date_of_birth?: string
          p_first_name: string
          p_gender?: string
          p_household_id: string
          p_last_name: string
          p_user_id: string
        }
        Returns: string
      }
      create_parent_with_household: {
        Args: {
          p_athlete_count?: number
          p_club_id: string
          p_email: string
          p_first_name: string
          p_last_name: string
        }
        Returns: {
          athlete_ids: string[]
          household_id: string
          parent_id: string
        }[]
      }
      create_user_profile: {
        Args: {
          p_club_id: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_waiver_for_admin: {
        Args: {
          p_body: string
          p_club_id: string
          p_required?: boolean
          p_season_id: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      get_athlete_gender_counts: {
        Args: never
        Returns: {
          count: number
          gender: string
        }[]
      }
      get_athlete_summary: {
        Args: {
          p_club_id: string
          p_gender?: string
          p_program_id?: string
          p_season_id: string
        }
        Returns: {
          new_athletes: number
          returning_athletes: number
          total_athletes: number
          unique_households: number
        }[]
      }
      get_athletes_by_age: {
        Args: {
          p_club_id: string
          p_gender?: string
          p_program_id?: string
          p_season_id: string
        }
        Returns: {
          age_group: string
          count: number
        }[]
      }
      get_athletes_by_gender: {
        Args: { p_club_id: string; p_program_id?: string; p_season_id: string }
        Returns: {
          count: number
          gender: string
        }[]
      }
      get_athletes_by_program: {
        Args: {
          p_club_id: string
          p_gender?: string
          p_program_id?: string
          p_season_id: string
        }
        Returns: {
          athlete_count: number
          program_id: string
          program_name: string
        }[]
      }
      get_club_athlete_counts: {
        Args: never
        Returns: {
          athlete_count: number
          club_id: string
        }[]
      }
      get_data_statistics: {
        Args: never
        Returns: {
          category: string
          count: number
          metric: string
        }[]
      }
      get_household_club_id: {
        Args: { p_household_id: string }
        Returns: string
      }
      get_household_guardian_count: {
        Args: { p_household_id: string }
        Returns: number
      }
      get_payment_status_counts: {
        Args: { p_since: string }
        Returns: {
          count: number
          payment_status: string
        }[]
      }
      get_program_sport_counts: {
        Args: never
        Returns: {
          count: number
          sport: string
        }[]
      }
      get_registration_revenue_summary: {
        Args: { p_since: string }
        Returns: {
          paid_count: number
          total_count: number
          total_revenue: number
        }[]
      }
      has_signed_required_waivers:
        | { Args: { p_athlete_id: string }; Returns: boolean }
        | {
            Args: { p_athlete_id: string; p_season_id: string }
            Returns: boolean
          }
      is_admin_for_club: { Args: { p_club_id: string }; Returns: boolean }
      is_user_guardian_in_any_household: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_user_guardian_in_household: {
        Args: { p_household_id: string; p_user_id: string }
        Returns: boolean
      }
      restore_group: { Args: { group_id: string }; Returns: undefined }
      restore_program: { Args: { program_id: string }; Returns: undefined }
      restore_sub_program: {
        Args: { sub_program_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_group: { Args: { group_id: string }; Returns: undefined }
      soft_delete_program: { Args: { program_id: string }; Returns: undefined }
      soft_delete_sub_program: {
        Args: { sub_program_id: string }
        Returns: undefined
      }
      store_signup_data: {
        Args: {
          p_address_line1: string
          p_address_line2: string
          p_city: string
          p_club_id: string
          p_email: string
          p_emergency_contact_name: string
          p_emergency_contact_phone: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_state: string
          p_user_id: string
          p_zip_code: string
        }
        Returns: undefined
      }
      update_waiver_for_admin: {
        Args: {
          p_body: string
          p_required: boolean
          p_title: string
          p_user_id: string
          p_waiver_id: string
        }
        Returns: string
      }
      validate_data_integrity: {
        Args: never
        Returns: {
          check_name: string
          description: string
          issue_count: number
          severity: string
        }[]
      }
      validate_otp_code: {
        Args: {
          p_code: string
          p_contact: string
          p_type: string
          p_user_id: string
        }
        Returns: {
          attempts_remaining: number
          message: string
          success: boolean
        }[]
      }
    }
    Enums: {
      program_status: "ACTIVE" | "INACTIVE" | "DELETED"
      user_role: "admin" | "coach" | "family" | "parent" | "system_admin"
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
      program_status: ["ACTIVE", "INACTIVE", "DELETED"],
      user_role: ["admin", "coach", "family", "parent", "system_admin"],
    },
  },
} as const
