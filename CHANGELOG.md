# Changelog - Sewa Ruang & Alat

All notable changes and fixes to the system.

## [Unreleased] - 2025-05-12

### Added

#### Kalender Ketersediaan Visual - Catalog Page
**Fitur:** Menampilkan kalender ketersediaan real-time untuk ruangan dan alat pada halaman katalog.

**Files Created:**
- `src/components/calendar/CalendarView.tsx` - Komponen kalender menggunakan react-big-calendar
- Installed package: `react-big-calendar` untuk tampilan kalender interaktif

**Files Modified:**
- `src/app/catalog/CatalogClient.tsx` - Menambahkan tombol kalender (ikon calendar) pada setiap card ruangan dan alat

**Features:**
- Kalender bulanan dengan navigasi previous/next month
- Visual indicator: 🟢 Hijau = Tersedia, 🔴 Merah = Terbooking
- Summary stats: Jumlah slot tersedia, terbooking, dan total
- Integrasi dengan tabel `room_booking_slots` dan `equipment_booking_slots`
- Dialog modal untuk menampilkan kalender per item
- Locale Indonesia (hari dan bulan dalam bahasa Indonesia)

**Usage:**
1. Buka halaman `/catalog`
2. Klik ikon kalender (📅) pada card ruangan atau alat
3. Lihat ketersediaan untuk bulan ini dan bulan berikutnya

---

#### Bug Fix - Hydration Error on Catalog
**Issue:** Error "In HTML, <button> cannot be a descendant of <button>" pada DialogTrigger.

**Fix:** Menghapus prop `asChild` dari DialogTrigger dan membungkus Button dalam div.

**Files Modified:**
- `src/app/catalog/CatalogClient.tsx` - Fixed RoomCard & EquipmentCard DialogTrigger

---

#### UI Improvements - Catalog & Calendar
**Fitur:** Perbaikan tampilan katalog dan kalender untuk UX yang lebih baik.

**Files Modified:**
- `src/app/catalog/CatalogClient.tsx` - Redesign complete catalog page
- `src/components/calendar/CalendarView.tsx` - Optimized calendar component

**Improvements:**

**Catalog Page:**
- New modern hero section dengan gradient background
- Tab-based navigation (Ruangan / Alat) dengan badge counter
- Redesigned cards dengan image placeholder
- Better filter layout dengan search dan dropdown
- Compact pagination dengan ellipsis
- Empty states yang lebih informatif
- CTA section di bagian bawah
- Responsive grid layout

**Calendar Component:**
- Compact mode untuk dialog popup (prop: `compact`)
- Custom calendar grid tanpa library berat
- Color-coded status: 🟢 Tersedia, 🔴 Penuh
- Today indicator
- Navigation bulanan
- Summary stats di bawah kalender
- MiniCalendar component untuk inline display
- Smaller dialog size (max-w-md)

**Admin Dashboard:**
- More compact layout
- 2-column stats grid on mobile
- Recent bookings sidebar
- Quick links card
- Better space utilization

---

#### Public Schedule View - Jadwal Peminjaman (Read-Only, Tanpa Login)
**Fitur:** Halaman publik untuk melihat jadwal peminjaman ruangan yang telah disetujui tanpa perlu login.

**Files Created:**
- `src/app/schedule/page.tsx` - Server Component untuk menampilkan jadwal publik

**Features:**
- Akses tanpa login (public access)
- Menampilkan booking dengan status: approved, active, completed
- Timeline view per bulan (3 bulan ke depan)
- Group by room - daftar ruangan dengan jumlah peminjaman
- Detail booking: tujuan, peminjam, institusi, tanggal, durasi
- Status indicators: 🟢 Disetujui, 🔵 Berlangsung, ⚪ Selesai
- Statistics: Total ruangan, total peminjaman, sedang berlangsung, selesai
- Responsive design untuk mobile dan desktop
- Server-side rendering dengan revalidate 60 detik
- Locale Indonesia (hari dan bulan dalam bahasa Indonesia)

