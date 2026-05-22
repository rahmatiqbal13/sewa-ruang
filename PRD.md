# Product Requirements Document (PRD)
## Sistem Sewa Ruang & Alat — Laboratorium Universitas

**Versi:** 1.0  
**Tanggal:** 2026-05-22  
**Penulis:** Rahmat Iqbal  
**Status:** Aktif / Production

---

## 1. Ringkasan Produk

### 1.1 Deskripsi
Sistem Sewa Ruang & Alat adalah platform manajemen peminjaman digital untuk laboratorium universitas (USC — Unit Sewa dan Cipta). Sistem ini menggantikan proses peminjaman manual dengan alur pengajuan, persetujuan, pembayaran, dan pengembalian yang terintegrasi secara digital.

### 1.2 Tujuan
- Digitalisasi proses peminjaman ruangan dan peralatan laboratorium
- Mengurangi administrasi manual dan risiko kesalahan pencatatan
- Memberikan visibilitas real-time status peminjaman kepada peminjam dan admin
- Otomatisasi notifikasi pengingat jatuh tempo dan keterlambatan pengembalian
- Menyediakan laporan dan rekap keuangan yang akurat

### 1.3 Konteks Bisnis
Sistem digunakan oleh laboratorium universitas yang menyewakan ruangan dan peralatan kepada mahasiswa, dosen, dan pihak eksternal. Setiap peminjaman memerlukan formulir resmi, pembayaran via Virtual Account (VA) atau tunai, dan konfirmasi pengembalian oleh petugas.

---

## 2. Pengguna (User Roles)

| Role | Deskripsi | Akses |
|---|---|---|
| **Super Admin** | Administrator tertinggi | Full access — termasuk manajemen user, lihat password, konfigurasi sistem |
| **Admin** | Operator harian | Kelola booking, pembayaran, pengembalian, laporan |
| **Staff** | Petugas lapangan | Akses terbatas sesuai tugas |
| **Borrower** | Peminjam (mahasiswa, dosen, umum) | Hanya akses portal peminjam |

### 2.1 Kategori Peminjam (Borrower)

| Kategori | Keterangan |
|---|---|
| `mahasiswa_s1` | Mahasiswa S1 |
| `mahasiswa_s2` | Mahasiswa Pascasarjana |
| `dosen` | Dosen |
| `staff` | Karyawan |
| `mou_unesa` | Mitra Kerjasama |
| `umum` | Umum / Eksternal |

---

## 3. Arsitektur Sistem

### 3.1 Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Styling | Tailwind CSS + shadcn/ui |
| PDF | puppeteer-core + HTML template |
| Email | Nodemailer (SMTP) |
| Notifikasi | Telegram Bot, WhatsApp API |
| Cron | Vercel Cron Jobs |
| Deployment | Vercel |

### 3.2 Struktur URL

#### Admin Panel (`/admin/*`)
| URL | Halaman |
|---|---|
| `/admin/dashboard` | Dashboard statistik real-time |
| `/admin/bookings` | Manajemen semua peminjaman |
| `/admin/bookings/new` | Buat peminjaman manual |
| `/admin/bookings/[id]` | Detail & aksi peminjaman |
| `/admin/rooms` | Manajemen ruangan |
| `/admin/equipment` | Manajemen alat/peralatan |
| `/admin/buildings` | Manajemen gedung |
| `/admin/inventory` | Inventaris per ruangan |
| `/admin/payments` | Transaksi & verifikasi pembayaran |
| `/admin/returns` | Pengembalian aset |
| `/admin/users` | Manajemen pengguna (Super Admin) |
| `/admin/reports` | Laporan kondisi & aset |
| `/admin/notifications` | Konfigurasi saluran & template notifikasi |
| `/admin/settings` | Pengaturan profil institusi |
| `/admin/qr` | Generator QR Code aset |
| `/admin/logs` | Log aktivitas sistem |
| `/admin/trash` | Sampah / data terhapus |

#### Portal Peminjam (`/dashboard`, `/bookings/*`, dll.)
| URL | Halaman |
|---|---|
| `/dashboard` | Dashboard peminjam |
| `/bookings` | Riwayat peminjaman |
| `/bookings/[id]` | Detail peminjaman |
| `/booking/new` | Form pengajuan baru |
| `/booking/[id]/payment` | Halaman pembayaran |
| `/booking/[id]/upload-proof` | Upload bukti transfer |
| `/profile` | Profil pengguna |

