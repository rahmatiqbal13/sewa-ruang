-- ============================================================
-- SEWA RUANG & ALAT - Database Schema V2
-- Struktur Terpisah: Rooms, Equipment, Room Inventories
-- ============================================================

-- ============================================================
-- DROP OLD POLICIES & FUNCTIONS (CLEAN UP FROM V1)
-- ============================================================

-- Drop all old policies that depend on helper functions
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admin_manage_users" ON public.users;
DROP POLICY IF EXISTS "super_admin_all_users" ON public.users;
DROP POLICY IF EXISTS "buildings_public_read" ON public.buildings;
DROP POLICY IF EXISTS "admin_manage_buildings" ON public.buildings;
DROP POLICY IF EXISTS "assets_public_read" ON public.assets;
DROP POLICY IF EXISTS "admin_manage_assets" ON public.assets;
DROP POLICY IF EXISTS "asset_images_public_read" ON public.asset_images;
DROP POLICY IF EXISTS "admin_manage_asset_images" ON public.asset_images;
DROP POLICY IF EXISTS "bookings_own_read" ON public.bookings;
DROP POLICY IF EXISTS "bookings_own_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_own_update" ON public.bookings;
DROP POLICY IF EXISTS "admin_delete_bookings" ON public.bookings;
DROP POLICY IF EXISTS "booking_assets_read" ON public.booking_assets;
DROP POLICY IF EXISTS "booking_assets_insert" ON public.booking_assets;
DROP POLICY IF EXISTS "booking_slots_read" ON public.booking_slots;
DROP POLICY IF EXISTS "booking_slots_insert" ON public.booking_slots;
DROP POLICY IF EXISTS "booking_slots_delete" ON public.booking_slots;
DROP POLICY IF EXISTS "booking_agreements_read" ON public.booking_agreements;
DROP POLICY IF EXISTS "booking_agreements_insert" ON public.booking_agreements;
DROP POLICY IF EXISTS "payments_own_read" ON public.payments;
DROP POLICY IF EXISTS "admin_manage_payments" ON public.payments;
DROP POLICY IF EXISTS "returns_read" ON public.returns;
DROP POLICY IF EXISTS "admin_manage_returns" ON public.returns;
DROP POLICY IF EXISTS "return_images_read" ON public.return_images;
DROP POLICY IF EXISTS "admin_manage_return_images" ON public.return_images;
DROP POLICY IF EXISTS "schedule_blocks_public_read" ON public.schedule_blocks;
DROP POLICY IF EXISTS "admin_manage_schedule_blocks" ON public.schedule_blocks;
DROP POLICY IF EXISTS "inventory_public_read" ON public.room_inventory_items;
DROP POLICY IF EXISTS "admin_staff_manage_inventory" ON public.room_inventory_items;
DROP POLICY IF EXISTS "inventory_images_public_read" ON public.room_inventory_images;
DROP POLICY IF EXISTS "admin_staff_manage_inventory_images" ON public.room_inventory_images;
DROP POLICY IF EXISTS "tracking_logs_read" ON public.asset_tracking_logs;
DROP POLICY IF EXISTS "tracking_logs_insert" ON public.asset_tracking_logs;
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_prefs_own" ON public.notification_preferences;
DROP POLICY IF EXISTS "admin_manage_channel_configs" ON public.notification_channel_configs;
DROP POLICY IF EXISTS "staff_read_channel_configs" ON public.notification_channel_configs;
DROP POLICY IF EXISTS "admin_manage_templates" ON public.notification_templates;
DROP POLICY IF EXISTS "staff_read_templates" ON public.notification_templates;
DROP POLICY IF EXISTS "agreement_templates_public_read" ON public.agreement_templates;
DROP POLICY IF EXISTS "admin_manage_agreement_templates" ON public.agreement_templates;
DROP POLICY IF EXISTS "extensions_own_read" ON public.booking_extensions;
DROP POLICY IF EXISTS "extensions_own_insert" ON public.booking_extensions;
DROP POLICY IF EXISTS "admin_manage_extensions" ON public.booking_extensions;
DROP POLICY IF EXISTS "waitlists_own" ON public.booking_waitlists;

