# Design: Jadwal Kuliah Berulang (Recurring Course Schedules)

## Tanggal: 2026-06-10
## Status: Approved

---

## 1. Overview

Fitur ini memungkinkan admin untuk mengelola jadwal kuliah berulang per semester. Jadwal kuliah otomatis memblok waktu ruangan sehingga tidak bisa dipesan pada saat kuliah berlangsung. Data jadwal ditampilkan di kalender ketersediaan publik.

## 2. Goals

- [ ] Admin bisa input jadwal kuliah secara manual (form)
- [ ] Admin bisa upload jadwal dari fakultas via CSV/Excel
- [ ] Jadwal kuliah berulang otomatis ter-generate untuk setiap minggu dalam semester
- [ ] Ruangan otomatis terblok pada waktu kuliah (tidak bisa dipesan)
- [ ] Kalender publik menampilkan jadwal kuliah dengan label "Kuliah"
- [ ] Revisi jadwal bisa dilakukan dengan edit template, instance otomatis di-rebuild

## 3. Non-Goals

- UI untuk dosen/fakultas mengirim jadwal (hanya admin yang input)
- Konflik jadwal kuliah antar fakultas otomatis (admin yang harus cek manual)
- Notifikasi ke dosen mahasiswa (bukan scope ini)

## 4. Architecture: Denormalized Block (Rekomendasi)

- Buat tabel template `course_schedules` menyimpan pola recurring (mata kuliah, dosen, hari, jam, semester)
- Saat template dibuat/simpan, sistem **generate instance** ke `room_schedule_blocks` untuk setiap hari dalam semester
- Kalender dan conflict detection cukup query `room_schedule_blocks` (sudah ada), tanpa perlu modifikasi query structure
- **Pro**: Integrasi sempurna dengan kalender & booking yang ada. Query sederhana. Mudah debug.
- **Kontra**: Data redundant (banyak baris). Edit template harus regenerate instance.

## 5. Database Schema

### 5.1 Tabel Baru: `course_schedules`

| Kolom | Tipe | Constraints | Keterangan |
|-------|------|-------------|------------|
| `id` | UUID | PK DEFAULT gen_random_uuid() | ID unik |
| `room_id` | UUID | NOT NULL, FK → rooms(id) | Ruangan |
| `mata_kuliah` | TEXT | NOT NULL | Nama mata kuliah |
| `dosen` | TEXT | NOT NULL | Nama dosen |
| `fakultas` | TEXT | NOT NULL | Nama fakultas |
| `kelas` | TEXT | NOT NULL | Kelas grup |
| `semester` | TEXT | NOT NULL | Contoh: "Ganjil 2026" |
| `day_of_week` | INTEGER | NOT NULL CHECK(0-6) | 0=Min, 1=Sen, 6=Sab |
| `start_time` | TIME | NOT NULL | Jam mulai |
| `end_time` | TIME | NOT NULL CHECK(end_time > start_time) | Jam selesai |
| `start_date` | DATE | NOT NULL | Tanggal mulai semester |
| `end_date` | DATE | NOT NULL CHECK(end_date > start_date) | Tanggal akhir semester |
| `is_active` | BOOLEAN | DEFAULT true | Aktif/tidak |
| `created_by` | UUID | NOT NULL, FK → users(id) | Admin pembuat |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Timestamp |

### 5.2 Extend Kolom di `room_schedule_blocks`

| Kolom | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `schedule_type` | TEXT | 'maintenance' | 'maintenance' atau 'class' |
| `course_schedule_id` | UUID | NULL | FK → course_schedules(id) |
| `mata_kuliah` | TEXT | NULL | Nama mata kuliah |
| `dosen` | TEXT | NULL | Nama dosen |
| `fakultas` | TEXT | NULL | Nama fakultas |
| `kelas` | TEXT | NULL | Nama kelas |
| `semester` | TEXT | NULL | Nama semester |

### 5.3 RLS Policies

```sql
CREATE POLICY "course_schedules_select_all"
  ON public.course_schedules FOR SELECT USING (true);

CREATE POLICY "course_schedules_admin_all"
  ON public.course_schedules FOR ALL
  USING (public.is_admin());
```

### 5.4 Function & Trigger

