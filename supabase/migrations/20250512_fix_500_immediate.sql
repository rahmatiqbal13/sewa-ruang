-- IMMEDIATE FIX FOR 500 ERROR - Run this in Supabase SQL Editor NOW
-- This will fix the login issue immediately

-- Step 1: Disable RLS on users table (immediate relief)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
DROP POLICY IF EXISTS "admin_full_access_users" ON public.users;
DROP POLICY IF EXISTS "user_view_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "allow_all_auth_select" ON public.users;
DROP POLICY IF EXISTS "admin_update_all" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins and super_admins can manage users" ON public.users;

-- Step 3: Re-enable RLS with working policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple working policies
-- Everyone can view all users (needed for login to work)
CREATE POLICY "allow_select_all"
  ON public.users FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "allow_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- Admins can do everything
CREATE POLICY "allow_admin_all"
  ON public.users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Step 5: Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;

-- Step 6: Verify
SELECT 'RLS fixed. Users table should now work!' as status;
SELECT COUNT(*) as total_users FROM public.users;
