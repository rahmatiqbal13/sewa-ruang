# claudefix_bug.md — Sewa Ruang Bug Fix Log

Dokumentasi lengkap bug yang ditemukan dan diperbaiki oleh Claude AI pada sesi debugging sistem Sewa Ruang (Mei 2025). File ini dibuat agar AI lain dapat mempelajari pola bug yang umum di proyek ini.

---

## 1. `users` Table — RLS Recursive Policy (Fatal 500 Error)

**Symptom:** Halaman admin mengembalikan 500 Internal Server Error saat query data.

**Root Cause:** Policy RLS di tabel `users` menggunakan subquery ke `public.users` di dalam klausa `USING`, menyebabkan infinite recursion.

**Fix:** Gunakan `auth.uid()` secara langsung, TIDAK boleh query tabel `users` di dalam policy `users`.
```sql
-- ❌ WRONG - Recursive
CREATE POLICY "admin_all" ON public.users FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ✅ CORRECT - Non-recursive
CREATE POLICY "users_select_authenticated" ON public.users FOR SELECT
  TO authenticated USING (true);
```

**Files affected:** Supabase dashboard (SQL Editor), tidak ada file TypeScript.

---

## 2. `bookings` Table — Ambiguous Foreign Key to `users`

**Symptom:** Query PostgREST ke `bookings` dengan join `users(...)` mengembalikan 400 Bad Request.

**Root Cause:** Tabel `bookings` memiliki DUA foreign key ke tabel `users`:
- `user_id` (FK utama - peminjam)
- `payment_verified_by` (FK sekunder - admin verifikasi pembayaran)

PostgREST tidak bisa menentukan FK mana yang dipakai tanpa hint eksplisit.

**Fix:** SELALU gunakan FK hint `!user_id` saat join ke users dari bookings.
```typescript
// ❌ WRONG - Ambiguous, akan error 400
.select('*, users(name, email)')

// ✅ CORRECT - Explicit FK hint
.select('*, users!user_id(name, email, phone, institution)')
```

**Files fixed:**
- `src/app/(admin)/admin/bookings/[id]/page.tsx`
- `src/app/(admin)/admin/returns/page.tsx`
- `src/app/(admin)/admin/returns/[id]/page.tsx`
- `src/app/(admin)/admin/payments/page.tsx`
- `src/app/(admin)/admin/notifications/page.tsx` (notifications join via user_id)
- `src/app/(admin)/admin/reports/page.tsx`
- `src/app/api/notifications/send/route.ts`
- `src/app/api/payments/generate-qr/route.ts`
- `src/app/api/payments/get-qr/route.ts`
- `src/app/api/payments/get-va/route.ts`
- `src/components/layouts/NotificationBell.tsx`
- `src/app/(admin)/admin/assets/page.tsx` (deprecated page)

---

## 3. `booking_items` — Wrong FK Alias for room_id and equipment_id

**Symptom:** Nama ruangan/alat tidak muncul di halaman peminjaman user (borrower), tampil kosong.

**Root Cause:** Query `booking_items` menggunakan nama alias default tanpa FK hint untuk `room_id` dan `equipment_id`.

**Fix:**
```typescript
// ❌ WRONG
booking_items(item_type, room_id, equipment_id, rooms(name), equipment(name))

// ✅ CORRECT - Explicit FK aliases
booking_items(item_type, room_id, equipment_id, rooms:room_id(name, room_code), equipment:equipment_id(name, equipment_code))
```

**Files fixed:**
- `src/app/(borrower)/bookings/page.tsx`
- `src/app/(borrower)/bookings/[id]/page.tsx`

---

## 4. `bookings` — Wrong Column Names (`start_date`/`end_date` doesn't exist)

**Symptom:** Halaman jadwal publik, profil borrower, invoice, dan reminder menampilkan tanggal "Invalid Date" atau undefined.

**Root Cause:** Kolom di tabel `bookings` adalah `start_datetime` dan `end_datetime` (TIMESTAMP WITH TIME ZONE), BUKAN `start_date`/`end_date`. Banyak file yang masih menggunakan nama kolom lama.

