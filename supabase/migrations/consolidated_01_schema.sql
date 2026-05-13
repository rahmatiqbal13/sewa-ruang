-- ============================================================
-- SCHEMA KONSOLIDASI — Tables, Types, Indexes, RLS Policies
-- Menggabungkan 30 migration files menjadi state final
-- Terakhir diperbarui: 2025-05-17
-- ============================================================
-- PENTING: Jalankan file ini SETELAH schema dasar Supabase terbentuk.
-- File ini hanya menambahkan kolom, tabel baru, dan RLS di atas schema dasar.
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- HELPER FUNCTIONS (harus ada sebelum RLS policies)
-- ============================================================

-- Ambil role dari JWT claims
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  role TEXT;
BEGIN
  role := current_setting('request.jwt.claims', true)::json->>'role';
  RETURN COALESCE(role, 'anon');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('super_admin', 'admin')
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('super_admin', 'admin', 'staff')
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- USERS TABLE — kolom tambahan + RLS final
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS borrower_category TEXT DEFAULT 'mahasiswa',
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS class_division TEXT,
  ADD COLUMN IF NOT EXISTS identity_number TEXT,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS plain_password TEXT;

ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'borrower';

-- RLS final: enabled, non-recursive (mencegah infinite recursion / 500 error)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- ============================================================
-- BUILDINGS RLS
-- ============================================================

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_buildings" ON public.buildings;
DROP POLICY IF EXISTS "public_read_buildings" ON public.buildings;
CREATE POLICY "admin_manage_buildings" ON public.buildings
  FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "public_read_buildings" ON public.buildings
  FOR SELECT USING (true);

-- ============================================================
-- ROOMS RLS
-- ============================================================

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_rooms" ON public.rooms;
DROP POLICY IF EXISTS "public_read_rooms" ON public.rooms;
CREATE POLICY "admin_manage_rooms" ON public.rooms
  FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "public_read_rooms" ON public.rooms
  FOR SELECT USING (true);

-- ============================================================
-- AGREEMENT TEMPLATES RLS
-- ============================================================

ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_templates" ON public.agreement_templates;
CREATE POLICY "admin_manage_templates" ON public.agreement_templates
  FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- ============================================================
-- EQUIPMENT TABLE — kolom tambahan + RLS
-- ============================================================

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id),
  ADD COLUMN IF NOT EXISTS floor INTEGER;

CREATE INDEX IF NOT EXISTS idx_equipment_building ON public.equipment(building_id);
CREATE INDEX IF NOT EXISTS idx_equipment_floor ON public.equipment(floor);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_equipment" ON public.equipment;
DROP POLICY IF EXISTS "public_read_equipment" ON public.equipment;
CREATE POLICY "admin_manage_equipment" ON public.equipment
  FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "public_read_equipment" ON public.equipment
  FOR SELECT USING (true);

-- ============================================================
-- EQUIPMENT RATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.equipment_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  user_category TEXT NOT NULL,
  rate_per_day NUMERIC(12,2) NOT NULL DEFAULT 0,
  rate_per_hour NUMERIC(12,2),
  requires_supervision BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(equipment_id, user_category)
);

CREATE INDEX IF NOT EXISTS idx_equipment_rates_equipment_id ON public.equipment_rates(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rates_user_category ON public.equipment_rates(user_category);

ALTER TABLE public.equipment_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipment_rates_select" ON public.equipment_rates;
DROP POLICY IF EXISTS "equipment_rates_admin" ON public.equipment_rates;
DROP POLICY IF EXISTS "admins_manage_equipment_rates" ON public.equipment_rates;
DROP POLICY IF EXISTS "authenticated_read_equipment_rates" ON public.equipment_rates;

CREATE POLICY "equipment_rates_select" ON public.equipment_rates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "equipment_rates_admin" ON public.equipment_rates
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role IN ('admin', 'staff', 'super_admin')
  ));

GRANT ALL ON public.equipment_rates TO service_role;
GRANT SELECT ON public.equipment_rates TO authenticated;

-- View: equipment beserta semua ratenya
CREATE OR REPLACE VIEW public.equipment_with_rates AS
SELECT
  e.*,
  jsonb_agg(
    jsonb_build_object(
      'user_category', er.user_category,
      'rate_per_day', er.rate_per_day,
      'rate_per_hour', er.rate_per_hour,
      'requires_supervision', er.requires_supervision
    )
  ) FILTER (WHERE er.id IS NOT NULL) AS rates
FROM public.equipment e
LEFT JOIN public.equipment_rates er ON er.equipment_id = e.id
GROUP BY e.id;

