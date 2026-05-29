# Dokumentasi Sistem — Sewa Ruang & Alat USC

> Dokumen indeks ini dirancang agar AI agent atau developer baru dapat langsung memahami sistem tanpa harus membaca semua file satu per satu. Baca halaman ini dulu, lalu buka dokumen spesifik yang relevan.

**Terakhir diperbarui:** 2026-05-29

---

## Apa Sistem Ini?

Platform digital terpusat untuk peminjaman **ruangan** dan **peralatan** di lingkungan universitas (UNESA — Universitas Negeri Surabaya, Direktorat USC). Menggantikan proses manual/kertas dengan alur digital yang transparan: pengajuan → verifikasi → pembayaran → dokumentasi.

## Siapa Penggunanya?

| Role | Akses | Contoh |
|------|-------|--------|
| `super_admin` | Semua fitur + manajemen admin | Kepala Direktorat |
| `admin` | Manajemen penuh booking, alat, ruangan | Staf TU |
| `staff` | Approval, pembayaran, pengembalian | Petugas lapangan |
| `borrower` | Buat booking, lihat status | Mahasiswa, dosen, umum |

---

## Daftar Dokumen

| File | Isi |
|------|-----|
| [INDEX.md](INDEX.md) | **Mulai di sini** — ringkasan sistem, pola kritis, masalah aktif |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Tech stack, skema DB, struktur direktori, API routes, pola query |
| [PRODUCT.md](PRODUCT.md) | Tujuan produk, brand, target pengguna, prinsip desain |
| [SETUP.md](SETUP.md) | Setup lokal, environment variables, deployment, migration DB |
| [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | SOP lengkap untuk admin/staff (booking, pembayaran, pengembalian, dll) |
| [FEATURES.md](FEATURES.md) | QR payment, notifikasi email, PWA, import/export, forgot password |
| [QA_TESTING.md](QA_TESTING.md) | Laporan pengujian fungsional + QA audit kode |
| [SECURITY.md](SECURITY.md) | Panduan keamanan, incident history, checklist |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Solusi masalah umum untuk developer dan pengguna |
| [BUG_HISTORY.md](BUG_HISTORY.md) | Riwayat bug yang pernah terjadi + solusinya (untuk pembelajaran AI) |
| [ADMIN_ROADMAP.md](ADMIN_ROADMAP.md) | Roadmap fitur admin ke depan |
| [SUPER_ADMIN_ACCESS.md](SUPER_ADMIN_ACCESS.md) | Panduan akses dan hak super admin |
| [SUPABASE_DISABLE_EMAIL_CONFIRM.md](SUPABASE_DISABLE_EMAIL_CONFIRM.md) | Cara nonaktifkan konfirmasi email Supabase |
| [WHATSAPP_TEMPLATE_GUIDE.md](WHATSAPP_TEMPLATE_GUIDE.md) | Template notifikasi WhatsApp |

---

## Snapshot Tech Stack

```
Next.js 16.2.6 (App Router, Turbopack)
TypeScript 5.x + React 19.2.4
Database: PostgreSQL via Supabase
Auth: Supabase Auth
Styling: Tailwind CSS v4 + shadcn/ui
Forms: React Hook Form + Zod
Email: Nodemailer (SMTP Brevo/Gmail)
Rate Limiting: Upstash Redis
QR Code: react-qr-code + qrcode
Excel: xlsx
```

---

## Struktur Route Utama

```
/                          → Homepage publik
/catalog                   → Katalog ruangan & alat (publik)
/rooms/[slug]              → Detail ruangan (publik)
/equipment/[slug]          → Detail alat (publik)
/login                     → Halaman login
/register                  → Daftar akun baru
/forgot-password           → Lupa password  ← PERLU ADD ke PUBLIC_ROUTES
/reset-password            → Reset password ← PERLU ADD ke PUBLIC_ROUTES
/dashboard                 → Dashboard peminjam (butuh auth)
/admin/dashboard           → Dashboard admin
/admin/rooms               → Manajemen ruangan
/admin/equipment           → Manajemen alat
/admin/buildings           → Manajemen gedung
/admin/bookings            → Daftar pemesanan
/admin/payments            → Verifikasi pembayaran
/admin/users               → Manajemen pengguna
/admin/qr/batch            → Generator QR batch
/admin/scan                → QR scanner
/admin/settings            → Pengaturan institusi
```

---

## Pola Kritis yang HARUS Diketahui

### 1. Auth Middleware (`src/proxy.ts`)
```typescript
// PUBLIC_ROUTES saat ini — MISSING /forgot-password dan /reset-password!
const PUBLIC_ROUTES = ['/', '/catalog', '/login', '/register']
const PUBLIC_PREFIXES = ['/rooms/', '/equipment/', '/assets/', '/api/payments/webhook']
```
Semua route di luar daftar ini membutuhkan auth. Redirect ke `/login?redirectTo=...`.

### 2. Admin Data — Selalu Pakai `createAdminClient`
```typescript
// ❌ WRONG — bisa gagal jika RLS memblokir
import { createClient } from '@/lib/supabase/server'

// ✅ CORRECT — bypass RLS dengan service role
import { createAdminClient } from '@/lib/supabase/server'
```
Semua `page.tsx` di `/admin/**` harus pakai `createAdminClient`.

### 3. Bookings + Users — FK Hint Wajib
```typescript
// Tabel bookings punya 2 FK ke users (user_id dan payment_verified_by)
// ❌ WRONG — ambiguous, error 400
.select('*, users(name, email)')

// ✅ CORRECT — explicit FK hint
.select('*, users!user_id(name, email, phone)')
```

### 4. Slug URL (bukan UUID)
```typescript
function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
// "Proyektor Sony" → "proyektor-sony"
// URL: /equipment/proyektor-sony/edit
```

### 5. RLS pada Tabel `users` — JANGAN Recursive
```sql
-- ❌ WRONG — infinite recursion → 500 error
CREATE POLICY ON public.users USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ✅ CORRECT
CREATE POLICY ON public.users FOR SELECT TO authenticated USING (true);
```

---

## Masalah Aktif (Per 2026-05-29)

| Severity | Masalah | File |
|----------|---------|------|
| 🔴 KRITIS | `plain_password` tersimpan plaintext di DB | `src/app/(auth)/register/page.tsx:65` |
| 🔴 KRITIS | `/forgot-password` & `/reset-password` redirect ke login (tidak bisa akses) | `src/proxy.ts:4` |
| 🔴 HIGH | Service worker terhapus tapi masih didaftarkan → JS error di semua halaman | `public/service-worker.js` (deleted), `src/lib/pwa.ts` |
| 🟠 MEDIUM | Mobile navbar tidak ada hamburger menu | `src/components/layouts/` |
| 🟡 LOW | 404 page redirect ke login (seharusnya tampil 404) | `src/proxy.ts` |

Lihat detail lengkap di [QA_TESTING.md](QA_TESTING.md) dan [SECURITY.md](SECURITY.md).

---

## Variabel Environment yang Dibutuhkan

```env
# Wajib
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Aplikasi
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EMAIL_FROM_NAME=

# Rate Limiting (optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Security
CRON_SECRET=
```

---

## Status Proyek

- **Framework:** Next.js 16 (stabil, Turbopack aktif)
- **Database:** Supabase PostgreSQL (production ready)
- **Deployment:** Vercel
- **Domain produksi:** `https://sewa-ruang.vercel.app`
- **Fitur booking equipment:** Belum diimplementasikan (catalog sudah ada, booking flow belum)
- **Laporan & analitik:** Belum diimplementasikan
