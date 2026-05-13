-- ============================================================
-- Fix RLS Policies for booking_items
-- User harus bisa insert booking_items untuk booking mereka sendiri
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "booking_items_read" ON public.booking_items;
DROP POLICY IF EXISTS "booking_items_insert" ON public.booking_items;
DROP POLICY IF EXISTS "admin_manage_booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "booking_items_select" ON public.booking_items;
DROP POLICY IF EXISTS "booking_items_insert_own" ON public.booking_items;
DROP POLICY IF EXISTS "booking_items_admin" ON public.booking_items;

-- Enable RLS
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - User bisa melihat booking_items untuk booking mereka
CREATE POLICY "booking_items_select"
  ON public.booking_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_items.booking_id 
      AND (b.user_id = auth.uid() OR b.user_id IN (SELECT id FROM public.users WHERE role IN ('admin', 'staff', 'super_admin')))
    )
  );

-- Policy 2: INSERT - User bisa insert booking_items (karena booking sudah dibuat oleh mereka)
-- Sederhana: authenticated user bisa insert, asalkan booking_id valid
CREATE POLICY "booking_items_insert_own"
  ON public.booking_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_items.booking_id 
      AND b.user_id = auth.uid()
    )
  );

-- Policy 3: Admin bisa manage semua
CREATE POLICY "booking_items_admin"
  ON public.booking_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'staff', 'super_admin')
    )
  );

-- Untuk service_role (bypass RLS untuk admin client)
GRANT ALL ON public.booking_items TO service_role;

SELECT 'booking_items RLS policies fixed!' as status;
