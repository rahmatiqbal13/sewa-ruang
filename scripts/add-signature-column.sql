-- Add signature_url column to users table for digital signature storage
-- Stores base64 PNG data URL of user's handwritten signature

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.users.signature_url IS 'Base64 PNG data URL of user digital signature, captured via canvas';