#### Publik
| URL | Halaman |
|---|---|
| `/catalog` | Katalog ruangan & alat |
| `/login` | Login |
| `/register` | Registrasi akun peminjam |

---

## 4. Fitur Utama

### 4.1 Manajemen Ruangan

**Entitas:**
- Nama, kode ruangan (unik per gedung), gedung, lantai, kapasitas
- Tipe ruangan, kondisi, status aktif
- Foto ruangan
- Harga dasar (`base_price`)
- Tarif per kategori pengguna (`room_rates`)

**Fitur Admin:**
- CRUD ruangan
- Upload foto
- Set tarif per jam / per hari per kategori peminjam
- Filter, pencarian, dan paginasi
- Soft delete (trash)

---

### 4.2 Manajemen Alat / Peralatan

**Entitas:**
- Nama, kode alat (auto-generate, immutable), kategori, merk
- Kondisi: `good` / `needs_repair` / `damaged` / `lost`
- Ketersediaan: `tersedia` / `digunakan` / `hilang`
- Status tindakan: `normal` / `perawatan` / `menunggu_part` / `afkir`
- Lokasi penyimpanan (room FK), lokasi saat ini
- Sumber perolehan, foto, deskripsi

**Kategori Alat:**
`elektronik` · `mebel` · `transportasi` · `alat_tes_pengukuran` · `alat_gym` · `perlengkapan` · `lainnya`

**Fitur Admin:**
- CRUD alat
- Set tarif per kategori pengguna (`equipment_rates`)
- Flag supervisi per kategori
- Import massal via dialog
- QR Code per alat (print batch)
- Soft delete
- Bulk actions

---

### 4.3 Manajemen Gedung & Inventaris

- CRUD gedung (nama, kode)
- Inventaris per ruangan: item non-sewable yang ada di dalam ruangan (meja, kursi, proyektor, dll.)
- CRUD item inventaris dengan kondisi dan kuantitas

---

### 4.4 Peminjaman (Booking)

#### Alur Peminjaman

```
Peminjam mengajukan
        ↓
   Status: pending
        ↓
Admin menyetujui / menolak
        ↓
   Status: approved / rejected
        ↓
Peminjam melakukan pembayaran
        ↓
Admin verifikasi pembayaran
        ↓
     Status: paid
        ↓
Peminjam menggunakan aset
        ↓
Admin mencatat pengembalian
        ↓
   Status: completed
```

#### Status Booking

| Status | Keterangan |
|---|---|
| `pending` | Menunggu persetujuan admin |
| `approved` | Disetujui, menunggu pembayaran |
| `paid` | Lunas, siap digunakan |
| `completed` | Selesai, aset dikembalikan |
| `rejected` | Ditolak admin |
| `cancelled` | Dibatalkan peminjam |

#### Data Booking
- Nomor referensi (auto-generate, format: `BKYYYYMMdd-XXXX`)
- Peminjam, tanggal mulai, tanggal selesai
- Item yang dipinjam (ruang dan/atau alat, bisa lebih dari satu)
- Total tagihan, kode pembayaran
- Catatan admin, catatan peminjam

**Fitur Admin:**
- Tampilan tabel & kartu
- Filter per status, pencarian by referensi/nama/instansi
- Paginasi (10 per halaman)
- Approval / rejection dengan catatan
- Kirim pesan ke peminjam (Email / WhatsApp / Telegram)
- Download & preview Formulir PDF (USC format)
- Kirim ulang formulir ke email peminjam
- Pengembalian lebih awal (`EarlyReturn`)
- Hapus booking (cascade ke pembayaran & pengembalian)

**Fitur Peminjam:**
- Form pengajuan baru (pilih ruang dan/atau alat, tanggal, tujuan)
- Riwayat peminjaman dengan status
- Batalkan peminjaman (jika masih pending)
- Upload bukti pembayaran

---

### 4.5 Pembayaran

**Metode Pembayaran:**
- Virtual Account (VA) per kategori aset (ruang / alat)
- Transfer manual
- Tunai (input oleh admin)

