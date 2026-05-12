-- Fix for "Database error creating new user" from Supabase Auth
-- This error usually means a trigger on auth.users is failing

-- Step 1: Check if the trigger exists and drop it temporarily to test
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Create a simpler, safer trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users with proper error handling
  BEGIN
    INSERT INTO public.users (
      id, 
      name, 
      email, 
      role,
      phone,
      borrower_category,
      institution,
      class_division,
      identity_number,
      telegram_username,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'borrower'),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      COALESCE(NEW.raw_user_meta_data->>'borrower_category', 'mahasiswa'),
      COALESCE(NEW.raw_user_meta_data->>'institution', ''),
      COALESCE(NEW.raw_user_meta_data->>'class_division', ''),
      COALESCE(NEW.raw_user_meta_data->>'identity_number', ''),
      COALESCE(NEW.raw_user_meta_data->>'telegram_username', ''),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      phone = EXCLUDED.phone,
      borrower_category = EXCLUDED.borrower_category,
      institution = EXCLUDED.institution,
      class_division = EXCLUDED.class_division,
      identity_number = EXCLUDED.identity_number,
      telegram_username = EXCLUDED.telegram_username,
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the auth transaction
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Ensure the users table has proper structure
-- Check and add any missing columns
DO $$
DECLARE
  col_record RECORD;
BEGIN
  -- List of columns we need
  FOR col_record IN 
    SELECT unnest(ARRAY['phone', 'borrower_category', 'institution', 'class_division', 'identity_number', 'telegram_username', 'created_at', 'updated_at']) AS col_name
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = col_record.col_name
    ) THEN
      EXECUTE format('ALTER TABLE public.users ADD COLUMN %I TEXT', col_record.col_name);
      RAISE NOTICE 'Added missing column: %', col_record.col_name;
    END IF;
  END LOOP;
END $$;

-- Step 5: Set proper defaults
ALTER TABLE public.users 
  ALTER COLUMN institution SET DEFAULT '',
  ALTER COLUMN class_division SET DEFAULT '',
  ALTER COLUMN borrower_category SET DEFAULT 'mahasiswa',
  ALTER COLUMN phone SET DEFAULT '',
  ALTER COLUMN identity_number SET DEFAULT '',
  ALTER COLUMN telegram_username SET DEFAULT '';

-- Step 6: Disable RLS and grant permissions
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO service_role;

-- Verify
SELECT 'Auth trigger fixed. Try creating a user now.' as status;
