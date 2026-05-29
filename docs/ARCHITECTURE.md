# Arsitektur Sistem — Sewa Ruang & Alat

---

## Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Framework | Next.js (App Router) | 16.2.6 |
| Language | TypeScript | 5.x |
| UI Library | React | 19.2.4 |
| Database | PostgreSQL via Supabase | — |
| Auth | Supabase Auth | 2.104.1 |
| Styling | Tailwind CSS v4 + shadcn/ui | — |
| State Management | Zustand | 5.x |
| Server State | TanStack React Query | 5.x |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Email | Nodemailer (SMTP) | 8.x |
| Rate Limiting | Upstash Redis | 1.x / 2.x |
| Excel | xlsx | 0.18.5 |
| QR Code | react-qr-code + qrcode | — |
| Notifications | sonner | 2.x |
| PDF | puppeteer-core | 24.x |

---

## Struktur Direktori

```
sewa-ruang/
├── src/
│   ├── app/
│   │   ├── (admin)/              # Route group admin (butuh auth admin/staff)
│   │   │   └── admin/
│   │   │       ├── dashboard/
│   │   │       ├── buildings/
│   │   │       ├── rooms/
│   │   │       ├── equipment/
│   │   │       ├── inventory/
│   │   │       ├── bookings/
│   │   │       ├── returns/
│   │   │       ├── payments/
│   │   │       ├── users/
│   │   │       ├── qr/
│   │   │       ├── reports/
│   │   │       ├── notifications/
│   │   │       └── settings/
│   │   ├── (auth)/               # Route group auth (login, register, dll)
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (borrower)/           # Route group peminjam (butuh auth borrower)
│   │   │   ├── dashboard/
│   │   │   ├── booking/
│   │   │   └── profile/
│   │   ├── (super-admin)/        # Route group super admin
│   │   ├── api/                  # API route handlers
│   │   ├── catalog/              # Katalog publik
│   │   ├── rooms/[id]/           # Detail ruangan (publik)
│   │   └── equipment/[slug]/     # Detail alat (publik)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layouts/              # Layout components
│   │   ├── shared/               # Komponen bersama (SafeImage, ImageUpload, dll)
│   │   ├── dashboard/            # Dashboard analytics
│   │   ├── scan/                 # QR scanner
│   │   ├── calendar/             # Calendar view
│   │   └── pwa/                  # PWA components
│   ├── lib/
│   │   ├── supabase/             # Supabase client (server.ts, client.ts)
│   │   ├── services/             # emailService, dll
│   │   ├── utils.ts              # Utility functions
│   │   └── pwa.ts                # PWA service worker registration
│   ├── types/                    # TypeScript types
│   └── proxy.ts                  # Auth middleware logic
├── docs/                         # Dokumentasi lengkap
├── public/                       # Static assets
│   ├── icons/
│   ├── manifest.json
│   └── offline.html
└── supabase/
    ├── migrations/               # SQL migration files
    └── schema-v2.sql
```

---

## Skema Database

### Tabel Utama

#### `rooms` — Ruangan
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `name` | text | Nama ruangan |
| `room_code` | text | Kode unik (contoh: A101) |
| `building_id` | uuid FK | → buildings |
| `capacity` | int | |
| `floor` | int | |
| `room_type` | text | |
| `is_active` | boolean | |
| `is_for_rent` | boolean | Bisa disewa atau tidak |
| `base_price` | int | |
| `photo_url` | text | |

#### `equipment` — Alat/Peralatan
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `name` | text | Nama alat (UNIK) |
| `equipment_code` | text | Auto-generate, immutable |
| `category` | text | elektronik, mebel, transportasi, alat_tes_pengukuran, alat_gym, perlengkapan, lainnya |
| `merk` | text | |
| `current_condition` | text | good, needs_repair, damaged, lost |
| `ketersediaan` | text | tersedia, digunakan, hilang |
| `status_tindakan` | text | normal, perawatan, menunggu_part, afkir |
| `storage_room_id` | uuid FK | → rooms |
| `is_active` | boolean | |
| `photo_url` | text | |

#### `equipment_rates` — Tarif Alat
```
PK: (equipment_id, user_category)
user_category: mahasiswa_s1 | mahasiswa_s2 | dosen | mou_unesa | umum
rate_per_day: numeric
rate_per_hour: numeric (nullable)
requires_supervision: boolean
```

#### `bookings` — Pemesanan
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | |
| `user_id` | uuid FK | → users (peminjam) |
| `payment_verified_by` | uuid FK | → users (admin verifikasi) |
| `status` | text | pending, approved, active, completed, rejected, cancelled |
| `payment_code` | text | Kode pembayaran unik |
| `start_datetime` | timestamptz | |
| `end_datetime` | timestamptz | |

