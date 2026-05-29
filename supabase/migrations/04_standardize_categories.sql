-- ============================================================
-- MIGRATION: Standardize categories & add event_type
-- ============================================================
-- Run this migration after deploying code changes that use
-- the new unified category system.
--
-- Changes:
-- 1. Add event_type column to bookings
-- 2. Migrate legacy borrower_category values → new 5-category system
-- 3. Migrate legacy member_type in snapshot_rate
-- 4. Migrate room_rates usage_category (dosen_karyawan → dosen)
-- ============================================================

-- 1. Add event_type column to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'lainnya';

-- Update existing bookings based on purpose (best-effort)
UPDATE public.bookings
SET event_type = 'perkuliahan'
WHERE purpose ILIKE '%perkuliahan%'
   OR purpose ILIKE '%kuliah%'
   OR purpose ILIKE '%mata kuliah%'
   OR purpose ILIKE '%kuliah semester%';

UPDATE public.bookings
SET event_type = 'penelitian'
WHERE purpose ILIKE '%penelitian%'
   OR purpose ILIKE '%penelitian%'
   OR purpose ILIKE '%ambil data%';

UPDATE public.bookings
SET event_type = 'event_mahasiswa'
WHERE purpose ILIKE '%event mahasiswa%'
   OR purpose ILIKE '%kegiatan mahasiswa%';

UPDATE public.bookings
SET event_type = 'event_umum'
WHERE purpose ILIKE '%event umum%'
   OR purpose ILIKE '%seminar%'
   OR purpose ILIKE '%workshop%';

-- Remaining nulls → 'lainnya'
UPDATE public.bookings
SET event_type = 'lainnya'
WHERE event_type IS NULL;

-- 2. Migrate users.borrower_category from legacy values
UPDATE public.users
SET borrower_category = 'mahasiswa_s1'
WHERE borrower_category = 'mahasiswa';

UPDATE public.users
SET borrower_category = 'mahasiswa_s2'
WHERE borrower_category = 'pascasarjana';

UPDATE public.users
SET borrower_category = 'dosen'
WHERE borrower_category = 'dosen_karyawan';

UPDATE public.users
SET borrower_category = 'umum'
WHERE borrower_category = 'borrower'
   OR borrower_category IS NULL
   OR borrower_category = '';

-- 3. Migrate equipment_rates: ensure dosen exists
-- (equipment_rates already uses 'dosen', no change needed)
-- But rename any 'dosen_karyawan' if accidentally exists
UPDATE public.equipment_rates
SET user_category = 'dosen'
WHERE user_category = 'dosen_karyawan';

-- 4. Migrate room_rates usage_category
UPDATE public.room_rates
SET usage_category = 'mahasiswa_s1'
WHERE usage_category = 'mahasiswa';

UPDATE public.room_rates
SET usage_category = 'mahasiswa_s2'
WHERE usage_category = 'pascasarjana';

UPDATE public.room_rates
SET usage_category = 'dosen'
WHERE usage_category = 'dosen_karyawan';

UPDATE public.room_rates
SET usage_category = 'kerjasama'
WHERE usage_category = 'kerjasama'; -- already correct

UPDATE public.room_rates
SET usage_category = 'umum'
WHERE usage_category = 'umum'; -- already correct

-- 5. Migrate snapshot_rate JSONB in bookings (safe multi-update)
UPDATE public.bookings
SET snapshot_rate = jsonb_set(snapshot_rate, '{borrower_category}', '"mahasiswa_s1"'::jsonb)
WHERE snapshot_rate->>'borrower_category' = 'mahasiswa';

UPDATE public.bookings
SET snapshot_rate = jsonb_set(snapshot_rate, '{borrower_category}', '"mahasiswa_s2"'::jsonb)
WHERE snapshot_rate->>'borrower_category' = 'pascasarjana';

UPDATE public.bookings
SET snapshot_rate = jsonb_set(snapshot_rate, '{borrower_category}', '"dosen"'::jsonb)
WHERE snapshot_rate->>'borrower_category' = 'dosen_karyawan';

UPDATE public.bookings
SET snapshot_rate = jsonb_set(snapshot_rate, '{borrower_category}', '"umum"'::jsonb)
WHERE snapshot_rate->>'borrower_category' = 'borrower';

UPDATE public.bookings
SET snapshot_rate = jsonb_set(snapshot_rate, '{member_type}', '"mahasiswa_s1"'::jsonb)
WHERE snapshot_rate->>'member_type' = 'mahasiswa_s1';

UPDATE public.bookings
SET snapshot_rate = jsonb_set(snapshot_rate, '{member_type}', '"mahasiswa_s2"'::jsonb)
WHERE snapshot_rate->>'member_type' = 'mahasiswa_s2';

UPDATE public.bookings
SET snapshot_rate = jsonb_set(snapshot_rate, '{member_type}', '"dosen"'::jsonb)
WHERE snapshot_rate->>'member_type' = 'dosen_karyawan';

UPDATE public.bookings
SET snapshot_rate = jsonb_set(snapshot_rate, '{member_type}', '"umum"'::jsonb)
WHERE snapshot_rate->>'member_type' = 'borrower';

UPDATE public.bookings
SET snapshot_rate = jsonb_set(snapshot_rate, '{member_type}', '"kerjasama"'::jsonb)
WHERE snapshot_rate->>'member_type' = 'kerjasama';

UPDATE public.bookings
SET snapshot_rate = jsonb_set(snapshot_rate, '{member_type}', '"umum"'::jsonb)
WHERE snapshot_rate->>'member_type' = 'umum';

SELECT 'Category migration completed successfully' AS status;
