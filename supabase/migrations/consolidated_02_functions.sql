-- ============================================================
-- FUNCTIONS & TRIGGERS KONSOLIDASI
-- Menggabungkan semua fungsi dan trigger ke state final
-- Terakhir diperbarui: 2025-05-17
-- ============================================================
-- PENTING: Jalankan SETELAH consolidated_01_schema.sql
-- ============================================================

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS update_institution_profile_updated_at ON public.institution_profile;
CREATE TRIGGER update_institution_profile_updated_at
  BEFORE UPDATE ON public.institution_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_rates_updated_at ON public.equipment_rates;
CREATE TRIGGER update_equipment_rates_updated_at
  BEFORE UPDATE ON public.equipment_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- EQUIPMENT CODE AUTO-GENERATE
-- Format: ALT-0001, ALT-0002, dst.
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_equipment_code()
RETURNS TRIGGER AS $$
DECLARE
  max_num INTEGER;
  new_code TEXT;
BEGIN
  IF NEW.equipment_code IS NULL OR NEW.equipment_code = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN equipment_code ~ '^ALT-[0-9]+$'
        THEN CAST(SUBSTRING(equipment_code FROM 5) AS INTEGER)
        ELSE 0
      END
    ), 0) INTO max_num FROM public.equipment;

    new_code := 'ALT-' || LPAD((max_num + 1)::text, 4, '0');

    WHILE EXISTS (SELECT 1 FROM public.equipment WHERE equipment_code = new_code) LOOP
      max_num := max_num + 1;
      new_code := 'ALT-' || LPAD((max_num + 1)::text, 4, '0');
    END LOOP;

    NEW.equipment_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_equipment_code ON public.equipment;
CREATE TRIGGER trigger_generate_equipment_code
  BEFORE INSERT ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.generate_equipment_code();

-- Backfill kode ALT untuk equipment yang belum punya kode
WITH equipment_without_codes AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS row_num
  FROM public.equipment WHERE equipment_code IS NULL
),
code_updates AS (
  SELECT id, 'ALT-' || LPAD(row_num::text, 4, '0') AS new_code
  FROM equipment_without_codes
)
UPDATE public.equipment e
SET equipment_code = c.new_code
FROM code_updates c WHERE e.id = c.id;

-- ============================================================
-- BOOKING REFERENCE NUMBER
-- Format: SEWA-YYYYMMDD-XXXX
-- Catatan: generate_reference_no() dipanggil dari before_booking_insert()
-- yang ada di base schema Supabase.
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_reference_no()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  random_part TEXT;
  ref TEXT;
  counter INTEGER := 0;
BEGIN
  date_part := to_char(NOW(), 'YYYYMMDD');
  LOOP
    random_part := UPPER(SUBSTRING(MD5(gen_random_uuid()::TEXT), 1, 4));
    ref := 'SEWA-' || date_part || '-' || random_part;
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE reference_no = ref) THEN
      RETURN ref;
    END IF;
    counter := counter + 1;
    IF counter >= 100 THEN
      ref := 'SEWA-' || date_part || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::INTEGER::TEXT, 6, '0');
      RETURN ref;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger set_booking_reference memanggil before_booking_insert() dari base schema
DROP TRIGGER IF EXISTS set_booking_reference ON public.bookings;
CREATE TRIGGER set_booking_reference
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.before_booking_insert();

-- ============================================================
-- BOOKING REMINDERS — auto-create saat booking diapprove
-- FINAL: menggunakan start_datetime/end_datetime
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_create_booking_reminders()
RETURNS TRIGGER AS $$
DECLARE
  v_reminder_time TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    v_reminder_time := NEW.start_datetime - INTERVAL '1 day';
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (NEW.id, 'before_start', v_reminder_time, 'email',
        'Pengingat: Peminjaman Anda akan dimulai besok.');
    END IF;

    v_reminder_time := NEW.start_datetime;
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (NEW.id, 'after_start', v_reminder_time, 'email',
        'Peminjaman Anda telah dimulai hari ini. Selamat menggunakan fasilitas!');
    END IF;

    v_reminder_time := NEW.end_datetime - INTERVAL '1 day';
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (NEW.id, 'before_end', v_reminder_time, 'email',
        'Pengingat: Peminjaman Anda akan berakhir besok. Jangan lupa mengembalikan aset tepat waktu.');
    END IF;

    v_reminder_time := NEW.end_datetime;
    IF v_reminder_time > NOW() THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_at, channel, message)
      VALUES (NEW.id, 'after_end', v_reminder_time, 'email',
        'Hari ini adalah tanggal pengembalian aset. Pastikan untuk mengembalikan dalam kondisi baik.');
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_reminders ON public.bookings;
CREATE TRIGGER auto_create_reminders
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_booking_reminders();