-- Drop policies that depend on helper functions (must drop before functions)
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
DROP POLICY IF EXISTS "admin_manage_channel_configs" ON public.notification_channel_configs;
DROP POLICY IF EXISTS "admin_manage_templates" ON public.notification_templates;
DROP POLICY IF EXISTS "admin_manage_templates" ON public.agreement_templates;

-- Drop old helper functions
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_admin_or_staff();

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================
-- ENUM TYPES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff', 'borrower');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_condition AS ENUM ('good', 'needs_repair', 'damaged', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'paid', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('online', 'manual_cash', 'manual_transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE return_condition AS ENUM ('good', 'minor_damage', 'major_damage', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inventory_condition AS ENUM ('good', 'needs_repair', 'damaged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE availability_status AS ENUM ('tersedia', 'digunakan', 'hilang', 'tidak_tersedia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE availability_status ADD VALUE 'tidak_tersedia';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE action_status AS ENUM ('normal', 'perawatan', 'menunggu_part', 'afkir');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('email', 'whatsapp', 'telegram');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE 'super_admin';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tracking_action_type AS ENUM ('scan_public', 'update_condition', 'update_location', 'marked_returned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE waitlist_status AS ENUM ('waiting', 'notified', 'converted', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE extension_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'borrower',
  phone TEXT,
  telegram_username TEXT,
  identity_number TEXT,
  institution TEXT NOT NULL DEFAULT '',
  class_division TEXT NOT NULL DEFAULT '',
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BUILDINGS (Gedung)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{1,5}$'),
  floor_count INTEGER NOT NULL CHECK (floor_count >= 1 AND floor_count <= 99),
  address TEXT,
  description TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROOMS (Ruang untuk disewa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  building_id UUID NOT NULL REFERENCES public.buildings(id),
  floor_number INTEGER NOT NULL CHECK (floor_number >= 1),
  room_sequence INTEGER NOT NULL CHECK (room_sequence >= 1 AND room_sequence <= 99),
  room_code TEXT UNIQUE,
  description TEXT,
  capacity INTEGER,
  rate_per_hour NUMERIC(12,2),
  rate_per_day NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_for_rent BOOLEAN NOT NULL DEFAULT true,
  operating_hours JSONB DEFAULT '{"monday":{"open":"08:00","close":"17:00"},"tuesday":{"open":"08:00","close":"17:00"},"wednesday":{"open":"08:00","close":"17:00"},"thursday":{"open":"08:00","close":"17:00"},"friday":{"open":"08:00","close":"17:00"},"saturday":null,"sunday":null}'::jsonb,
  current_condition asset_condition NOT NULL DEFAULT 'good',
  photo_url TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.room_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EQUIPMENT (Alat/Peralatan untuk disewa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  equipment_code TEXT UNIQUE,
  description TEXT,
  merk TEXT,
  model TEXT,
  serial_number TEXT,
  category TEXT, -- 'elektronik', 'mebel', 'transportasi', 'alat_tes_pengukuran', 'alat_gym', 'perlengkapan', 'lainnya'
  current_condition asset_condition NOT NULL DEFAULT 'good',
  ketersediaan availability_status NOT NULL DEFAULT 'tersedia',
  status_tindakan action_status NOT NULL DEFAULT 'normal',
  rate_per_hour NUMERIC(12,2),
  rate_per_day NUMERIC(12,2),
  sumber TEXT,
  tgl_terakhir_cek DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  photo_url TEXT,
  current_location TEXT,
  -- Location hierarchy (all optional since room data may not be complete)
  building_id UUID REFERENCES public.buildings(id),
  floor INTEGER,
  storage_room_id UUID REFERENCES public.rooms(id),
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.equipment_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROOM INVENTORIES (Barang di dalam ruangan, TIDAK untuk disewa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_inventories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  condition inventory_condition NOT NULL DEFAULT 'good',
  inventory_code TEXT,
  category TEXT, -- 'furniture', 'elektronik', 'dekorasi', 'perlengkapan', 'lainnya'
  notes TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_updated_by UUID REFERENCES public.users(id),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, inventory_code)
);

CREATE TABLE IF NOT EXISTS public.room_inventory_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES public.room_inventories(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AGREEMENT TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agreement_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_no TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  status booking_status NOT NULL DEFAULT 'pending',
  purpose TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  snapshot_rate JSONB NOT NULL DEFAULT '{}',
  extension_count INTEGER NOT NULL DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_datetime CHECK (end_datetime > start_datetime)
);

-- Booking Items (bisa room atau equipment)
CREATE TABLE IF NOT EXISTS public.booking_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('room', 'equipment')),
  room_id UUID REFERENCES public.rooms(id),
  equipment_id UUID REFERENCES public.equipment(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_item_reference CHECK (
    (item_type = 'room' AND room_id IS NOT NULL AND equipment_id IS NULL) OR
    (item_type = 'equipment' AND equipment_id IS NOT NULL AND room_id IS NULL)
  )
);

-- Room Booking Slots (prevent double booking)
CREATE TABLE IF NOT EXISTS public.room_booking_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  slot TSTZRANGE NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  EXCLUDE USING gist (room_id WITH =, slot WITH &&)
    WHERE (status IN ('approved', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Equipment Booking Slots
CREATE TABLE IF NOT EXISTS public.equipment_booking_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  slot TSTZRANGE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking Agreements
CREATE TABLE IF NOT EXISTS public.booking_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  template_version_id UUID NOT NULL REFERENCES public.agreement_templates(id),
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  agreed_by UUID NOT NULL REFERENCES public.users(id),
  agreement_pdf_url TEXT
);

-- Booking Extensions
CREATE TABLE IF NOT EXISTS public.booking_extensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  requested_duration_minutes INTEGER NOT NULL,
  status extension_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  new_end_datetime TIMESTAMPTZ,
  additional_amount NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking Waitlists
CREATE TABLE IF NOT EXISTS public.booking_waitlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id),
  equipment_id UUID REFERENCES public.equipment(id),
  desired_date DATE NOT NULL,
  desired_start_time TIME NOT NULL,
  desired_end_time TIME NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id),
  queue_position INTEGER NOT NULL,
  status waitlist_status NOT NULL DEFAULT 'waiting',
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_waitlist_item CHECK (
    (room_id IS NOT NULL AND equipment_id IS NULL) OR
    (equipment_id IS NOT NULL AND room_id IS NULL)
  )
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  gateway_ref TEXT,
  paid_at TIMESTAMPTZ,
  recorded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RETURNS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  returned_at TIMESTAMPTZ NOT NULL,
  condition return_condition NOT NULL,
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.return_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  url TEXT NOT NULL
);

-- ============================================================
-- SCHEDULE BLOCKS (Maintenance)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_schedule_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_room_block_datetime CHECK (end_datetime > start_datetime)
);

