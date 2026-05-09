-- Migration: Add RLS policies for room_rates table
-- Created: 2025-05-09
-- Issue: room_rates data not showing in query due to missing RLS policy

-- Enable RLS on room_rates table
ALTER TABLE public.room_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "room_rates_select_all" ON public.room_rates;
DROP POLICY IF EXISTS "room_rates_insert_admin" ON public.room_rates;
DROP POLICY IF EXISTS "room_rates_update_admin" ON public.room_rates;
DROP POLICY IF EXISTS "room_rates_delete_admin" ON public.room_rates;

-- Allow everyone to read room_rates (public read)
CREATE POLICY "room_rates_select_all"
  ON public.room_rates
  FOR SELECT
  USING (true);

-- Only admin can insert room_rates
CREATE POLICY "room_rates_insert_admin"
  ON public.room_rates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Only admin can update room_rates
CREATE POLICY "room_rates_update_admin"
  ON public.room_rates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Only admin can delete room_rates
CREATE POLICY "room_rates_delete_admin"
  ON public.room_rates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Also check if table exists and has proper constraints
COMMENT ON TABLE public.room_rates IS 'Tarif ruangan per kategori penggunaan';

-- Verify the data exists
SELECT 'Room rates count: ' || COUNT(*)::text as info FROM public.room_rates;
