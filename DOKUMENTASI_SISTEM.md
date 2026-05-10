# Dokumentasi Sistem — Sewa Ruang & Alat

> Versi: 1.0 | Tanggal: 10 Mei 2026 | Dibuat untuk tim maintenance & developer berikutnya

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Tech Stack](#2-tech-stack)
3. [Struktur Direktori](#3-struktur-direktori)
4. [Arsitektur Database](#4-arsitektur-database)
5. [Alur Autentikasi & Otorisasi](#5-alur-autentikasi--otorisasi)
6. [Modul-Modul Sistem](#6-modul-modul-sistem)
7. [API Routes](#7-api-routes)
8. [Layanan Notifikasi](#8-layanan-notifikasi)
9. [Import / Export Data](#9-import--export-data)
10. [QR Code](#10-qr-code)
11. [Konfigurasi Environment](#11-konfigurasi-environment)
12. [Migrasi Database](#12-migrasi-database)
13. [Cara Menjalankan Lokal](#13-cara-menjalankan-lokal)
14. [Deployment](#14-deployment)
15. [Troubleshooting Umum](#15-troubleshooting-umum)

---

## 1. Gambaran Umum

Sistem **Sewa Ruang & Alat** adalah platform manajemen penyewaan untuk universitas. Sistem ini mengelola dua entitas utama:

| Entitas | Deskripsi |
|---------|-----------|
| **Ruangan** | Ruang fisik (lab, aula, studio) yang dapat disewa per jam/hari |
| **Alat/Peralatan** | Barang yang dapat disewakan terpisah dari ruangan |

### Pengguna Sistem

| Role | Deskripsi | Akses |
|------|-----------|-------|
| `super_admin` | Administrator tertinggi | Semua fitur + manajemen admin |
| `admin` | Pengelola utama | Semua fitur admin |
| `staff` | Staf operasional | Booking, pembayaran, pengembalian |
| `borrower` | Peminjam/penyewa | Buat booking, lihat status |

---

## 2. Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Framework | Next.js (App Router) | 16.2.4 |
| Language | TypeScript | 5.x |
| UI Library | React | 19.2.4 |
| Database | PostgreSQL via Supabase | — |
| Auth | Supabase Auth | 2.104.1 |
| Styling | Tailwind CSS v4 | 4.x |
| UI Components | shadcn/ui | 4.5.0 |
| State Management | Zustand | 5.0.12 |
| Server State | TanStack React Query | 5.100.5 |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Email | Nodemailer (SMTP) | 8.0.7 |
| Rate Limiting | Upstash Redis + Ratelimit | 1.37.x / 2.0.x |
| Excel | xlsx | 0.18.5 |
| QR Code | react-qr-code + qrcode | 2.0.x / 1.5.x |
| Notifications | Toast via sonner | 2.0.7 |

---

## 3. Struktur Direktori

```
sewa-ruang/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (admin)/                  # Route group: Admin area
│   │   │   ├── layout.tsx            # Layout admin dengan sidebar
│   │   │   └── admin/
│   │   │       ├── dashboard/        # Dashboard statistik
│   │   │       ├── buildings/        # Manajemen gedung
│   │   │       ├── rooms/            # Manajemen ruangan
│   │   │       ├── equipment/        # Manajemen alat
│   │   │       ├── inventory/        # Inventaris ruangan
│   │   │       ├── bookings/         # Manajemen pemesanan
│   │   │       ├── returns/          # Manajemen pengembalian
│   │   │       ├── payments/         # Manajemen pembayaran
│   │   │       ├── users/            # Manajemen pengguna
│   │   │       ├── qr/               # Generator QR Code
│   │   │       ├── reports/          # Laporan & analitik
│   │   │       ├── notifications/    # Konfigurasi notifikasi
│   │   │       └── settings/         # Pengaturan sistem
│   │   ├── (auth)/                   # Route group: Autentikasi
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (borrower)/               # Route group: Peminjam
│   │   │   ├── dashboard/
│   │   │   ├── booking/new/
│   │   │   └── bookings/
│   │   ├── api/                      # API route handlers
│   │   │   ├── notifications/
│   │   │   └── super-admin/
│   │   ├── assets/[id]/scan/         # Halaman scan QR publik
│   │   ├── catalog/                  # Katalog publik
│   │   └── page.tsx                  # Landing page
│   ├── components/
│   │   ├── layouts/                  # AdminShell, BorrowerNav, dll
│   │   ├── shared/                   # Badge, ImageUpload, SafeImage
│   │   └── ui/                       # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/                 # server.ts + client.ts
│   │   ├── services/                 # emailService, whatsappService, telegramService
│   │   ├── notifications/            # sender.ts
│   │   └── utils.ts                  # cn(), formatRupiah(), formatDate()
│   ├── stores/
│   │   └── auth.ts                   # Zustand auth store
│   ├── types/
│   │   └── supabase.ts               # TypeScript types untuk semua tabel DB
│   └── proxy.ts                      # Middleware Next.js (routing auth)
├── supabase/
│   ├── schema.sql                    # Schema database utama
│   ├── schema-v2.sql                 # Schema versi alternatif
│   └── migrations/                   # File migrasi SQL berurutan
├── scripts/                          # Utility scripts (import, migrasi, verifikasi)
├── public/                           # Static assets
├── next.config.ts                    # Konfigurasi Next.js
├── package.json
└── .env.local                        # Environment variables (tidak di-commit)
```

---

## 4. Arsitektur Database

Database menggunakan **PostgreSQL** via Supabase dengan **Row Level Security (RLS)** aktif.

### Diagram Relasi Tabel Utama

```
buildings
    └── rooms (building_id → buildings.id)
            └── room_inventories (room_id → rooms.id)

equipment (alat yang dapat disewa)
    └── equipment_rates (equipment_id → equipment.id)
            [tarif per user_category: mahasiswa_s1, mahasiswa_s2, dosen, mou_unesa, umum]

users (extends auth.users)
    └── bookings (user_id → users.id)
            ├── booking_items   (booking_id → bookings.id) [room/equipment]
            ├── booking_agreements
            ├── booking_extensions
            ├── booking_early_returns
            ├── payments        (booking_id → bookings.id)
            └── returns         (booking_id → bookings.id)
```

### Daftar Tabel

| Tabel | Fungsi |
|-------|--------|
| `users` | Data pengguna + role |
| `buildings` | Data gedung |
| `rooms` | Data ruangan per gedung |
| `equipment` | Data alat/peralatan |
| `equipment_rates` | Tarif sewa alat per kategori user |
| `room_inventories` | Daftar inventaris per ruangan |
| `room_inventory_items` | Item detail inventaris ruangan |
| `assets` | Tabel legacy (sudah digantikan rooms + equipment) |
| `bookings` | Data pemesanan |
| `booking_items` | Item dalam pemesanan (ruangan atau alat) |
| `booking_assets` | Relasi booking ke asset (legacy) |
| `booking_agreements` | Persetujuan surat perjanjian |
| `booking_extensions` | Pengajuan perpanjangan booking |
| `booking_early_returns` | Data pengembalian lebih awal |
| `booking_waitlists` | Daftar antrian jika item tidak tersedia |
| `payments` | Data pembayaran |
| `returns` | Data pengembalian barang/ruangan |
| `asset_tracking_logs` | Log jejak audit aset via scan QR |
| `schedule_blocks` | Blokir jadwal tertentu |
| `notifications` | Log notifikasi terkirim |
| `notification_preferences` | Preferensi notifikasi per user |
| `agreement_templates` | Template surat perjanjian |

### Enum / Tipe Data Penting

```typescript
UserRole       = 'super_admin' | 'admin' | 'staff' | 'borrower'
BookingStatus  = 'pending' | 'approved' | 'rejected' | 'paid' | 'completed' | 'cancelled'
PaymentMethod  = 'online' | 'manual_cash' | 'manual_transfer' | 'refund'
PaymentStatus  = 'pending' | 'paid' | 'failed' | 'cancelled'
ReturnCondition= 'good' | 'minor_damage' | 'major_damage' | 'lost'
AssetCondition = 'good' | 'needs_repair' | 'damaged' | 'lost'

// Equipment-specific
ketersediaan   = 'tersedia' | 'digunakan' | 'hilang'
status_tindakan= 'normal' | 'perawatan' | 'menunggu_part' | 'afkir'
category       = 'elektronik' | 'mebel' | 'transportasi' | 'alat_tes_pengukuran' | 'alat_gym' | 'perlengkapan' | 'lainnya'
```

### Kategori Tarif Pengguna (equipment_rates)

| Kode | Keterangan |
|------|-----------|
| `mahasiswa_s1` | Mahasiswa S1 |
| `mahasiswa_s2` | Mahasiswa S2/S3 |
| `dosen` | Dosen / Tenaga Pendidik |
| `mou_unesa` | Mitra MoU Universitas |
| `umum` | Masyarakat Umum |

---

## 5. Alur Autentikasi & Otorisasi

### Middleware (src/proxy.ts)

File ini adalah Next.js middleware yang berjalan sebelum setiap request. Logikanya:

1. Cek apakah path adalah rute publik (`/`, `/catalog`, `/login`, `/register`, dll.)
2. Jika tidak publik → cek session Supabase
3. Jika belum login → redirect ke `/login`
4. Jika sudah login tapi akses rute admin tanpa role yang sesuai → redirect ke dashboard borrower

**Rute publik yang tidak perlu login:**
- `/` (landing page)
- `/catalog`
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/auth/callback`
- `/assets/[id]/scan` (scan QR publik)

### Supabase Client

| File | Digunakan Di | Keterangan |
|------|-------------|------------|
| `src/lib/supabase/server.ts` | Server Components, Server Actions, API Routes | Menggunakan cookies |
| `src/lib/supabase/client.ts` | Client Components | Browser-side |

### Auth Store (Zustand)

`src/stores/auth.ts` menyimpan state `user` dan `role` di sisi client untuk navigasi kondisional.

---

## 6. Modul-Modul Sistem

### 6.1 Manajemen Gedung (`/admin/buildings`)

**Fungsi:** CRUD data gedung sebagai container ruangan.

| Field | Tipe | Aturan |
|-------|------|--------|
| `name` | text | Wajib |
| `code` | text | Wajib, unik, format `[A-Z0-9]{1-5}` |
| `floor_count` | integer | 1–99 |
| `address` | text | Opsional |

---

### 6.2 Manajemen Ruangan (`/admin/rooms`)

**Fungsi:** CRUD ruangan, termasuk penentuan tarif dan fasilitas.

**File penting:**
- [src/app/(admin)/admin/rooms/page.tsx](src/app/(admin)/admin/rooms/page.tsx) — Server Component, fetch data
- [src/app/(admin)/admin/rooms/RoomsPageClient.tsx](src/app/(admin)/admin/rooms/RoomsPageClient.tsx) — Filter & tabel
- [src/app/(admin)/admin/rooms/RoomForm.tsx](src/app/(admin)/admin/rooms/RoomForm.tsx) — Form buat/edit

**Field penting:**
- `room_code` — unik per gedung (contoh: `A101`)
- `base_price` — harga dasar (integer, Rupiah)
- `is_active` — toggle aktif/nonaktif
- `is_for_rent` — toggle tersedia untuk disewa publik
- `facilities` — array string fasilitas

**Export/Import Excel:**
- Export: [src/app/(admin)/admin/rooms/exportRooms.ts](src/app/(admin)/admin/rooms/exportRooms.ts)
- Import: [src/app/(admin)/admin/rooms/importRooms.ts](src/app/(admin)/admin/rooms/importRooms.ts)

---

### 6.3 Manajemen Alat (`/admin/equipment`)

**Fungsi:** CRUD alat, status kondisi, ketersediaan, tarif per kategori.

**File penting:**
- [src/app/(admin)/admin/equipment/equipmentActions.ts](src/app/(admin)/admin/equipment/equipmentActions.ts) — Server Actions (CRUD)
- [src/app/(admin)/admin/equipment/EquipmentForm.tsx](src/app/(admin)/admin/equipment/EquipmentForm.tsx) — Form buat/edit
- [src/app/(admin)/admin/equipment/EquipmentRatesForm.tsx](src/app/(admin)/admin/equipment/EquipmentRatesForm.tsx) — Form tarif

**Aturan penting:**
- `equipment_code` — di-generate otomatis, **tidak bisa diubah setelah dibuat**
- Nama alat harus unik; jika duplikat, sistem otomatis menambah nomor: `"Proyektor (2)"`
- URL menggunakan slug dari nama: `"Proyektor Sony"` → `/admin/equipment/proyektor-sony/edit`

**Slug generation:**
```typescript
// src/app/(admin)/admin/equipment/equipmentActions.ts
function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
```

**Status alat (3 dimensi):**
| Dimensi | Nilai |
|---------|-------|
| Kondisi (`current_condition`) | `good`, `needs_repair`, `damaged`, `lost` |
| Ketersediaan (`ketersediaan`) | `tersedia`, `digunakan`, `hilang` |
| Tindakan (`status_tindakan`) | `normal`, `perawatan`, `menunggu_part`, `afkir` |

---

### 6.4 Inventaris Ruangan (`/admin/inventory`)

**Fungsi:** Mencatat barang-barang yang ada di dalam setiap ruangan (kursi, meja, proyektor ruangan, dll).

**Struktur:**
```
room_inventories (kategori inventaris per ruangan)
    └── room_inventory_items (item detail, dengan quantity & kondisi)
```

**File penting:**
- [src/app/(admin)/admin/inventory/[roomId]/RoomInventoryList.tsx](src/app/(admin)/admin/inventory/%5BroomId%5D/RoomInventoryList.tsx) — List item per ruangan
- [src/app/(admin)/admin/inventory/[roomId]/AddInventoryItemDialog.tsx](src/app/(admin)/admin/inventory/%5BroomId%5D/AddInventoryItemDialog.tsx) — Dialog tambah item

---

### 6.5 Manajemen Pemesanan (`/admin/bookings`)

**Fungsi:** Kelola seluruh siklus booking dari pending hingga selesai.

**Alur Status Booking:**
```
[Buat Booking] → pending
                    ├── approved → paid → completed
                    ├── rejected
                    └── cancelled
```

**File penting:**
- [src/app/(admin)/admin/bookings/[id]/page.tsx](src/app/(admin)/admin/bookings/%5Bid%5D/page.tsx) — Detail + aksi booking
- [src/app/(admin)/admin/bookings/[id]/ApprovalButtons.tsx](src/app/(admin)/admin/bookings/%5Bid%5D/ApprovalButtons.tsx) — Tombol approve/reject
- [src/app/(admin)/admin/bookings/[id]/EarlyReturnButton.tsx](src/app/(admin)/admin/bookings/%5Bid%5D/EarlyReturnButton.tsx) — Proses pengembalian awal

**Field booking penting:**
- `reference_no` — nomor referensi auto-generate
- `snapshot_rate` — tarif yang berlaku saat booking dibuat (JSON, tidak berubah walau tarif di-update)
- `extension_count` — berapa kali sudah diperpanjang

---

### 6.6 Manajemen Pembayaran (`/admin/payments`)

**Fungsi:** Catat dan verifikasi pembayaran.

**Metode pembayaran yang didukung:**
- `online` — payment gateway
- `manual_cash` — tunai dicatat admin
- `manual_transfer` — transfer bank dicatat admin
- `refund` — pengembalian dana

**File penting:**
- [src/app/(admin)/admin/payments/page.tsx](src/app/(admin)/admin/payments/page.tsx) — List pembayaran
- [src/app/(admin)/admin/payments/RecordPaymentButton.tsx](src/app/(admin)/admin/payments/RecordPaymentButton.tsx) — Catat pembayaran manual

---

### 6.7 Manajemen Pengembalian (`/admin/returns`)

**Fungsi:** Catat kondisi barang/ruangan saat dikembalikan, dan proses refund jika perlu.

**Alur pengembalian:**
```
booking selesai/early return
    → RecordReturnForm (catat kondisi)
    → CompleteReturnForm (finalkan + refund jika ada)
```

**File penting:**
- [src/app/(admin)/admin/returns/[id]/RecordReturnForm.tsx](src/app/(admin)/admin/returns/%5Bid%5D/RecordReturnForm.tsx)
- [src/app/(admin)/admin/returns/[id]/CompleteReturnForm.tsx](src/app/(admin)/admin/returns/%5Bid%5D/CompleteReturnForm.tsx)

**Kondisi pengembalian:**
| Kode | Arti |
|------|------|
| `good` | Kondisi baik |
| `minor_damage` | Kerusakan ringan |
| `major_damage` | Kerusakan berat |
| `lost` | Hilang |

---

### 6.8 Manajemen Pengguna (`/admin/users`)

**Fungsi:** Kelola akun admin, staff, dan borrower.

**Catatan:** Pengguna baru dengan role `borrower` bisa daftar sendiri via `/register`. Role `admin`/`staff`/`super_admin` hanya bisa dibuat oleh admin.

**File penting:**
- [src/app/(admin)/admin/users/page.tsx](src/app/(admin)/admin/users/page.tsx)
- [src/app/api/super-admin/users/route.ts](src/app/api/super-admin/users/route.ts) — API buat super_admin

---

### 6.9 Katalog Publik (`/catalog`)

**Fungsi:** Halaman publik untuk melihat ruangan & alat yang tersedia, dengan filter & info harga.

**File penting:**
- [src/app/catalog/page.tsx](src/app/catalog/page.tsx) — Server Component
- [src/app/catalog/CatalogClient.tsx](src/app/catalog/CatalogClient.tsx) — Filter interaktif

---

### 6.10 Laporan (`/admin/reports`)

**Fungsi:** Dashboard analitik — statistik booking, pendapatan, penggunaan alat/ruangan.

---

## 7. API Routes

| Endpoint | Method | Fungsi | Auth |
|----------|--------|--------|------|
| `/api/notifications/send` | POST | Kirim notifikasi multi-channel (email/WA/Telegram) | Admin/Staff |
| `/api/notifications/send-email` | POST | Kirim email kustom | Admin |
| `/api/super-admin/users` | POST | Buat user super_admin | Super Admin |
| `/api/super-admin/users/[id]` | PATCH/DELETE | Edit/hapus user | Super Admin |
| `/auth/callback` | GET | OAuth callback Supabase | — |

---

## 8. Layanan Notifikasi

Sistem mendukung 3 channel notifikasi:

| Channel | Service File | Library |
|---------|-------------|---------|
| Email | `src/lib/services/emailService.ts` | nodemailer (SMTP) |
| WhatsApp | `src/lib/services/whatsappService.ts` | (konfigurasi provider WA) |
| Telegram | `src/lib/services/telegramService.ts` | Telegram Bot API |

**Rate limiting email** (forgot-password): 3 request per 15 menit via Upstash Redis.

**Template editor:** `/admin/notifications` — admin bisa kustomisasi template notifikasi.

---

## 9. Import / Export Data

Sistem mendukung import/export via file Excel (`.xlsx`).

| Modul | Export | Import |
|-------|--------|--------|
| Ruangan | [exportRooms.ts](src/app/(admin)/admin/rooms/exportRooms.ts) | [importRooms.ts](src/app/(admin)/admin/rooms/importRooms.ts) |
| Alat | [exportEquipment.ts](src/app/(admin)/admin/equipment/exportEquipment.ts) | [importEquipment.ts](src/app/(admin)/admin/equipment/importEquipment.ts) |
| Inventaris | [exportInventory.ts](src/app/(admin)/admin/inventory/exportInventory.ts) | [importInventory.ts](src/app/(admin)/admin/inventory/importInventory.ts) |

**Library yang digunakan:** `xlsx` v0.18.5

Untuk melihat format kolom yang diperlukan saat import, jalankan export terlebih dahulu, lalu lihat struktur kolomnya sebagai template.

---

## 10. QR Code

Setiap alat memiliki QR Code yang dapat di-scan untuk melihat info publik atau memperbarui kondisi.

**Halaman scan publik:** `/assets/[id]/scan` — tidak perlu login, mencatat log via `asset_tracking_logs`.

**Generator QR:**
- Per item: [src/app/(admin)/admin/equipment/EquipmentQRCode.tsx](src/app/(admin)/admin/equipment/EquipmentQRCode.tsx)
- Batch: `/admin/qr/batch` — generate QR banyak alat sekaligus

**Tracking actions:**
| Action | Keterangan |
|--------|-----------|
| `scan_public` | Scan oleh publik |
| `update_condition` | Update kondisi via scan |
| `update_location` | Update lokasi via scan |
| `marked_returned` | Tandai sudah dikembalikan |

---

## 11. Konfigurasi Environment

File `.env.local` di root project (tidak di-commit ke git):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Hanya server-side, jangan expose ke client

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@domain.com
SMTP_PASS=app_password_here
SMTP_FROM=noreply@domain.com

# Rate Limiting (Upstash Redis) — untuk forgot-password
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# WhatsApp (opsional)
WHATSAPP_API_URL=...
WHATSAPP_API_TOKEN=...

# Telegram (opsional)
TELEGRAM_BOT_TOKEN=...
```

> **Penting:** `SUPABASE_SERVICE_ROLE_KEY` memberikan akses penuh ke database tanpa RLS. Hanya gunakan di server-side code.

---

## 12. Migrasi Database

### File Schema Utama

- **`supabase/schema.sql`** — schema lengkap, jalankan di Supabase SQL Editor untuk setup awal
- **`supabase/schema-v2.sql`** — versi alternatif

### Migrasi Bertahap (supabase/migrations/)

Jalankan secara berurutan berdasarkan timestamp:

| File | Fungsi |
|------|--------|
| `20250507_add_building_floor_to_equipment.sql` | Tambah kolom building/floor ke tabel equipment |
| `20250507_auto_generate_equipment_codes.sql` | Trigger auto-generate kode alat |
| `20250507_fix_get_user_role_function.sql` | Perbaikan fungsi get user role |
| `20250509_fix_inventory_rls_policies.sql` | Perbaikan RLS inventory |
| `20250509_add_booking_borrower_columns.sql` | Tambah kolom info peminjam ke bookings |
| `20250509_add_booking_columns.sql` | Tambah kolom tambahan bookings |
| `20250509_add_room_rates_rls.sql` | RLS untuk room_rates |
| `20250509_add_early_returns_table.sql` | Buat tabel early_returns |
| `20250509_update_returns_workflow.sql` | Update alur pengembalian |
| `20250509_fix_returns_columns.sql` | Perbaikan kolom tabel returns |

### Cara Menjalankan Migrasi

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih project
2. Klik **SQL Editor**
3. Paste isi file SQL, klik **Run**
4. Verifikasi dengan `scripts/verify-database.js`

---

## 13. Cara Menjalankan Lokal

### Prasyarat

- Node.js 18+ (direkomendasikan 20 LTS)
- npm atau yarn
- Akses ke Supabase project

### Langkah-langkah

```bash
# 1. Clone repository
git clone <repo-url>
cd sewa-ruang

# 2. Install dependencies
npm install

# 3. Buat file environment
cp .env.example .env.local
# Edit .env.local dengan nilai yang benar

# 4. Jalankan development server
npm run dev
# Buka http://localhost:3000
```

### Scripts yang Tersedia

```bash
npm run dev      # Development server (hot reload)
npm run build    # Build production
npm run start    # Jalankan build production
npm run lint     # Cek kode dengan ESLint
```

---

## 14. Deployment

Sistem ini di-deploy ke **Vercel** (direkomendasikan untuk Next.js).

### Langkah Deployment

1. Push code ke GitHub/GitLab
2. Connect repository ke Vercel
3. Set environment variables di Vercel Dashboard (sama seperti `.env.local`)
4. Deploy otomatis setiap push ke branch `main`

### Variabel Penting di Vercel

Semua variabel di section [Konfigurasi Environment](#11-konfigurasi-environment) harus di-set di **Vercel → Project → Settings → Environment Variables**.

---

## 15. Troubleshooting Umum

### Masalah Upload Gambar

**Gejala:** Gambar tidak tampil atau error saat upload  
**Penyebab:** Next.js Image component tidak kompatibel dengan beberapa URL Supabase Storage  
**Solusi:** Gunakan `SafeImage` component di [src/components/shared/SafeImage.tsx](src/components/shared/SafeImage.tsx) (bukan `next/image`)

### Gambar Terpotong (Cropping)

**Gejala:** Foto alat/ruangan terpotong  
**Solusi:** Pastikan CSS menggunakan `object-contain` bukan `object-cover`

### RLS Error di Database

**Gejala:** Query gagal dengan error "new row violates row-level security policy"  
**Solusi:** Cek file `scripts/diagnose-inventory-rls.sql` dan jalankan migrasi `supabase/migrations/20250509_fix_inventory_rls_policies.sql`

### Kolom Database Tidak Ditemukan

**Gejala:** Error "column X does not exist"  
**Solusi:** Pastikan semua file migrasi sudah dijalankan berurutan. Lihat folder `supabase/migrations/`.

### Email Reset Password Tidak Terkirim

**Gejala:** User tidak menerima email  
**Penyebab 1:** Rate limit — maksimal 3 request per 15 menit  
**Penyebab 2:** SMTP credentials salah  
**Solusi:** Cek `SMTP_*` env vars, dan cek Upstash Redis quota.

### Dropdown Ruangan Menampilkan UUID

**Gejala:** Selector ruangan menampilkan ID bukan nama  
**Solusi:** Komponen [RoomSelect.tsx](src/app/(admin)/admin/equipment/RoomSelect.tsx) adalah Client Component yang menampilkan nama ruangan. Pastikan data ruangan ter-fetch dengan benar.

### URL Alat 404 Setelah Edit Nama

**Gejala:** Link lama ke alat tidak berfungsi setelah nama diubah  
**Penjelasan:** URL alat menggunakan slug dari nama (bukan ID). Jika nama diubah, URL juga berubah.  
**Solusi by design:** Beri tahu pengguna bahwa URL berubah saat nama diubah.

---

*Dokumen ini dibuat pada 10 Mei 2026. Update dokumentasi ini setiap ada perubahan arsitektur signifikan.*
