-- Migration: Add missing columns to bookings table for admin booking form
-- Created: 2025-05-09

-- Add columns for borrower information
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS borrower_name TEXT,
ADD COLUMN IF NOT EXISTS borrower_email TEXT,
ADD COLUMN IF NOT EXISTS borrower_phone TEXT,
ADD COLUMN IF NOT EXISTS borrower_institution TEXT,
ADD COLUMN IF NOT EXISTS borrower_class TEXT,
ADD COLUMN IF NOT EXISTS member_type TEXT,
ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.borrower_name IS 'Nama peminjam untuk peminjaman manual oleh admin';
COMMENT ON COLUMN public.bookings.borrower_email IS 'Email peminjam';
COMMENT ON COLUMN public.bookings.borrower_phone IS 'Nomor telepon peminjam';
COMMENT ON COLUMN public.bookings.borrower_institution IS 'Instansi/organisasi peminjam';
COMMENT ON COLUMN public.bookings.borrower_class IS 'Kelas atau divisi peminjam';
COMMENT ON COLUMN public.bookings.member_type IS 'Jenis member: mahasiswa_s1, mahasiswa_s2, dosen_karyawan, umum, kerjasama';
COMMENT ON COLUMN public.bookings.created_by_admin IS 'Menandai apakah peminjaman dibuat oleh admin';
