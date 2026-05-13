-- ============================================================
-- SEED DATA KONSOLIDASI
-- Data awal: institution profile, rekening bank, tarif alat
-- Terakhir diperbarui: 2025-05-17
-- ============================================================
-- PENTING: Jalankan SETELAH consolidated_01_schema.sql
-- dan consolidated_02_functions.sql
-- ============================================================

-- ============================================================
-- INSTITUTION PROFILE (default row)
-- ============================================================

INSERT INTO public.institution_profile (name, short_name)
VALUES ('Sport Center UNESA', 'SC UNESA')
ON CONFLICT DO NOTHING;

-- ============================================================
-- BANK ACCOUNTS — Transfer Biasa
-- ============================================================

INSERT INTO public.bank_accounts (
  bank_name, bank_code, account_number, account_name,
  category, payment_method_type, is_primary, display_order
) VALUES
  ('BCA',     '014', '1234567890', 'Direktorat Olahraga Unesa', 'general', 'transfer', true,  1),
  ('Mandiri', '008', '0987654321', 'Direktorat Olahraga Unesa', 'general', 'transfer', false, 2),
  ('BRI',     '002', '1122334455', 'Direktorat Olahraga Unesa', 'general', 'transfer', false, 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- BANK ACCOUNTS — Virtual Account BTN
-- Hapus data BTN lama agar tidak duplikat, lalu insert ulang
-- ============================================================

DELETE FROM public.bank_accounts
WHERE bank_code = '200' AND category IN ('room', 'equipment');

INSERT INTO public.bank_accounts (
  bank_name, bank_code, account_number, virtual_account_number,
  account_name, category, payment_method_type, is_active, is_primary, display_order
) VALUES
  (
    'BTN (Bank Tabungan Negara)', '200', 'VA-GEDUNG-BTN', '942200220220400002',
    'Sewa Gedung Lab Dopping Unesa', 'room', 'va', true, true, 1
  ),
  (
    'BTN (Bank Tabungan Negara)', '200', 'VA-ALAT-BTN', '942200220220400001',
    'Laboratorium Anti Doping Unesa', 'equipment', 'va', true, true, 2
  );

-- ============================================================
-- EQUIPMENT RATES — Default untuk semua alat aktif
-- 5 kategori pengguna, rate 0 sebagai placeholder.
-- Admin dapat mengubah via halaman edit alat.
-- ============================================================

DO $$
DECLARE
  equip RECORD;
  categories TEXT[] := ARRAY['mahasiswa_s1', 'mahasiswa_s2', 'dosen', 'mou_unesa', 'umum'];
  cat TEXT;
BEGIN
  -- Migrasi rate lama dari kolom equipment (jika ada) ke tabel equipment_rates
  FOR equip IN
    SELECT id, rate_per_day, rate_per_hour
    FROM public.equipment
    WHERE rate_per_day IS NOT NULL OR rate_per_hour IS NOT NULL
  LOOP
    INSERT INTO public.equipment_rates (
      equipment_id, user_category, rate_per_day, rate_per_hour, requires_supervision
    ) VALUES (
      equip.id, 'umum', COALESCE(equip.rate_per_day, 0), equip.rate_per_hour, false
    )
    ON CONFLICT (equipment_id, user_category)
    DO UPDATE SET
      rate_per_day = EXCLUDED.rate_per_day,
      rate_per_hour = EXCLUDED.rate_per_hour;
  END LOOP;

  -- Insert default 0 untuk semua kategori & semua alat aktif (jika belum ada)
  FOR equip IN SELECT id FROM public.equipment WHERE is_active = true
  LOOP
    FOREACH cat IN ARRAY categories
    LOOP
      INSERT INTO public.equipment_rates (
        equipment_id, user_category, rate_per_day, rate_per_hour, requires_supervision
      ) VALUES (equip.id, cat, 0, NULL, false)
      ON CONFLICT (equipment_id, user_category) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

SELECT 'Seed data loaded successfully!' AS status;
