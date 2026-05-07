-- Migration: Add building_id and floor to equipment table
-- This allows specifying building and floor even when room is not yet available

-- Add building_id column
ALTER TABLE public.equipment 
ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id);

-- Add floor column
ALTER TABLE public.equipment 
ADD COLUMN IF NOT EXISTS floor INTEGER;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_building ON public.equipment(building_id);
CREATE INDEX IF NOT EXISTS idx_equipment_floor ON public.equipment(floor);

-- Update RLS policies to include new columns (they inherit from existing table policies)
-- No need to add new policies, existing ones will cover new columns

COMMENT ON COLUMN public.equipment.building_id IS 'Optional reference to building when room is not yet specified';
COMMENT ON COLUMN public.equipment.floor IS 'Optional floor number when room is not yet specified';
