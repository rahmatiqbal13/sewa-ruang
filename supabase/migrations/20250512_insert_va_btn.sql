-- Insert VA BTN untuk Sewa Gedung dan Sewa Alat
-- Sesuai data dari user

-- 1. VA untuk Sewa Gedung (Ruangan)
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
) VALUES (
  'BTN (Bank Tabungan Negara)',
  '200',
  'VA-GEDUNG-001',
  '942200220220400002',
  'Sewa Gedung Lab Dopping Unesa',
  'room',
  'va',
  true,
  true,
  1
)
ON CONFLICT (virtual_account_number) 
DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  account_name = EXCLUDED.account_name,
  category = EXCLUDED.category,
  is_active = true,
  is_primary = true;

-- 2. VA untuk Sewa Alat
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
) VALUES (
  'BTN (Bank Tabungan Negara)',
  '200',
  'VA-ALAT-001',
  '942200220220400001',
  'Laboratorium Anti Doping Unesa',
  'equipment',
  'va',
  true,
  true,
  2
)
ON CONFLICT (virtual_account_number) 
DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  account_name = EXCLUDED.account_name,
  category = EXCLUDED.category,
  is_active = true,
  is_primary = true;

-- 3. Tampilkan hasil
SELECT 
  category,
  bank_name,
  virtual_account_number,
  account_name,
  is_active,
  is_primary
FROM public.bank_accounts 
WHERE virtual_account_number IN (
  '942200220220400002',
  '942200220220400001'
)
ORDER BY category;
