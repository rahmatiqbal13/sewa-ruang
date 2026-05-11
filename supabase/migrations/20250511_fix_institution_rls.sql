-- Fix RLS untuk institution_profile
-- Jalankan ini di Supabase SQL Editor

-- Disable RLS
ALTER TABLE public.institution_profile DISABLE ROW LEVEL SECURITY;

-- Grant all permissions
GRANT ALL ON public.institution_profile TO authenticated;
GRANT ALL ON public.institution_profile TO anon;
GRANT ALL ON public.institution_profile TO service_role;

-- Grant sequence jika ada
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verifikasi
SELECT 'RLS DISABLED untuk institution_profile' as status;
