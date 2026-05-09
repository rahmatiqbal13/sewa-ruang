-- Diagnostic query to check RLS issues for room_inventory_items
-- Run this in Supabase SQL Editor to diagnose the issue

-- ============================================================
-- CHECK 1: Verify table exists and RLS is enabled
-- ============================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'room_inventory_items';

-- ============================================================
-- CHECK 2: List all RLS policies on room_inventory_items
-- ============================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check
FROM pg_policies 
WHERE tablename = 'room_inventory_items'
ORDER BY policyname;

-- ============================================================
-- CHECK 3: Check current user's role
-- ============================================================
-- This will show the current authenticated user's info
SELECT 
    auth.uid() as current_user_id,
    current_setting('request.jwt.claims', true)::json->>'role' as jwt_role;

-- ============================================================
-- CHECK 4: Check if current user exists in users table and their role
-- ============================================================
SELECT 
    id,
    email,
    role,
    full_name,
    created_at
FROM public.users 
WHERE id = auth.uid();

-- ============================================================
-- CHECK 5: Test RLS helper functions
-- ============================================================
SELECT 
    public.is_admin() as is_current_user_admin,
    public.is_admin_or_staff() as is_current_user_admin_or_staff;

-- ============================================================
-- CHECK 6: Try to manually insert a test row (will fail if RLS blocks)
-- ============================================================
-- Uncomment the following to test insert (use with caution):
/*
INSERT INTO public.room_inventory_items (
    room_asset_id, 
    name, 
    quantity, 
    condition,
    last_updated_by
) VALUES (
    (SELECT id FROM public.assets WHERE category = 'room' LIMIT 1),
    'TEST_ITEM_DELETE_ME',
    1,
    'good',
    auth.uid()
);
*/

-- ============================================================
-- CHECK 7: List all users with their roles
-- ============================================================
SELECT 
    id,
    email,
    role,
    full_name,
    is_active
FROM public.users 
ORDER BY role, created_at DESC
LIMIT 20;
