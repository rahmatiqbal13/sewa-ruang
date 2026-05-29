# Laporan QA & Functional Testing — Sewa Ruang & Alat

Dokumen ini menggabungkan dua sesi pengujian:
- **QA Audit Kode** — 2026-05-22 (static analysis)
- **Functional Testing** — 2026-05-29 (Playwright headless, live server)

---

## Ringkasan Eksekutif

| Severity | Jumlah |
|----------|--------|
| 🔴 Kritis | 5 |
| 🟠 High | 7 |
| 🟡 Medium | 12 |
| 🟢 Low | 4 |
| **Total temuan** | **28** |

---

## Sesi 1 — Functional Testing (2026-05-29)

**Metode:** Playwright headless Chromium, server `localhost:3000`, Next.js 16.2.6  
**Cakupan:** Homepage, katalog, auth flow, admin area, mobile responsiveness

### Hasil per Area

| Area | Status | Catatan |
|------|--------|---------|
| Homepage | ✅ PASS | Title, H1, stat cards, CTA normal |
| Katalog publik | ✅ PASS | 168 item terdeteksi, filter sidebar berfungsi |
| Room detail | ✅ PASS | `/rooms/ruang-kelas-1` → HTTP 200, slug routing OK |
| Equipment detail | ✅ PASS | Navigasi dari katalog berjalan |
| Login page | ✅ PASS | Form valid, validasi inline aktif |
| Login error | ✅ PASS | Toast "Email atau password salah" muncul |
| Register page | ✅ PASS | 11 field, tombol disabled sampai form valid |
| Forgot password | ❌ FAIL | **307 redirect ke login** — halaman tidak bisa diakses |
| Reset password | ❌ FAIL | **307 redirect ke login** — link dari email tidak bisa dipakai |
| Service worker | ❌ FAIL | File terhapus + middleware redirect → 4 JS error di semua halaman |
| Mobile 375px | ⚠️ WARN | Halaman tampil tapi tidak ada hamburger/mobile menu |
| 404 handling | ⚠️ WARN | Redirect ke login, bukan tampil halaman 404 |

### Temuan Kritis (Sesi 1)

---

#### 🔴 CRIT-F01 — Plaintext Password Tersimpan di Database

**File:** `src/app/(auth)/register/page.tsx:65`

```typescript
plain_password: data.password,  // ← PASSWORD PLAINTEXT TERSIMPAN
```

Password plaintext juga disimpan di:
- `src/app/api/super-admin/users/route.ts:168` dan `:201`
- `src/app/api/super-admin/users/[id]/route.ts:64`

Kolom ini dibaca dan ditampilkan di:
- `src/app/(admin)/admin/users/UserDetailSheet.tsx:65`
- `src/app/(super-admin)/super-admin/users/page.tsx:128`

**Risiko:** Jika database bocor, SEMUA password user terekspos. Melanggar prinsip keamanan dasar (passwords harus selalu di-hash).

**Fix:** Hapus kolom `plain_password` dari semua INSERT/UPDATE dan seluruh SELECT query. Gunakan fitur reset password Supabase jika admin perlu mengubah password user.

---

#### 🔴 CRIT-F02 — Middleware Memblokir Halaman Forgot & Reset Password

**File:** `src/proxy.ts:4`

```typescript
const PUBLIC_ROUTES = ['/', '/catalog', '/login', '/register']
// ← /forgot-password dan /reset-password TIDAK ADA di sini
```

Akibatnya:
- User yang lupa password diredirect ke login → tidak bisa reset
- User yang klik link reset dari email diredirect ke login → tidak bisa selesaikan proses
- Service worker (`/service-worker.js`) juga terkena redirect

**Fix:**
```typescript
const PUBLIC_ROUTES = [
  '/', '/catalog', '/login', '/register',
  '/forgot-password', '/reset-password'
]
```

---

#### 🔴 CRIT-F03 — Service Worker File Terhapus

`public/service-worker.js` terhapus dari repository tapi `src/components/providers/PWAProvider.tsx` masih memanggil `registerServiceWorker()`. Ini menghasilkan **4 console error** di setiap halaman:

```
Service Worker registration failed: SecurityError: The script resource is behind a redirect
```

**Fix (pilih salah satu):**
1. Pulihkan file `public/service-worker.js` dengan konten minimal yang valid
2. Hapus pemanggilan `registerServiceWorker()` dari `PWAProvider.tsx`

---

### Temuan Medium (Sesi 1)

- ⚠️ **Mobile navigation** — Tidak ada hamburger menu di viewport 375px. Pengguna mobile mungkin tidak bisa mengakses navigasi.
- ⚠️ **404 behavior** — Semua URL tak dikenal (termasuk `/anything-random`) diredirect ke `/login?redirectTo=...` alih-alih menampilkan halaman 404. Perlu tambahkan handler 404 publik.

---

## Sesi 2 — QA Audit Kode (2026-05-22)

**Metode:** Static analysis source code + HTTP response testing

### 1. Security & Authentication