-- ============================================================
-- ROOM RATES RLS
-- ============================================================

ALTER TABLE public.room_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "room_rates_select_all" ON public.room_rates;
DROP POLICY IF EXISTS "room_rates_insert_admin" ON public.room_rates;
DROP POLICY IF EXISTS "room_rates_update_admin" ON public.room_rates;
DROP POLICY IF EXISTS "room_rates_delete_admin" ON public.room_rates;
CREATE POLICY "room_rates_select_all" ON public.room_rates
  FOR SELECT USING (true);
CREATE POLICY "room_rates_insert_admin" ON public.room_rates
  FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "room_rates_update_admin" ON public.room_rates
  FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "room_rates_delete_admin" ON public.room_rates
  FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'super_admin'));

-- ============================================================
-- ROOM INVENTORY RLS
-- ============================================================

ALTER TABLE public.room_inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_items_public_read" ON public.room_inventory_items;
DROP POLICY IF EXISTS "inventory_items_admin_manage" ON public.room_inventory_items;
DROP POLICY IF EXISTS "inventory_items_staff_manage" ON public.room_inventory_items;
CREATE POLICY "inventory_items_public_read" ON public.room_inventory_items
  FOR SELECT USING (true);
CREATE POLICY "inventory_items_admin_manage" ON public.room_inventory_items
  FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "inventory_items_staff_manage" ON public.room_inventory_items
  FOR ALL TO authenticated USING (public.is_admin_or_staff());

ALTER TABLE public.room_inventory_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_images_public_read_new" ON public.room_inventory_images;
DROP POLICY IF EXISTS "inventory_images_admin_manage" ON public.room_inventory_images;
DROP POLICY IF EXISTS "inventory_images_staff_manage" ON public.room_inventory_images;
CREATE POLICY "inventory_images_public_read_new" ON public.room_inventory_images
  FOR SELECT USING (true);
CREATE POLICY "inventory_images_admin_manage" ON public.room_inventory_images
  FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "inventory_images_staff_manage" ON public.room_inventory_images
  FOR ALL TO authenticated USING (public.is_admin_or_staff());

-- ============================================================
-- INSTITUTION PROFILE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.institution_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Sport Center UNESA',
  short_name TEXT DEFAULT 'SC UNESA',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  description TEXT,
  operating_hours TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.institution_profile DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.institution_profile TO authenticated;
GRANT ALL ON public.institution_profile TO anon;
GRANT ALL ON public.institution_profile TO service_role;

-- ============================================================
-- BOOKING STATUS ENUM — nilai tambahan
-- ============================================================

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_uploaded';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_rejected';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'active';

-- ============================================================
-- BOOKINGS TABLE — kolom tambahan
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS borrower_name TEXT,
  ADD COLUMN IF NOT EXISTS borrower_email TEXT,
  ADD COLUMN IF NOT EXISTS borrower_phone TEXT,
  ADD COLUMN IF NOT EXISTS borrower_institution TEXT,
  ADD COLUMN IF NOT EXISTS borrower_class TEXT,
  ADD COLUMN IF NOT EXISTS member_type TEXT,
  ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS actual_end_datetime TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_qr_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_verified_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_bank VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_payment_code
  ON public.bookings(payment_code) WHERE payment_code IS NOT NULL;

-- ============================================================
-- BOOKING ITEMS RLS
-- ============================================================

ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "booking_items_read" ON public.booking_items;
DROP POLICY IF EXISTS "booking_items_insert" ON public.booking_items;
DROP POLICY IF EXISTS "admin_manage_booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "booking_items_select" ON public.booking_items;
DROP POLICY IF EXISTS "booking_items_insert_own" ON public.booking_items;
DROP POLICY IF EXISTS "booking_items_admin" ON public.booking_items;

CREATE POLICY "booking_items_select" ON public.booking_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_items.booking_id
    AND (b.user_id = auth.uid() OR b.user_id IN (
      SELECT id FROM public.users WHERE role IN ('admin', 'staff', 'super_admin')
    ))
  ));

CREATE POLICY "booking_items_insert_own" ON public.booking_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_items.booking_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "booking_items_admin" ON public.booking_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role IN ('admin', 'staff', 'super_admin')
  ));

GRANT ALL ON public.booking_items TO service_role;

-- ============================================================
-- BOOKING EARLY RETURNS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_early_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  planned_end_datetime TIMESTAMPTZ NOT NULL,
  actual_end_datetime TIMESTAMPTZ NOT NULL,
  refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  processed_by UUID REFERENCES public.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (actual_end_datetime < planned_end_datetime)
);

