-- ============================================================
-- Fix Duplicate Reference Number Issue
-- Generate unique reference number dengan UUID suffix
-- ============================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS set_booking_reference ON public.bookings;

-- Update function to generate truly unique reference numbers
CREATE OR REPLACE FUNCTION public.generate_reference_no()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  random_part TEXT;
  ref TEXT;
  counter INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  date_part := to_char(now(), 'YYYYMMDD');
  
  LOOP
    -- Generate random 4-digit alphanumeric
    random_part := UPPER(SUBSTRING(MD5(gen_random_uuid()::TEXT), 1, 4));
    ref := 'SEWA-' || date_part || '-' || random_part;
    
    -- Cek apakah sudah ada
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE reference_no = ref) THEN
      RETURN ref;
    END IF;
    
    counter := counter + 1;
    IF counter >= max_attempts THEN
      -- Fallback: gunakan timestamp + random
      ref := 'SEWA-' || date_part || '-' || LPAD(EXTRACT(EPOCH FROM now())::INTEGER::TEXT, 6, '0');
      RETURN ref;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER set_booking_reference
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.before_booking_insert();

-- Cek apakah ada duplicate reference_no saat ini
SELECT reference_no, COUNT(*) as count
FROM public.bookings
GROUP BY reference_no
HAVING COUNT(*) > 1;

SELECT 'Reference number generator fixed!' as status;
