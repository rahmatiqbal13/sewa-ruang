-- ============================================================
-- MIGRASI: Pisahkan Assets menjadi Rooms, Equipment, dan Inventory
-- 
-- Tujuan:
-- 1. rooms = ruangan yang bisa disewa
-- 2. equipment = alat/peralatan yang bisa disewa  
-- 3. room_inventory_items = barang di dalam ruangan (tidak disewa)
-- ============================================================

-- ============================================================
-- STEP 1: Buat Tabel Rooms (Ruang untuk disewa)
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
  operating_hours JSONB,
  current_condition TEXT NOT NULL DEFAULT 'good' CHECK (current_condition IN ('good', 'needs_repair', 'damaged', 'lost')),
  photo_url TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger untuk auto-generate room_code
CREATE OR REPLACE FUNCTION public.generate_room_code_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_building_code TEXT;
BEGIN
  SELECT code INTO v_building_code FROM public.buildings WHERE id = NEW.building_id;
  IF v_building_code IS NOT NULL THEN
    NEW.room_code := v_building_code || NEW.floor_number::TEXT || LPAD(NEW.room_sequence::TEXT, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_room_code ON public.rooms;
CREATE TRIGGER set_room_code
  BEFORE INSERT OR UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.generate_room_code_v2();

-- ============================================================
-- STEP 2: Buat Tabel Equipment (Alat untuk disewa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  equipment_code TEXT UNIQUE,
  description TEXT,
  merk TEXT,
  model TEXT,
  serial_number TEXT,
  category TEXT, -- 'elektronik', 'mebel', 'transportasi', dll
  current_condition TEXT NOT NULL DEFAULT 'good' CHECK (current_condition IN ('good', 'needs_repair', 'damaged', 'lost')),
  ketersediaan TEXT NOT NULL DEFAULT 'tersedia' CHECK (ketersediaan IN ('tersedia', 'digunakan', 'hilang')),
  status_tindakan TEXT NOT NULL DEFAULT 'normal' CHECK (status_tindakan IN ('normal', 'perawatan', 'menunggu_part', 'afkir')),
  rate_per_hour NUMERIC(12,2),
  rate_per_day NUMERIC(12,2),
  sumber TEXT, -- asal perolehan
  tgl_terakhir_cek DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  photo_url TEXT,
  current_location TEXT, -- lokasi fisik saat ini
  storage_room_id UUID REFERENCES public.rooms(id), -- ruang penyimpanan
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- STEP 3: Update Tabel Room Inventory (referensi ke rooms baru)
-- ============================================================
-- Backup dulu data lama jika ada
-- ALTER TABLE public.room_inventory_items RENAME COLUMN room_asset_id TO room_id;
-- ALTER TABLE public.room_inventory_items 
--   DROP CONSTRAINT IF EXISTS room_inventory_items_room_asset_id_fkey,
--   ADD CONSTRAINT room_inventory_items_room_id_fkey 
--   FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;

-- Buat tabel baru untuk room_inventory dengan struktur yang lebih baik
CREATE TABLE IF NOT EXISTS public.room_inventories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'needs_repair', 'damaged')),
  inventory_code TEXT,
  category TEXT, -- 'furniture', 'elektronik', 'dekorasi', dll
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
-- STEP 4: Buat Tabel Images untuk Rooms dan Equipment
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.equipment_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- STEP 5: Update Booking System untuk mendukung Rooms dan Equipment
-- ============================================================

-- Tabel booking_items yang lebih fleksibel (bisa room atau equipment)
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