```sql
-- Function: regenerate instance saat template diubah
CREATE OR REPLACE FUNCTION public.regenerate_course_schedule_instances()
RETURNS TRIGGER AS $$
BEGIN
  -- Hapus instance lama
  DELETE FROM public.room_schedule_blocks
  WHERE course_schedule_id = NEW.id;

  -- Generate instance baru
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
  FROM generate_series(NEW.start_date, NEW.end_date, '1 day') AS d
  WHERE EXTRACT(DOW FROM d) = NEW.day_of_week
  AND d >= CURRENT_DATE - INTERVAL '1 day';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: AFTER INSERT OR UPDATE
CREATE TRIGGER trg_course_schedule_regenerate
AFTER INSERT OR UPDATE ON public.course_schedules
FOR EACH ROW EXECUTE FUNCTION public.regenerate_course_schedule_instances();

-- Trigger: BEFORE DELETE
CREATE TRIGGER trg_course_schedule_cleanup
BEFORE DELETE ON public.course_schedules
FOR EACH ROW EXECUTE FUNCTION public.delete_course_schedule_instances();
```

## 6. API / Server Actions

### 6.1 `createCourseSchedule(formData)`
- Insert ke `course_schedules`
- Trigger auto-generate instance
- Return success/error

### 6.2 `updateCourseSchedule(id, formData)`
- Update template
- Trigger regenerate instance
- Return success/error

### 6.3 `deleteCourseSchedule(id)`
- Hapus template
- Trigger hapus instance
- Return success/error

### 6.4 `importCourseSchedulesFromCSV(file)`
- Parse CSV
- Validasi kolom
- Lookup room_id by name
- Insert batch ke `course_schedules`
- Trigger auto-generate instance per row
- Return summary: berhasil, gagal, error details

### 6.5 `getCourseSchedules(roomId?)`
- Query `course_schedules` dengan filter optional room_id
- Order by semester, day_of_week, start_time

## 7. UI / Admin Pages

### 7.1 `/admin/rooms/[id]/course-schedules`
- **Tabel**: Daftar jadwal kuliah untuk ruangan ini
  - Kolom: Mata Kuliah, Dosen, Fakultas, Kelas, Hari, Jam, Semester
  - Aksi: Edit, Hapus
- **Tombol**: "Tambah Jadwal", "Import CSV"
- **Filter**: Semester, Fakultas
- **Search**: Mata kuliah, Dosen

### 7.2 Modal: Tambah / Edit Jadwal
- Form fields:
  - Mata Kuliah (text)
  - Dosen (text)
  - Fakultas (text)
  - Kelas (text)
  - Semester (text, placeholder: "Ganjil 2026")
  - Hari (dropdown: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)
  - Jam Mulai (time picker)
  - Jam Selesai (time picker)
  - Tanggal Mulai Semester (date picker)
  - Tanggal Akhir Semester (date picker)

### 7.3 `/admin/course-schedules` (Global View)
- Tabel: Semua jadwal kuliah dari semua ruangan
- Filter: Semester, Fakultas, Ruangan
- Search: Mata kuliah, Dosen
- Export: CSV download

### 7.4 CSV Import Dialog
- Upload file area (drag & drop)
- Preview table (5 baris pertama)
- Kolom mapping (auto-detect dari header)
- Tombol: "Import" (insert ke DB), "Cancel"

## 8. CSV Format

Format wajib untuk upload dari fakultas:

```csv
mata_kuliah,dosen,fakultas,kelas,semester,ruangan,hari,jam_mulai,jam_selesai,tanggal_mulai,tanggal_selesai
Fisika Dasar,Dr. Budi,FMIPA,Kelas A,Ganjil 2026,Ruang Kelas 1,Senin,08:00,10:00,2026-08-01,2026-12-15
Kimia Organik,Prof. Ani,FMIPA,Kelas B,Ganjil 2026,Ruang Kelas 2,Selasa,10:00,12:00,2026-08-01,2026-12-15
```

**Ketentuan:**
- Header harus sesuai (case insensitive, bisa spasi/garis bawah)
- `ruangan` harus match nama ruangan di database (case insensitive)
- `hari` dalam bahasa Indonesia: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu
- `jam_mulai` dan `jam_selesai` format HH:MM atau HH:MM:SS
- `tanggal_mulai` dan `tanggal_selesai` format YYYY-MM-DD
- Semester tidak divalidasi (free text)