**Fix:** Ganti semua referensi `start_date` → `start_datetime`, `end_date` → `end_datetime`.

**PENTING:** `src/app/(borrower)/booking/new/BookingForm.tsx` menggunakan `start_date`/`end_date` sebagai **nama field form** (bukan kolom DB). Ini BENAR - field form ini dikonversi ke `start_datetime`/`end_datetime` sebelum dikirim ke API. Jangan ubah file ini.

**Files fixed:**
- `src/app/schedule/page.tsx` — interface + query fields + filters + render
- `src/app/(borrower)/profile/page.tsx` — interface + display
- `src/app/api/reminders/process/route.ts` — message templates
- `src/app/api/bookings/[id]/invoice/route.ts` — invoice notes
- `src/app/api/bookings/[id]/invoice/simple/route.ts` — invoice notes

---

## 5. `booking_status` Enum — Missing Values

**Symptom:** `PATCH /api/.../bookings 400 Bad Request` dengan pesan "invalid input value for enum booking_status: 'pending_payment'".

**Root Cause:** PostgreSQL enum `booking_status` dibuat tanpa beberapa nilai yang dibutuhkan kode.

**Fix:** Jalankan migration SQL berikut di Supabase SQL Editor:
```sql
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_uploaded';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_rejected';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'active';

-- Reload schema cache PostgREST
NOTIFY pgrst, 'reload schema';
```

**Migration file:** `supabase/migrations/20250516_extend_booking_status_enum.sql`

**TypeScript types juga diupdate:**
- `src/types/supabase.ts` — `BookingStatus` type ditambahkan nilai baru

---

## 6. Trigger `auto_create_booking_reminders` — Wrong Column Names

**Symptom:** `PATCH bookings 400` dengan pesan "record "new" has no field "start_date"" saat admin approve booking.

**Root Cause:** Function trigger PostgreSQL `auto_create_booking_reminders` dibuat dengan referensi `NEW.start_date`/`NEW.end_date` padahal kolom sebenarnya `NEW.start_datetime`/`NEW.end_datetime`.

**Fix:**
```sql
CREATE OR REPLACE FUNCTION public.auto_create_booking_reminders()
RETURNS TRIGGER AS $$
DECLARE
  v_reminder_time TIMESTAMP WITH TIME ZONE;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Gunakan start_datetime / end_datetime, BUKAN start_date / end_date
    v_reminder_time := NEW.start_datetime - INTERVAL '1 day';
    ...
    v_reminder_time := NEW.end_datetime - INTERVAL '1 day';
    ...
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Migration file:** `supabase/migrations/20250516_fix_reminder_trigger_columns.sql`

---

## 7. Admin User Management — RLS Bypass via API

**Symptom:** Admin tidak bisa create/edit/delete user dari halaman `/admin/users`. Error "Permission denied" atau silent fail.

**Root Cause:** Komponen UI memanggil Supabase client langsung dari browser. RLS policy memblokir operasi admin pada tabel `users`.

**Fix:** Semua operasi user management (create, update role, update password) harus melalui API endpoint yang menggunakan `createAdminClient` (service_role key yang bypass RLS).

**Pattern:**
```typescript
// Client component → API route → createAdminClient → DB
// ❌ WRONG: Direct Supabase client dari browser
const { error } = await supabase.from('users').update({role}).eq('id', id)