#### 🔴 CRIT-S01 — CRON_SECRET Validation Lemah
- **File:** `src/app/api/reminders/process/route.ts:12`
- **Issue:** CRON_SECRET hanya dicek jika env var tersedia. Jika tidak di-set, endpoint bisa dipanggil siapapun.
- **Fix:**
```typescript
const cronSecret = process.env.CRON_SECRET
if (!cronSecret) throw new Error('CRON_SECRET not configured')
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

#### 🟠 HIGH-S01 — Missing Input Validation di Email Endpoint
- **File:** `src/app/api/notifications/send-email/route.ts:8-14`
- **Issue:** Field `to`, `subject`, `message` tidak divalidasi. Rentan spam.
- **Fix:** Tambahkan Zod validation.

#### 🟠 HIGH-S02 — Missing Rate Limiting pada Send Notification
- **File:** `src/app/api/notifications/send/route.ts`
- **Issue:** Bisa spam notifikasi tanpa throttle.

---

### 2. Database & Query

#### 🔴 CRIT-S02 — `.single()` Tanpa Null Check (Crash Potensial)
- **Files:** `src/lib/institution.ts:45`, `src/app/(admin)/admin/users/page.tsx:32`, `src/app/(borrower)/dashboard/page.tsx:55`
- **Issue:** Jika query return 0 hasil, `.single()` throw error → 500 crash.
- **Fix:** Ganti dengan `.maybeSingle()` dan handle null case.

#### 🟠 HIGH-S03 — FK Hint Tidak Konsisten di Bookings Queries
- **File:** `src/app/(admin)/admin/bookings/page.tsx:18`
- **Issue:** Beberapa query sudah pakai `users!user_id(...)`, yang lain belum.

#### 🟡 MED-S01 — Missing Availability Check saat Booking
- **Issue:** Tidak ada pengecekan overlap booking. User bisa double-book item yang sama.

#### 🟡 MED-S02 — Kolom `payment_status` Tidak Exist
- **Issue:** Tabel `bookings` tidak punya kolom `payment_status`, hanya `status`. Query yang salah akan error runtime.

---

### 3. Route & Dead Code

#### 🟠 HIGH-S04 — Route `/admin/assets` Masih Ada (Deprecated)
- **File:** `src/app/(admin)/admin/assets/`
- **Issue:** Folder deprecated masih exist, mungkin masih query tabel lama.
- **Fix:** Hapus folder atau buat redirect ke `/admin/equipment`.

---

### 4. TypeScript

#### 🟠 HIGH-S05 — Excessive `as any` Casting (88+ file)
- **Issue:** `as any` bypass TypeScript checks. Bug tipe bisa lolos ke production.
- Contoh: `src/app/(admin)/admin/equipment/equipmentActions.ts:13,40,50`

---

### 5. Form & UX

#### 🟡 MED-F01 — Missing Konfirmasi Password di Register
- **File:** `src/app/(auth)/register/page.tsx`
- **Issue:** Form register tidak punya field "ulangi password". Typo tidak terdeteksi.

#### 🟡 MED-F02 — Missing Error Boundary di Admin Pages
- **Issue:** Tidak ada `error.tsx`. Jika satu component crash, seluruh admin page blank.

#### 🟡 MED-F03 — Booking Equipment Belum Diimplementasikan
- **Issue:** Katalog sudah tampilkan equipment, tapi belum ada flow booking.

#### 🟠 HIGH-S06 — Null Check Missing di Payment Page
- **File:** `src/app/(borrower)/booking/[id]/payment/page.tsx:79`
- **Issue:** `setBooking(bookingData)` tanpa null check → potensi crash.

---

## Hasil HTTP Route Testing

| Route | Expected | Actual | Status |
|-------|----------|--------|--------|
| `GET /` | 200 | 200 | ✅ |
| `GET /catalog` | 200 | 200 | ✅ |
| `GET /login` | 200 | 200 | ✅ |
| `GET /register` | 200 | 200 | ✅ |
| `GET /forgot-password` (unauth) | 200 | **307 → /login** | ❌ |
| `GET /reset-password` (unauth) | 200 | **307 → /login** | ❌ |
| `GET /service-worker.js` | 200 | **307 → /login** | ❌ |
| `GET /manifest.json` | 200 | 200 | ✅ |
| `GET /rooms/ruang-kelas-1` | 200 | 200 | ✅ |
| `GET /admin/dashboard` (unauth) | 307 → /login | 307 | ✅ |
| `GET /admin/equipment` (unauth) | 307 → /login | 307 | ✅ |

---

## Prioritas Perbaikan

### Segera (Minggu Ini)
- [ ] **CRIT-F01:** Hapus `plain_password` dari seluruh codebase dan database
- [ ] **CRIT-F02:** Tambahkan `/forgot-password` dan `/reset-password` ke `PUBLIC_ROUTES` di `src/proxy.ts`
- [ ] **CRIT-F03:** Pulihkan atau hapus service worker
- [ ] **CRIT-S01:** Fix CRON_SECRET validation
- [ ] **CRIT-S02:** Ganti `.single()` → `.maybeSingle()` di file-file kritis

### Minggu Depan
- [ ] **HIGH-S04:** Hapus route `/admin/assets` deprecated
- [ ] **HIGH-S06:** Tambah null check di payment page
- [ ] **MED-F01:** Tambah konfirmasi password di register
- [ ] **MED-F02:** Tambah `error.tsx` di admin routes

### Backlog
- [ ] **HIGH-S05:** Hilangkan `as any` casting bertahap
- [ ] **MED-F03:** Implementasi booking equipment flow
- [ ] Implementasi reporting & analytics
- [ ] Tambah hamburger menu untuk mobile