CREATE TABLE IF NOT EXISTS public.equipment_schedule_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_equipment_block_datetime CHECK (end_datetime > start_datetime)
);

-- ============================================================
-- ASSET TRACKING LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.asset_tracking_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('room', 'equipment', 'room_inventory')),
  entity_id UUID NOT NULL,
  scanned_by UUID REFERENCES public.users(id),
  action_type tracking_action_type NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT,
  recipient TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  event_type TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, channel, event_type)
);

CREATE TABLE IF NOT EXISTS public.notification_channel_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel notification_channel NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  channel notification_channel NOT NULL,
  user_category TEXT NOT NULL DEFAULT 'default',
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id),
  UNIQUE(event_type, channel, user_category)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_rooms_building ON public.rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON public.rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_for_rent ON public.rooms(is_for_rent);
CREATE INDEX IF NOT EXISTS idx_equipment_active ON public.equipment(is_active);
CREATE INDEX IF NOT EXISTS idx_equipment_ketersediaan ON public.equipment(ketersediaan);
CREATE INDEX IF NOT EXISTS idx_equipment_storage ON public.equipment(storage_room_id);
CREATE INDEX IF NOT EXISTS idx_equipment_building ON public.equipment(building_id);
CREATE INDEX IF NOT EXISTS idx_equipment_floor ON public.equipment(floor);
CREATE INDEX IF NOT EXISTS idx_room_inventories_room ON public.room_inventories(room_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_room ON public.booking_items(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_items_equipment ON public.booking_items(equipment_id) WHERE equipment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_room_booking_slots_room ON public.room_booking_slots(room_id);
CREATE INDEX IF NOT EXISTS idx_equipment_booking_slots_equipment ON public.equipment_booking_slots(equipment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tracking_entity ON public.asset_tracking_logs(entity_type, entity_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_inventory_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_tracking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'));
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'staff'));
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Users
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "admin_manage_users" ON public.users FOR ALL USING (public.is_admin());

-- Buildings
CREATE POLICY "buildings_public_read" ON public.buildings FOR SELECT USING (true);
CREATE POLICY "admin_manage_buildings" ON public.buildings FOR ALL USING (public.is_admin());

-- Rooms
CREATE POLICY "rooms_public_read" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "admin_manage_rooms" ON public.rooms FOR ALL USING (public.is_admin());
CREATE POLICY "staff_read_rooms" ON public.rooms FOR SELECT USING (public.is_admin_or_staff());

-- Room Images
CREATE POLICY "room_images_public_read" ON public.room_images FOR SELECT USING (true);
CREATE POLICY "admin_manage_room_images" ON public.room_images FOR ALL USING (public.is_admin());

-- Equipment
CREATE POLICY "equipment_public_read" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "admin_manage_equipment" ON public.equipment FOR ALL USING (public.is_admin());
CREATE POLICY "staff_manage_equipment" ON public.equipment FOR ALL USING (public.is_admin_or_staff());

-- Equipment Images
CREATE POLICY "equipment_images_public_read" ON public.equipment_images FOR SELECT USING (true);
CREATE POLICY "admin_manage_equipment_images" ON public.equipment_images FOR ALL USING (public.is_admin());

-- Room Inventories
CREATE POLICY "room_inventories_public_read" ON public.room_inventories FOR SELECT USING (true);
CREATE POLICY "admin_staff_manage_room_inventories" ON public.room_inventories FOR ALL USING (public.is_admin_or_staff());

-- Room Inventory Images
CREATE POLICY "room_inventory_images_public_read" ON public.room_inventory_images FOR SELECT USING (true);
CREATE POLICY "admin_staff_manage_room_inventory_images" ON public.room_inventory_images FOR ALL USING (public.is_admin_or_staff());

-- Bookings
CREATE POLICY "bookings_own_read" ON public.bookings FOR SELECT USING (user_id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "bookings_own_insert" ON public.bookings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookings_own_update" ON public.bookings FOR UPDATE USING (user_id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "admin_delete_bookings" ON public.bookings FOR DELETE USING (public.is_admin());

-- Booking Items
CREATE POLICY "booking_items_read" ON public.booking_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.is_admin_or_staff()))
);
CREATE POLICY "booking_items_insert" ON public.booking_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
);
CREATE POLICY "admin_manage_booking_items" ON public.booking_items FOR ALL USING (public.is_admin_or_staff());