-- Index untuk booking_items
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_room ON public.booking_items(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_items_equipment ON public.booking_items(equipment_id) WHERE equipment_id IS NOT NULL;

-- Booking slots untuk rooms
CREATE TABLE IF NOT EXISTS public.room_booking_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  slot TSTZRANGE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'cancelled')),
  EXCLUDE USING gist (room_id WITH =, slot WITH &&)
    WHERE (status IN ('approved', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking slots untuk equipment
CREATE TABLE IF NOT EXISTS public.equipment_booking_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  slot TSTZRANGE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- STEP 6: Schedule Blocks untuk Rooms dan Equipment
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
-- STEP 7: Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_rooms_building ON public.rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON public.rooms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rooms_for_rent ON public.rooms(is_for_rent) WHERE is_for_rent = true;
CREATE INDEX IF NOT EXISTS idx_equipment_active ON public.equipment(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_equipment_ketersediaan ON public.equipment(ketersediaan);
CREATE INDEX IF NOT EXISTS idx_equipment_storage ON public.equipment(storage_room_id);
CREATE INDEX IF NOT EXISTS idx_room_inventories_room ON public.room_inventories(room_id);
CREATE INDEX IF NOT EXISTS idx_room_booking_slots_room ON public.room_booking_slots(room_id);
CREATE INDEX IF NOT EXISTS idx_equipment_booking_slots_equipment ON public.equipment_booking_slots(equipment_id);

-- ============================================================
-- STEP 8: Enable RLS
-- ============================================================
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_inventory_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_schedule_blocks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 9: RLS Policies
-- ============================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "rooms_public_read" ON public.rooms;
DROP POLICY IF EXISTS "admin_manage_rooms" ON public.rooms;
DROP POLICY IF EXISTS "staff_read_rooms" ON public.rooms;
DROP POLICY IF EXISTS "equipment_public_read" ON public.equipment;
DROP POLICY IF EXISTS "admin_manage_equipment" ON public.equipment;
DROP POLICY IF EXISTS "staff_manage_equipment" ON public.equipment;
DROP POLICY IF EXISTS "room_inventories_public_read" ON public.room_inventories;
DROP POLICY IF EXISTS "admin_staff_manage_room_inventories" ON public.room_inventories;
DROP POLICY IF EXISTS "room_images_public_read" ON public.room_images;
DROP POLICY IF EXISTS "admin_manage_room_images" ON public.room_images;
DROP POLICY IF EXISTS "equipment_images_public_read" ON public.equipment_images;
DROP POLICY IF EXISTS "admin_manage_equipment_images" ON public.equipment_images;
DROP POLICY IF EXISTS "booking_items_read" ON public.booking_items;
DROP POLICY IF EXISTS "booking_items_insert" ON public.booking_items;
DROP POLICY IF EXISTS "admin_manage_booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "room_booking_slots_public_read" ON public.room_booking_slots;
DROP POLICY IF EXISTS "admin_manage_room_booking_slots" ON public.room_booking_slots;
DROP POLICY IF EXISTS "equipment_booking_slots_public_read" ON public.equipment_booking_slots;
DROP POLICY IF EXISTS "admin_manage_equipment_booking_slots" ON public.equipment_booking_slots;
DROP POLICY IF EXISTS "room_schedule_blocks_public_read" ON public.room_schedule_blocks;
DROP POLICY IF EXISTS "admin_manage_room_schedule_blocks" ON public.room_schedule_blocks;
DROP POLICY IF EXISTS "equipment_schedule_blocks_public_read" ON public.equipment_schedule_blocks;
DROP POLICY IF EXISTS "admin_manage_equipment_schedule_blocks" ON public.equipment_schedule_blocks;

-- Rooms policies
CREATE POLICY "rooms_public_read" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "admin_manage_rooms" ON public.rooms FOR ALL USING (public.is_admin());
CREATE POLICY "staff_read_rooms" ON public.rooms FOR SELECT USING (public.is_admin_or_staff());

-- Equipment policies
CREATE POLICY "equipment_public_read" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "admin_manage_equipment" ON public.equipment FOR ALL USING (public.is_admin());
CREATE POLICY "staff_manage_equipment" ON public.equipment FOR ALL USING (public.is_admin_or_staff());

-- Room Inventories policies
CREATE POLICY "room_inventories_public_read" ON public.room_inventories FOR SELECT USING (true);
CREATE POLICY "admin_staff_manage_room_inventories" ON public.room_inventories FOR ALL USING (public.is_admin_or_staff());

-- Images policies
CREATE POLICY "room_images_public_read" ON public.room_images FOR SELECT USING (true);
CREATE POLICY "admin_manage_room_images" ON public.room_images FOR ALL USING (public.is_admin());
CREATE POLICY "equipment_images_public_read" ON public.equipment_images FOR SELECT USING (true);
CREATE POLICY "admin_manage_equipment_images" ON public.equipment_images FOR ALL USING (public.is_admin());

-- Booking items policies
CREATE POLICY "booking_items_read" ON public.booking_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.is_admin_or_staff()))
);
CREATE POLICY "booking_items_insert" ON public.booking_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
);
CREATE POLICY "admin_manage_booking_items" ON public.booking_items FOR ALL USING (public.is_admin_or_staff());

