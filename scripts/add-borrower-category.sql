-- Add borrower_category column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS borrower_category TEXT
    CHECK (borrower_category IN ('mahasiswa', 'pascasarjana', 'dosen_karyawan', 'kerjasama', 'umum'));

-- Set default for existing borrower accounts (optional, admin can update later)
UPDATE public.users
  SET borrower_category = 'mahasiswa'
  WHERE role = 'borrower' AND borrower_category IS NULL;
