-- ============================================================
-- COURSE SCHEDULES (Jadwal Kuliah Berulang)
-- Tanggal: 2026-06-10
-- ============================================================

-- 1. Tabel Template: course_schedules
CREATE TABLE IF NOT EXISTS public.course_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  mata_kuliah TEXT NOT NULL,
  dosen TEXT NOT NULL,
  fakultas TEXT NOT NULL,
  kelas TEXT NOT NULL,
  semester TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL CHECK (end_time > start_time),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date > start_date),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes untuk course_schedules
CREATE INDEX IF NOT EXISTS idx_course_schedules_room ON public.course_schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_semester ON public.course_schedules(semester);
CREATE INDEX IF NOT EXISTS idx_course_schedules_active ON public.course_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_course_schedules_dates ON public.course_schedules(start_date, end_date);

-- 2. Extend room_schedule_blocks dengan kolom baru
ALTER TABLE public.room_schedule_blocks
  ADD COLUMN IF NOT EXISTS schedule_type TEXT NOT NULL DEFAULT 'maintenance',
  ADD COLUMN IF NOT EXISTS course_schedule_id UUID REFERENCES public.course_schedules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS mata_kuliah TEXT,
  ADD COLUMN IF NOT EXISTS dosen TEXT,
  ADD COLUMN IF NOT EXISTS fakultas TEXT,
  ADD COLUMN IF NOT EXISTS kelas TEXT,
  ADD COLUMN IF NOT EXISTS semester TEXT;

-- Update existing rows yang belum punya schedule_type
UPDATE public.room_schedule_blocks SET schedule_type = 'maintenance' WHERE schedule_type IS NULL;

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_room_schedule_blocks_type ON public.room_schedule_blocks(room_id, start_datetime, schedule_type);

-- 3. RLS Policies
ALTER TABLE public.course_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_schedules_select_all" ON public.course_schedules;
CREATE POLICY "course_schedules_select_all"
  ON public.course_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "course_schedules_admin_all" ON public.course_schedules;
CREATE POLICY "course_schedules_admin_all"
  ON public.course_schedules FOR ALL
  USING (public.is_admin());

-- 4. Function: regenerate_course_schedule_instances
CREATE OR REPLACE FUNCTION public.regenerate_course_schedule_instances()
RETURNS TRIGGER AS $$
BEGIN
  -- Hapus instance lama yang terkait template ini
  DELETE FROM public.room_schedule_blocks
  WHERE course_schedule_id = NEW.id;

  -- Generate instance baru untuk setiap hari yang sesuai day_of_week
  INSERT INTO public.room_schedule_blocks (
    room_id, start_datetime, end_datetime, reason,
    schedule_type, course_schedule_id, mata_kuliah, dosen, fakultas, kelas, semester,
    created_by
  )
  SELECT
    NEW.room_id,
    (d + NEW.start_time)::timestamptz,
    (d + NEW.end_time)::timestamptz,
    NEW.mata_kuliah || ' - ' || NEW.dosen || ' (' || NEW.kelas || ')',
    'class',
    NEW.id,
    NEW.mata_kuliah,
    NEW.dosen,
    NEW.fakultas,
    NEW.kelas,
    NEW.semester,
    NEW.created_by
  FROM generate_series(NEW.start_date, NEW.end_date, '1 day'::interval) AS d
  WHERE EXTRACT(DOW FROM d) = NEW.day_of_week
  AND d >= CURRENT_DATE - INTERVAL '1 day';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: regenerate setelah INSERT atau UPDATE
DROP TRIGGER IF EXISTS trg_course_schedule_regenerate ON public.course_schedules;
CREATE TRIGGER trg_course_schedule_regenerate
  AFTER INSERT OR UPDATE ON public.course_schedules
  FOR EACH ROW EXECUTE FUNCTION public.regenerate_course_schedule_instances();

-- 5. Function: delete_course_schedule_instances
CREATE OR REPLACE FUNCTION public.delete_course_schedule_instances()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.room_schedule_blocks
  WHERE course_schedule_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger: hapus instance sebelum DELETE template
DROP TRIGGER IF EXISTS trg_course_schedule_cleanup ON public.course_schedules;
CREATE TRIGGER trg_course_schedule_cleanup
  BEFORE DELETE ON public.course_schedules
  FOR EACH ROW EXECUTE FUNCTION public.delete_course_schedule_instances();

-- 6. Trigger: update timestamp
DROP TRIGGER IF EXISTS update_course_schedules_updated_at ON public.course_schedules;
CREATE TRIGGER update_course_schedules_updated_at
  BEFORE UPDATE ON public.course_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Seed: default data (optional - uncomment if needed)
-- INSERT INTO public.course_schedules (room_id, mata_kuliah, dosen, fakultas, kelas, semester, day_of_week, start_time, end_time, start_date, end_date, created_by)
-- SELECT 
--   '3bd09da5-351b-46aa-939f-1edbd6ff1167'::uuid,
--   'Fisika Dasar',
--   'Dr. Budi',
--   'FMIPA',
--   'Kelas A',
--   'Ganjil 2026',
--   1,
--   '08:00:00',
--   '10:00:00',
--   '2026-08-01',
--   '2026-12-15',
--   (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)
-- WHERE EXISTS (SELECT 1 FROM public.users WHERE role = 'admin');
