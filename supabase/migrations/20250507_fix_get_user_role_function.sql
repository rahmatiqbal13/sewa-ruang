-- Migration: Fix get_user_role() function dependency
-- Method 2: Drop policy first, then function, then recreate both

-- Step 1: Drop policies that depend on get_user_role()
DROP POLICY IF EXISTS admin_manage_templates ON public.agreement_templates;
DROP POLICY IF EXISTS admin_manage_buildings ON public.buildings;
DROP POLICY IF EXISTS admin_manage_rooms ON public.rooms;
DROP POLICY IF EXISTS admin_manage_equipment ON public.equipment;

-- Step 2: Now drop the function
DROP FUNCTION IF EXISTS public.get_user_role();

-- Step 3: Recreate the function
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
COMMENT ON FUNCTION public.get_user_role() IS 'Gets the user role from JWT claims. Returns anon if not authenticated.';

-- Step 4: Recreate the policies
-- agreement_templates policy
CREATE POLICY admin_manage_templates ON public.agreement_templates
  FOR ALL 
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- buildings policy  
CREATE POLICY admin_manage_buildings ON public.buildings
  FOR ALL 
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- rooms policy
CREATE POLICY admin_manage_rooms ON public.rooms
  FOR ALL 
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- equipment policy
CREATE POLICY admin_manage_equipment ON public.equipment
  FOR ALL 
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- Also ensure public can read basic data
-- These are common policies that might be needed
CREATE POLICY public_read_buildings ON public.buildings
  FOR SELECT 
  USING (true);

CREATE POLICY public_read_rooms ON public.rooms
  FOR SELECT 
  USING (true);

CREATE POLICY public_read_equipment ON public.equipment
  FOR SELECT 
  USING (true);
