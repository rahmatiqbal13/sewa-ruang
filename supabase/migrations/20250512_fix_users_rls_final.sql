-- ============================================================
-- FINAL FIX: Remove recursive RLS on users table
-- Root cause: FOR ALL policy queries public.users inside USING
-- clause, causing infinite recursion → 500 error.
--
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Step 1: Drop ALL existing policies on users (dynamic, catches any name)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;
END $$;

-- Step 2: Clean slate
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 3: Non-recursive policies only

-- All authenticated users can read all profiles
-- (needed for login redirect and BorrowerLayout)
CREATE POLICY "users_select_authenticated"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow INSERT for authenticated (user registration flow)
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- NOTE: Admin DELETE/INSERT of other users must go through
-- server-side actions using SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS automatically. No client-side admin
-- policy is needed here — and adding one would re-introduce
-- the recursion bug.

-- Step 4: Permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Step 5: Verify
SELECT
  policyname,
  cmd,
  qual::text AS using_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

SELECT 'FIXED: users table RLS is now non-recursive. Login should work.' AS status;
