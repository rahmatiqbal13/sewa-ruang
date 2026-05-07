-- ============================================================
-- Tabel untuk menyimpan tarif equipment per kategori user
-- ============================================================

CREATE TABLE IF NOT EXISTS public.equipment_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  user_category TEXT NOT NULL CHECK (user_category IN (
    'mahasiswa_s1',      -- Mahasiswa Unesa S1
    'mahasiswa_s2',      -- Mahasiswa Unesa S2/Pasca
    'dosen',             -- Dosen Unesa
    'mou_unesa',         -- MoU dengan Unesa
    'umum'               -- Umum
  )),
  rate_per_day NUMERIC(12,2) NOT NULL,
  rate_per_hour NUMERIC(12,2),
  requires_supervision BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(equipment_id, user_category)
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_equipment_rates_equipment ON public.equipment_rates(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rates_category ON public.equipment_rates(user_category);

-- Enable RLS
ALTER TABLE public.equipment_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "equipment_rates_public_read" ON public.equipment_rates;
DROP POLICY IF EXISTS "admin_manage_equipment_rates" ON public.equipment_rates;

CREATE POLICY "equipment_rates_public_read" ON public.equipment_rates FOR SELECT USING (true);
CREATE POLICY "admin_manage_equipment_rates" ON public.equipment_rates FOR ALL USING (public.is_admin());

-- Function untuk generate equipment code otomatis
CREATE OR REPLACE FUNCTION public.generate_equipment_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  new_code TEXT;
BEGIN
  -- Ambil nomor urut tertinggi yang sudah ada
  SELECT COALESCE(MAX(CAST(SUBSTRING(equipment_code FROM 'ALT-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.equipment
  WHERE equipment_code ~ '^ALT-\d+$';
  
  new_code := 'ALT-' || LPAD(next_num::TEXT, 4, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk auto-set equipment_code jika kosong
CREATE OR REPLACE FUNCTION public.before_equipment_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.equipment_code IS NULL OR NEW.equipment_code = '' THEN
    NEW.equipment_code := public.generate_equipment_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_equipment_code ON public.equipment;
CREATE TRIGGER set_equipment_code
  BEFORE INSERT ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.before_equipment_insert();

-- Function untuk update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_equipment_rates_updated_at ON public.equipment_rates;
CREATE TRIGGER update_equipment_rates_updated_at
  BEFORE UPDATE ON public.equipment_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SELESAI
-- ============================================================