> **PENTING:** Tabel `bookings` punya 2 FK ke `users`. Selalu gunakan FK hint `users!user_id(...)` saat query join.

#### `users` — Pengguna
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | uuid PK | = auth.uid() |
| `name` | text | |
| `email` | text | |
| `role` | text | super_admin, admin, staff, borrower |
| `phone` | text | WhatsApp |
| `borrower_category` | text | mahasiswa, pascasarjana, dosen_karyawan, kerjasama, umum |
| `institution` | text | |
| ~~`plain_password`~~ | ~~text~~ | **HARUS DIHAPUS — security risk** |

#### Tabel Lainnya
- `buildings` — Gedung
- `room_rates` — Tarif ruangan per kategori
- `booking_items` — Item dalam booking (room/equipment)
- `room_inventory` — Inventaris per ruangan
- `institution_profile` — Profil institusi (nama, logo, dll)
- `notifications` — Log notifikasi
- `booking_reminders` — Jadwal pengingat otomatis

---

## Alur Autentikasi

```
User → /login → Supabase Auth → session cookie
                ↓
         src/proxy.ts (middleware)
                ↓
    Cek PUBLIC_ROUTES / PUBLIC_PREFIXES
                ↓
    Jika auth butuh & belum login → redirect /login?redirectTo=...
                ↓
    Jika login berhasil → role check → /admin/dashboard atau /dashboard
```

**File middleware:** `src/proxy.ts` (bukan `middleware.ts` — sengaja dihapus untuk menghindari bug Turbopack)

**Public routes saat ini:**
```typescript
const PUBLIC_ROUTES = ['/', '/catalog', '/login', '/register']
// ⚠️ MASALAH: /forgot-password dan /reset-password belum ada di sini!
const PUBLIC_PREFIXES = ['/rooms/', '/equipment/', '/assets/', '/inventory-items/', '/api/payments/webhook']
```

---

## Pola Query Database

### Admin Data — Wajib Pakai Service Role
```typescript
// src/lib/supabase/server.ts menyediakan 2 client:
const supabase = await createClient()       // anon key — untuk data public/user
const admin = await createAdminClient()     // service role — untuk admin data

// Semua page.tsx di /admin/** HARUS pakai createAdminClient
```

### Bookings + Users — FK Hint
```typescript
// ✅ SELALU pakai FK hint eksplisit
.select('*, users!user_id(name, email, phone, telegram_username, institution, class_division)')
```

### Slug Generation
```typescript
function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
// "Proyektor Sony" → "proyektor-sony"
```

### Mencari Item dari Slug
```typescript
const { data: allItems } = await sb.from('equipment').select('id, name').eq('is_active', true)
const matched = allItems?.find(item => createSlug(item.name) === slug)
if (!matched) notFound()
```

---

## API Routes

| Route | Method | Keterangan |
|-------|--------|-----------|
| `/api/auth/callback` | GET | Supabase OAuth callback |
| `/api/bookings/[id]/invoice` | GET | Generate PDF invoice |
| `/api/payments/generate-qr` | POST | Generate QR code pembayaran |
| `/api/payments/webhook` | POST | Webhook pembayaran (publik) |
| `/api/notifications/send` | POST | Kirim notifikasi |
| `/api/notifications/send-email` | POST | Kirim email |
| `/api/reminders/process` | GET | Proses reminder (cron, butuh CRON_SECRET) |
| `/api/super-admin/users` | GET/POST | Manajemen user (super admin) |
| `/api/super-admin/users/[id]` | PUT/DELETE | Edit/hapus user |

---

## Komponen Penting

| Komponen | Lokasi | Fungsi |
|----------|--------|--------|
| `SafeImage` | `src/components/shared/SafeImage.tsx` | Wrapper `<img>` dengan error handling |
| `ImageUpload` | `src/components/shared/ImageUpload.tsx` | Upload gambar (URL/File/Camera) |
| `PhotoUpload` | `src/components/shared/PhotoUpload.tsx` | Upload foto ruangan |
| `AdminShell` | `src/components/layouts/AdminShell.tsx` | Layout admin dengan sidebar |
| `QRScanner` | `src/components/scan/QRScanner.tsx` | Scanner QR code |
| `DashboardAnalytics` | `src/components/dashboard/DashboardAnalytics.tsx` | Grafik dashboard |
| `PWAProvider` | `src/components/providers/PWAProvider.tsx` | Registrasi service worker |