**Usage:**
1. Akses `/schedule` tanpa login
2. Lihat jadwal peminjaman per bulan
3. Klik detail untuk melihat informasi lengkap

---

#### Activity Log / Audit Trail System
**Fitur:** Sistem audit trail untuk mencatat semua perubahan data (INSERT, UPDATE, DELETE) pada tabel penting.

**Files Created:**
- `supabase/migrations/20250513_create_activity_logs.sql` - Migration untuk setup tabel dan triggers
- `src/app/(admin)/admin/logs/page.tsx` - Admin page untuk melihat activity log

**Database Changes:**
- Tabel baru: `activity_logs` dengan kolom: table_name, record_id, action, old_data, new_data, performed_by, performed_at
- Triggers pada tabel: bookings, users, equipment, rooms, buildings, payment_proofs
- Function: `log_activity()` untuk otomatis mencatat perubahan
- Function: `get_recent_activity()` untuk mengambil log dengan user info

**Features:**
- Automatic logging tanpa perlu code changes
- Track INSERT, UPDATE, DELETE operations
- Simpan old_data dan new_data (JSONB) untuk audit
- Admin-only access (RLS policy)
- Filter by table name
- Pagination (20 logs per page)
- Summary stats: total aktivitas, penambahan, perubahan, penghapusan
- Human-readable action labels (Tambah, Ubah, Hapus)
- Show changed fields summary untuk UPDATE operations
- Indonesian locale untuk timestamps

**Tracked Tables:**
- bookings (Peminjaman)
- users (Pengguna)
- equipment (Alat)
- rooms (Ruangan)
- buildings (Gedung)
- payment_proofs (Bukti Pembayaran)

**Usage:**
1. Jalankan migration SQL di Supabase
2. Akses `/admin/logs` sebagai Super Admin
3. Lihat riwayat perubahan data
4. Filter berdasarkan tabel

---

#### Auto-generate PDF Invoice
**Fitur:** Generate invoice PDF secara otomatis dari booking details.

**Files Created:**
- `src/app/api/bookings/[id]/invoice/route.ts` - API endpoint untuk generate invoice PDF (dengan Puppeteer)
- `src/app/api/bookings/[id]/invoice/simple/route.ts` - API endpoint untuk generate invoice HTML (tanpa Puppeteer)

**Dependencies Installed:**
- `puppeteer-core` - Untuk generate PDF dari HTML

**Features:**
- Generate invoice dari booking data
- Include booking items (ruangan & alat)
- Auto-calculate subtotal dan total
- Format currency Rupiah (IDR)
- Institution branding dari profile
- Customer details (nama, email)
- Invoice number dan invoice date
- Notes: tanggal peminjaman dan status
- Professional PDF layout dengan header & footer
- Signature sections untuk admin dan customer
- Access control: Admin bisa lihat semua, user hanya invoice sendiri
- Fallback ke HTML jika PDF generation gagal

**API Endpoints:**
- `GET /api/bookings/[id]/invoice` - Generate PDF invoice (requires Puppeteer)
- `GET /api/bookings/[id]/invoice/simple` - Generate HTML invoice (browser printable)

**Integration:**
Tambahkan tombol download di booking detail page:
```tsx
<a 
  href={`/api/bookings/${bookingId}/invoice/simple`}
  target="_blank"
  className="..."
>
  Download Invoice
</a>
```

**Usage:**
1. Buka detail booking
2. Klik "Download Invoice"
3. Invoice akan terbuka di tab baru (HTML format)
4. Print ke PDF menggunakan browser print dialog (Ctrl+P)

**For Production (PDF generation):**
1. Setup Chrome/Chromium executable path
2. Atau gunakan `chrome-aws-lambda` untuk Vercel
3. Update environment variable: `CHROME_EXECUTABLE_PATH`

---