**Alur Pembayaran:**
1. Peminjam menerima nomor VA dari formulir
2. Peminjam transfer dan upload bukti
3. Admin verifikasi via halaman `/admin/payments/verify`
4. Status booking berubah ke `paid`

**Data Payment:**
- Tabel `payments`: pembayaran manual yang diinput admin
- Tabel `payment_proofs`: bukti transfer yang diupload peminjam
- VA info dari tabel `bank_accounts` (`payment_method_type = 'va'`)

**Fitur Admin:**
- Daftar semua transaksi
- Verifikasi bukti transfer VA
- Input pembayaran manual
- Hapus record pembayaran / bukti transfer
- Statistik: total terkumpul, menunggu pembayaran, menunggu verifikasi

---

### 4.6 Pengembalian (Returns)

**Alur Pengembalian:**
1. Admin membuka halaman `/admin/returns`
2. Filter per jenis aset (alat / ruang)
3. Proses pengembalian: catat kondisi, waktu kembali, catatan
4. Booking status → `completed`

**Data Return:**
- Waktu dikembalikan (`returned_at`)
- Kondisi saat kembali: `good` / `minor_damage` / `major_damage` / `lost`
- Flag pengembalian lebih awal (`is_early_return`)
- Catatan petugas

**Fitur Admin:**
- Tabel peminjaman aktif (menunggu pengembalian) dengan highlight overdue
- Riwayat pengembalian
- Hapus record pengembalian

---

### 4.7 Dokumen PDF

#### Formulir Peminjaman USC (4 halaman)
1. **Formulir Peminjaman** — Data peminjam + daftar aset yang dipinjam
2. **Risiko & Persetujuan** — Pernyataan risiko + kolom tanda tangan
3. **Invoice + Catatan Pembayaran** — Rincian biaya + info VA dinamis
4. **Persetujuan & Tanda Tangan** — TTD Admin USC & Pemohon

**Fitur:**
- Generate otomatis via puppeteer (HTML → PDF)
- Dikirim via email saat booking diajukan
- Admin dapat download (attachment) atau preview (inline)
- Admin dapat kirim ulang formulir ke email peminjam
- Info VA dinamis: tampilkan VA Ruang / VA Alat / keduanya sesuai isi booking

---

### 4.8 Notifikasi

#### In-App (Notification Bell — Admin)
Real-time refresh, menampilkan:
- **Telat Kembali** (merah) — Booking aktif yang sudah lewat batas waktu
- **Jatuh Tempo** (oranye) — Booking aktif yang berakhir dalam 24 jam
- **Pengajuan Baru** (kuning) — Booking dengan status `pending`
- **Member Baru** (hijau) — User baru mendaftar dalam 7 hari terakhir

Badge menampilkan jumlah **unread** saja. Saat popover dibuka, semua item otomatis ditandai "sudah dibaca" via `localStorage`. Badge kembali ke 0 setelah dibuka.

#### External Notifications
| Channel | Trigger | Penerima |
|---|---|---|
| Email | Booking diajukan | Peminjam (+ formulir PDF) |
| Email | Pengingat jatuh tempo | Peminjam |
| Email | Keterlambatan pengembalian | Peminjam |
| WhatsApp | Pengingat jatuh tempo | Peminjam |
| WhatsApp | Keterlambatan pengembalian | Peminjam |
| Telegram | Booking baru masuk | Admin |

#### Cron Job (Vercel, harian)
Endpoint: `GET /api/reminders/process`  
Tugas:
- Proses reminder terjadwal (`booking_reminders` table)
- Deteksi booking overdue → kirim notifikasi email + WhatsApp ke peminjam
- Deduplication: hanya 1 notifikasi overdue per booking per hari

#### Konfigurasi Notifikasi (Admin)
- Aktif/nonaktif per channel (Email, WhatsApp, Telegram)
- Edit template pesan per event type dan kategori user
- Riwayat notifikasi terkirim

---

### 4.9 Manajemen Pengguna (Super Admin Only)

**Akses:** Hanya `super_admin` — non-super_admin di-redirect ke dashboard

