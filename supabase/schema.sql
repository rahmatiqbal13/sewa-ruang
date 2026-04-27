-- ============================================================
-- SEWA RUANG & ALAT - Database Schema
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/omxfvkknhgnniimkfbvj/sql
-- ============================================================

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
  CREATE TYPE asset_category AS ENUM ('room', 'equipment');
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
  CREATE TYPE availability_status AS ENUM ('tersedia', 'digunakan', 'hilang');
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
-- USERS (extends Supabase auth.users)
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
-- BUILDINGS
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
-- ASSETS (rooms and equipment)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category asset_category NOT NULL,
  building_id UUID REFERENCES public.buildings(id),
  floor_number INTEGER CHECK (floor_number >= 1),
  room_sequence INTEGER CHECK (room_sequence >= 1 AND room_sequence <= 99),
  room_code TEXT UNIQUE,
  description TEXT,
  capacity INTEGER,
  rate_per_hour NUMERIC(12,2),
  rate_per_day NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  operating_hours JSONB,
  current_condition asset_condition NOT NULL DEFAULT 'good',
  current_location TEXT,
  merk TEXT,
  ketersediaan availability_status NOT NULL DEFAULT 'tersedia',
  status_tindakan action_status NOT NULL DEFAULT 'normal',
  sumber TEXT,
  tgl_terakhir_cek DATE,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT room_requires_building CHECK (
    category != 'room' OR (building_id IS NOT NULL AND floor_number IS NOT NULL AND room_sequence IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.asset_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
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

CREATE TABLE IF NOT EXISTS public.booking_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  UNIQUE(booking_id, asset_id)
);

-- Prevent double-booking at database level
CREATE TABLE IF NOT EXISTS public.booking_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  slot TSTZRANGE NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  EXCLUDE USING gist (asset_id WITH =, slot WITH &&)
    WHERE (status IN ('approved', 'paid'))
);

CREATE TABLE IF NOT EXISTS public.booking_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  template_version_id UUID NOT NULL REFERENCES public.agreement_templates(id),
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  agreed_by UUID NOT NULL REFERENCES public.users(id),
  agreement_pdf_url TEXT
);

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

CREATE TABLE IF NOT EXISTS public.booking_waitlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  desired_date DATE NOT NULL,
  desired_start_time TIME NOT NULL,
  desired_end_time TIME NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id),
  queue_position INTEGER NOT NULL,
  status waitlist_status NOT NULL DEFAULT 'waiting',
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(asset_id, desired_date, desired_start_time, desired_end_time, user_id)
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
-- SCHEDULE BLOCKS (maintenance)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_block_datetime CHECK (end_datetime > start_datetime)
);

-- ============================================================
-- ROOM INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  condition inventory_condition NOT NULL DEFAULT 'good',
  inventory_code TEXT,
  notes TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_updated_by UUID REFERENCES public.users(id),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_asset_id, inventory_code)
);

CREATE TABLE IF NOT EXISTS public.room_inventory_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES public.room_inventory_items(id) ON DELETE CASCADE,
  url TEXT NOT NULL
);

-- ============================================================
-- ASSET TRACKING LOGS (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.asset_tracking_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('asset', 'inventory_item')),
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
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
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
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id),
  UNIQUE(event_type, channel)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_assets_building ON public.assets(building_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_booking_assets_booking ON public.booking_assets(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_assets_asset ON public.booking_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tracking_entity ON public.asset_tracking_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_inventory_room ON public.room_inventory_items(room_asset_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_inventory_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_tracking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if admin or above (includes super_admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'));
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if admin or staff (includes super_admin)
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'staff'));
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USERS policies
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "admin_manage_users" ON public.users FOR ALL USING (public.is_admin());
CREATE POLICY "super_admin_all_users" ON public.users FOR ALL USING (public.is_super_admin());

-- BUILDINGS policies
CREATE POLICY "buildings_public_read" ON public.buildings FOR SELECT USING (true);
CREATE POLICY "admin_manage_buildings" ON public.buildings FOR ALL USING (public.get_user_role() = 'admin');

-- ASSETS policies
CREATE POLICY "assets_public_read" ON public.assets FOR SELECT USING (true);
CREATE POLICY "admin_manage_assets" ON public.assets FOR ALL USING (public.get_user_role() = 'admin');

-- ASSET IMAGES policies
CREATE POLICY "asset_images_public_read" ON public.asset_images FOR SELECT USING (true);
CREATE POLICY "admin_manage_asset_images" ON public.asset_images FOR ALL USING (public.get_user_role() = 'admin');

-- BOOKINGS policies
CREATE POLICY "bookings_own_read" ON public.bookings FOR SELECT USING (user_id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "bookings_own_insert" ON public.bookings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookings_own_update" ON public.bookings FOR UPDATE USING (user_id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "admin_delete_bookings" ON public.bookings FOR DELETE USING (public.get_user_role() = 'admin');

-- BOOKING ASSETS policies
CREATE POLICY "booking_assets_read" ON public.booking_assets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.is_admin_or_staff()))
);
CREATE POLICY "booking_assets_insert" ON public.booking_assets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
);