#### Dashboard Analytics - Grafik Statistik untuk Admin
**Fitur:** Dashboard dengan visualisasi data dan grafik statistik untuk monitoring sistem.

**Files Created:**
- `src/components/dashboard/DashboardAnalytics.tsx` - Komponen analytics dengan grafik

**Dependencies Installed:**
- `recharts` - Library untuk membuat grafik dan chart

**Features:**
- Time range selector: 7 Hari, 30 Hari, 3 Bulan, 1 Tahun
- Stats cards dengan trend indicators:
  - Total Peminjaman
  - Peminjaman Aktif
  - Total Pendapatan
  - Total Pengguna
- Trend comparison vs periode sebelumnya
- Tren Peminjaman Harian (Line Chart)
- Status Peminjaman (Pie Chart dengan legend)
- Ruangan Paling Sering Dipinjam (Horizontal Bar Chart)
- Alat Paling Sering Dipinjam (Horizontal Bar Chart)
- Daftar Peminjaman Terbaru dengan status badge
- Real-time data fetching dari Supabase
- Responsive design untuk semua ukuran layar
- Indonesian locale untuk tanggal dan angka

**Integration:**
Komponen otomatis muncul di admin dashboard setelah stats cards.

**Usage:**
1. Login sebagai admin
2. Buka halaman `/admin/dashboard`
3. Pilih time range (7H/30H/3B/1T)
4. Lihat grafik dan statistik

---

#### Booking Reminders - Sistem Reminder Otomatis
**Fitur:** Sistem pengingat otomatis untuk peminjaman via email/WhatsApp.

**Files Created:**
- `supabase/migrations/20250514_create_booking_reminders.sql` - Migration untuk setup reminders
- `src/app/api/reminders/process/route.ts` - API endpoint untuk memproses reminders
- `src/components/booking/BookingReminders.tsx` - UI component untuk menampilkan reminders

**Database Changes:**
- Tabel baru: `booking_reminders` dengan kolom: booking_id, reminder_type, scheduled_at, sent_at, status, channel, message
- Trigger: `auto_create_booking_reminders` - Auto-create reminders saat booking approved
- Functions:
  - `process_pending_reminders()` - Ambil reminders yang perlu dikirim
  - `mark_reminder_sent()` - Tandai reminder sudah terkirim
  - `get_booking_reminders()` - Ambil reminders untuk booking tertentu

**Automatic Reminders:**
- 1 hari sebelum mulai (before_start)
- Saat tanggal mulai (after_start)
- 1 hari sebelum selesai (before_end)
- Saat tanggal selesai/pengembalian (after_end)

**Features:**
- Auto-create reminders saat booking di-approve
- Multiple channels: Email, WhatsApp
- Scheduled sending dengan cron job
- Status tracking: pending, sent, failed, cancelled
- Custom message untuk setiap reminder type
- UI di booking detail untuk melihat reminders
- Cancel reminder functionality
- Integration dengan existing emailService dan whatsappService

**API Endpoints:**
- `GET /api/reminders/process` - Process pending reminders (cron job)