**Fitur:**
- Daftar semua pengguna dengan detail lengkap
- **UserDetailSheet** (panel samping):
  - Semua info akun (email, WA, Telegram, instansi, kelas, no. identitas, tgl daftar)
  - **Password tersimpan** — tampil tersembunyi, klik mata untuk reveal
  - Form set/ganti password langsung (update `auth.users` + simpan `plain_password`)
  - Riwayat peminjaman user (lazy-load, 6 terbaru)
- Edit data profil user
- Ubah role user
- Reset password user
- Hapus user (hard delete dari Supabase Auth + cascade)
- Tambah user baru (dibuat oleh admin)

**Plain Password:**
- Disimpan di kolom `plain_password` tabel `users`
- Diisi saat: admin membuat user, admin reset password, user mendaftar sendiri
- Hanya visible di UserDetailSheet saat login sebagai `super_admin`
- User yang mendaftar sebelum fitur ini aktif: `plain_password = null` (perlu di-reset)

---

### 4.10 Katalog Publik

URL: `/catalog`  
Menampilkan ruangan dan alat yang tersedia untuk disewa.  
Tersedia untuk pengunjung tanpa login (guest).

---

### 4.11 QR Code Aset

- Generate QR Code per alat (berisi URL detail alat)
- Print batch QR Code untuk semua alat aktif
- Halaman `/admin/qr` dan `/admin/qr/batch`

---

### 4.12 Laporan (Reports)

Halaman `/admin/reports` menampilkan:
- Daftar alat per kondisi (baik, perlu perbaikan, rusak, hilang)
- Daftar inventaris per ruangan
- Status ketersediaan aset
- Filter dan pencarian

---

### 4.13 Pengaturan Sistem

- **Profil Institusi** — nama institusi, logo, kontak, alamat (ditampilkan di PDF)
- **Notifikasi** — konfigurasi channel & template (lihat 4.8)
- **Metode Pembayaran** — konfigurasi Virtual Account bank (BTN) per kategori

---

## 5. Database Schema (Tabel Utama)

| Tabel | Deskripsi |
|---|---|
| `users` | Profil pengguna (extend Supabase Auth) |
| `buildings` | Gedung |
| `rooms` | Ruangan |
| `room_rates` | Tarif ruangan per kategori pengguna |
| `equipment` | Alat/peralatan |
| `equipment_rates` | Tarif alat per kategori pengguna |
| `room_inventory` | Inventaris per ruangan |
| `bookings` | Data peminjaman |
| `booking_items` | Item dalam peminjaman (ruang/alat) |
| `booking_slots_rooms` | Slot waktu booking ruangan |
| `booking_slots_equipment` | Slot waktu booking alat |
| `payments` | Pembayaran manual |
| `payment_proofs` | Bukti transfer VA |
| `bank_accounts` | Rekening & VA bank |
| `returns` | Catatan pengembalian aset |
| `booking_early_returns` | Pengembalian lebih awal |
| `booking_reminders` | Jadwal & riwayat reminder |
| `notification_channel_configs` | Konfigurasi channel notifikasi |
| `notification_templates` | Template pesan notifikasi |
| `notifications` | Log notifikasi terkirim |

**Catatan relasi penting:**
- `bookings` memiliki 2 FK ke `users`: `user_id` (peminjam) dan `payment_verified_by` (admin verifikasi) — query harus menggunakan hint `users!user_id(...)`
- Hampir semua tabel child dari `bookings` menggunakan `ON DELETE CASCADE`
- Tabel `users` menggunakan non-recursive RLS policy (tidak boleh ada subquery ke `users` di dalam `USING` clause)

---

## 6. Security & Access Control

### 6.1 Pola Admin Data Fetching
Semua server component di `/admin/**` harus menggunakan `createAdminClient` (service role) untuk bypass RLS:
```typescript
import { createAdminClient as createClient } from '@/lib/supabase/server'
```

### 6.2 API Endpoint Authorization
| Endpoint | Akses |
|---|---|
| `/api/super-admin/**` | Super Admin only |
| `/api/bookings/[id]` DELETE | Admin / Super Admin |
| `/api/returns/[id]` DELETE | Admin / Super Admin |
| `/api/payments/[id]` DELETE | Admin / Super Admin |
| `/api/reminders/process` | Cron Secret (Bearer token) |
| `/api/notifications/booking-submitted` | Internal (server-to-server) |

