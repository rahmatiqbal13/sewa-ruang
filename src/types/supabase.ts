export type UserRole = 'admin' | 'staff' | 'borrower'
export type AssetCategory = 'room' | 'equipment'
export type AssetCondition = 'good' | 'needs_repair' | 'damaged' | 'lost'
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'completed' | 'cancelled'
export type PaymentMethod = 'online' | 'manual_cash' | 'manual_transfer'
export type PaymentStatus = 'pending' | 'paid' | 'failed'
export type ReturnCondition = 'good' | 'minor_damage' | 'major_damage' | 'lost'
export type InventoryCondition = 'good' | 'needs_repair' | 'damaged'
export type NotificationChannel = 'email' | 'whatsapp' | 'telegram'
export type TrackingActionType = 'scan_public' | 'update_condition' | 'update_location' | 'marked_returned'
export type WaitlistStatus = 'waiting' | 'notified' | 'converted' | 'expired' | 'cancelled'
export type ExtensionStatus = 'pending' | 'approved' | 'rejected'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: UserRole
          phone: string | null
          telegram_username: string | null
          identity_number: string | null
          institution: string
          class_division: string
          email_verified_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
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
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['buildings']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['buildings']['Insert']>
      }
      assets: {
        Row: {
          id: string
          name: string
          category: AssetCategory
          building_id: string | null
          floor_number: number | null
          room_sequence: number | null
          room_code: string | null
          description: string | null
          capacity: number | null
          rate_per_hour: number | null
          rate_per_day: number | null
          is_active: boolean
          operating_hours: Record<string, unknown> | null
          current_condition: AssetCondition
          current_location: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['assets']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['assets']['Insert']>
      }
      bookings: {
        Row: {
          id: string
          reference_no: string
          user_id: string
          status: BookingStatus
          purpose: string
          start_datetime: string
          end_datetime: string
          total_amount: number
          snapshot_rate: Record<string, unknown>
          extension_count: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'reference_no' | 'created_at'>
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
      booking_assets: {
        Row: { id: string; booking_id: string; asset_id: string }
        Insert: Omit<Database['public']['Tables']['booking_assets']['Row'], 'id'>
        Update: never
      }
      booking_agreements: {
        Row: {
          id: string
          booking_id: string
          template_version_id: string
          agreed_at: string
          agreed_by: string
          agreement_pdf_url: string | null
        }
        Insert: Omit<Database['public']['Tables']['booking_agreements']['Row'], 'id'>
        Update: never
      }
      booking_extensions: {
        Row: {
          id: string
          booking_id: string
          requested_duration_minutes: number
          status: ExtensionStatus
          approved_by: string | null
          approved_at: string | null
          new_end_datetime: string | null
          additional_amount: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['booking_extensions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['booking_extensions']['Insert']>
      }
      booking_waitlists: {
        Row: {
          id: string
          asset_id: string
          desired_date: string
          desired_start_time: string
          desired_end_time: string
          user_id: string
          queue_position: number
          status: WaitlistStatus
          notified_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['booking_waitlists']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['booking_waitlists']['Insert']>
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          method: PaymentMethod
          amount: number
          status: PaymentStatus
          gateway_ref: string | null
          paid_at: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      returns: {
        Row: {
          id: string
          booking_id: string
          returned_at: string
          condition: ReturnCondition
          notes: string | null
          recorded_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['returns']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['returns']['Insert']>
      }
      room_inventory_items: {
        Row: {
          id: string
          room_asset_id: string
          name: string
          quantity: number
          condition: InventoryCondition
          inventory_code: string | null
          notes: string | null
          is_active: boolean
          last_updated_by: string | null
          last_updated_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['room_inventory_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['room_inventory_items']['Insert']>
      }
      asset_tracking_logs: {
        Row: {
          id: string
          entity_type: 'asset' | 'inventory_item'
          entity_id: string
          scanned_by: string | null
          action_type: TrackingActionType
          changes: Record<string, unknown>
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['asset_tracking_logs']['Row'], 'id' | 'created_at'>
        Update: never
      }
      schedule_blocks: {
        Row: {
          id: string
          asset_id: string
          start_datetime: string
          end_datetime: string
          reason: string
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['schedule_blocks']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['schedule_blocks']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          is_read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Pick<Database['public']['Tables']['notifications']['Row'], 'is_read'>
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          channel: NotificationChannel
          event_type: string
          is_enabled: boolean
        }
        Insert: Omit<Database['public']['Tables']['notification_preferences']['Row'], 'id'>
        Update: Pick<Database['public']['Tables']['notification_preferences']['Row'], 'is_enabled'>
      }
      agreement_templates: {
        Row: {
          id: string
          version: number
          title: string
          body_html: string
          created_by: string
          created_at: string
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['agreement_templates']['Row'], 'id' | 'version' | 'created_at'>
        Update: Pick<Database['public']['Tables']['agreement_templates']['Row'], 'is_active'>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
