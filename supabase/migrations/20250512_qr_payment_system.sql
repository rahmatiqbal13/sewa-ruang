-- Migration: QR Payment System (Non-Midtrans)
-- Created: 2026-05-12

-- ============================================================
-- 1. Add payment columns to bookings table
-- ============================================================

-- Payment QR code URL
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_qr_url TEXT;

-- Unique payment code for identification
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_code VARCHAR(50);

-- Proof of payment image URL
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- When payment was verified
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE;

-- Who verified the payment
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_verified_by UUID REFERENCES public.users(id);

-- Payment method used
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Bank name used for transfer
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_bank VARCHAR(50);

-- Create unique index for payment code
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_payment_code 
ON public.bookings(payment_code) 
WHERE payment_code IS NOT NULL;

-- ============================================================
-- 2. Create payment_proofs table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  proof_url TEXT NOT NULL,
  bank_name VARCHAR(50),
  account_name VARCHAR(100),
  transfer_amount DECIMAL(12,2),
  transfer_date DATE,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
  verified_by UUID REFERENCES public.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_proofs_booking 
ON public.payment_proofs(booking_id);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_status 
ON public.payment_proofs(status);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_pending 
ON public.payment_proofs(status) 
WHERE status = 'pending';

-- ============================================================
-- 3. Create bank_accounts table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name VARCHAR(50) NOT NULL,
  bank_code VARCHAR(10),
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  branch VARCHAR(100),
  qr_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active 
ON public.bank_accounts(is_active) 
WHERE is_active = true;

-- Insert default bank accounts (contoh)
INSERT INTO public.bank_accounts (bank_name, bank_code, account_number, account_name, is_primary, display_order)
VALUES 
  ('BCA', '014', '1234567890', 'Direktorat Olahraga Unesa', true, 1),
  ('Mandiri', '008', '0987654321', 'Direktorat Olahraga Unesa', false, 2),
  ('BRI', '002', '1122334455', 'Direktorat Olahraga Unesa', false, 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Create function to generate unique payment code
-- ============================================================

CREATE OR REPLACE FUNCTION generate_payment_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(50);
  code_exists BOOLEAN;
BEGIN
  -- Only generate if payment_code is null and status is pending_payment
  IF NEW.payment_code IS NULL AND NEW.status = 'pending_payment' THEN
    LOOP
      -- Generate code: SIMP-{booking_id first 8 chars}-{random 6 chars}
      new_code := 'SIMP-' || 
                  SUBSTRING(NEW.id::text, 1, 8) || '-' ||
                  UPPER(SUBSTRING(MD5(RANDOM()::text), 1, 6));
      
      -- Check if code exists
      SELECT EXISTS(
        SELECT 1 FROM public.bookings 
        WHERE payment_code = new_code
      ) INTO code_exists;
      
      -- Exit loop if code is unique
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    NEW.payment_code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_generate_payment_code ON public.bookings;
CREATE TRIGGER trg_generate_payment_code
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_payment_code();

-- ============================================================
-- 5. Update RLS policies for new tables
-- ============================================================

-- Enable RLS
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Policy for payment_proofs
CREATE POLICY "Users can view own payment proofs"
  ON public.payment_proofs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payment_proofs.booking_id
      AND b.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can insert own payment proofs"
  ON public.payment_proofs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payment_proofs.booking_id
      AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can update payment proofs"
  ON public.payment_proofs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Policy for bank_accounts (public read, admin write)
CREATE POLICY "Bank accounts are viewable by everyone"
  ON public.bank_accounts FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Only admins can manage bank accounts"
  ON public.bank_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 6. Create function to verify payment
-- ============================================================

CREATE OR REPLACE FUNCTION verify_booking_payment(
  p_booking_id UUID,
  p_admin_id UUID,
  p_status VARCHAR(20), -- 'verified' or 'rejected'
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_booking_status VARCHAR(50);
BEGIN
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

-- ============================================================
-- 7. Grant permissions
-- ============================================================

GRANT ALL ON public.payment_proofs TO authenticated;
GRANT ALL ON public.bank_accounts TO authenticated;
GRANT ALL ON public.payment_proofs TO anon;
GRANT ALL ON public.bank_accounts TO anon;

-- ============================================================
-- 8. Verify migration
-- ============================================================

SELECT 'Migration completed successfully' as status;

-- Show created tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('bookings', 'payment_proofs', 'bank_accounts')
ORDER BY table_name;
