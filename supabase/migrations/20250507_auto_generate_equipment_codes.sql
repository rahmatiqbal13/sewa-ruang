-- Migration: Auto-generate equipment codes for existing equipment without codes
-- Also updates the code generation logic to be more robust

-- First, let's see how many equipment don't have codes
-- SELECT COUNT(*) FROM public.equipment WHERE equipment_code IS NULL;

-- Generate codes for existing equipment without codes
-- Using a CTE to generate sequential codes
WITH equipment_without_codes AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) as row_num
  FROM public.equipment
  WHERE equipment_code IS NULL
),
code_updates AS (
  SELECT 
    id,
    'ALT-' || LPAD(row_num::text, 4, '0') as new_code
  FROM equipment_without_codes
)
UPDATE public.equipment e
SET equipment_code = c.new_code
FROM code_updates c
WHERE e.id = c.id;

-- Create a function to auto-generate equipment code on insert
CREATE OR REPLACE FUNCTION generate_equipment_code()
RETURNS TRIGGER AS $$
DECLARE
  max_num INTEGER;
  new_code TEXT;
BEGIN
  -- Only generate if equipment_code is not provided
  IF NEW.equipment_code IS NULL OR NEW.equipment_code = '' THEN
    -- Find the highest existing number
    SELECT COALESCE(MAX(
      CASE 
        WHEN equipment_code ~ '^ALT-[0-9]+$' 
        THEN CAST(SUBSTRING(equipment_code FROM 5) AS INTEGER)
        ELSE 0 
      END
    ), 0) INTO max_num
    FROM public.equipment;
    
    -- Generate new code
    new_code := 'ALT-' || LPAD((max_num + 1)::text, 4, '0');
    
    -- Ensure uniqueness (in case of race condition)
    WHILE EXISTS (SELECT 1 FROM public.equipment WHERE equipment_code = new_code) LOOP
      max_num := max_num + 1;
      new_code := 'ALT-' || LPAD((max_num + 1)::text, 4, '0');
    END LOOP;
    
    NEW.equipment_code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate code before insert
DROP TRIGGER IF EXISTS trigger_generate_equipment_code ON public.equipment;
CREATE TRIGGER trigger_generate_equipment_code
  BEFORE INSERT ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION generate_equipment_code();

COMMENT ON FUNCTION generate_equipment_code() IS 'Auto-generates equipment code in format ALT-XXXX if not provided';
