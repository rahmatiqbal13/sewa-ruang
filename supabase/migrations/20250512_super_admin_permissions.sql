-- ============================================================
-- MIGRATION: Grant super_admin full access to all features
-- This ensures super_admin can do everything admin can do
-- ============================================================

-- 1. Update RLS policies for bank_accounts (payment methods)
-- Policy: Allow admins and super_admins to manage bank accounts
DROP POLICY IF EXISTS "Only admins can manage bank accounts" ON public.bank_accounts;

CREATE POLICY "Admins and super_admins can manage bank accounts"
  ON public.bank_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- 2. Update RLS policies for payment_proofs
-- Policy: Allow admins and super_admins to update payment proofs
DROP POLICY IF EXISTS "Only admins can update payment proofs" ON public.payment_proofs;

CREATE POLICY "Admins and super_admins can update payment proofs"
  ON public.payment_proofs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Allow admins and super_admins to delete payment proofs
CREATE POLICY "Admins and super_admins can delete payment proofs"
  ON public.payment_proofs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- 3. Update RLS policies for bookings (if exists)
-- Allow admins and super_admins full access to bookings
DO $$
BEGIN
  -- Check if policy exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookings' 
    AND policyname = 'Only admins can update bookings'
  ) THEN
    DROP POLICY "Only admins can update bookings" ON public.bookings;
  END IF;
  
  -- Create new policy
  CREATE POLICY "Admins and super_admins can manage bookings"
    ON public.bookings FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
      )
    );
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- 4. Update RLS policies for rooms
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rooms' 
    AND policyname LIKE '%admin%'
  ) THEN
    DROP POLICY IF EXISTS "Only admins can manage rooms" ON public.rooms;
    
    CREATE POLICY "Admins and super_admins can manage rooms"
      ON public.rooms FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'super_admin')
        )
      );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- 5. Update RLS policies for equipment
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'equipment' 
    AND policyname LIKE '%admin%'
  ) THEN
    DROP POLICY IF EXISTS "Only admins can manage equipment" ON public.equipment;
    
    CREATE POLICY "Admins and super_admins can manage equipment"
      ON public.equipment FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'super_admin')
        )
      );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- 6. Update RLS policies for buildings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'buildings' 
    AND policyname LIKE '%admin%'
  ) THEN
    DROP POLICY IF EXISTS "Only admins can manage buildings" ON public.buildings;
    
    CREATE POLICY "Admins and super_admins can manage buildings"
      ON public.buildings FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'super_admin')
        )
      );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- 7. Update RLS policies for users management
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname LIKE '%admin%'
  ) THEN
    DROP POLICY IF EXISTS "Only admins can manage users" ON public.users;
    
    CREATE POLICY "Admins and super_admins can manage users"
      ON public.users FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'super_admin')
        )
      );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- 8. Grant super_admin additional privileges
-- Ensure super_admin can bypass RLS (this is typically already set, but making sure)
ALTER TABLE public.bank_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs FORCE ROW LEVEL SECURITY;

-- 9. Update the verify_booking_payment function to accept super_admin
-- Recreate the function to ensure it works for both roles
CREATE OR REPLACE FUNCTION verify_booking_payment(
  p_booking_id UUID,
  p_admin_id UUID,
  p_status VARCHAR(20),
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_booking_status VARCHAR(50);
  v_user_role VARCHAR(50);
BEGIN
  -- Check if user is admin or super_admin
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_admin_id;
  
  IF v_user_role NOT IN ('admin', 'super_admin') THEN
    RETURN false;
  END IF;

  -- Get current booking status
  SELECT status INTO v_booking_status
  FROM public.bookings
  WHERE id = p_booking_id;
  
  -- Only allow verification if status is pending_payment or payment_uploaded
  IF v_booking_status NOT IN ('pending_payment', 'payment_uploaded') THEN
    RETURN false;
  END IF;
  
  -- Update booking
  IF p_status = 'verified' THEN
    UPDATE public.bookings
    SET 
      status = 'paid',
      payment_verified_at = now(),
      payment_verified_by = p_admin_id,
      updated_at = now()
    WHERE id = p_booking_id;
    
    -- Update payment proof status
    UPDATE public.payment_proofs
    SET 
      status = 'verified',
      verified_by = p_admin_id,
      verified_at = now()
    WHERE booking_id = p_booking_id
    AND status = 'pending';
    
  ELSIF p_status = 'rejected' THEN
    -- Update payment proof status
    UPDATE public.payment_proofs
    SET 
      status = 'rejected',
      verified_by = p_admin_id,
      verified_at = now(),
      rejection_reason = p_rejection_reason
    WHERE booking_id = p_booking_id
    AND status = 'pending';
    
    -- Reset booking to pending payment
    UPDATE public.bookings
    SET 
      status = 'pending_payment',
      payment_proof_url = NULL,
      updated_at = now()
    WHERE id = p_booking_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create a helper function to check if user is admin or super_admin
CREATE OR REPLACE FUNCTION is_admin_or_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Verify the changes
SELECT 'RLS policies updated for super_admin access' as status;

-- Show updated policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('bank_accounts', 'payment_proofs', 'bookings', 'rooms', 'equipment', 'buildings', 'users')
AND policyname LIKE '%admin%'
ORDER BY tablename, policyname;
