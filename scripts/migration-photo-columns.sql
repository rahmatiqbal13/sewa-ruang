-- Add photo_url to buildings table (for building photos)
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add photo_url to returns table (for asset condition photo on return)
ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add is_for_rent to assets table (controls whether a room appears in the borrower catalog)
-- Defaults to TRUE so all existing rooms stay visible
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS is_for_rent BOOLEAN NOT NULL DEFAULT TRUE;
