-- Run this in Supabase Dashboard SQL Editor
-- Add missing columns to bookings table for admin booking form

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS borrower_name TEXT,
ADD COLUMN IF NOT EXISTS borrower_email TEXT,
ADD COLUMN IF NOT EXISTS borrower_phone TEXT,
ADD COLUMN IF NOT EXISTS borrower_institution TEXT,
ADD COLUMN IF NOT EXISTS borrower_class TEXT,
ADD COLUMN IF NOT EXISTS member_type TEXT,
ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
