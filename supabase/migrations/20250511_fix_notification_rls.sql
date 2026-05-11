-- ============================================
-- FIX RLS POLICIES FOR NOTIFICATIONS
-- Jalankan ini di Supabase SQL Editor
-- ============================================

-- 1. Fix function get_user_role() untuk handle super_admin
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  role TEXT;
BEGIN
  -- Get role from JWT claims
  role := current_setting('request.jwt.claims', true)::json->>'role';
  
  -- Return role or 'anon' if not found
  RETURN COALESCE(role, 'anon');
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.get_user_role() IS 'Gets the user role from JWT claims. Returns anon if not found.';

-- 2. Drop existing policies
DROP POLICY IF EXISTS "admin_manage_channel_configs" ON public.notification_channel_configs;
DROP POLICY IF EXISTS "staff_read_channel_configs" ON public.notification_channel_configs;
DROP POLICY IF EXISTS "admin_manage_templates" ON public.notification_templates;
DROP POLICY IF EXISTS "staff_read_templates" ON public.notification_templates;
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_prefs_own" ON public.notification_preferences;

-- 3. Recreate policies with super_admin support

-- Policy for notification_channel_configs (admin & super_admin can manage)
CREATE POLICY "admin_manage_channel_configs" 
  ON public.notification_channel_configs 
  FOR ALL 
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "staff_read_channel_configs" 
  ON public.notification_channel_configs 
  FOR SELECT 
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'super_admin', 'staff'));

-- Policy for notification_templates (admin & super_admin can manage)
CREATE POLICY "admin_manage_templates" 
  ON public.notification_templates 
  FOR ALL 
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "staff_read_templates" 
  ON public.notification_templates 
  FOR SELECT 
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'super_admin', 'staff'));

-- Policy for notifications
CREATE POLICY "notifications_own" 
  ON public.notifications 
  FOR ALL 
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.get_user_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR public.get_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "notif_prefs_own" 
  ON public.notification_preferences 
  FOR ALL 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Ensure RLS is enabled
ALTER TABLE public.notification_channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions
GRANT ALL ON public.notification_channel_configs TO authenticated;
GRANT ALL ON public.notification_templates TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notification_preferences TO authenticated;

-- 6. Verify policies
SELECT 'Policies fixed successfully!' as result;

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('notification_channel_configs', 'notification_templates', 'notifications', 'notification_preferences')
ORDER BY tablename, policyname;
