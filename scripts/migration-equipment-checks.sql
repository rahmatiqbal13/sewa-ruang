-- ============================================================
-- MIGRATION: Equipment Checks (Pengecekan Kondisi Alat)
-- ============================================================

-- Tabel riwayat pengecekan kondisi alat
CREATE TABLE IF NOT EXISTS public.equipment_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  condition asset_condition NOT NULL DEFAULT 'good',
  notes TEXT,
  checked_by UUID REFERENCES public.users(id),
  checked_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_equipment_checks_equipment ON public.equipment_checks(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_checks_date ON public.equipment_checks(checked_at);

-- RLS Policies
ALTER TABLE public.equipment_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_checks_public_read" ON public.equipment_checks;
CREATE POLICY "equipment_checks_public_read" ON public.equipment_checks FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_manage_equipment_checks" ON public.equipment_checks;
CREATE POLICY "admin_manage_equipment_checks" ON public.equipment_checks FOR ALL USING (public.is_admin_or_staff());

-- Trigger: update equipment.tgl_terakhir_cek saat insert check
CREATE OR REPLACE FUNCTION public.update_equipment_last_check()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.equipment
  SET tgl_terakhir_cek = NEW.checked_at::date,
      current_condition = NEW.condition
  WHERE id = NEW.equipment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_equipment_last_check ON public.equipment_checks;
CREATE TRIGGER trigger_update_equipment_last_check
  AFTER INSERT ON public.equipment_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_equipment_last_check();
