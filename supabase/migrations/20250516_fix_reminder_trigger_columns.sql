-- Fix auto_create_booking_reminders trigger
-- Column names in bookings are start_datetime/end_datetime, not start_date/end_date
CREATE OR REPLACE FUNCTION public.auto_create_booking_reminders()
RETURNS TRIGGER AS $$
DECLARE
  v_reminder_time TIMESTAMP WITH TIME ZONE;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    -- Reminder 1 day before start
    v_reminder_time := NEW.start_datetime - INTERVAL '1 day';
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (
        NEW.id, 'before_start', v_reminder_time, 'email',
        'Pengingat: Peminjaman Anda akan dimulai besok.'
      );
    END IF;

    -- Reminder on start date
    v_reminder_time := NEW.start_datetime;
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (
        NEW.id, 'after_start', v_reminder_time, 'email',
        'Peminjaman Anda telah dimulai hari ini. Selamat menggunakan fasilitas!'
      );
    END IF;

    -- Reminder 1 day before end
    v_reminder_time := NEW.end_datetime - INTERVAL '1 day';
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (
        NEW.id, 'before_end', v_reminder_time, 'email',
        'Pengingat: Peminjaman Anda akan berakhir besok. Jangan lupa mengembalikan aset tepat waktu.'
      );
    END IF;

    -- Reminder on end date
    v_reminder_time := NEW.end_datetime;
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (
        NEW.id, 'after_end', v_reminder_time, 'email',
        'Hari ini adalah tanggal pengembalian aset. Pastikan untuk mengembalikan dalam kondisi baik.'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