-- BOOKING SLOTS
CREATE POLICY "booking_slots_read" ON public.booking_slots FOR SELECT USING (true);
CREATE POLICY "booking_slots_insert" ON public.booking_slots FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
);
CREATE POLICY "booking_slots_delete" ON public.booking_slots FOR DELETE USING (public.is_admin_or_staff());

-- BOOKING AGREEMENTS
CREATE POLICY "booking_agreements_read" ON public.booking_agreements FOR SELECT USING (
  agreed_by = auth.uid() OR public.is_admin_or_staff()
);
CREATE POLICY "booking_agreements_insert" ON public.booking_agreements FOR INSERT WITH CHECK (agreed_by = auth.uid());

-- PAYMENTS policies
CREATE POLICY "payments_own_read" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.is_admin_or_staff()))
);
CREATE POLICY "admin_manage_payments" ON public.payments FOR ALL USING (public.is_admin_or_staff());

-- RETURNS policies
CREATE POLICY "returns_read" ON public.returns FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.is_admin_or_staff()))
);
CREATE POLICY "admin_manage_returns" ON public.returns FOR ALL USING (public.is_admin_or_staff());

-- RETURN IMAGES
CREATE POLICY "return_images_read" ON public.return_images FOR SELECT USING (true);
CREATE POLICY "admin_manage_return_images" ON public.return_images FOR ALL USING (public.is_admin_or_staff());

-- SCHEDULE BLOCKS
CREATE POLICY "schedule_blocks_public_read" ON public.schedule_blocks FOR SELECT USING (true);
CREATE POLICY "admin_manage_schedule_blocks" ON public.schedule_blocks FOR ALL USING (public.get_user_role() = 'admin');

-- ROOM INVENTORY
CREATE POLICY "inventory_public_read" ON public.room_inventory_items FOR SELECT USING (true);
CREATE POLICY "admin_staff_manage_inventory" ON public.room_inventory_items FOR ALL USING (public.is_admin_or_staff());

-- ROOM INVENTORY IMAGES
CREATE POLICY "inventory_images_public_read" ON public.room_inventory_images FOR SELECT USING (true);
CREATE POLICY "admin_staff_manage_inventory_images" ON public.room_inventory_images FOR ALL USING (public.is_admin_or_staff());

-- ASSET TRACKING LOGS
CREATE POLICY "tracking_logs_read" ON public.asset_tracking_logs FOR SELECT USING (true);
CREATE POLICY "tracking_logs_insert" ON public.asset_tracking_logs FOR INSERT WITH CHECK (true);

-- NOTIFICATIONS
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (user_id = auth.uid() OR public.get_user_role() = 'admin');

-- NOTIFICATION PREFERENCES
CREATE POLICY "notif_prefs_own" ON public.notification_preferences FOR ALL USING (user_id = auth.uid());

-- NOTIFICATION CHANNEL CONFIGS (admin only)
CREATE POLICY "admin_manage_channel_configs" ON public.notification_channel_configs FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "staff_read_channel_configs" ON public.notification_channel_configs FOR SELECT USING (public.is_admin_or_staff());

-- NOTIFICATION TEMPLATES (admin only)
CREATE POLICY "admin_manage_templates" ON public.notification_templates FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "staff_read_templates" ON public.notification_templates FOR SELECT USING (public.is_admin_or_staff());

-- AGREEMENT TEMPLATES
CREATE POLICY "agreement_templates_public_read" ON public.agreement_templates FOR SELECT USING (true);
CREATE POLICY "admin_manage_templates" ON public.agreement_templates FOR ALL USING (public.get_user_role() = 'admin');

-- BOOKING EXTENSIONS
ALTER TABLE public.booking_extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "extensions_own_read" ON public.booking_extensions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.is_admin_or_staff()))
);
CREATE POLICY "extensions_own_insert" ON public.booking_extensions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
);
CREATE POLICY "admin_manage_extensions" ON public.booking_extensions FOR UPDATE USING (public.is_admin_or_staff());

-- BOOKING WAITLISTS
ALTER TABLE public.booking_waitlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waitlists_own" ON public.booking_waitlists FOR ALL USING (user_id = auth.uid() OR public.is_admin_or_staff());

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'borrower')
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

-- Trigger: auto set reference_no and room_code
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

-- Trigger: auto set room_code on asset insert/update
CREATE OR REPLACE FUNCTION public.before_asset_upsert()
RETURNS TRIGGER AS $$
DECLARE
  v_building_code TEXT;
BEGIN
  IF NEW.category = 'room' AND NEW.building_id IS NOT NULL AND NEW.floor_number IS NOT NULL AND NEW.room_sequence IS NOT NULL THEN
    SELECT code INTO v_building_code FROM public.buildings WHERE id = NEW.building_id;
    IF v_building_code IS NOT NULL AND (NEW.room_code IS NULL OR NEW.room_code = '') THEN
      NEW.room_code := public.generate_room_code(v_building_code, NEW.floor_number, NEW.room_sequence);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_asset_room_code ON public.assets;
CREATE TRIGGER set_asset_room_code
  BEFORE INSERT OR UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.before_asset_upsert();

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
