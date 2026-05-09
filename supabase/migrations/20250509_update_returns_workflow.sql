-- Migration: Update returns table for new return workflow
-- Created: 2025-05-09

-- Add columns for early return tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'is_early_return'
  ) THEN
    ALTER TABLE public.returns ADD COLUMN is_early_return BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'refund_amount'
  ) THEN
    ALTER TABLE public.returns ADD COLUMN refund_amount NUMERIC(12,2);
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.returns.is_early_return IS 'Menandai apakah pengembalian dilakukan lebih cepat dari jadwal';
COMMENT ON COLUMN public.returns.refund_amount IS 'Nominal refund jika pengembalian lebih cepat';

-- Update RLS policies for returns table
DROP POLICY IF EXISTS "returns_select_admin" ON public.returns;
DROP POLICY IF EXISTS "returns_insert_admin" ON public.returns;
DROP POLICY IF EXISTS "returns_update_admin" ON public.returns;

CREATE POLICY "returns_select_all"
  ON public.returns
  FOR SELECT
  USING (true);

CREATE POLICY "returns_insert_admin"
  ON public.returns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "returns_update_admin"
  ON public.returns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Ensure bookings have actual_end_datetime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'actual_end_datetime'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN actual_end_datetime TIMESTAMPTZ;
  END IF;
END $$;
