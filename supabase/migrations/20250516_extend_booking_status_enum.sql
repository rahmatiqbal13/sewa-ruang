-- Extend booking_status enum with all values used in application code
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_uploaded';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_rejected';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'active';
