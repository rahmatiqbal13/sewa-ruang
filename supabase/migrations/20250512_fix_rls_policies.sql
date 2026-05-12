-- ============================================================
-- FIX: RLS Policies untuk super_admin dan admin
-- Memastikan semua data terbaca di halaman pengajuan dan pembayaran
-- ============================================================

-- 1. Fix RLS untuk tabel bookings - Allow admin/super_admin to see ALL bookings
DROP POLICY IF EXISTS "Admins and super_admins can manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;

-- Policy: Admin/Super Admin dapat melihat SEMUA bookings
CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Users biasa hanya lihat booking sendiri
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Policy: Insert booking (authenticated users)
CREATE POLICY "Authenticated users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Update booking (admin/super_admin)
CREATE POLICY "Admins can update all bookings"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Delete booking (admin/super_admin only)
CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- 2. Fix RLS untuk booking_items
DROP POLICY IF EXISTS "Admins can manage booking_items" ON public.booking_items;

CREATE POLICY "Admins can view all booking_items"
  ON public.booking_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_items.booking_id
      AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage booking_items"
  ON public.booking_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- 3. Fix RLS untuk users - Allow admin/super_admin to see all users
DROP POLICY IF EXISTS "Admins and super_admins can manage users" ON public.users;

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
    OR id = auth.uid()
  );

CREATE POLICY "Admins can manage users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- 4. Fix RLS untuk payment_proofs
DROP POLICY IF EXISTS "Users can view own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Admins and super_admins can update payment proofs" ON public.payment_proofs;

CREATE POLICY "Admins can view all payment proofs"
  ON public.payment_proofs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payment_proofs.booking_id
      AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage payment proofs"
  ON public.payment_proofs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- 5. Grant permissions
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.booking_items TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.payment_proofs TO authenticated;
GRANT ALL ON public.bank_accounts TO authenticated;

-- 6. Disable RLS temporarily for testing (COMMENT OUT IN PRODUCTION)
-- Uncomment line below if you want to disable RLS for testing
-- ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

-- 7. Verify current policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('bookings', 'booking_items', 'users', 'payment_proofs', 'bank_accounts')
ORDER BY tablename, policyname;

-- 8. Test query untuk memastikan data terbaca
SELECT 'Bookings count' as check_name, COUNT(*) as count FROM public.bookings
UNION ALL
SELECT 'Booking items count', COUNT(*) FROM public.booking_items
UNION ALL
SELECT 'Payment proofs count', COUNT(*) FROM public.payment_proofs
UNION ALL
SELECT 'Users count', COUNT(*) FROM public.users;

SELECT 'RLS policies fixed successfully' as status;
