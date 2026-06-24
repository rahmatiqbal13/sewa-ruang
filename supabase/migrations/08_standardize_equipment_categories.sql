-- ============================================================
-- MIGRATION: Standardize equipment categories (for existing DB)
-- ============================================================
-- Run this AFTER tables are created (08_complete_setup.sql)
--
-- Steps:
-- 1. Normalize existing data
-- 2. Add CHECK constraint
-- 3. Update comment
-- ============================================================

-- ===== 1. NORMALIZE EXISTING CATEGORIES =====
UPDATE public.equipment
SET category = 'elektronik'
WHERE category ILIKE 'elektronik'
   OR category ILIKE 'electronic'
   OR category ILIKE 'elektro';

UPDATE public.equipment
SET category = 'mebel'
WHERE category ILIKE 'mebel'
   OR category ILIKE 'furniture'
   OR category ILIKE 'furnitur';

UPDATE public.equipment
SET category = 'transportasi'
WHERE category ILIKE 'transportasi'
   OR category ILIKE 'transportation'
   OR category ILIKE 'kendaraan';

UPDATE public.equipment
SET category = 'alat_tes_pengukuran'
WHERE category ILIKE 'alat_tes_pengukuran'
   OR category ILIKE 'alat tes'
   OR category ILIKE 'testing tool'
   OR category ILIKE 'pengukuran';

UPDATE public.equipment
SET category = 'alat_gym'
WHERE category ILIKE 'alat_gym'
   OR category ILIKE 'alat gym'
   OR category ILIKE 'gym'
   OR category ILIKE 'fitness'
   OR category ILIKE 'olahraga';

UPDATE public.equipment
SET category = 'perlengkapan'
WHERE category ILIKE 'perlengkapan'
   OR category ILIKE 'equipment'
   OR category ILIKE 'peralatan'
   OR category ILIKE 'aksesoris';

-- Safety: anything invalid → 'lainnya'
UPDATE public.equipment
SET category = 'lainnya'
WHERE category IS NOT NULL
  AND category NOT IN (
    'elektronik',
    'mebel',
    'transportasi',
    'alat_tes_pengukuran',
    'alat_gym',
    'perlengkapan',
    'lainnya'
  );

-- ===== 2. ADD CHECK CONSTRAINT =====
ALTER TABLE public.equipment
  DROP CONSTRAINT IF EXISTS equipment_category_check;

ALTER TABLE public.equipment
  ADD CONSTRAINT equipment_category_check
  CHECK (category IS NULL OR category IN (
    'elektronik',
    'mebel',
    'transportasi',
    'alat_tes_pengukuran',
    'alat_gym',
    'perlengkapan',
    'lainnya'
  ));

-- ===== 3. UPDATE COMMENT =====
COMMENT ON COLUMN public.equipment.category IS
  'Kategori alat: elektronik, mebel, transportasi, alat_tes_pengukuran, alat_gym, perlengkapan, lainnya';

-- ===== VERIFICATION =====
SELECT 'Equipment category standardization completed' AS status;
SELECT category, COUNT(*) AS count
FROM public.equipment
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;
