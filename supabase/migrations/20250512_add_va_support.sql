-- Migration: Add VA (Virtual Account) support with categories
-- This supports separate VA for room payments and equipment payments

-- ============================================================
-- 1. Add category column to bank_accounts for VA separation
-- ============================================================

-- Add category column: 'room', 'equipment', 'general'
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'general';

-- Add payment_method_type: 'va', 'qr', 'transfer'
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS payment_method_type VARCHAR(20) DEFAULT 'transfer';

-- Add virtual_account_number for VA payments
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS virtual_account_number VARCHAR(50);

-- Create index for category lookups
CREATE INDEX IF NOT EXISTS idx_bank_accounts_category 
ON public.bank_accounts(category) 
WHERE is_active = true;

-- ============================================================
-- 2. Update existing data or insert VA examples
-- ============================================================

-- Insert VA for room payments (if not exists)
INSERT INTO public.bank_accounts (
  bank_name, 
  bank_code, 
  account_number, 
  virtual_account_number,
  account_name, 
  category,
  payment_method_type,
  is_active, 
  is_primary, 
  display_order
)
SELECT 
  'BCA Virtual Account',
  '014',
  'VA-ROOM-001',
  '8888-1234-5678-90',
  'SimpaRoom - Direktorat Olahraga Unesa',
  'room',
  'va',
  true,
  false,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.bank_accounts 
  WHERE category = 'room' AND payment_method_type = 'va'
);

-- Insert VA for equipment payments (if not exists)
INSERT INTO public.bank_accounts (
  bank_name, 
  bank_code, 
  account_number, 
  virtual_account_number,
  account_name, 
  category,
  payment_method_type,
  is_active, 
  is_primary, 
  display_order
)
SELECT 
  'BCA Virtual Account',
  '014',
  'VA-EQUIP-001',
  '8888-9876-5432-10',
  'SimpaEquip - Direktorat Olahraga Unesa',
  'equipment',
  'va',
  true,
  false,
  2
WHERE NOT EXISTS (
  SELECT 1 FROM public.bank_accounts 
  WHERE category = 'equipment' AND payment_method_type = 'va'
);

-- ============================================================
-- 3. Verify the changes
-- ============================================================

SELECT 'Migration completed successfully' as status;

-- Show all payment methods
SELECT 
  bank_name,
  category,
  payment_method_type,
  virtual_account_number,
  account_number,
  account_name,
  is_active
FROM public.bank_accounts 
ORDER BY category, display_order;