**Cron Job Setup (Vercel):**
```json
{
  "crons": [
    {
      "path": "/api/reminders/process",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Usage:**
1. Jalankan migration SQL di Supabase
2. Setup cron job untuk memanggil `/api/reminders/process` setiap jam
3. Saat booking di-approve, reminders otomatis dibuat
4. User akan menerima reminder sesuai jadwal
5. Admin dapat melihat status reminders di booking detail

---

#### Register Page & User Profile with Photo Upload
**Fitur:** Halaman register dan profil user dengan kemampuan upload foto profil.

**Files Created:**
- `src/app/(borrower)/profile/page.tsx` - Halaman profil lengkap dengan tabs
- `supabase/migrations/20250514_create_avatar_storage.sql` - Storage bucket untuk avatars

**Files Modified:**
- `src/app/(auth)/register/page.tsx` - Tambah upload foto profil saat registrasi

**Features:**
- **Register Page:**
  - Upload foto profil menggunakan ImageUpload component
  - Support URL, file upload, dan camera capture
  - Validasi file (max 5MB, image only)
  - Preview foto sebelum submit
  
- **Profile Page:**
  - Tabs: Profil & Riwayat Peminjaman
  - Display foto profil (circular) dengan fallback icon
  - Edit semua data profil kecuali email
  - ImageUpload component untuk ganti foto
  - Real-time preview
  - Form validation dengan Zod
  - Riwayat peminjaman dengan status badges
  - Member info card (join date, role)
  
- **Storage Setup:**
  - Bucket: `avatars` dengan folder `users/`
  - Policies: upload, update, delete untuk authenticated users
  - Public read access
  - File size limit: 5MB
  - Allowed types: JPEG, PNG, WEBP, GIF

**Database Changes:**
- Added column `photo_url` to `users` table

**Usage:**
1. Register: Upload foto saat membuat akun (opsional)
2. Profile: `/profile` - Edit data dan foto profil
3. Riwayat: Lihat daftar peminjaman di tab kedua

---

### Fixed

#### Login Loop — 500 Error pada Query `users` Table (RLS Infinite Recursion)
**Issue:** Setelah login berhasil (credentials valid), user dikembalikan ke halaman login terus-menerus.

**Log error:**
```
GET https://<project>.supabase.co/rest/v1/users?select=role&id=eq.<uid> 500 (Internal Server Error)
```

**Root Cause:** Migration `20250512_super_admin_permissions.sql` (committed) menambahkan policy baru pada tabel `users`:
```sql
CREATE POLICY "Admins and super_admins can manage users"
  ON public.users FOR ALL   -- ← mencakup SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users   -- ← query users di dalam policy users!
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
```
Policy `FOR ALL` ini mengevaluasi subquery ke `public.users` saat SELECT → PostgreSQL mendeteksi **infinite recursion** → melempar 500 error.

**Efek domino:**
1. `login/page.tsx` → query users → 500 → `profile` null → `router.push('/dashboard')`
2. `BorrowerLayout` (`src/app/(borrower)/layout.tsx:16`) → query users → 500 → `if (!profile) redirect('/login')`
3. `AdminLayout` (`src/app/(admin)/layout.tsx:50`) → query users → 500 → `if (!profile) redirect('/dashboard')`

**Fix Applied:**

1. **SQL Migration** (`supabase/migrations/20250512_fix_users_rls_final.sql`) — **wajib dijalankan di Supabase SQL Editor**:
   - Drop semua policy lama pada `users` secara dinamis
   - Buat ulang hanya policy non-recursive:
     - `SELECT` → `USING (true)` untuk semua authenticated user
     - `UPDATE` → `USING (id = auth.uid())`
     - `INSERT` → `WITH CHECK (id = auth.uid())`
   - Operasi admin (DELETE, INSERT user lain) dilakukan via service role key di server-side — service role otomatis bypass RLS

2. **Semua admin `page.tsx`** — switch dari `createClient()` ke `createAdminClient()` (service role) agar data fetching tidak bergantung pada konfigurasi RLS:
   ```typescript
   // Before:
   import { createClient } from '@/lib/supabase/server'
   // After:
   import { createAdminClient as createClient } from '@/lib/supabase/server'
   ```
   Files terdampak: 26 file `page.tsx` di `src/app/(admin)/admin/`

---

#### Bookings Page — Data Tidak Muncul (Ambiguous Foreign Key)
**Issue:** Halaman `/admin/bookings` menampilkan "Tidak ada data pengajuan" meski data ada di database.

**Root Cause:** Query PostgREST menggunakan `users(...)` tanpa hint FK:
```typescript
// bookings/page.tsx (before)
.select(`..., users(name, email, phone, ...)`)
```
Tabel `bookings` memiliki **dua FK ke tabel `users`**:
- `user_id` (FK utama — peminjam)
- `payment_verified_by` (ditambahkan oleh migration QR payment)

PostgREST tidak bisa menentukan FK mana yang dimaksud → mengembalikan error → `data` null → array kosong → halaman kosong. Error ini **silent** karena kode tidak memeriksa `{ error }`.

**Fix Applied** (`src/app/(admin)/admin/bookings/page.tsx`):
```typescript
// Before:
users(name, email, phone, telegram_username, institution, class_division)

