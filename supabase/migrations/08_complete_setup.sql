-- ============================================================
-- COMPLETE SETUP: Create all tables from scratch (safe)
-- ============================================================
-- This script creates ALL tables needed for the app if they don't exist.
-- Safe to run on empty or partially-set-up databases.
-- Uses IF NOT EXISTS everywhere to avoid errors.
-- ============================================================

-- ===== 0. EXTENSIONS =====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===== 1. BUILDINGS =====
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  floor_count INTEGER NOT NULL DEFAULT 1,
  address TEXT,
  description TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 2. USERS (minimal — Supabase Auth creates auth.users, we add public.users profile) =====
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'borrower',
  phone TEXT,
  borrower_category TEXT DEFAULT 'umum',
  institution TEXT,
  class_division TEXT,
  identity_number TEXT,
  telegram_username TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 3. ROOMS =====
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  room_code TEXT,
  building_id UUID REFERENCES public.buildings(id),
  floor_number INTEGER,
  capacity INTEGER,
  description TEXT,
  photo_url TEXT,
  door_photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_for_rent BOOLEAN NOT NULL DEFAULT true,
  current_condition TEXT NOT NULL DEFAULT 'good',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 4. EQUIPMENT =====
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  equipment_code TEXT UNIQUE,
  description TEXT,
  merk TEXT,
  model TEXT,
  serial_number TEXT,
  category TEXT,
  current_condition TEXT NOT NULL DEFAULT 'good',
  ketersediaan TEXT NOT NULL DEFAULT 'tersedia',
  status_tindakan TEXT NOT NULL DEFAULT 'normal',
  rate_per_hour NUMERIC(12,2),
  rate_per_day NUMERIC(12,2),
  sumber TEXT,
  tgl_terakhir_cek DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  photo_url TEXT,
  current_location TEXT,
  building_id UUID REFERENCES public.buildings(id),
  floor INTEGER,
  storage_room_id UUID REFERENCES public.rooms(id),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 5. EQUIPMENT_IMAGES =====
CREATE TABLE IF NOT EXISTS public.equipment_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 6. EQUIPMENT_RATES =====
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

-- ===== 7. ROOM_RATES =====
CREATE TABLE IF NOT EXISTS public.room_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  usage_category TEXT NOT NULL,
  rate_per_hour NUMERIC(12,2),
  rate_per_day NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, usage_category)
);

-- ===== 8. INSTITUTION_PROFILE =====
CREATE TABLE IF NOT EXISTS public.institution_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  description TEXT,
  operating_hours TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_buildings_active ON public.buildings(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_building ON public.rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON public.rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_equipment_name ON public.equipment(name);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON public.equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_building ON public.equipment(building_id);
CREATE INDEX IF NOT EXISTS idx_equipment_ketersediaan ON public.equipment(ketersediaan);
CREATE INDEX IF NOT EXISTS idx_equipment_condition ON public.equipment(current_condition);
CREATE INDEX IF NOT EXISTS idx_equipment_rates_equipment_id ON public.equipment_rates(equipment_id);

-- ===== RLS POLICIES =====
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "public_read_buildings" ON public.buildings;
DROP POLICY IF EXISTS "public_read_rooms" ON public.rooms;
DROP POLICY IF EXISTS "public_read_equipment" ON public.equipment;
DROP POLICY IF EXISTS "admin_manage_equipment" ON public.equipment;
DROP POLICY IF EXISTS "equipment_rates_select" ON public.equipment_rates;
DROP POLICY IF EXISTS "equipment_rates_admin" ON public.equipment_rates;
DROP POLICY IF EXISTS "room_rates_select_all" ON public.room_rates;
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;

-- Recreate policies
CREATE POLICY "public_read_buildings" ON public.buildings FOR SELECT USING (true);
CREATE POLICY "public_read_rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "public_read_equipment" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "admin_manage_equipment" ON public.equipment
  FOR ALL USING (COALESCE(current_setting('request.jwt.claims', true)::json->>'role', '') IN ('admin', 'super_admin'));
CREATE POLICY "equipment_rates_select" ON public.equipment_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_rates_admin" ON public.equipment_rates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'staff', 'super_admin')));
CREATE POLICY "room_rates_select_all" ON public.room_rates FOR SELECT USING (true);
CREATE POLICY "users_select_authenticated" ON public.users FOR SELECT TO authenticated USING (true);

-- ===== CATEGORY CHECK CONSTRAINT =====
-- Clean up any invalid categories first
UPDATE public.equipment
SET category = 'lainnya'
WHERE category IS NOT NULL
  AND category NOT IN ('elektronik','mebel','transportasi','alat_tes_pengukuran','alat_gym','perlengkapan','lainnya');

-- Drop old constraint if exists
ALTER TABLE public.equipment DROP CONSTRAINT IF EXISTS equipment_category_check;

-- Add new constraint
ALTER TABLE public.equipment
  ADD CONSTRAINT equipment_category_check
  CHECK (category IS NULL OR category IN (
    'elektronik','mebel','transportasi','alat_tes_pengukuran','alat_gym','perlengkapan','lainnya'
  ));

COMMENT ON COLUMN public.equipment.category IS
  'Kategori alat: elektronik, mebel, transportasi, alat_tes_pengukuran, alat_gym, perlengkapan, lainnya';

-- ===== VIEW: equipment_with_rates =====
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

-- ===== VERIFY =====
SELECT 'All tables created successfully!' AS status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('buildings','rooms','users','equipment','equipment_rates','room_rates','institution_profile') ORDER BY tablename;
