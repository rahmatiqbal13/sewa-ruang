# Panduan Fitur — Sewa Ruang & Alat

---

## 1. Sistem QR Payment

### Cara Kerja
1. Admin/staff generate QR code untuk booking tertentu (`/admin/qr/batch` atau per booking)
2. Peminjam scan QR → diarahkan ke halaman upload bukti transfer
3. Peminjam upload foto bukti transfer
4. Admin verifikasi di `/admin/payments`
5. Status booking berubah ke `active`

### Generate QR Individual
```
/admin/bookings → pilih booking → Generate QR
```

### Generate QR Batch
```
/admin/qr/batch → pilih beberapa booking → Generate & Print
```

### Print QR
Gunakan `printUtils.ts` di `src/app/(admin)/admin/qr/` untuk format print.

---

## 2. Sistem Notifikasi Email

### Setup SMTP

Edit environment variables:
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-login
SMTP_PASS=your-smtp-key
EMAIL_FROM=noreply@domain.com
EMAIL_FROM_NAME=Sistem Sewa Ruang & Alat
```

**Rekomendasi provider:** Brevo (gratis 300 email/hari), SendGrid, atau Gmail (dengan App Password).

### Jenis Notifikasi

| Trigger | Penerima | Konten |
|---------|---------|--------|
| Booking baru dibuat | Admin | Detail booking, data peminjam |
| Booking disetujui | Peminjam | Konfirmasi + instruksi pembayaran |
| Booking ditolak | Peminjam | Alasan penolakan |
| Pembayaran diterima | Peminjam | Konfirmasi aktif |
| H-1 sebelum booking | Peminjam | Reminder |
| Booking selesai | Peminjam | Terima kasih + evaluasi |

### Template Variables

Template email mendukung variabel yang di-replace otomatis:

```
{{BORROWER_NAME}}       Nama peminjam
{{BOOKING_ID}}          ID booking
{{BOOKING_CODE}}        Kode pembayaran
{{ITEM_NAME}}           Nama ruangan/alat
{{START_DATETIME}}      Waktu mulai
{{END_DATETIME}}        Waktu selesai
{{TOTAL_COST}}          Total biaya
{{INSTITUTION_NAME}}    Nama institusi
{{ADMIN_EMAIL}}         Email admin
```

Kustomisasi template di: `/admin/notifications`

### Konfigurasi di Admin

```
/admin/notifications → konfigurasi template → simpan
```

---

## 3. Forgot Password Flow

### Cara Kerja
1. User buka `/forgot-password`
2. Masukkan email terdaftar
3. Sistem kirim email dengan link reset (via Supabase Auth)
4. User klik link → diarahkan ke `/reset-password`
5. User masukkan password baru

### Rate Limiting
Dibatasi 3 kali per 15 menit per IP address (via Upstash Redis).

### Setup yang Diperlukan

Di Supabase Auth → Email Templates: kustomisasi template email reset password.

Di Supabase Auth → URL Configuration: tambahkan redirect URL:
```
https://your-domain.com/auth/callback*
https://your-domain.com/reset-password
```

> **PERHATIAN:** Per 2026-05-29, ada bug aktif di mana `/forgot-password` tidak bisa diakses karena tidak ada di `PUBLIC_ROUTES`. Lihat [BUG_HISTORY.md](BUG_HISTORY.md#bug-09).

---

## 4. Import & Export Data

### Export

**Equipment ke Excel:**
```
/admin/equipment → tombol Export → download .xlsx
```

**Bookings ke Excel:**
```
/admin/bookings → tombol Export → download .xlsx
```

### Import

**Equipment dari Excel:**
```
/admin/equipment → tombol Import → upload .xlsx
```

Template Excel bisa didownload dari halaman yang sama.

**Format kolom Excel equipment:**
- `Nama` (wajib)
- `Kategori` — elektronik | mebel | transportasi | alat_tes_pengukuran | alat_gym | perlengkapan | lainnya
- `Merk`
- `Kondisi` — good | needs_repair | damaged | lost
- `Kode Ruang Penyimpanan`
- `Sumber Perolehan`
- `Tarif S1/hari`, `Tarif S2/hari`, `Tarif Dosen/hari`, `Tarif MOU/hari`, `Tarif Umum/hari`

---

## 5. PWA (Progressive Web App)

### Fitur PWA yang Tersedia
- Install prompt (Add to Home Screen)
- Offline page (`/public/offline.html`)
- Web manifest (`/public/manifest.json`)
- Theme color dan splash screen

### Status Per 2026-05-29
- ⚠️ Service worker tidak berfungsi — file terhapus, perlu dipulihkan
- Install prompt: berfungsi (via `usePWA()` hook)
- Manifest: berfungsi (HTTP 200)

### Mengaktifkan Kembali Service Worker
1. Buat ulang `public/service-worker.js` dengan konten minimal:
```javascript
self.addEventListener('install', event => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(clients.claim()))
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')))
})
```

2. Tambahkan `/service-worker.js` ke middleware allowlist atau hapus `.js` extension dari matcher:
```typescript
// src/proxy.ts - matcher config
matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js)$).*)']
//                                                                                         ^^^^ tambahkan ini
```

---

## 6. Profil Institusi

Admin dapat mengkustomisasi informasi institusi yang tampil di seluruh sistem.

```
/admin/settings → Institution Profile
```

Field yang dapat dikustomisasi:
- Nama institusi
- Singkatan
- Deskripsi
- Website
- Logo/foto
- Alamat + kontak

Data ini otomatis muncul di:
- Navbar publik
- Footer
- Email notification
- Metadata halaman (title, description)

---

## 7. QR Scanner

Scanner QR code berbasis web (tanpa aplikasi tambahan).

```
/admin/scan → izinkan akses kamera → scan QR booking
```

Hasil scan: detail booking langsung muncul — nama peminjam, item, waktu, status pembayaran.

Implementasi menggunakan library `html5-qrcode`.