// ✅ CORRECT: Via API route
await fetch('/api/super-admin/users/${id}', {
  method: 'PATCH',
  body: JSON.stringify({ role })
})
```

**Files created/modified:**
- `src/app/api/super-admin/users/route.ts` — POST (create user)
- `src/app/api/super-admin/users/[id]/route.ts` — PATCH (update user, role, password), DELETE
- `src/app/(admin)/admin/users/AddUserDialog.tsx`
- `src/app/(admin)/admin/users/EditUserDialog.tsx`
- `src/app/(admin)/admin/users/ChangeRoleButton.tsx`
- `src/app/(admin)/admin/users/ChangePasswordDialog.tsx` — New component

---

## 8. `users` Table — `updated_at` Column Doesn't Exist

**Symptom:** PATCH user endpoint mengembalikan "Could not find the 'updated_at' column of 'users' in the schema cache".

**Root Cause:** Tabel `users` tidak memiliki kolom `updated_at`. Kode salah menyertakan field ini dalam update query.

**Fix:** Hapus `updated_at: new Date().toISOString()` dari semua update query ke tabel `users`.

**Files fixed:**
- `src/app/api/super-admin/users/[id]/route.ts`
- `src/app/(borrower)/profile/page.tsx`

---

## 9. `plain_password` Column — Non-existent Before Migration

**Symptom:** PATCH user endpoint 500 error karena mencoba menyimpan ke kolom `plain_password` yang belum ada.

**Root Cause:** Kolom `plain_password` ditambahkan sebagai fitur baru untuk menampilkan password user kepada super admin (karena Supabase Auth menggunakan bcrypt yang tidak bisa di-reverse). Kolom ini perlu migration terpisah.

**Fix:**
1. Jalankan migration: `supabase/migrations/20250516_add_plain_password.sql`
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plain_password text;
```
2. Update ke kolom ini dilakukan non-blocking (fire-and-forget), sehingga fitur tetap berjalan meski migration belum dijalankan.

```typescript
// Non-blocking - jangan await, jangan lempar error
;(admin.from('users') as any)
  .update({ plain_password: password })
  .eq('id', id)
  .then(() => {}) // silent
```

---

## 10. Hydration Error — Base UI vs Radix UI Pattern

**Symptom:** Console error "Hydration failed because the initial UI does not match what was rendered on the server" di halaman admin/users. Error menyebut `<button>` nested inside `<button>`.

**Root Cause:** Proyek ini menggunakan `@base-ui/react`, BUKAN Radix UI. `DialogTrigger` di Base UI menggunakan prop `render={}`, bukan `asChild` seperti Radix.

**Fix:**
```tsx
// ❌ WRONG - Radix UI pattern (menyebabkan nested button)
<DialogTrigger asChild>
  <Button>Tambah User</Button>
</DialogTrigger>

// ✅ CORRECT - Base UI pattern
<DialogTrigger render={<Button />}>
  Tambah User
</DialogTrigger>
```

**Files fixed:**
- `src/app/(admin)/admin/users/AddUserDialog.tsx`

---

## 11. `booking_assets` / `assets` Table References (Deprecated)

**Symptom:** Notification bell dan halaman admin tidak menampilkan nama aset dengan benar.

**Root Cause:** Beberapa file masih menggunakan tabel lama `booking_assets` dan `assets`. Sistem sekarang menggunakan `booking_items` dengan join ke `rooms` dan `equipment`.

**Fix:**
```typescript
// ❌ WRONG - Tabel lama
.select('booking_assets(assets(name))')
const assetName = b.booking_assets?.[0]?.assets?.name

// ✅ CORRECT - Tabel baru
.select('booking_items(item_type, rooms:room_id(name), equipment:equipment_id(name))')
const firstItem = b.booking_items?.[0]
const assetName = firstItem?.item_type === 'room' ? firstItem?.rooms?.name : firstItem?.equipment?.name
```

**Files fixed:**
- `src/components/layouts/NotificationBell.tsx`
- `src/app/(admin)/admin/reports/page.tsx`

---

## 12. Notification API — Parameter Mismatch

**Symptom:** `POST /api/notifications/send 400 Bad Request` setiap kali admin approve booking.

**Root Cause:** Fungsi `sendNotif` di `ApprovalButtons.tsx` mengirim `{ event_type, booking_id }` tapi API endpoint mengharapkan `{ bookingId, channels }`.

**Fix:**
```typescript
// ❌ WRONG
body: JSON.stringify({ event_type: eventType, booking_id: bookingId })

// ✅ CORRECT
body: JSON.stringify({ bookingId: booking_id, channels: ['email', 'whatsapp'] })
```

**Files fixed:**
- `src/app/(admin)/admin/bookings/[id]/ApprovalButtons.tsx`

---

## 13. `admin/bookings/[id]` — 404 Because of Multi-level Nested Join

**Symptom:** Halaman detail booking borrower mengembalikan 404.

