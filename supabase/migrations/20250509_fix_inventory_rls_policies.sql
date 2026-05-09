-- Migration: Fix RLS policies for room_inventory_items table
-- Issue: Frontend code still uses room_inventory_items but RLS policies may be missing

-- ============================================================
-- STEP 1: Ensure RLS is enabled on room_inventory_items
-- ============================================================
ALTER TABLE public.room_inventory_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: Drop existing policies if any (to avoid conflicts)
-- ============================================================
DROP POLICY IF EXISTS "inventory_public_read" ON public.room_inventory_items;
DROP POLICY IF EXISTS "admin_staff_manage_inventory" ON public.room_inventory_items;
DROP POLICY IF EXISTS "inventory_items_public_read" ON public.room_inventory_items;
DROP POLICY IF EXISTS "inventory_items_admin_manage" ON public.room_inventory_items;
DROP POLICY IF EXISTS "inventory_items_staff_manage" ON public.room_inventory_items;

-- ============================================================
-- STEP 3: Create new RLS policies
-- ============================================================

-- Allow public to read inventory items (for catalog view)
CREATE POLICY "inventory_items_public_read" 
ON public.room_inventory_items 
FOR SELECT 
USING (true);

-- Allow admin to manage all inventory items
CREATE POLICY "inventory_items_admin_manage" 
ON public.room_inventory_items 
FOR ALL 
USING (public.is_admin());

-- Allow staff to manage inventory items
CREATE POLICY "inventory_items_staff_manage" 
ON public.room_inventory_items 
FOR ALL 
USING (public.is_admin_or_staff());

-- ============================================================
-- STEP 4: Also fix room_inventory_images if needed
-- ============================================================
ALTER TABLE public.room_inventory_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_images_public_read" ON public.room_inventory_images;
DROP POLICY IF EXISTS "admin_staff_manage_inventory_images" ON public.room_inventory_images;
DROP POLICY IF EXISTS "inventory_images_public_read_new" ON public.room_inventory_images;
DROP POLICY IF EXISTS "inventory_images_admin_manage" ON public.room_inventory_images;
DROP POLICY IF EXISTS "inventory_images_staff_manage" ON public.room_inventory_images;

-- Allow public to read inventory images
CREATE POLICY "inventory_images_public_read_new" 
ON public.room_inventory_images 
FOR SELECT 
USING (true);

-- Allow admin to manage inventory images
CREATE POLICY "inventory_images_admin_manage" 
ON public.room_inventory_images 
FOR ALL 
USING (public.is_admin());

-- Allow staff to manage inventory images
CREATE POLICY "inventory_images_staff_manage" 
ON public.room_inventory_images 
FOR ALL 
USING (public.is_admin_or_staff());

-- ============================================================
-- STEP 5: Verify the helper functions exist
-- ============================================================

-- Ensure is_admin() function exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'));
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Ensure is_admin_or_staff() function exists
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'staff'));
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Add comments
COMMENT ON FUNCTION public.is_admin() IS 'Checks if the current user has admin or super_admin role';
COMMENT ON FUNCTION public.is_admin_or_staff() IS 'Checks if the current user has admin, super_admin, or staff role';
