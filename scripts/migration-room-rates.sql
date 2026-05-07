-- Migration: Tambah tabel room_rates untuk tarif ruangan per kategori penggunaan
-- Kategori: perkuliahan, event_mahasiswa, event_umum

CREATE TABLE IF NOT EXISTS public.room_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  usage_category TEXT NOT NULL CHECK (usage_category IN ('perkuliahan', 'event_mahasiswa', 'event_umum')),
  rate_per_hour NUMERIC(12,2),
  rate_per_day NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, usage_category)
);

CREATE INDEX IF NOT EXISTS idx_room_rates_room ON public.room_rates(room_id);

ALTER TABLE public.room_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_rates_public_read" ON public.room_rates
  FOR SELECT USING (true);

CREATE POLICY "admin_manage_room_rates" ON public.room_rates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'staff')
    )
  );