-- Booking slots policies
CREATE POLICY "room_booking_slots_public_read" ON public.room_booking_slots FOR SELECT USING (true);
CREATE POLICY "admin_manage_room_booking_slots" ON public.room_booking_slots FOR ALL USING (public.is_admin_or_staff());

CREATE POLICY "equipment_booking_slots_public_read" ON public.equipment_booking_slots FOR SELECT USING (true);
CREATE POLICY "admin_manage_equipment_booking_slots" ON public.equipment_booking_slots FOR ALL USING (public.is_admin_or_staff());

-- Schedule blocks policies
CREATE POLICY "room_schedule_blocks_public_read" ON public.room_schedule_blocks FOR SELECT USING (true);
CREATE POLICY "admin_manage_room_schedule_blocks" ON public.room_schedule_blocks FOR ALL USING (public.is_admin());

CREATE POLICY "equipment_schedule_blocks_public_read" ON public.equipment_schedule_blocks FOR SELECT USING (true);
CREATE POLICY "admin_manage_equipment_schedule_blocks" ON public.equipment_schedule_blocks FOR ALL USING (public.is_admin());

-- ============================================================
-- STEP 10: Migrasi Data dari Assets (Jika ada data lama)
-- ============================================================

-- Migrasi Rooms dari Assets (category = 'room')
INSERT INTO public.rooms (
  id, name, building_id, floor_number, room_sequence, room_code,
  description, capacity, rate_per_hour, rate_per_day, is_active,
  operating_hours, current_condition, photo_url, created_by, created_at
)
SELECT 
  id, name, building_id, floor_number, room_sequence, room_code,
  description, capacity, rate_per_hour, rate_per_day, is_active,
  operating_hours, current_condition::asset_condition, photo_url, 
  (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin') LIMIT 1),
  created_at
FROM public.assets
WHERE category = 'room'
ON CONFLICT (id) DO NOTHING;

-- Migrasi Equipment dari Assets (category = 'equipment')
INSERT INTO public.equipment (
  id, name, equipment_code, description, merk,
  current_condition, ketersediaan, status_tindakan,
  rate_per_hour, rate_per_day, sumber, tgl_terakhir_cek,
  is_active, photo_url, current_location, created_by, created_at
)
SELECT 
  id, name, room_code, description, merk,
  current_condition::asset_condition, ketersediaan::availability_status, status_tindakan::action_status,
  rate_per_hour, rate_per_day, sumber, tgl_terakhir_cek,
  is_active, photo_url, current_location,
  (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin') LIMIT 1),
  created_at
FROM public.assets
WHERE category = 'equipment'
ON CONFLICT (id) DO NOTHING;

-- Migrasi Asset Images
INSERT INTO public.room_images (room_id, url, display_order)
SELECT ai.asset_id, ai.url, ai.display_order
FROM public.asset_images ai
JOIN public.rooms r ON r.id = ai.asset_id;

INSERT INTO public.equipment_images (equipment_id, url, display_order)
SELECT ai.asset_id, ai.url, ai.display_order
FROM public.asset_images ai
JOIN public.equipment e ON e.id = ai.asset_id;

-- ============================================================
-- STEP 11: Functions untuk Update Timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_updated_at ON public.equipment;
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- STEP 12: Update Search Paths atau Views (Optional)
-- ============================================================

-- View untuk melihat semua item yang bisa dibooking
DROP VIEW IF EXISTS public.bookable_items;

CREATE VIEW public.bookable_items AS
SELECT 
  'room' as item_type,
  r.id,
  r.name,
  r.room_code as code,
  r.current_condition,
  r.is_active,
  r.is_for_rent,
  r.rate_per_hour,
  r.rate_per_day,
  r.photo_url,
  b.name as building_name,
  r.capacity,
  NULL::text as merk
FROM public.rooms r
JOIN public.buildings b ON b.id = r.building_id
WHERE r.is_active = true AND r.is_for_rent = true

UNION ALL

SELECT 
  'equipment' as item_type,
  e.id,
  e.name,
  e.equipment_code as code,
  e.current_condition,
  e.is_active,
  true as is_for_rent,
  e.rate_per_hour,
  e.rate_per_day,
  e.photo_url,
  NULL as building_name,
  NULL as capacity,
  e.merk
FROM public.equipment e
WHERE e.is_active = true;

-- ============================================================
-- SELESAI
-- ============================================================
