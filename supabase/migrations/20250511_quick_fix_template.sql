-- Quick Fix: Jalankan ini di Supabase SQL Editor
-- ============================================

-- Fix untuk notification_templates
DROP POLICY IF EXISTS "admin_manage_templates" ON public.notification_templates;

CREATE POLICY "admin_manage_templates" 
  ON public.notification_templates 
  FOR ALL 
  TO authenticated
  USING (true)  -- Allow all authenticated users for now
  WITH CHECK (true);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.notification_templates TO authenticated;

SELECT 'FIXED! Silakan coba simpan template lagi.' as result;
