-- ============================================================
-- EMERGENCY FIX: users.borrower_category constraint
-- ============================================================
-- Langkah 1: DROP constraint dulu (pastikan benar-benar terhapus)
-- Langkah 2: UPDATE data
-- Langkah 3: ADD constraint baru
--
-- JANGAN dijalankan dalam transaksi — tiap langkah harus sukses sendiri.
-- ============================================================

-- ===== LANGKAH 1: Hapus constraint lama =====
-- Coba hapus dengan nama yang pasti
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_borrower_category_check;

-- Kalau masih ada constraint lain dengan nama berbeda, cari & hapus
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%borrower_category%'
  LOOP
    RAISE NOTICE 'Dropping constraint: %', r.conname;
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- ===== LANGKAH 2: Bersihkan data lama =====
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

-- Safety: kalau masih ada nilai aneh, paksa jadi umum
UPDATE public.users
SET borrower_category = 'umum'
WHERE borrower_category NOT IN ('mahasiswa_s1', 'mahasiswa_s2', 'dosen', 'kerjasama', 'umum');

-- ===== LANGKAH 3: Tambah constraint baru =====
ALTER TABLE public.users
  ADD CONSTRAINT users_borrower_category_check
  CHECK (borrower_category IS NULL OR borrower_category IN (
    'mahasiswa_s1',
    'mahasiswa_s2',
    'dosen',
    'kerjasama',
    'umum'
  ));

SELECT 'Constraint fixed. Current values:' AS status;
SELECT borrower_category, COUNT(*) FROM public.users GROUP BY borrower_category;