### 6.3 RLS Policies
- `users` table: SELECT = all authenticated (non-recursive), UPDATE = own data only
- Admin operations menggunakan service role (bypass RLS)
- `booking_reminders`: admin manage all, user view own

---

## 7. Integrasi Eksternal

| Layanan | Fungsi | Config |
|---|---|---|
| **Supabase** | Database, Auth, Storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Nodemailer** | Kirim email + attachment PDF | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL` |
| **Telegram Bot** | Notifikasi admin | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` |
| **WhatsApp API** | Notifikasi peminjam | `WHATSAPP_API_URL`, `WHATSAPP_API_KEY` |
| **Google Chrome** | Generate PDF via puppeteer | `CHROME_EXECUTABLE_PATH` (auto-detect jika kosong) |
| **Vercel Cron** | Jalankan reminder harian | `CRON_SECRET` |

---

## 8. Alur Registrasi & Login

### 8.1 Registrasi Mandiri (Peminjam)
1. Isi form `/register`: nama, email, password, WA, kategori, instansi, kelas, no. identitas, Telegram, foto
2. `supabase.auth.signUp()` dipanggil → password di-hash oleh Supabase Auth
3. `plain_password` (teks asli) disimpan ke tabel `users` **sebelum proses hash**
4. Akun langsung aktif (tidak memerlukan verifikasi email)

### 8.2 Login
- Supabase Auth session (cookie-based)
- Role diambil dari tabel `users.role`
- Redirect berdasarkan role: admin/super_admin/staff → `/admin/dashboard`, borrower → `/dashboard`

---

## 9. Halaman & Komponen Kunci

| Komponen | Lokasi | Deskripsi |
|---|---|---|
| `NotificationBell` | `layouts/NotificationBell.tsx` | Bell notifikasi admin dengan unread tracking |
| `BookingsList` | `admin/bookings/BookingsList.tsx` | Tabel/card booking dengan filter, search, paginasi |
| `UserDetailSheet` | `admin/users/UserDetailSheet.tsx` | Panel detail user + password visibility + riwayat booking |
| `BookingStatusBadge` | `shared/BookingStatusBadge.tsx` | Badge status booking yang konsisten |
| `SafeImage` | `shared/SafeImage.tsx` | Wrapper `<img>` dengan error handling |
| `ContactButtons` | `shared/ContactButtons.tsx` | Tombol kontak peminjam (Email/WA/Telegram) |
| `generateUSCBookingDocument` | `lib/pdf-generator.ts` | Generator HTML formulir USC 4 halaman |

---

## 10. Fitur yang Belum Diimplementasikan

| Fitur | Status | Catatan |
|---|---|---|
| Payment Gateway (Midtrans) | Segera Hadir | Konfigurasi ada di settings tapi belum aktif |
| Template Surat Perjanjian | Segera Hadir | UI placeholder sudah ada |
| Availability Calendar | Belum | Tampilan kalender ketersediaan ruang/alat |
| Laporan Keuangan Lengkap | Parsial | Hanya summary di dashboard |
| Export Data (Excel/CSV) | Parsial | Tombol Export ada tapi belum fungsional |

---

## 11. Konvensi Kode

### Slug URL
```typescript
function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
// "Proyektor Sony" → "proyektor-sony"
```

### Query Booking (Hindari Ambiguous FK)
```typescript
// ✅ Benar
.select('..., users!user_id(name, email)')

// ❌ Salah
.select('..., users(name, email)')
```

### Kolom yang Tidak Ada
```typescript
// booking_items TIDAK punya kolom `price`
// Gunakan booking.total_amount untuk total tagihan
```

---

## 12. Environment Variables Lengkap

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email (SMTP)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM_NAME=Sewa Ruang & Alat
SMTP_FROM_EMAIL=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=

# WhatsApp
WHATSAPP_API_URL=
WHATSAPP_API_KEY=

# PDF Generation
CHROME_EXECUTABLE_PATH=

# Cron
CRON_SECRET=
```

---

*Dokumen ini mencerminkan state sistem per 2026-05-22. Update setiap ada perubahan fitur signifikan.*
