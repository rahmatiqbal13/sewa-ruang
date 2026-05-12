-- ============================================================
-- URGENT FIX: RLS Policies - Allow admin/super_admin full access
-- ============================================================

-- Disable RLS temporarily to test if that's the issue
-- Setelah test, re-enable dengan policy yang benar

-- 1. Check current RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('bookings', 'booking_items', 'users', 'payment_proofs', 'bank_accounts');

-- 2. Disable RLS on all tables for testing (REMOVE THIS IN PRODUCTION AFTER FIX)
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts DISABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies on these tables
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('bookings', 'booking_items', 'users', 'payment_proofs', 'bank_accounts')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 4. Re-enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- 5. Create simple policies: Admin/Super Admin can do EVERYTHING
-- Bookings - Admin full access
CREATE POLICY "admin_full_access_bookings"
  ON public.bookings FOR ALL
  USING ( EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) );

-- Bookings - Users can view own
CREATE POLICY "user_view_own_bookings"
  ON public.bookings FOR SELECT
  USING ( user_id = auth.uid() );

-- Booking Items - Admin full access
CREATE POLICY "admin_full_access_booking_items"
  ON public.booking_items FOR ALL
  USING ( EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) );

-- Users - Admin full access
CREATE POLICY "admin_full_access_users"
  ON public.users FOR ALL
  USING ( EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) );

-- Users - view own profile
CREATE POLICY "user_view_own"
  ON public.users FOR SELECT
  USING ( id = auth.uid() );

-- Payment Proofs - Admin full access
CREATE POLICY "admin_full_access_payment_proofs"
  ON public.payment_proofs FOR ALL
  USING ( EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) );

-- Bank Accounts - Admin full access
CREATE POLICY "admin_full_access_bank_accounts"
  ON public.bank_accounts FOR ALL
  USING ( EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) );

-- Bank Accounts - Public read for active
CREATE POLICY "public_read_active_bank_accounts"
  ON public.bank_accounts FOR SELECT
  USING ( is_active = true );

-- 6. Grant full permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 7. Force re-check
ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs FORCE ROW LEVEL SECURITY;

-- 8. Test query
SELECT 'Bookings' as table_name, COUNT(*) as record_count FROM public.bookings
UNION ALL
SELECT 'Booking Items', COUNT(*) FROM public.booking_items
UNION ALL
SELECT 'Users', COUNT(*) FROM public.users
UNION ALL
SELECT 'Payment Proofs', COUNT(*) FROM public.payment_proofs;

-- 9. List final policies
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT 'RLS fix applied - test your application now' as result;
