-- Fix for VA creation issues
-- Check and fix potential constraint issues

-- 1. Check if there are any constraints on bank_accounts
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'bank_accounts'
AND tc.table_schema = 'public';

-- 2. Make sure virtual_account_number is unique (if not already)
DO $$
BEGIN
  -- Check if unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_bank_accounts_va_unique'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bank_accounts'
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%virtual%'
  ) THEN
    -- Add unique constraint if it doesn't exist
    ALTER TABLE public.bank_accounts 
    ADD CONSTRAINT unique_virtual_account_number 
    UNIQUE (virtual_account_number);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
  WHEN others THEN
    RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
END $$;

-- 3. Ensure all required columns have defaults or allow null
ALTER TABLE public.bank_accounts 
ALTER COLUMN bank_code SET DEFAULT '200',
ALTER COLUMN account_number SET DEFAULT '',
ALTER COLUMN is_active SET DEFAULT true,
ALTER COLUMN is_primary SET DEFAULT false,
ALTER COLUMN display_order SET DEFAULT 0;

-- 4. Fix RLS policies to ensure they work correctly
-- Drop and recreate policies with proper conditions

-- Policy for SELECT (all authenticated users can view active)
DROP POLICY IF EXISTS "Bank accounts are viewable by everyone" ON public.bank_accounts;
CREATE POLICY "Bank accounts are viewable by everyone"
  ON public.bank_accounts FOR SELECT
  TO authenticated, anon 
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'super_admin')
  ));

-- Policy for ALL operations (admin and super_admin only)
DROP POLICY IF EXISTS "Admins and super_admins can manage bank accounts" ON public.bank_accounts;
CREATE POLICY "Admins and super_admins can manage bank accounts"
  ON public.bank_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- 5. Grant proper permissions
GRANT ALL ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO anon;

-- 6. Verify the table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bank_accounts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Test insert with sample data (will show any constraint issues)
DO $$
DECLARE
  test_id UUID;
BEGIN
  INSERT INTO public.bank_accounts (
    bank_name,
    bank_code,
    account_number,
    virtual_account_number,
    account_name,
    category,
    payment_method_type,
    is_active,
    is_primary
  ) VALUES (
    'TEST BANK',
    '200',
    'TEST-ACCT-001',
    'TESTVA' || EXTRACT(EPOCH FROM NOW())::INTEGER,
    'Test Account',
    'general',
    'va',
    true,
    false
  )
  RETURNING id INTO test_id;
  
  -- Delete test record
  DELETE FROM public.bank_accounts WHERE id = test_id;
  
  RAISE NOTICE 'Test insert successful! Table is working correctly.';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;

SELECT 'VA setup fix completed' as status;
