-- ============================================================
-- Booking Reminders System
-- Sistem reminder otomatis untuk peminjaman
-- ============================================================

-- 1. Create reminders table
CREATE TABLE IF NOT EXISTS public.booking_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('before_start', 'after_start', 'before_end', 'after_end', 'custom')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'telegram', 'sms')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking ON public.booking_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_status ON public.booking_reminders(status);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_scheduled ON public.booking_reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_type ON public.booking_reminders(reminder_type);

-- 3. Enable RLS
ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "admin_manage_reminders" ON public.booking_reminders;
DROP POLICY IF EXISTS "user_view_own_reminders" ON public.booking_reminders;

CREATE POLICY "admin_manage_reminders"
  ON public.booking_reminders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "user_view_own_reminders"
  ON public.booking_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_reminders.booking_id
      AND b.user_id = auth.uid()
    )
  );

-- 5. Grant permissions
GRANT ALL ON public.booking_reminders TO authenticated;
GRANT ALL ON public.booking_reminders TO service_role;

-- 6. Function to auto-create reminders when booking is approved
CREATE OR REPLACE FUNCTION public.auto_create_booking_reminders()
RETURNS TRIGGER AS $$
DECLARE
  v_reminder_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only create reminders for approved bookings
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Reminder 1 day before start
    v_reminder_time := NEW.start_date - INTERVAL '1 day';
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (
        NEW.id,
        'before_start',
        v_reminder_time,
        'email',
        'Pengingat: Peminjaman Anda akan dimulai besok.'
      );
    END IF;
    
    -- Reminder on start date
    v_reminder_time := NEW.start_date;
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (
        NEW.id,
        'after_start',
        v_reminder_time,
        'email',
        'Peminjaman Anda telah dimulai hari ini. Selamat menggunakan fasilitas!'
      );
    END IF;
    
    -- Reminder 1 day before end (for returns)
    v_reminder_time := NEW.end_date - INTERVAL '1 day';
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (
        NEW.id,
        'before_end',
        v_reminder_time,
        'email',
        'Pengingat: Peminjaman Anda akan berakhir besok. Jangan lupa mengembalikan aset tepat waktu.'
      );
    END IF;
    
    -- Reminder on end date
    v_reminder_time := NEW.end_date;
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (
        NEW.id,
        'after_end',
        v_reminder_time,
        'email',
        'Hari ini adalah tanggal pengembalian aset. Pastikan untuk mengembalikan dalam kondisi baik.'
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger for auto-reminders
DROP TRIGGER IF EXISTS auto_create_reminders ON public.bookings;
CREATE TRIGGER auto_create_reminders
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_booking_reminders();

-- 8. Function to process pending reminders (to be called by cron job)
CREATE OR REPLACE FUNCTION public.process_pending_reminders()
RETURNS TABLE (
  reminder_id UUID,
  booking_id UUID,
  user_email TEXT,
  user_phone TEXT,
  reminder_type TEXT,
  message TEXT,
  channel TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.booking_id,
    u.email,
    u.phone,
    r.reminder_type,
    r.message,
    r.channel
  FROM public.booking_reminders r
  JOIN public.bookings b ON b.id = r.booking_id
  JOIN public.users u ON u.id = b.user_id
  WHERE r.status = 'pending'
    AND r.scheduled_at <= NOW()
  ORDER BY r.scheduled_at ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to mark reminder as sent
CREATE OR REPLACE FUNCTION public.mark_reminder_sent(p_reminder_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.booking_reminders
  SET 
    status = 'sent',
    sent_at = NOW(),
    updated_at = NOW()
  WHERE id = p_reminder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to get reminders for a booking
CREATE OR REPLACE FUNCTION public.get_booking_reminders(p_booking_id UUID)
RETURNS TABLE (
  id UUID,
  reminder_type TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  channel TEXT,
  message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.reminder_type,
    r.scheduled_at,
    r.sent_at,
    r.status,
    r.channel,
    r.message
  FROM public.booking_reminders r
  WHERE r.booking_id = p_booking_id
  ORDER BY r.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Verify setup
SELECT 'Booking reminders system configured successfully!' as status;

-- Show sample query to check upcoming reminders
SELECT 
  'Upcoming reminders in next 24 hours:' as description,
  COUNT(*) as count
FROM public.booking_reminders
WHERE status = 'pending'
  AND scheduled_at <= NOW() + INTERVAL '24 hours';