// After:
users!user_id(name, email, phone, telegram_username, institution, class_division)
```

---

#### Payments Page — Data Tidak Muncul (Query Kolom Tidak Ada)
**Issue:** Halaman `/admin/payments` menampilkan "Belum ada transaksi pembayaran" meski booking sudah ada.

**Root Cause:** Query meminta kolom `payment_status` yang **tidak ada** pada tabel `bookings`:
```typescript
// payments/page.tsx (before)
.select(`..., payment_status, ...`)
```
Kolom `payment_status` adalah sebuah TYPE enum di database (`CREATE TYPE payment_status`), dan ada sebagai kolom di tabel `payments` — bukan di tabel `bookings`. Tabel `bookings` hanya punya kolom `status` (dengan type `booking_status`). PostgREST mengembalikan error 400 → `data` null → tabel kosong. Error ini **silent** karena kode tidak memeriksa `{ error }`.

**Fix Applied** (`src/app/(admin)/admin/payments/page.tsx`):
```typescript
// Before:
.select(`..., status, payment_status, payment_code, ...`)

// After:
.select(`..., status, payment_code, ...`)
```
Removed `payment_status` dari select query dan TypeScript type definition.

---

#### User Creation - "Database error creating new user" (Auth API Error)
**Issue:** Creating new users via admin API failed with error:
- Error: `Database error creating new user`
- Code: `unexpected_failure`
- Status: `500`

**Root Cause:** The database trigger `on_auth_user_created` on `auth.users` table was failing when trying to insert into `public.users`. This caused the entire auth transaction to rollback.

**Symptoms:**
1. Test script (`scripts/test-auth.js`) showed `AuthApiError: Database error creating new user`
2. Listing users worked fine (proving service role key is valid)
3. Creating auth user failed with 500 error

**Fix Applied:**

1. **Modified trigger function** (`supabase/migrations/20250512_fix_auth_trigger.sql`):
   - Added `EXCEPTION WHEN OTHERS` block to catch and log errors without failing the auth transaction
   - Wrapped INSERT in BEGIN/EXCEPTION block
   - Changed from `ON CONFLICT DO NOTHING` to `ON CONFLICT DO UPDATE` for better handling
   - Added proper COALESCE defaults for all nullable fields

2. **Database schema fixes**:
   - Added missing columns: `phone`, `borrower_category`, `institution`, `class_division`, `identity_number`, `telegram_username`
   - Set proper DEFAULT values for all columns
   - Disabled RLS on `public.users` table
   - Granted proper permissions

3. **API route improvements** (`src/app/api/super-admin/users/route.ts`):
   - Better error logging and debugging
   - Fallback to manual insert if trigger fails
   - Uses empty strings instead of NULL for optional fields

**SQL Migration Required:**
```sql
-- Run this in Supabase Dashboard → SQL Editor
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.users (id, name, email, role, phone, borrower_category, institution, class_division, identity_number, telegram_username, created_at, updated_at)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'borrower'), COALESCE(NEW.raw_user_meta_data->>'phone', ''), COALESCE(NEW.raw_user_meta_data->>'borrower_category', 'mahasiswa'), COALESCE(NEW.raw_user_meta_data->>'institution', ''), COALESCE(NEW.raw_user_meta_data->>'class_division', ''), COALESCE(NEW.raw_user_meta_data->>'identity_number', ''), COALESCE(NEW.raw_user_meta_data->>'telegram_username', ''), NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Trigger error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Testing:**
```bash
node scripts/test-auth.js
```

