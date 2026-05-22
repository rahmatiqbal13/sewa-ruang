# Laporan QA Manual Testing — Sewa Ruang & Alat
**Tanggal**: 2026-05-22  
**Tester**: QA Manual (Claude)  
**Versi**: Next.js 16.2.6 (Turbopack)  
**Environment**: Development (`localhost:3000`)

---

## Ringkasan Eksekutif

| Severity | Jumlah |
|----------|--------|
| 🔴 Critical | 3 |
| 🟠 High | 6 |
| 🟡 Medium | 12 |
| 🟢 Low | 4 |
| **Total** | **25** |

---

## 1. Security & Authentication

### 🔴 CRIT-01 — CRON_SECRET Validation Lemah
- **File**: `src/app/api/reminders/process/route.ts:12`
- **Issue**: CRON_SECRET hanya di-check jika env var tersedia. Jika `CRON_SECRET` tidak di-set, endpoint bisa dipanggil siapapun tanpa auth.
- **Rekomendasi**:
```typescript
const cronSecret = process.env.CRON_SECRET
if (!cronSecret) throw new Error('CRON_SECRET not configured')
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 🟠 HIGH-01 — Missing Input Validation di Email Notification Endpoint
- **File**: `src/app/api/notifications/send-email/route.ts:8-14`
- **Issue**: Field `to`, `subject`, `message` tidak divalidasi. Rentan terhadap spam atau payload berbahaya.
- **Rekomendasi**: Tambahkan Zod validation:
```typescript
const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(10000),
})
```

### 🟠 HIGH-02 — Missing Rate Limiting pada Notification Send
- **File**: `src/app/api/notifications/send/route.ts`
- **Issue**: Endpoint bisa dipanggil berulang kali tanpa throttle, bisa spam notifikasi ke user.
- **Rekomendasi**: Cek apakah notifikasi untuk booking yang sama sudah dikirim dalam 60 detik terakhir.

### 🟡 MED-01 — NEXT_PUBLIC_APP_URL Tidak Di-validate
- **File**: `src/app/api/payments/generate-qr/route.ts:180`
- **Issue**: Jika env var tidak di-set, QR code akan berisi URL `"undefined/..."`.
- **Rekomendasi**: `const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'`

---

## 2. Database & Query Issues

### 🔴 CRIT-02 — `.single()` Tanpa Null Check (Potensi Crash)
- **Files**:
  - `src/lib/institution.ts:45`
  - `src/app/(admin)/admin/users/page.tsx:32`
  - `src/app/(borrower)/dashboard/page.tsx:55`
- **Issue**: Jika query return 0 hasil, `.single()` throw error dan crash halaman (500 error). Ini bisa terjadi untuk new user atau data yang belum lengkap.
- **Rekomendasi**: Ganti `.single()` dengan `.maybeSingle()` dan handle null case:
```typescript
const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
if (!data) redirect('/login')
```

### 🟠 HIGH-03 — FK Hint Tidak Konsisten di Bookings Queries
- **File**: `src/app/(admin)/admin/bookings/page.tsx:18`
- **Issue**: Tabel `bookings` punya 2 FK ke `users` (`user_id` dan `payment_verified_by`). Beberapa query sudah pakai FK hint `users!user_id(...)`, yang lain belum — bisa menyebabkan ambiguity error di Supabase.
- **Rekomendasi**: Audit semua query yang join tabel `bookings` + `users` dan pastikan pakai explicit FK hint.

### 🟡 MED-02 — Missing Availability Check saat Booking Dibuat
- **Severity**: High secara bisnis
- **Issue**: Tidak ada pengecekan apakah ruangan/alat sudah di-booking di slot waktu yang sama. User bisa double-book item yang sama.
- **Rekomendasi**: Tambahkan query overlap check sebelum insert booking:
```sql
SELECT id FROM bookings
WHERE item_id = $1
  AND status NOT IN ('rejected', 'cancelled')
  AND NOT (end_time <= $2 OR start_time >= $3)
```

### 🟡 MED-03 — Kolom `payment_status` Tidak Ada di Tabel `bookings`
- **File**: Beberapa query di admin payments
- **Issue**: Berdasarkan AGENTS.md, tabel `bookings` tidak punya kolom `payment_status` — hanya ada `status`. Query yang salah akan error di runtime.
- **Rekomendasi**: Audit semua SELECT query yang menyebut `payment_status` dan ganti dengan `status`.

---

## 3. Deprecated Routes & Dead Code

