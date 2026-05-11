-- Fix RLS policies for notifications (to allow super_admin)
-- Run this in Supabase SQL Editor

-- Update notification_channel_configs policy
DROP POLICY IF EXISTS "admin_manage_channel_configs" ON public.notification_channel_configs;
CREATE POLICY "admin_manage_channel_configs" 
  ON public.notification_channel_configs 
  FOR ALL 
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- Update notification_templates policy  
DROP POLICY IF EXISTS "admin_manage_templates" ON public.notification_templates;
CREATE POLICY "admin_manage_templates" 
  ON public.notification_templates 
  FOR ALL 
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- Update notifications policy
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" 
  ON public.notifications 
  FOR ALL 
  USING (user_id = auth.uid() OR public.get_user_role() IN ('admin', 'super_admin'));

-- Also check if is_admin_or_staff() function includes super_admin
-- If not, you might need to update that function too

SELECT 'Policies updated successfully!' as result;