---

#### DeleteUserButton - Hydration Error (Nested Buttons)
**Issue:** Console error: `In HTML, <button> cannot be a descendant of <button>. This will cause a hydration error.`

**Root Cause:** `AlertDialogTrigger` component renders its own `<button>` element, and inside it was another `<Button>` component from shadcn/ui.

**Fix Applied:** (`src/app/(admin)/admin/users/DeleteUserButton.tsx`)
- Changed from wrapping a `<Button>` inside `<AlertDialogTrigger>` 
- To applying button styling classes directly to `AlertDialogTrigger` using `buttonVariants()`

```tsx
// Before (broken):
<AlertDialogTrigger asChild>
  <Button>...</Button>
</AlertDialogTrigger>

// After (fixed):
<AlertDialogTrigger
  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), '...')}
>
  <Trash2 className="h-3.5 w-3.5" />
</AlertDialogTrigger>
```

---

## [Previous] - 2025-05-11

### Database Migrations

- Added `institution_profile` table for storing institution branding
- Fixed RLS policies for notifications and templates
- Added `borrower_category` and additional fields to `users` table
- Fixed inventory RLS policies

### Features

- Institution profile settings page
- Public pages with dynamic branding
- Email/PDF templates with institution branding
- Admin dashboard with institution banner

## Environment Variables Required

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Must have service_role, NOT anon

# Email (Required for password reset)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com

# Optional
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
TELEGRAM_BOT_TOKEN=...
```

## Troubleshooting Guide

### "Database error creating new user"
1. Check Supabase Dashboard → Logs → Auth for trigger errors
2. Run the migration SQL above to fix the trigger
3. Ensure `public.users` table has all required columns
4. Test with: `node scripts/test-auth.js`

### Hydration errors with buttons
- Use `asChild` prop carefully - some shadcn components don't work well with it
- Alternative: Apply button styles directly using `buttonVariants()`

### Service Role Key Issues
- Must start with `eyJ...`
- JWT payload must have `"role": "service_role"`
- Can verify with: `node -e "const t='YOUR_KEY'; console.log(JSON.parse(Buffer.from(t.split('.')[1],'base64').toString()))"`

---

## Summary: Development Session 2025-05-12

### ✅ Completed Features:

| Category | Features | Status |
|----------|----------|--------|
| **Authentication** | Login with RLS fix | ✅ Done |
| | Register with photo upload | ✅ Done |
| | User profile page | ✅ Done |
| **Catalog** | Modern catalog design | ✅ Done |
| | Calendar availability view | ✅ Done |
| | Room & Equipment cards | ✅ Done |
| **Admin Dashboard** | Compact layout | ✅ Done |
| | Analytics charts | ✅ Done |
| | Activity log | ✅ Done |
| **Public Pages** | Public schedule view | ✅ Done |
| | Institution branding | ✅ Done |
| **Booking System** | Booking reminders | ✅ Done |
| | Auto-generate invoice | ✅ Done |
| **Bug Fixes** | Hydration errors | ✅ Done |
| | RLS policies | ✅ Done |

### 📦 New Dependencies Added:
- `react-big-calendar` - Calendar display
- `recharts` - Analytics charts  
- `puppeteer-core` - PDF generation

### 🗄️ Database Migrations Created:
- `20250512_fix_users_rls_final.sql` - Fix RLS infinite recursion
- `20250513_create_activity_logs.sql` - Audit trail system
- `20250514_create_booking_reminders.sql` - Reminder system
- `20250514_create_avatar_storage.sql` - Photo upload storage

### 📄 New Pages Created:
- `/schedule` - Public booking schedule
- `/profile` - User profile with photo
- `/admin/logs` - Activity audit trail
- API: `/api/reminders/process` - Reminder processor
- API: `/api/bookings/[id]/invoice` - Invoice generator