-- Booking Slots
CREATE POLICY "room_booking_slots_public_read" ON public.room_booking_slots FOR SELECT USING (true);
CREATE POLICY "admin_manage_room_booking_slots" ON public.room_booking_slots FOR ALL USING (public.is_admin_or_staff());
CREATE POLICY "equipment_booking_slots_public_read" ON public.equipment_booking_slots FOR SELECT USING (true);
CREATE POLICY "admin_manage_equipment_booking_slots" ON public.equipment_booking_slots FOR ALL USING (public.is_admin_or_staff());

-- Booking Agreements
CREATE POLICY "booking_agreements_read" ON public.booking_agreements FOR SELECT USING (
  agreed_by = auth.uid() OR public.is_admin_or_staff()
);
CREATE POLICY "booking_agreements_insert" ON public.booking_agreements FOR INSERT WITH CHECK (agreed_by = auth.uid());

-- Payments
CREATE POLICY "payments_own_read" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.is_admin_or_staff()))
);
CREATE POLICY "admin_manage_payments" ON public.payments FOR ALL USING (public.is_admin_or_staff());

-- Returns
CREATE POLICY "returns_read" ON public.returns FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.is_admin_or_staff()))
);
CREATE POLICY "admin_manage_returns" ON public.returns FOR ALL USING (public.is_admin_or_staff());

