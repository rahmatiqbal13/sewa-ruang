-- RUN THIS IN SUPABASE DASHBOARD SQL EDITOR
-- Add missing columns to returns table

-- Add is_early_return column
ALTER TABLE public.returns 
ADD COLUMN IF NOT EXISTS is_early_return BOOLEAN DEFAULT FALSE;

-- Add refund_amount column  
ALTER TABLE public.returns 
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2);

-- Add actual_end_datetime to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS actual_end_datetime TIMESTAMPTZ;

-- Verify columns were added
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'returns' 
AND column_name IN ('is_early_return', 'refund_amount')
ORDER BY column_name;
