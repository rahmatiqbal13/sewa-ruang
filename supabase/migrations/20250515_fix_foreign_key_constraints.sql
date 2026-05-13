-- ============================================================
-- Fix Foreign Key Constraint: bookings -> users
-- Add ON DELETE behavior to prevent deletion errors
-- ============================================================

-- Drop existing foreign key constraint
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;

-- Add new foreign key constraint with ON DELETE SET NULL
-- This allows users to be deleted while preserving booking records
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Also update activity_logs performed_by to allow NULL when user is deleted
ALTER TABLE public.activity_logs 
DROP CONSTRAINT IF EXISTS activity_logs_performed_by_fkey;

ALTER TABLE public.activity_logs 
ADD CONSTRAINT activity_logs_performed_by_fkey 
FOREIGN KEY (performed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Check other tables that reference users
-- payment_proofs.verified_by
ALTER TABLE public.payment_proofs 
DROP CONSTRAINT IF EXISTS payment_proofs_verified_by_fkey;

ALTER TABLE public.payment_proofs 
ADD CONSTRAINT payment_proofs_verified_by_fkey 
FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- booking_agreements.agreed_by
ALTER TABLE public.booking_agreements 
DROP CONSTRAINT IF EXISTS booking_agreements_agreed_by_fkey;

ALTER TABLE public.booking_agreements 
ADD CONSTRAINT booking_agreements_agreed_by_fkey 
FOREIGN KEY (agreed_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- booking_extensions.approved_by
ALTER TABLE public.booking_extensions 
DROP CONSTRAINT IF EXISTS booking_extensions_approved_by_fkey;

ALTER TABLE public.booking_extensions 
ADD CONSTRAINT booking_extensions_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

SELECT 'Foreign key constraints updated with ON DELETE SET NULL' as status;