-- Return Images
CREATE POLICY "return_images_read" ON public.return_images FOR SELECT USING (true);
CREATE POLICY "admin_manage_return_images" ON public.return_images FOR ALL USING (public.is_admin_or_staff());

-- Schedule Blocks
CREATE POLICY "room_schedule_blocks_public_read" ON public.room_schedule_blocks FOR SELECT USING (true);
CREATE POLICY "admin_manage_room_schedule_blocks" ON public.room_schedule_blocks FOR ALL USING (public.is_admin());
CREATE POLICY "equipment_schedule_blocks_public_read" ON public.equipment_schedule_blocks FOR SELECT USING (true);
CREATE POLICY "admin_manage_equipment_schedule_blocks" ON public.equipment_schedule_blocks FOR ALL USING (public.is_admin());

-- Tracking Logs
CREATE POLICY "tracking_logs_read" ON public.asset_tracking_logs FOR SELECT USING (true);
CREATE POLICY "tracking_logs_insert" ON public.asset_tracking_logs FOR INSERT WITH CHECK (true);

-- Notifications
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (user_id = auth.uid() OR public.get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "notif_prefs_own" ON public.notification_preferences FOR ALL USING (user_id = auth.uid());
CREATE POLICY "admin_manage_channel_configs" ON public.notification_channel_configs FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "staff_read_channel_configs" ON public.notification_channel_configs FOR SELECT USING (public.is_admin_or_staff());
CREATE POLICY "admin_manage_templates" ON public.notification_templates FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "staff_read_templates" ON public.notification_templates FOR SELECT USING (public.is_admin_or_staff());

-- Agreement Templates
CREATE POLICY "agreement_templates_public_read" ON public.agreement_templates FOR SELECT USING (true);
CREATE POLICY "admin_manage_templates" ON public.agreement_templates FOR ALL USING (public.get_user_role() = 'admin');

-- Booking Extensions
CREATE POLICY "extensions_own_read" ON public.booking_extensions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.is_admin_or_staff()))
);
CREATE POLICY "extensions_own_insert" ON public.booking_extensions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
);
CREATE POLICY "admin_manage_extensions" ON public.booking_extensions FOR UPDATE USING (public.is_admin_or_staff());

-- Booking Waitlists
CREATE POLICY "waitlists_own" ON public.booking_waitlists FOR ALL USING (user_id = auth.uid() OR public.is_admin_or_staff());

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    name, 
    email, 
    role,
    phone,
    borrower_category,
    institution,
    class_division,
    identity_number,
    telegram_username
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'borrower'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'borrower_category',
    NEW.raw_user_meta_data->>'institution',
    NEW.raw_user_meta_data->>'class_division',
    NEW.raw_user_meta_data->>'identity_number',
    NEW.raw_user_meta_data->>'telegram_username'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate reference number
CREATE OR REPLACE FUNCTION public.generate_reference_no()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  seq_part TEXT;
  ref TEXT;
