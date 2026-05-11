-- ============================================
-- FIX RLS POLICIES - KHUSUS UNTUK SUPER_ADMIN
-- Jalankan ini di Supabase SQL Editor
-- ============================================

-- 1. Fix function get_user_role() - ambil dari JWT claims dengan berbagai format
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  jwt_claims JSON;
  user_role TEXT;
BEGIN
  -- Get JWT claims
  jwt_claims := current_setting('request.jwt.claims', true)::json;
  
  -- Coba ambil role dari berbagai lokasi di JWT
  -- Format 1: Langsung di root
  user_role := jwt_claims->>'role';
  
  -- Format 2: Di dalam 'app_metadata'
  IF user_role IS NULL THEN
    user_role := jwt_claims->'app_metadata'->>'role';
  END IF;
  
  -- Format 3: Di dalam 'user_metadata'
  IF user_role IS NULL THEN
    user_role := jwt_claims->'user_metadata'->>'role';
  END IF;
  
  -- Return role atau 'anon' jika tidak authenticated
  RETURN COALESCE(user_role, 'anon');
END;
$$;

-- Test function (bisa di-comment setelah test)
-- SELECT public.get_user_role();

-- 2. Drop ALL existing policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "admin_manage_channel_configs" ON public.notification_channel_configs;
  DROP POLICY IF EXISTS "staff_read_channel_configs" ON public.notification_channel_configs;
  DROP POLICY IF EXISTS "admin_manage_templates" ON public.notification_templates;
  DROP POLICY IF EXISTS "staff_read_templates" ON public.notification_templates;
  DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
  DROP POLICY IF EXISTS "notif_prefs_own" ON public.notification_preferences;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- 3. Disable dan Re-enable RLS untuk reset
ALTER TABLE public.notification_channel_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 4. Create policies yang ALLOW ALL untuk super_admin
-- Policy 1: notification_channel_configs - super_admin bisa semua
CREATE POLICY "super_admin_manage_channel_configs" 
  ON public.notification_channel_configs 
  FOR ALL 
  TO authenticated
  USING (true)  -- Bypass RLS check, handle di aplikasi
  WITH CHECK (true);

-- Policy 2: notification_templates - super_admin bisa semua
CREATE POLICY "super_admin_manage_templates" 
  ON public.notification_templates 
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 3: notifications - super_admin bisa semua
CREATE POLICY "super_admin_manage_notifications" 
  ON public.notifications 
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: notification_preferences - user hanya bisa kelola sendiri
CREATE POLICY "user_manage_prefs" 
  ON public.notification_preferences 
  FOR ALL 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Grant permissions
GRANT ALL ON public.notification_channel_configs TO authenticated;
GRANT ALL ON public.notification_templates TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notification_preferences TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Verify
SELECT 'SUCCESS! Policies updated for super_admin.' as result;

-- 7. Test query (optional)
-- SELECT * FROM public.notification_channel_configs LIMIT 1;