-- Fungsi bantu untuk memproses reminder yang sudah jatuh tempo
CREATE OR REPLACE FUNCTION public.process_pending_reminders()
RETURNS TABLE (
  reminder_id UUID, booking_id UUID, user_email TEXT, user_phone TEXT,
  reminder_type TEXT, message TEXT, channel TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.booking_id, u.email, u.phone, r.reminder_type, r.message, r.channel
  FROM public.booking_reminders r
  JOIN public.bookings b ON b.id = r.booking_id
  JOIN public.users u ON u.id = b.user_id
  WHERE r.status = 'pending' AND r.scheduled_at <= NOW()
  ORDER BY r.scheduled_at ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_reminder_sent(p_reminder_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.booking_reminders
  SET status = 'sent', sent_at = NOW(), updated_at = NOW()
  WHERE id = p_reminder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_booking_reminders(p_booking_id UUID)
RETURNS TABLE (
  id UUID, reminder_type TEXT, scheduled_at TIMESTAMPTZ, sent_at TIMESTAMPTZ,
  status TEXT, channel TEXT, message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.reminder_type, r.scheduled_at, r.sent_at, r.status, r.channel, r.message
  FROM public.booking_reminders r
  WHERE r.booking_id = p_booking_id
  ORDER BY r.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PAYMENT CODE — digenerate oleh API (get-va/get-qr), bukan trigger DB
-- Format: PAY-{referenceNo}-{timestamp_base36}
-- Trigger dihapus untuk menghindari konflik format
-- ============================================================
DROP TRIGGER IF EXISTS trg_generate_payment_code ON public.bookings;
DROP FUNCTION IF EXISTS public.generate_payment_code();

-- ============================================================
-- VERIFY BOOKING PAYMENT (admin)
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_booking_payment(
  p_booking_id UUID,
  p_admin_id UUID,
  p_status VARCHAR(20),
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_booking_status VARCHAR(50);
BEGIN
  SELECT status INTO v_booking_status FROM public.bookings WHERE id = p_booking_id;

  IF v_booking_status NOT IN ('pending_payment', 'payment_uploaded') THEN
    RETURN false;
  END IF;

  IF p_status = 'verified' THEN
    UPDATE public.bookings
    SET status = 'paid', payment_verified_at = NOW(),
        payment_verified_by = p_admin_id
    WHERE id = p_booking_id;

    UPDATE public.payment_proofs
    SET status = 'verified', verified_by = p_admin_id, verified_at = NOW()
    WHERE booking_id = p_booking_id AND status = 'pending';

  ELSIF p_status = 'partial' THEN
    -- Terima pembayaran sebagian: tandai proof ini verified, kembalikan booking
    -- ke status 'approved' supaya peminjam bisa upload bukti sisa pembayaran
    UPDATE public.payment_proofs
    SET status = 'verified', verified_by = p_admin_id, verified_at = NOW()
    WHERE booking_id = p_booking_id AND status = 'pending';

    UPDATE public.bookings
    SET status = 'approved', payment_proof_url = NULL
    WHERE id = p_booking_id;

  ELSIF p_status = 'rejected' THEN
    UPDATE public.payment_proofs
    SET status = 'rejected', verified_by = p_admin_id,
        verified_at = NOW(), rejection_reason = p_rejection_reason
    WHERE booking_id = p_booking_id AND status = 'pending';

    -- payment_rejected: peminjam harus upload ulang bukti
    UPDATE public.bookings
    SET status = 'payment_rejected', payment_proof_url = NULL
    WHERE id = p_booking_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ACTIVITY LOG — audit trail untuk tabel utama
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT'; v_new_data := to_jsonb(NEW); v_old_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE'; v_old_data := to_jsonb(OLD); v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE'; v_old_data := to_jsonb(OLD); v_new_data := NULL;
  END IF;

  BEGIN
    INSERT INTO public.activity_logs (
      table_name, record_id, action, old_data, new_data, performed_by, performed_at
    ) VALUES (
      TG_TABLE_NAME, COALESCE(NEW.id, OLD.id),
      v_action, v_old_data, v_new_data, auth.uid(), NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Activity log error: %', SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS activity_log_bookings ON public.bookings;
CREATE TRIGGER activity_log_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS activity_log_users ON public.users;
CREATE TRIGGER activity_log_users
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS activity_log_equipment ON public.equipment;
CREATE TRIGGER activity_log_equipment
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS activity_log_rooms ON public.rooms;
CREATE TRIGGER activity_log_rooms
  AFTER INSERT OR UPDATE OR DELETE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS activity_log_buildings ON public.buildings;
CREATE TRIGGER activity_log_buildings
  AFTER INSERT OR UPDATE OR DELETE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS activity_log_payment_proofs ON public.payment_proofs;
CREATE TRIGGER activity_log_payment_proofs
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Fungsi query activity log
CREATE OR REPLACE FUNCTION public.get_recent_activity(
  p_limit INTEGER DEFAULT 50,
  p_table_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID, table_name TEXT, record_id UUID, action TEXT,
  old_data JSONB, new_data JSONB, performed_by UUID,
  performed_at TIMESTAMPTZ, user_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT al.id, al.table_name, al.record_id, al.action,
    al.old_data, al.new_data, al.performed_by, al.performed_at,
    u.name AS user_name
  FROM public.activity_logs al
  LEFT JOIN public.users u ON u.id = al.performed_by
  WHERE (p_table_name IS NULL OR al.table_name = p_table_name)
  ORDER BY al.performed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Functions and triggers configured successfully!' AS status;
