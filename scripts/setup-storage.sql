-- ============================================================
-- Setup Supabase Storage Buckets
-- ============================================================

-- Enable Storage extension (if not already enabled)
-- Note: This is typically done through Supabase Dashboard

-- Create buckets for different types of images
-- Note: Run this in Supabase SQL Editor or use Supabase Dashboard

-- Bucket: photos (general purpose - already used by PhotoUpload component)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket: equipment-photos (for equipment images)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('equipment-photos', 'equipment-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket: building-photos (for building images)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('building-photos', 'building-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket: room-photos (for room images)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('room-photos', 'room-photos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage RLS Policies
-- ============================================================

-- Policy: Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id IN ('photos', 'equipment-photos', 'building-photos', 'room-photos'));

-- Policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('photos', 'equipment-photos', 'building-photos', 'room-photos'));

-- Policy: Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('photos', 'equipment-photos', 'building-photos', 'room-photos'));

-- Policy: Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('photos', 'equipment-photos', 'building-photos', 'room-photos'));

-- ============================================================
-- SELESAI
-- ============================================================
-- 
-- CATATAN PENTING:
-- 
-- 1. SQL di atas harus dijalankan di Supabase SQL Editor
-- 2. Atau bisa juga setup manual melalui Supabase Dashboard:
--    - Buka: https://app.supabase.com/project/_/storage/buckets
--    - Click "New Bucket"
--    - Buat bucket: photos, equipment-photos, building-photos, room-photos
--    - Set "Public bucket" = true
--    - Set RLS policies (Public read, Authenticated write)
--
-- 3. Untuk testing lokal tanpa storage, gunakan URL eksternal:
--    - Imgur, Cloudinary, atau image hosting lainnya
--    - Fitur URL input sudah tersedia di semua form
--
-- ============================================================
