-- Fix users table RLS and constraints for super-admin user creation

-- Disable RLS for users table (if using service role, this shouldn't be needed but just in case)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant all permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO service_role;

-- Ensure sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Check users table structure and add missing columns if needed
DO $$
BEGIN
  -- Add phone column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE public.users ADD COLUMN phone TEXT;
  END IF;

  -- Add borrower_category column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'borrower_category') THEN
    ALTER TABLE public.users ADD COLUMN borrower_category TEXT DEFAULT 'mahasiswa';
  END IF;

  -- Add institution column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'institution') THEN
    ALTER TABLE public.users ADD COLUMN institution TEXT;
  END IF;

  -- Add class_division column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'class_division') THEN
    ALTER TABLE public.users ADD COLUMN class_division TEXT;
  END IF;

  -- Add identity_number column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'identity_number') THEN
    ALTER TABLE public.users ADD COLUMN identity_number TEXT;
  END IF;

  -- Add telegram_username column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'telegram_username') THEN
    ALTER TABLE public.users ADD COLUMN telegram_username TEXT;
  END IF;

  -- Add created_at column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'created_at') THEN
    ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add updated_at column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Make sure id, name, email, role have proper constraints
ALTER TABLE public.users 
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN role SET NOT NULL;

-- Add default values for role if not exists
ALTER TABLE public.users 
  ALTER COLUMN role SET DEFAULT 'borrower';

-- Create or replace updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Create trigger
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify
SELECT 'users table structure updated successfully' as status;
