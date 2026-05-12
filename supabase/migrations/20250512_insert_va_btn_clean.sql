-- Insert VA BTN untuk Sewa Gedung dan Sewa Alat
-- Data sesuai yang diberikan user

-- Hapus data VA BTN yang lama jika ada (untuk menghindari duplikat)
DELETE FROM public.bank_accounts 
WHERE bank_code = '200' 
AND category IN ('room', 'equipment');

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
  'VA-GEDUNG-BTN',
  '942200220220400002',
  'Sewa Gedung Lab Dopping Unesa',
  'room',
  'va',
  true,
  true,
  1
);

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
  'VA-ALAT-BTN',
  '942200220220400001',
  'Laboratorium Anti Doping Unesa',
  'equipment',
  'va',
  true,
  true,
  2
);

-- Tampilkan hasil
SELECT 
  category,
  bank_name,
  virtual_account_number,
  account_name,
  is_active,
  is_primary
FROM public.bank_accounts 
WHERE bank_code = '200'
ORDER BY display_order;