## 9. Kalender Publik (Update)

### 9.1 `CalendarView.tsx`
- Query tambahan ke `room_schedule_blocks` untuk `schedule_type = 'class'`
- Warna baru untuk jadwal kuliah:
  - 🔴 Penuh (booking) — merah (existing)
  - 🟢 Tersedia — hijau (existing)
  - 🔵 Jadwal Kuliah — biru
  - 🔧 Maintenance — abu-abu (existing)

### 9.2 `src/app/rooms/[id]/page.tsx` (Section Jadwal)
- Di bawah "Jadwal Peminjaman", tambahkan section "Jadwal Kuliah Mendatang"
- Tampilkan 5 jadwal kuliah terdekat (sorted by start_datetime)
- Label: mata_kuliah, dosen, kelas, waktu

### 9.3 `src/app/schedule/page.tsx`
- Tampilkan jadwal kuliah juga di halaman jadwal publik
- Warna badge: biru untuk "Jadwal Kuliah"

## 10. Conflict Detection (Update)

### 10.1 `src/app/(borrower)/booking/new/actions.ts`

Tambah step 3 di conflict detection:

```typescript
// Step 3: Cek overlapping room_schedule_blocks (class schedules)
const { data: classBlocks } = await supabase
  .from('room_schedule_blocks')
  .select('mata_kuliah, dosen, start_datetime, end_datetime')
  .eq('room_id', roomId)
  .eq('schedule_type', 'class')
  .lt('start_datetime', endDt.toISOString())
  .gt('end_datetime', startDt.toISOString())

if (classBlocks && classBlocks.length > 0) {
  const block = classBlocks[0]
  return {
    error: `Ruangan sedang dipakai untuk jadwal kuliah "${block.mata_kuliah}" (Dosen: ${block.dosen}) pada ${formatDateTime(block.start_datetime)}`
  }
}
```

## 11. Migration File

File: `supabase/migrations/20250610_course_schedules.sql`

Berisi:
1. CREATE TABLE course_schedules
2. ALTER TABLE room_schedule_blocks (add kolom baru)
3. CREATE POLICY RLS
4. CREATE FUNCTION regenerate_course_schedule_instances()
5. CREATE FUNCTION delete_course_schedule_instances()
6. CREATE TRIGGER trg_course_schedule_regenerate
7. CREATE TRIGGER trg_course_schedule_cleanup
8. CREATE INDEX idx_course_schedules_room, semester, dll.
9. UPDATE room_schedule_blocks SET schedule_type = 'maintenance' WHERE schedule_type IS NULL

## 12. Testing Checklist

- [ ] Admin bisa tambah jadwal kuliah via form
- [ ] Instance otomatis generate di room_schedule_blocks
- [ ] Admin bisa edit jadwal, instance otomatis rebuild
- [ ] Admin bisa hapus jadwal, instance otomatis hapus
- [ ] CSV upload berhasil parse & insert
- [ ] CSV upload gagal kalau ruangan tidak ditemukan
- [ ] Kalender publik menampilkan jadwal kuliah (warna biru)
- [ ] Booking conflict terdeteksi kalau overlap dengan jadwal kuliah
- [ ] Booking conflict tidak terdeteksi kalau tidak overlap
- [ ] Halaman `/admin/rooms/[id]/course-schedules` menampilkan jadwal ruangan
- [ ] Halaman `/admin/course-schedules` menampilkan semua jadwal
- [ ] Revisi jadwal (dosen ganti jam) → instance rebuild

## 13. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Banyak instance (16 minggu × 50 matkul = 800 baris) | Performance query kalender | Index pada room_schedule_blocks(room_id, start_datetime, schedule_type) |
| Ruangan nama tidak match CSV | Import gagal | Case insensitive match, fuzzy search, admin bisa edit mapping |
| Rebuild instance lama saat edit | Delete + Insert banyak baris | Gunakan transaction, tampilkan loading state |
| Fakultas kirim format CSV beda | Parser gagal | Template + validasi, error report per baris |

---

*Spec ini disetujui user pada 2026-06-10. Siap untuk implementation planning.*
