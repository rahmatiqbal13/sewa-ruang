-- Create institution_profile table
CREATE TABLE IF NOT EXISTS public.institution_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Sport Center UNESA',
  short_name TEXT DEFAULT 'SC UNESA',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  description TEXT,
  operating_hours TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default data if empty
INSERT INTO public.institution_profile (name, short_name)
SELECT 'Sport Center UNESA', 'SC UNESA'
WHERE NOT EXISTS (SELECT 1 FROM public.institution_profile);

-- Disable RLS untuk memudahkan (atau bisa enable dengan policy admin)
ALTER TABLE public.institution_profile DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.institution_profile TO authenticated;
GRANT ALL ON public.institution_profile TO anon;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_institution_profile_updated_at ON public.institution_profile;
CREATE TRIGGER update_institution_profile_updated_at
  BEFORE UPDATE ON public.institution_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

SELECT 'Institution profile table created successfully!' as result;