### 🔴 CRIT-03 — Route `/admin/assets` Masih Ada (Deprecated)
- **File**: `src/app/(admin)/admin/assets/`
- **Issue**: Folder ini masih exist dan mungkin masih query tabel lama `assets`. AGENTS.md menyatakan route ini deprecated dan harus redirect ke `/admin/equipment`.
- **Rekomendasi**:
  1. Hapus folder `src/app/(admin)/admin/assets/`
  2. Atau buat redirect:
```typescript
// src/app/(admin)/admin/assets/page.tsx
import { redirect } from 'next/navigation'
export default function AssetsPage() { redirect('/admin/equipment') }
```

### 🟢 LOW-01 — Duplikasi Logic Service Role Client
- **File**: `src/app/(admin)/admin/equipment/importEquipment.ts:119-122`
- **Issue**: Service role client dibuat secara manual dengan hardcoded URL/key, padahal sudah ada `createAdminClient` di `src/lib/supabase/server.ts`.
- **Rekomendasi**: Gunakan `createAdminClient()` yang sudah ada.

---

## 4. TypeScript & Type Safety

### 🟠 HIGH-04 — Excessive `as any` Type Casting (88+ file)
- **Files**: Ditemukan di 88 file, contoh:
  - `src/app/(admin)/admin/equipment/equipmentActions.ts:13,40,50`
  - `src/app/api/super-admin/users/route.ts:19,60,140`
- **Issue**: `as any` bypass TypeScript checks. Bug tipe bisa lolos ke production.
- **Rekomendasi**: Definisikan proper types untuk Supabase responses dan gunakan secara konsisten.

### 🟡 MED-04 — Form Resolver Di-cast ke `any`
- **File**: `src/app/(auth)/register/page.tsx:32-33`
- **Issue**: `resolver: zodResolver(schema) as any` — ini symptom bahwa type form tidak match dengan schema Zod.
- **Rekomendasi**: Gunakan `z.infer<typeof schema>` sebagai generic type untuk `useForm`.

---

## 5. Form Validation Issues

### 🟡 MED-05 — Validasi Nomor Telepon Terlalu Lemah
- **File**: `src/app/(auth)/register/page.tsx:30`
- **Issue**: Hanya cek minimal 10 karakter, tidak validate format Indonesia.
- **Rekomendasi**:
```typescript
phone: z.string().regex(/^(\+62|0)[0-9]{9,12}$/, 'Format: 08xx atau +628xx')
```

### 🟡 MED-06 — Input maxLength Tidak Konsisten dengan Validasi DB
- **File**: `src/app/(auth)/register/page.tsx:32-33`
- **Issue**: Field `institution` (max 100 char) dan `class_division` (max 50 char) tidak punya `maxLength` attribute di HTML input. User bisa type lebih panjang sebelum kena error dari Zod.
- **Rekomendasi**: Tambahkan `maxLength` attribute ke `<input>`.

### 🟡 MED-07 — Missing Konfirmasi Password di Register
- **File**: `src/app/(auth)/register/page.tsx`
- **Issue**: Form register tidak ada field "konfirmasi password". Typo password tidak bisa dideteksi.
- **Rekomendasi**: Tambahkan `confirmPassword` field dengan Zod `.refine()` check.

---

## 6. Null/Undefined Handling & UI Crashes

### 🟠 HIGH-05 — Booking User Data Bisa Null di Payment Page
- **File**: `src/app/(borrower)/booking/[id]/payment/page.tsx:79`
- **Issue**: `setBooking(bookingData)` tanpa check null. Jika booking tidak ditemukan, component render state undefined dan bisa crash.
- **Rekomendasi**:
```typescript
if (!bookingData) {
  toast.error('Booking tidak ditemukan')
  router.push('/bookings')
  return
}
setBooking(bookingData)
```

### 🟡 MED-08 — QR Code Content Bisa Berisi Null User Name
- **File**: `src/app/api/payments/generate-qr/route.ts:94`
- **Issue**: `booking.users?.name` bisa undefined, menghasilkan QR dengan string "undefined".
- **Rekomendasi**: `const userName = booking.users?.name ?? booking.users?.email ?? 'Unknown User'`

### 🟡 MED-09 — Missing Error Boundary di Admin Pages
- **File**: `src/app/(admin)/admin/` (general)
- **Issue**: Tidak ada React Error Boundary. Jika satu component crash, seluruh halaman admin blank.
- **Rekomendasi**: Tambahkan `error.tsx` di setiap route segment penting.

---

## 7. Error Handling & Logging

