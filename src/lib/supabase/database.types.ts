export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      buildings: {
        Row: {
          id: string
          name: string
          code: string
          floor_count: number
          address: string | null
          description: string | null
          photo_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          floor_count?: number
          address?: string | null
          description?: string | null
          photo_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          floor_count?: number
          address?: string | null
          description?: string | null
          photo_url?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          room_code: string | null
          building_id: string | null
          floor_number: number | null
          capacity: number | null
          description: string | null
          photo_url: string | null
          door_photo_url: string | null
          is_active: boolean
          is_for_rent: boolean
          current_condition: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          room_code?: string | null
          building_id?: string | null
          floor_number?: number | null
          capacity?: number | null
          description?: string | null
          photo_url?: string | null
          door_photo_url?: string | null
          is_active?: boolean
          is_for_rent?: boolean
          current_condition?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          room_code?: string | null
          building_id?: string | null
          floor_number?: number | null
          capacity?: number | null
          description?: string | null
          photo_url?: string | null
          door_photo_url?: string | null
          is_active?: boolean
          is_for_rent?: boolean
          current_condition?: string
          created_at?: string
          updated_at?: string
        }
      }
      room_rates: {
        Row: {
          id: string
          room_id: string
          usage_category: string
          rate_per_hour: number | null
          rate_per_day: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          usage_category: string
          rate_per_hour?: number | null
          rate_per_day?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          usage_category?: string
          rate_per_hour?: number | null
          rate_per_day?: number
          created_at?: string
          updated_at?: string
        }
      }
      equipment: {
        Row: {
          id: string
          name: string
          equipment_code: string | null
          description: string | null
          merk: string | null
          model: string | null
          serial_number: string | null
          category: string | null
          current_condition: string
          ketersediaan: string
          status_tindakan: string
          rate_per_hour: number | null
          rate_per_day: number | null
          sumber: string | null
          tgl_terakhir_cek: string | null
          is_active: boolean
          photo_url: string | null
          current_location: string | null
          building_id: string | null
          floor: number | null
          storage_room_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          equipment_code?: string | null
          description?: string | null
          merk?: string | null
          model?: string | null
          serial_number?: string | null
          category?: string | null
          current_condition?: string
          ketersediaan?: string
          status_tindakan?: string
          rate_per_hour?: number | null
          rate_per_day?: number | null
          sumber?: string | null
          tgl_terakhir_cek?: string | null
          is_active?: boolean
          photo_url?: string | null
          current_location?: string | null
          building_id?: string | null
          floor?: number | null
          storage_room_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          equipment_code?: string | null
          description?: string | null
          merk?: string | null
          model?: string | null
          serial_number?: string | null
          category?: string | null
          current_condition?: string
          ketersediaan?: string
          status_tindakan?: string
          rate_per_hour?: number | null
          rate_per_day?: number | null
          sumber?: string | null
          tgl_terakhir_cek?: string | null
          is_active?: boolean
          photo_url?: string | null
          current_location?: string | null
          building_id?: string | null
          floor?: number | null
          storage_room_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      equipment_rates: {
        Row: {
          id: string
          equipment_id: string
          user_category: string
          rate_per_day: number
          rate_per_hour: number | null
          requires_supervision: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          equipment_id: string
          user_category: string
          rate_per_day?: number
          rate_per_hour?: number | null
          requires_supervision?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          equipment_id?: string
          user_category?: string
          rate_per_day?: number
          rate_per_hour?: number | null
          requires_supervision?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: string
          phone: string | null
          borrower_category: string | null
          institution: string | null
          class_division: string | null
          identity_number: string | null
          telegram_username: string | null
          photo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: string
          phone?: string | null
          borrower_category?: string | null
          institution?: string | null
          class_division?: string | null
          identity_number?: string | null
          telegram_username?: string | null
          photo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: string
          phone?: string | null
          borrower_category?: string | null
          institution?: string | null
          class_division?: string | null
          identity_number?: string | null
          telegram_username?: string | null
          photo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      institution_profile: {
        Row: {
          id: string
          name: string
          short_name: string | null
          logo_url: string | null
          address: string | null
          phone: string | null
          email: string | null
          website: string | null
          description: string | null
          operating_hours: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          short_name?: string | null
          logo_url?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          description?: string | null
          operating_hours?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          short_name?: string | null
          logo_url?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          description?: string | null
          operating_hours?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          reference_no: string
          user_id: string
          status: string
          purpose: string
          start_datetime: string
          end_datetime: string
          total_amount: number
          snapshot_rate: Json
          extension_count: number
          admin_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reference_no: string
          user_id: string
          status?: string
          purpose: string
          start_datetime: string
          end_datetime: string
          total_amount?: number
          snapshot_rate?: Json
          extension_count?: number
          admin_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reference_no?: string
          user_id?: string
          status?: string
          purpose?: string
          start_datetime?: string
          end_datetime?: string
          total_amount?: number
          snapshot_rate?: Json
          extension_count?: number
          admin_notes?: string | null
          created_at?: string
        }
      }
      booking_items: {
        Row: {
          id: string
          booking_id: string
          item_type: string
          room_id: string | null
          equipment_id: string | null
          start_datetime: string | null
          end_datetime: string | null
          quantity: number
          rate_per_day: number | null
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          item_type: string
          room_id?: string | null
          equipment_id?: string | null
          start_datetime?: string | null
          end_datetime?: string | null
          quantity?: number
          rate_per_day?: number | null
          total_price?: number
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          item_type?: string
          room_id?: string | null
          equipment_id?: string | null
          start_datetime?: string | null
          end_datetime?: string | null
          quantity?: number
          rate_per_day?: number | null
          total_price?: number
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          status: string
          payment_method: string | null
          payment_code: string | null
          paid_at: string | null
          verified_by: string | null
          verification_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          amount: number
          status?: string
          payment_method?: string | null
          payment_code?: string | null
          paid_at?: string | null
          verified_by?: string | null
          verification_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          amount?: number
          status?: string
          payment_method?: string | null
          payment_code?: string | null
          paid_at?: string | null
          verified_by?: string | null
          verification_notes?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          type: string
          title: string
          message: string
          data: Json | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          title: string
          message: string
          data?: Json | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          title?: string
          message?: string
          data?: Json | null
          is_read?: boolean
          created_at?: string
        }
      }
      returns: {
        Row: {
          id: string
          booking_id: string
          returned_by: string | null
          returned_at: string
          condition_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          returned_by?: string | null
          returned_at?: string
          condition_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          returned_by?: string | null
          returned_at?: string
          condition_notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      equipment_with_rates: {
        Row: {
          id: string
          name: string
          equipment_code: string | null
          description: string | null
          merk: string | null
          model: string | null
          serial_number: string | null
          category: string | null
          current_condition: string
          ketersediaan: string
          status_tindakan: string
          rate_per_hour: number | null
          rate_per_day: number | null
          sumber: string | null
          tgl_terakhir_cek: string | null
          is_active: boolean
          photo_url: string | null
          current_location: string | null
          building_id: string | null
          floor: number | null
          storage_room_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          rates: Json | null
        }
      }
    }
    Functions: {
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_admin_or_staff: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      asset_condition: 'good' | 'needs_repair' | 'damaged' | 'lost'
      availability_status: 'tersedia' | 'digunakan' | 'hilang' | 'tidak_tersedia'
      action_status: 'normal' | 'perawatan' | 'menunggu_part' | 'afkir'
      booking_status: 'pending' | 'approved' | 'rejected' | 'paid' | 'active' | 'completed' | 'cancelled'
      user_role: 'super_admin' | 'admin' | 'staff' | 'borrower'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
