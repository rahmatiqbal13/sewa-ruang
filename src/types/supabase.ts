export type UserRole = 'admin' | 'staff' | 'borrower' | 'super_admin'
export type AssetCategory = 'room' | 'equipment'
export type AssetCondition = 'good' | 'needs_repair' | 'damaged' | 'lost'
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'completed' | 'cancelled' | 'pending_payment' | 'payment_uploaded' | 'payment_rejected' | 'active'
export type PaymentMethod = 'online' | 'manual_cash' | 'manual_transfer' | 'refund'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled'
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
        Relationships: []
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
        Relationships: []
        Insert: Omit<Database['public']['Tables']['buildings']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['buildings']['Insert']>
      }
      rooms: {
        Row: {
          id: string
          name: string
          room_code: string
          building_id: string
          floor: number
          capacity: number
          room_type: string
          base_price: number
          current_condition: string
          is_active: boolean
          is_for_rent: boolean
          photo_url: string | null
          description: string | null
          facilities: string[] | null
          created_at: string
          updated_at: string
        }
        Relationships: []
        Insert: Omit<Database['public']['Tables']['rooms']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>
      }
      equipment: {
        Row: {
          id: string
          name: string
          equipment_code: string
          category: string
          merk: string | null
          description: string | null
          current_condition: string
          ketersediaan: string
          status_tindakan: string
          storage_room_id: string | null
          current_location: string | null
          sumber: string | null
          is_active: boolean
          photo_url: string | null
          tgl_terakhir_cek: string | null
          created_at: string
        }
        Relationships: []
        Insert: Omit<Database['public']['Tables']['equipment']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['equipment']['Insert']>
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
        Relationships: [
          {
            foreignKeyName: 'equipment_rates_equipment_id_fkey'
            columns: ['equipment_id']
            isOneToOne: false
            referencedRelation: 'equipment'
            referencedColumns: ['id']
          }
        ]
        Insert: Omit<Database['public']['Tables']['equipment_rates']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['equipment_rates']['Insert']>
      }
      room_inventories: {
        Row: {
          id: string
          name: string
          inventory_code: string
          category: string
          room_id: string
          quantity: number
          condition: string
          is_active: boolean
          notes: string | null
          last_updated_at: string
          created_at: string
        }
        Relationships: []
        Insert: Omit<Database['public']['Tables']['room_inventories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['room_inventories']['Insert']>
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
        Relationships: []
        Insert: Omit<Database['public']['Tables']['assets']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['assets']['Insert']>
      }
      bookings: {
        Row: {
          id: string
          reference_no: string
          payment_code: string | null
          user_id: string
          status: BookingStatus
          purpose: string
          start_datetime: string
          end_datetime: string
          actual_end_datetime: string | null
          total_amount: number
          snapshot_rate: Record<string, unknown>
          extension_count: number
          admin_notes: string | null
          created_at: string
        }
        Relationships: []
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'reference_no' | 'created_at'>
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
      booking_assets: {
        Row: { id: string; booking_id: string; asset_id: string }
        Relationships: []
        Insert: Omit<Database['public']['Tables']['booking_assets']['Row'], 'id'>
        Update: never
      }
      booking_items: {
        Row: {
          id: string
          booking_id: string
          item_type: 'room' | 'equipment'
          room_id: string | null
          equipment_id: string | null
          quantity: number
          rate_per_hour: number | null
          rate_per_day: number | null
          created_at: string
        }
        Relationships: []
        Insert: Omit<Database['public']['Tables']['booking_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['booking_items']['Insert']>
      }
      booking_early_returns: {
        Row: {
          id: string
          booking_id: string
          planned_end_datetime: string
          actual_end_datetime: string
          refund_amount: number
          notes: string | null
          status: 'pending' | 'refund_pending' | 'completed' | 'cancelled'
          created_at: string
        }
        Relationships: []
        Insert: Omit<Database['public']['Tables']['booking_early_returns']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['booking_early_returns']['Insert']>
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          is_early_return: boolean
          refund_amount: number | null
          photo_url: string | null
          created_at: string
        }
        Relationships: []
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
          photo_url: string | null
          is_active: boolean
          last_updated_by: string | null
          last_updated_at: string
          created_at: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
        Insert: Omit<Database['public']['Tables']['agreement_templates']['Row'], 'id' | 'version' | 'created_at'>
        Update: Pick<Database['public']['Tables']['agreement_templates']['Row'], 'is_active'>
      }
      equipment_checks: {
        Row: {
          id: string
          equipment_id: string
          condition: string
          notes: string | null
          checked_by_name: string | null
          checked_at: string
          created_at: string
        }
        Relationships: []
        Insert: Omit<Database['public']['Tables']['equipment_checks']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['equipment_checks']['Insert']>
      }
      equipment_booking_slots: {
        Row: {
          id: string
          equipment_id: string
          booking_id: string
          slot: string
          quantity: number
          status: string
          created_at: string
        }
        Relationships: []
        Insert: Omit<Database['public']['Tables']['equipment_booking_slots']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['equipment_booking_slots']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
