-- Migration: Add table for early returns
-- Created: 2025-05-09

-- Table to track early returns
CREATE TABLE IF NOT EXISTS public.booking_early_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  planned_end_datetime TIMESTAMPTZ NOT NULL,
  actual_end_datetime TIMESTAMPTZ NOT NULL,
  refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'refund_pending', 'refund_processed'
  processed_by UUID REFERENCES public.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_dates CHECK (actual_end_datetime < planned_end_datetime)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_early_returns_booking_id ON public.booking_early_returns(booking_id);
CREATE INDEX IF NOT EXISTS idx_early_returns_status ON public.booking_early_returns(status);

-- Enable RLS
ALTER TABLE public.booking_early_returns ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "early_returns_select_admin"
  ON public.booking_early_returns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'staff')
    )
  );

CREATE POLICY "early_returns_insert_admin"
  ON public.booking_early_returns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "early_returns_update_admin"
  ON public.booking_early_returns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Also add actual_end_datetime to bookings table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'actual_end_datetime'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN actual_end_datetime TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON TABLE public.booking_early_returns IS 'Catatan pengembalian lebih cepat dari peminjam';
