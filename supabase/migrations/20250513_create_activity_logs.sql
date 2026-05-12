-- ============================================================
-- Activity Log / Audit Trail System
-- Track all changes to important tables for audit purposes
-- ============================================================

-- 1. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_table ON public.activity_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_record ON public.activity_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_performed_by ON public.activity_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_activity_logs_performed_at ON public.activity_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);

-- 3. Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Only admins can view logs
DROP POLICY IF EXISTS "admin_view_activity_logs" ON public.activity_logs;
CREATE POLICY "admin_view_activity_logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- 5. Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_action TEXT;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_new_data := to_jsonb(NEW);
    v_old_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  END IF;

  -- Insert log (ignore errors to not block main operations)
  BEGIN
    INSERT INTO public.activity_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      performed_by,
      performed_at
    ) VALUES (
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      v_action,
      v_old_data,
      v_new_data,
      auth.uid(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Activity log error: %', SQLERRM;
  END;

  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create triggers for important tables

-- Bookings table
DROP TRIGGER IF EXISTS activity_log_bookings ON public.bookings;
CREATE TRIGGER activity_log_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Users table
DROP TRIGGER IF EXISTS activity_log_users ON public.users;
CREATE TRIGGER activity_log_users
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Equipment table
DROP TRIGGER IF EXISTS activity_log_equipment ON public.equipment;
CREATE TRIGGER activity_log_equipment
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Rooms table
DROP TRIGGER IF EXISTS activity_log_rooms ON public.rooms;
CREATE TRIGGER activity_log_rooms
  AFTER INSERT OR UPDATE OR DELETE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Buildings table
DROP TRIGGER IF EXISTS activity_log_buildings ON public.buildings;
CREATE TRIGGER activity_log_buildings
  AFTER INSERT OR UPDATE OR DELETE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Payment proofs table
DROP TRIGGER IF EXISTS activity_log_payment_proofs ON public.payment_proofs;
CREATE TRIGGER activity_log_payment_proofs
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- 7. Grant permissions
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

-- 8. Create helper function to get recent activity
CREATE OR REPLACE FUNCTION public.get_recent_activity(
  p_limit INTEGER DEFAULT 50,
  p_table_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  table_name TEXT,
  record_id UUID,
  action TEXT,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID,
  performed_at TIMESTAMP WITH TIME ZONE,
  user_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.table_name,
    al.record_id,
    al.action,
    al.old_data,
    al.new_data,
    al.performed_by,
    al.performed_at,
    u.name as user_name
  FROM public.activity_logs al
  LEFT JOIN public.users u ON u.id = al.performed_by
  WHERE (p_table_name IS NULL OR al.table_name = p_table_name)
  ORDER BY al.performed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Verify setup
SELECT 'Activity log system configured successfully!' as status;
SELECT 
  tablename,
  COUNT(*) as log_count
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE t.tgname LIKE 'activity_log_%'
GROUP BY tablename;
