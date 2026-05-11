-- Fix RLS policy for notification_templates
-- Allow super_admin to manage templates

-- Drop existing policy
DROP POLICY IF EXISTS "admin_manage_templates" ON public.notification_templates;

-- Create new policy that includes super_admin
CREATE POLICY "admin_manage_templates" 
  ON public.notification_templates 
  FOR ALL 
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

-- Also create a policy for reading
DROP POLICY IF EXISTS "staff_read_templates" ON public.notification_templates;

CREATE POLICY "staff_read_templates" 
  ON public.notification_templates 
  FOR SELECT 
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'super_admin', 'staff'));

-- Ensure RLS is enabled
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.notification_templates TO authenticated;

SELECT 'RLS policy for notification_templates updated successfully!' as result;
