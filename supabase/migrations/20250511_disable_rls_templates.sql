-- SOLUSI FINAL: Disable RLS untuk notification_templates
-- Jalankan ini di Supabase SQL Editor
-- ============================================

-- Disable RLS untuk tabel notification_templates
ALTER TABLE public.notification_templates DISABLE ROW LEVEL SECURITY;

-- Grant semua permission
GRANT ALL ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO anon;

-- Pastikan tabel bisa diakses
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Verifikasi
SELECT 'RLS DISABLED untuk notification_templates' as status;

-- Cek status RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'notification_templates';
