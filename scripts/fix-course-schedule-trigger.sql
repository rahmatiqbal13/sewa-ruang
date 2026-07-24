-- Fix trigger: saat course_schedule di-soft-delete (is_active = false),
-- hapus room_schedule_blocks-nya dan JANGAN regenerate
-- Ini memastikan jadwal yang dihapus tidak lagi memblokir ruangan

CREATE OR REPLACE FUNCTION public.regenerate_course_schedule_instances()
RETURNS TRIGGER AS $$
BEGIN
  -- Selalu hapus instance lama yang terkait template ini
  DELETE FROM public.room_schedule_blocks
  WHERE course_schedule_id = NEW.id;

  -- Hanya generate ulang jika jadwal masih aktif
  IF NEW.is_active THEN
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