BEGIN
  date_part := to_char(now(), 'YYYYMMDD');
  SELECT LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  INTO seq_part
  FROM public.bookings
  WHERE reference_no LIKE 'SEWA-' || date_part || '-%';
  ref := 'SEWA-' || date_part || '-' || seq_part;
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Generate room code
CREATE OR REPLACE FUNCTION public.generate_room_code(
  p_building_code TEXT,
  p_floor_number INTEGER,
  p_room_sequence INTEGER
) RETURNS TEXT AS $$
BEGIN
  RETURN p_building_code || p_floor_number::TEXT || LPAD(p_room_sequence::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: auto set reference_no
CREATE OR REPLACE FUNCTION public.before_booking_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_no IS NULL OR NEW.reference_no = '' THEN
    NEW.reference_no := public.generate_reference_no();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_booking_reference ON public.bookings;
CREATE TRIGGER set_booking_reference
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.before_booking_insert();

-- Trigger: auto set room_code on room insert/update
CREATE OR REPLACE FUNCTION public.before_room_upsert()
RETURNS TRIGGER AS $$
DECLARE
  v_building_code TEXT;
BEGIN
  SELECT code INTO v_building_code FROM public.buildings WHERE id = NEW.building_id;
  IF v_building_code IS NOT NULL AND (NEW.room_code IS NULL OR NEW.room_code = '') THEN
    NEW.room_code := public.generate_room_code(v_building_code, NEW.floor_number, NEW.room_sequence);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_room_code ON public.rooms;
CREATE TRIGGER set_room_code
  BEFORE INSERT OR UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.before_room_upsert();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_updated_at ON public.equipment;
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_room_inventories_updated_at ON public.room_inventories;
CREATE TRIGGER update_room_inventories_updated_at
  BEFORE UPDATE ON public.room_inventories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- DEFAULT DATA
-- ============================================================
INSERT INTO public.agreement_templates (id, version, title, body_html, created_by, is_active)
SELECT
  uuid_generate_v4(),
  1,
  'Perjanjian Tanggung Jawab Peminjaman',
  '<h2>SURAT PERJANJIAN TANGGUNG JAWAB PEMINJAMAN</h2>
<p>Dengan menyetujui perjanjian ini, saya selaku peminjam menyatakan bahwa:</p>
<ol>
  <li>Saya bertanggung jawab penuh atas kondisi ruang dan/atau peralatan yang saya pinjam selama masa peminjaman.</li>
  <li>Saya wajib mengembalikan aset yang dipinjam tepat waktu sesuai jadwal yang telah disetujui.</li>
  <li>Saya wajib melaporkan setiap kerusakan atau kehilangan kepada pengelola sesegera mungkin.</li>
  <li>Saya bersedia menanggung biaya penggantian atau perbaikan apabila terjadi kerusakan atau kehilangan akibat kelalaian saya.</li>
  <li>Saya tidak akan menggunakan aset yang dipinjam untuk kegiatan yang melanggar hukum atau norma yang berlaku.</li>
  <li>Saya menyetujui bahwa persetujuan digital ini memiliki kekuatan hukum yang sama dengan tanda tangan fisik.</li>
</ol>',
  (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1),
  true
WHERE EXISTS (SELECT 1 FROM public.users WHERE role = 'admin')
  AND NOT EXISTS (SELECT 1 FROM public.agreement_templates WHERE is_active = true);

-- ============================================================
-- VIEWS
-- ============================================================

-- View untuk melihat semua item yang bisa dibooking
CREATE OR REPLACE VIEW public.bookable_items AS
SELECT 
  'room' as item_type,
  r.id,
  r.name,
  r.room_code as code,
  r.current_condition,
  r.is_active,
  r.rate_per_hour,
  r.rate_per_day,
  r.photo_url,
  b.name as building_name,
  r.capacity,
  NULL::text as merk,
  r.is_for_rent
FROM public.rooms r
JOIN public.buildings b ON b.id = r.building_id
WHERE r.is_active = true

UNION ALL

SELECT 
  'equipment' as item_type,
  e.id,
  e.name,
  e.equipment_code as code,
  e.current_condition,
  e.is_active,
  e.rate_per_hour,
  e.rate_per_day,
  e.photo_url,
  NULL as building_name,
  NULL as capacity,
  e.merk,
  true as is_for_rent
FROM public.equipment e
WHERE e.is_active = true;