CREATE INDEX IF NOT EXISTS idx_early_returns_booking_id ON public.booking_early_returns(booking_id);
CREATE INDEX IF NOT EXISTS idx_early_returns_status ON public.booking_early_returns(status);

ALTER TABLE public.booking_early_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "early_returns_select_admin" ON public.booking_early_returns;
DROP POLICY IF EXISTS "early_returns_insert_admin" ON public.booking_early_returns;
DROP POLICY IF EXISTS "early_returns_update_admin" ON public.booking_early_returns;
CREATE POLICY "early_returns_select_admin" ON public.booking_early_returns
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'staff')
  ));
CREATE POLICY "early_returns_insert_admin" ON public.booking_early_returns
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));
CREATE POLICY "early_returns_update_admin" ON public.booking_early_returns
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- ============================================================
-- RETURNS TABLE — kolom tambahan + RLS
-- ============================================================

ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS is_early_return BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "returns_select_all" ON public.returns;
DROP POLICY IF EXISTS "returns_insert_admin" ON public.returns;
DROP POLICY IF EXISTS "returns_update_admin" ON public.returns;
CREATE POLICY "returns_select_all" ON public.returns
  FOR SELECT USING (true);
CREATE POLICY "returns_insert_admin" ON public.returns
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));
CREATE POLICY "returns_update_admin" ON public.returns
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- ============================================================
-- BOOKING REMINDERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('before_start', 'after_start', 'before_end', 'after_end', 'custom')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'telegram', 'sms')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking ON public.booking_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_status ON public.booking_reminders(status);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_scheduled ON public.booking_reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_type ON public.booking_reminders(reminder_type);

ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_reminders" ON public.booking_reminders;
DROP POLICY IF EXISTS "user_view_own_reminders" ON public.booking_reminders;
CREATE POLICY "admin_manage_reminders" ON public.booking_reminders
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')
  ));
CREATE POLICY "user_view_own_reminders" ON public.booking_reminders
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_reminders.booking_id AND b.user_id = auth.uid()
  ));

GRANT ALL ON public.booking_reminders TO authenticated;
GRANT ALL ON public.booking_reminders TO service_role;

-- ============================================================
-- PAYMENT PROOFS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  proof_url TEXT NOT NULL,
  bank_name VARCHAR(50),
  account_name VARCHAR(100),
  transfer_amount DECIMAL(12,2),
  transfer_date DATE,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  verified_by UUID REFERENCES public.users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_booking ON public.payment_proofs(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON public.payment_proofs(status);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can insert own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Only admins can update payment proofs" ON public.payment_proofs;
CREATE POLICY "Users can view own payment proofs" ON public.payment_proofs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = payment_proofs.booking_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin'))
  );
CREATE POLICY "Users can insert own payment proofs" ON public.payment_proofs
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = payment_proofs.booking_id AND b.user_id = auth.uid()
  ));
CREATE POLICY "Only admins can update payment proofs" ON public.payment_proofs
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')
  ));

GRANT ALL ON public.payment_proofs TO authenticated;
GRANT ALL ON public.payment_proofs TO anon;

-- ============================================================
-- BANK ACCOUNTS TABLE (termasuk kolom VA)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name VARCHAR(50) NOT NULL,
  bank_code VARCHAR(10),
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  branch VARCHAR(100),
  qr_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  category VARCHAR(20) DEFAULT 'general',
  payment_method_type VARCHAR(20) DEFAULT 'transfer',
  virtual_account_number VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON public.bank_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_category ON public.bank_accounts(category) WHERE is_active = true;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bank accounts are viewable by everyone" ON public.bank_accounts;
DROP POLICY IF EXISTS "Only admins can manage bank accounts" ON public.bank_accounts;
CREATE POLICY "Bank accounts are viewable by everyone" ON public.bank_accounts
  FOR SELECT TO authenticated, anon USING (is_active = true);
CREATE POLICY "Only admins can manage bank accounts" ON public.bank_accounts
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')
  ));

GRANT ALL ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO anon;

-- ============================================================
-- ACTIVITY LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_table ON public.activity_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_record ON public.activity_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_performed_by ON public.activity_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_activity_logs_performed_at ON public.activity_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_view_activity_logs" ON public.activity_logs;
CREATE POLICY "admin_view_activity_logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')
  ));

GRANT SELECT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

-- ============================================================
-- AVATAR STORAGE BUCKET & POLICIES (final state)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

CREATE POLICY "Users can upload their own avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Avatars are publicly accessible" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

SELECT 'Schema consolidated successfully!' AS status;
