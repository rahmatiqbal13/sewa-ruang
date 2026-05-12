-- ============================================================
-- MIGRATION: Virtual Account (VA) Support
-- Untuk sistem pembayaran dengan VA terpisah: Sewa Ruang & Sewa Alat
-- ============================================================

-- 1. Tambah kolom untuk VA support
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS payment_method_type VARCHAR(20) DEFAULT 'transfer',
ADD COLUMN IF NOT EXISTS virtual_account_number VARCHAR(50);

-- 2. Create index untuk category
CREATE INDEX IF NOT EXISTS idx_bank_accounts_category 
ON public.bank_accounts(category) 
WHERE is_active = true;

-- 3. Update data existing (set semua ke 'general' jika belum ada kategori)
UPDATE public.bank_accounts 
SET category = 'general', 
    payment_method_type = 'transfer'
WHERE category IS NULL;

-- 4. Insert VA untuk Sewa Ruang (contoh)
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
  'BCA Virtual Account - Ruang',
  '014',
  'VA-ROOM-001',
  '88881234567890',
  'SimpaRoom - Direktorat Olahraga Unesa',
  'room',
  'va',
  true,
  true,
  1
) ON CONFLICT DO NOTHING;

-- 5. Insert VA untuk Sewa Alat (contoh)
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
  'BCA Virtual Account - Alat',
  '014',
  'VA-EQUIP-001',
  '88889876543210',
  'SimpaEquip - Direktorat Olahraga Unesa',
  'equipment',
  'va',
  true,
  true,
  2
) ON CONFLICT DO NOTHING;

-- 6. Insert VA Mandiri untuk Ruang (alternatif)
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
  'Mandiri Virtual Account - Ruang',
  '008',
  'VA-ROOM-002',
  '89891234567890',
  'SimpaRoom - Direktorat Olahraga Unesa',
  'room',
  'va',
  true,
  false,
  3
) ON CONFLICT DO NOTHING;

-- 7. Insert VA Mandiri untuk Alat (alternatif)
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
  'Mandiri Virtual Account - Alat',
  '008',
  'VA-EQUIP-002',
  '89899876543210',
  'SimpaEquip - Direktorat Olahraga Unesa',
  'equipment',
  'va',
  true,
  false,
  4
) ON CONFLICT DO NOTHING;

-- 8. Update RLS policies untuk memastikan access
-- Policy untuk select (semua user yang aktif)
DROP POLICY IF EXISTS "Bank accounts are viewable by everyone" ON public.bank_accounts;
CREATE POLICY "Bank accounts are viewable by everyone" 
ON public.bank_accounts FOR SELECT
TO authenticated, anon 
USING (is_active = true);

-- 9. Verifikasi hasil
SELECT 
  'Migration selesai' as status,
  (SELECT COUNT(*) FROM public.bank_accounts WHERE category = 'room') as va_room_count,
  (SELECT COUNT(*) FROM public.bank_accounts WHERE category = 'equipment') as va_equipment_count,
  (SELECT COUNT(*) FROM public.bank_accounts WHERE category = 'general') as va_general_count;

-- 10. Tampilkan semua VA yang tersedia
SELECT 
  bank_name,
  category,
  payment_method_type,
  virtual_account_number,
  account_name,
  is_active,
  is_primary
FROM public.bank_accounts 
ORDER BY category, is_primary DESC, display_order;