**Root Cause:** Query `booking_items` menggunakan join 3-level: `rooms:room_id(name, room_code, capacity, buildings(name))`. PostgREST gagal resolve join `buildings` karena `rooms` tidak memiliki direct FK ke `buildings` dalam konteks yang bisa di-resolve dari `booking_items`.

**Fix:** Hapus join `buildings(name)` dari query booking_items di halaman borrower. Data gedung jarang dibutuhkan di halaman detail borrower.

```typescript
// ❌ WRONG - 3-level join menyebabkan 404
rooms:room_id(id, name, room_code, capacity, buildings(name))

// ✅ CORRECT - Cukup 2 level
rooms:room_id(id, name, room_code, capacity)
```

**Files fixed:**
- `src/app/(borrower)/bookings/[id]/page.tsx`

---

## 14. Admin Client vs Regular Client Pattern

**Critical Rule:** Semua `page.tsx` di `/admin/**` HARUS menggunakan `createAdminClient` (service_role) bukan `createClient` biasa, agar bisa bypass RLS.

```typescript
// ❌ WRONG - Bisa di-block RLS
import { createClient } from '@/lib/supabase/server'

// ✅ CORRECT - Bypass RLS untuk admin
import { createAdminClient as createClient } from '@/lib/supabase/server'
```

---

---

## 15. `EquipmentRatesForm` — Tarif Tidak Tersimpan Saat Kategori Baru Diaktifkan

**Symptom:** Admin mengaktifkan kategori tarif yang sebelumnya non-aktif, mengisi nominal, klik Simpan — nominal tidak tersimpan. Setiap kali diulang hasilnya sama.

**Root Cause:** Input `rate_per_day` adalah *controlled input* React dengan `value={rate?.rate_per_day ?? 0}`.
Ketika kategori baru diaktifkan, nilai awal state adalah `0`, sehingga input menampilkan `"0"`.

Saat user mencoba menghapus `"0"` untuk mengetik nominal baru:
1. `e.target.value = ""` (input dikosongkan)
2. `parseFloat("") || 0` = `NaN || 0` = **0**
3. State di-set kembali ke 0
4. React re-render: input kembali menampilkan `"0"`
5. User tidak bisa mengetik nilai lain → submit dengan rate `0`

Rate `0` **memang tersimpan** ke database (karena server action menganggap `0 >= 0` valid), tapi saat halaman reload, kondisi `existing.rate_per_day > 0` = `false` → kategori **tampil sebagai non-aktif**. User mengira nominalnya tidak tersimpan.

**Pengecekan Ruangan:** Form ruangan (`RoomForm.tsx`) menggunakan React Hook Form dengan string state (`''` default), sehingga **tidak memiliki bug ini**.

**Root cause lanjutan:** Meski masalah "stuck at 0" diperbaiki, React *controlled input* (`value` prop) masih bisa tidak sinkron dengan DOM saat form submission di Next.js Server Action. Browser membaca DOM value langsung (bukan React state) saat mengumpulkan FormData — jika ada lag atau mismatch, nilai tidak terkirim.

Selain itu: Radix UI `Select` dengan `name` prop menggunakan mekanisme hidden select internal yang tidak selalu reliable untuk Server Action FormData. Dan kondisi `rateDay >= 0` di server action menyimpan rate=0, tapi form menampilkan `existing.rate_per_day > 0` → rate=0 terlihat sebagai "non-aktif" → user mengira data tidak tersimpan.

**Fix Final** (3 perubahan):

**1. `EquipmentRatesForm.tsx` — Uncontrolled inputs:**
```tsx
// ❌ BEFORE — controlled, React bisa tidak sinkron dengan DOM
value={rate?.rate_per_day ?? 0}

// ✅ AFTER — uncontrolled, browser kelola DOM value langsung
defaultValue={rate?.rate_per_day || ''}
onChange={(e) => {
  const parsed = parseFloat(e.target.value)
  updateRate(category.key, 'rate_per_day', isNaN(parsed) ? 0 : parsed)
}}
```

