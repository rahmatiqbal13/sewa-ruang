-- ============================================================
-- FIX: Complete RLS Fix - Handles existing policies
-- ============================================================

-- ============================================================
-- 1. USERS TABLE
-- ============================================================

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (with IF EXISTS to avoid errors)
DROP POLICY IF EXISTS "auth_users_select_all" ON public.users;
DROP POLICY IF EXISTS "anon_users_select" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admin_manage_users" ON public.users;
DROP POLICY IF EXISTS "allow_select_all" ON public.users;
DROP POLICY IF EXISTS "allow_update_own" ON public.users;
DROP POLICY IF EXISTS "allow_admin_all" ON public.users;
DROP POLICY IF EXISTS "auth_select_all" ON public.users;
DROP POLICY IF EXISTS "user_view_own" ON public.users;
DROP POLICY IF EXISTS "admin_full_access_users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins and super_admins can manage users" ON public.users;

-- Create policies
CREATE POLICY "auth_users_select_all"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

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
-- 2. BOOKINGS TABLE
-- ============================================================

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "admin_select_all_bookings" ON public.bookings;
DROP POLICY IF EXISTS "user_select_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "auth_insert_bookings" ON public.bookings;
DROP POLICY IF EXISTS "admin_update_bookings" ON public.bookings;
DROP POLICY IF EXISTS "admin_delete_bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "admin_full_access_bookings" ON public.bookings;
DROP POLICY IF EXISTS "user_view_own_bookings" ON public.bookings;

-- Create policies
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

CREATE POLICY "user_select_own_bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "auth_insert_bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

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
-- 3. BOOKING_ITEMS TABLE
-- ============================================================

ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_all_booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "user_select_own_booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "admin_manage_booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "Admins can view all booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "Admins can manage booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "admin_full_access_booking_items" ON public.booking_items;

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

-- ============================================================
-- 4. PAYMENT_PROOFS TABLE
-- ============================================================

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_all_payment_proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "user_select_own_payment_proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "admin_manage_payment_proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Admins can view all payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Admins can manage payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "admin_full_access_payment_proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can view own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Admins and super_admins can update payment proofs" ON public.payment_proofs;

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

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.booking_items TO authenticated;
GRANT ALL ON public.payment_proofs TO authenticated;
GRANT ALL ON public.bank_accounts TO authenticated;

-- ============================================================
-- 6. VERIFICATION
-- ============================================================

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('users', 'bookings', 'booking_items', 'payment_proofs')
ORDER BY tablename, policyname;

SELECT 
  'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Bookings', COUNT(*) FROM public.bookings
UNION ALL
SELECT 'Booking Items', COUNT(*) FROM public.booking_items
UNION ALL
SELECT 'Payment Proofs', COUNT(*) FROM public.payment_proofs;

SELECT 'SUCCESS: RLS policies configured! Refresh your pages now.' as status;