### 🟠 HIGH-06 — Forgot Password: Email Failure Tidak Di-handle
- **File**: `src/app/(auth)/forgot-password/actions.ts:116-122`
- **Issue**: Jika `sendCustomResetEmail` throw error, tidak ada try-catch. User tidak mendapat feedback dan tidak tahu email gagal dikirim.
- **Rekomendasi**: Wrap dalam try-catch dan return error state yang informatif.

### 🟡 MED-10 — Generic Error Messages di API Routes
- **File**: Multiple API routes
- **Issue**: Semua error return `{ error: 'Internal server error' }` tanpa detail. Sulit debug di production.
- **Rekomendasi**:
```typescript
const message = process.env.NODE_ENV === 'development' ? error.message : 'Terjadi kesalahan. Coba lagi.'
```

### 🟡 MED-11 — Tidak Ada Audit Log untuk Admin Actions
- **Issue**: Admin bisa edit/delete data tanpa jejak log. Tidak ada audit trail siapa yang mengubah apa.
- **Rekomendasi**: Tambahkan tabel `audit_logs` dan log setiap CUD operation dari admin.

---

## 8. Missing Features (Bisnis Impact)

### 🟡 MED-12 — Booking Equipment Belum Diimplementasikan
- **File**: AGENTS.md (TODO section)
- **Issue**: Alur booking untuk equipment (peralatan) belum ada. User hanya bisa lihat catalog tapi tidak bisa booking alat.
- **Rekomendasi**: Prioritaskan implementasi booking flow untuk equipment.

### 🟢 LOW-02 — Tidak Ada Equipment Availability Calendar
- **Issue**: Tidak ada tampilan visual kapan alat available/busy.
- **Rekomendasi**: Implementasikan calendar view per equipment.

### 🟢 LOW-03 — Tidak Ada Reporting & Analytics
- **Issue**: Admin tidak punya dashboard analytics (pendapatan, utilization rate, dll).
- **Rekomendasi**: Implementasikan basic reporting dengan aggregasi data dari tabel `bookings`.

---

## 9. HTTP Status & Route Testing

| Route | Expected | Actual | Status |
|-------|----------|--------|--------|
| `GET /` | 200 | 200 | ✅ OK |
| `GET /login` | 200 | 200 | ✅ OK |
| `GET /catalog` | 200 | 200 | ✅ OK |
| `GET /admin/dashboard` (unauthenticated) | 307 → /login | 307 | ✅ OK |
| `GET /admin/equipment` (unauthenticated) | 307 → /login | 307 | ✅ OK |
| `GET /admin/rooms` (unauthenticated) | 307 → /login | 307 | ✅ OK |
| `GET /admin/bookings` (unauthenticated) | 307 → /login | 307 | ✅ OK |

**Auth redirect**: Semua protected routes sudah redirect ke `/login?redirectTo=...` ✅

---

## 10. Code Quality

### 🟢 LOW-04 — Tidak Ada `.env.example`
- **Issue**: Developer baru tidak tahu env vars apa yang dibutuhkan.
- **Rekomendasi**: Buat `.env.example` dengan semua keys (tanpa values) dan keterangan optional/required.

---

## Prioritas Perbaikan

### Minggu 1 — Critical & High
- [ ] CRIT-01: Fix CRON_SECRET validation
- [ ] CRIT-02: Ganti semua `.single()` → `.maybeSingle()` + null handling
- [ ] CRIT-03: Hapus/redirect route `/admin/assets`
- [ ] HIGH-01: Tambah Zod validation di email endpoint
- [ ] HIGH-03: Fix FK hint consistency di bookings queries
- [ ] HIGH-05: Fix null check di payment page
- [ ] HIGH-06: Fix error handling di forgot password action

### Minggu 2 — Medium
- [ ] MED-02: Implementasi availability check saat booking
- [ ] MED-05: Perbaiki validasi nomor telepon
- [ ] MED-07: Tambah konfirmasi password di register
- [ ] MED-09: Tambah `error.tsx` di admin routes
- [ ] MED-11: Buat audit log sistem

### Minggu 3 — Backlog
- [ ] HIGH-04: Hapus `as any` casting bertahap
- [ ] MED-12: Implementasi booking equipment flow
- [ ] LOW-02: Equipment availability calendar
- [ ] LOW-03: Reporting & analytics dashboard
- [ ] LOW-04: Buat `.env.example`

---

*Laporan ini dibuat berdasarkan static analysis source code dan HTTP response testing. Testing fungsional end-to-end memerlukan akun autentikasi yang valid.*