**2. `EquipmentRatesForm.tsx` — Supervision hidden input:**
```tsx
// ❌ BEFORE — Radix UI Select dengan name prop, hidden select tidak reliable
<Select name={`${category.key}_supervision`} value={...}>

// ✅ AFTER — explicit hidden input (React-controlled, selalu terkirim) + Select murni visual
<input type="hidden" name={`${category.key}_supervision`} value={...} readOnly />
<Select value={...} onValueChange={...}>  {/* tanpa name */}
```

**3. `edit/page.tsx` — Server action condition & error logging:**
```typescript
// ❌ BEFORE — rateDay >= 0 menyimpan rate=0 tapi form menampilkan sebagai disabled
if (!isNaN(rateDay) && rateDay >= 0) {
  await sba.from('equipment_rates').upsert(...)  // silent fail

// ✅ AFTER — konsisten dengan form (rate > 0 = aktif), plus error logging
if (!isNaN(rateDay) && rateDay > 0) {
  const { error: upsertError } = await sba.from('equipment_rates').upsert(...)
  if (upsertError) console.error(`Rate upsert error [${category}]:`, upsertError)
```

**Root cause final (setelah debugging dengan console.error):** Error `42501 - row-level security policy violation`. `createAdminClient` menggunakan `@supabase/ssr` yang saat user login, override `Authorization` header dengan user JWT (bukan service role JWT). Akibatnya INSERT ke `equipment_rates` diblokir RLS (tidak ada INSERT policy untuk regular user).

**Fix 4: `src/lib/supabase/server.ts` — tambah `createAdminDbClient`:**
```typescript
// Fungsi baru yang pakai @supabase/supabase-js langsung (non-SSR)
// Authorization header selalu service role JWT → bypass RLS
export function createAdminDbClient() {
  const { url, key } = getAdminEnvVars()
  return createBaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
```

**Fix 5: `edit/page.tsx` server action — pakai `createAdminDbClient` untuk rates:**
```typescript
const adminDb = createAdminDbClient()  // bukan sba (SSR client)
await (adminDb as any).from('equipment_rates').upsert(...)
```

**Migration (safety net):** `supabase/migrations/20250513_fix_equipment_rates_rls.sql`
— Tambah RLS policy agar admin user juga bisa INSERT/UPDATE via SSR client.

**Files fixed:**
- `src/app/(admin)/admin/equipment/EquipmentRatesForm.tsx` — `value` → `defaultValue` untuk day & hour, hidden input untuk supervision
- `src/app/(admin)/admin/equipment/[slug]/edit/page.tsx` — pakai `createAdminDbClient` untuk rates upsert
- `src/lib/supabase/server.ts` — tambah `createAdminDbClient` (non-SSR, true service role)
- `supabase/migrations/20250513_fix_equipment_rates_rls.sql` — RLS policies untuk equipment_rates

---

## Quick Reference: Common Errors & Fixes

| Error | Penyebab | Fix |
|-------|----------|-----|
| `400 Bad Request` pada query bookings | Missing FK hint `users!user_id` | Tambah `!user_id` pada semua join users dari bookings |
| `400` saat approve booking | Trigger pakai kolom `start_date` yang tidak ada | Jalankan migration `fix_reminder_trigger_columns.sql` |
| `400` "invalid enum value" | Enum `booking_status` belum punya nilai baru | Jalankan migration `extend_booking_status_enum.sql` |
| `500` pada halaman admin | RLS recursive policy atau client biasa | Gunakan `createAdminClient`, fix RLS policy |
| `404` pada booking detail | 3-level nested join gagal di PostgREST | Hapus join yang terlalu dalam |
| Tanggal "Invalid Date" | Kode pakai `start_date` tapi kolom adalah `start_datetime` | Ganti ke `start_datetime`/`end_datetime` |
| Nested button hydration error | Pakai `asChild` (Radix) di proyek Base UI | Ganti ke `render={<Component />}` |
| `updated_at column not found` | Tabel `users` tidak punya kolom `updated_at` | Hapus field ini dari update query |
| Tarif alat tidak tersimpan saat kategori diaktifkan | Controlled input + RLS 42501 pada `equipment_rates` | `defaultValue` untuk input, `createAdminDbClient` untuk upsert |
