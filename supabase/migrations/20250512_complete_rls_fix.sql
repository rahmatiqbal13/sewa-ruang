-- ============================================================
-- FIX: Enable RLS with proper policies for ALL tables
-- Setelah RLS di-disable, kita enable kembali dengan policy yang benar
-- ============================================================

-- ============================================================
-- 1. USERS TABLE - Re-enable with working policies
-- ============================================================

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "allow_select_all" ON public.users;
DROP POLICY IF EXISTS "allow_update_own" ON public.users;
DROP POLICY IF EXISTS "allow_admin_all" ON public.users;

-- Policy 1: All authenticated users can view all users (for login/role check)
CREATE POLICY "auth_users_select_all"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Anon can view users (needed for some auth flows)
CREATE POLICY "anon_users_select"
  ON public.users FOR SELECT
  TO anon
  USING (true);

-- Policy 3: Users can update own profile
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Policy 4: Admins can manage all users
CREATE POLICY "admin_manage_users"
  ON public.users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 2. BOOKINGS TABLE - Fix for admin to see all bookings
-- ============================================================

-- Disable then re-enable
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "admin_full_access_bookings" ON public.bookings;
DROP POLICY IF EXISTS "user_view_own_bookings" ON public.bookings;

-- Policy 1: Admin/Super Admin can see ALL bookings
CREATE POLICY "admin_select_all_bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Policy 2: Regular users can only see their own bookings
CREATE POLICY "user_select_own_bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 3: Authenticated users can create bookings
CREATE POLICY "auth_insert_bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 4: Admin can update all bookings
CREATE POLICY "admin_update_bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Policy 5: Admin can delete bookings
CREATE POLICY "admin_delete_bookings"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 3. BOOKING_ITEMS TABLE - Fix for admin access
-- ============================================================

ALTER TABLE public.booking_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "Admins can manage booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "admin_full_access_booking_items" ON public.booking_items;

-- Policy 1: Admin can see all booking items
CREATE POLICY "admin_select_all_booking_items"
  ON public.booking_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Policy 2: Users can see booking items for their own bookings
CREATE POLICY "user_select_own_booking_items"
  ON public.booking_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_items.booking_id
      AND b.user_id = auth.uid()
    )
  );

-- Policy 3: Admin can manage all booking items
CREATE POLICY "admin_manage_booking_items"
  ON public.booking_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 4. PAYMENT_PROOFS TABLE - Fix for admin access
-- ============================================================

ALTER TABLE public.payment_proofs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Admins can manage payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "admin_full_access_payment_proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can view own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Admins and super_admins can update payment proofs" ON public.payment_proofs;

-- Policy 1: Admin can see all payment proofs
CREATE POLICY "admin_select_all_payment_proofs"
  ON public.payment_proofs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Policy 2: Users can see payment proofs for their own bookings
CREATE POLICY "user_select_own_payment_proofs"
  ON public.payment_proofs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payment_proofs.booking_id
      AND b.user_id = auth.uid()
    )
  );

-- Policy 3: Admin can manage all payment proofs
CREATE POLICY "admin_manage_payment_proofs"
  ON public.payment_proofs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.booking_items TO authenticated;
GRANT ALL ON public.payment_proofs TO authenticated;
GRANT ALL ON public.bank_accounts TO authenticated;

GRANT ALL ON public.users TO anon;
GRANT ALL ON public.bookings TO anon;
GRANT ALL ON public.booking_items TO anon;
GRANT ALL ON public.payment_proofs TO anon;

-- ============================================================
-- 6. VERIFICATION
-- ============================================================

-- Check all policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('users', 'bookings', 'booking_items', 'payment_proofs')
ORDER BY tablename, policyname;

-- Verify counts
SELECT 'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Bookings', COUNT(*) FROM public.bookings
UNION ALL
SELECT 'Booking Items', COUNT(*) FROM public.booking_items
UNION ALL
SELECT 'Payment Proofs', COUNT(*) FROM public.payment_proofs;

SELECT 'RLS policies configured successfully! Refresh admin dashboard now.' as status;
