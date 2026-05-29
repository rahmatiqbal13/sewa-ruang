# Panduan Admin — Sewa Ruang & Alat

Panduan operasional harian untuk **admin**, **staff**, dan **super_admin**.

---

## Login & Akses

### Login
1. Buka URL sistem → klik **Masuk** atau akses `/login`
2. Masukkan email dan password
3. Sistem arahkan ke `/admin/dashboard` (admin/staff) atau `/dashboard` (borrower)

### Logout
Klik nama/foto di pojok kanan atas sidebar → **Logout**

### Role & Hak Akses

| Role | Bisa Akses |
|------|-----------|
| `super_admin` | Semua fitur + manajemen admin users |
| `admin` | Semua fitur admin |
| `staff` | Booking, pembayaran, pengembalian |
| `borrower` | Dashboard pribadi, buat booking |

---

## Manajemen Gedung

### Tambah Gedung
1. Sidebar → **Gedung** → **+ Tambah Gedung**
2. Isi: Nama, Kode (unik, maks 5 karakter), Jumlah Lantai, Alamat (opsional)
3. Simpan

> Kode gedung bersifat unik dan tidak bisa duplikat.

### Edit / Hapus
- Edit: klik ikon pensil pada baris gedung
- Hapus: klik ikon tempat sampah → konfirmasi
- Gedung tidak bisa dihapus jika masih punya ruangan aktif

---

## Manajemen Ruangan

### Tambah Ruangan
1. Sidebar → **Ruangan** → **+ Tambah Ruangan**
2. Isi: Nama, Gedung (pilih), Kode Ruangan, Kapasitas, Lantai, Tipe
3. Upload foto (opsional)
4. Set tarif per kategori pengguna
5. Simpan

### Status Ruangan
- `is_active` — ruangan tampil di sistem
- `is_for_rent` — ruangan bisa disewa (tampil di katalog publik)

### Inventaris Ruangan
Setiap ruangan bisa punya daftar inventaris (meja, kursi, proyektor, dll):
```
/admin/rooms → klik nama ruangan → tab Inventaris
```

---

## Manajemen Alat/Peralatan

### Tambah Alat
1. Sidebar → **Alat** → **+ Tambah Alat**
2. Isi field wajib:
   - **Nama** (harus unik — sistem tambah "(2)" otomatis jika duplikat)
   - **Kategori**: elektronik | mebel | transportasi | alat_tes_pengukuran | alat_gym | perlengkapan | lainnya
   - **Kondisi**: good | needs_repair | damaged | lost
3. Upload foto (opsional)
4. Set tarif per kategori pengguna (S1, S2, Dosen, MOU, Umum) — per hari dan/atau per jam
5. Simpan

### Status Alat

| Status | Kolom | Nilai |
|--------|-------|-------|
| Kondisi | `current_condition` | good, needs_repair, damaged, lost |
| Ketersediaan | `ketersediaan` | tersedia, digunakan, hilang |
| Tindakan | `status_tindakan` | normal, perawatan, menunggu_part, afkir |

### Edit Alat
```
/admin/equipment → klik nama alat → Edit
```
URL edit menggunakan slug nama: `/admin/equipment/nama-alat/edit`

### Pengecekan Kondisi Alat
```
/admin/equipment/[slug]/check → form pengecekan → simpan log
```

---

## Manajemen Booking

### Status Booking

| Status | Artinya |
|--------|---------|
| `pending` | Menunggu review admin |
| `approved` | Disetujui, menunggu pembayaran |
| `active` | Pembayaran verified, sedang berjalan |
| `completed` | Selesai dan dikembalikan |
| `rejected` | Ditolak admin |
| `cancelled` | Dibatalkan peminjam |

### Alur Approval
1. Booking masuk → status `pending`
2. Admin review di `/admin/bookings`
3. **Setujui** → status `approved` + notifikasi email ke peminjam
4. Peminjam bayar → upload bukti
5. Admin verifikasi pembayaran → status `active`
6. Selesai digunakan → admin record pengembalian → status `completed`

### Buat Booking Manual (by Admin)
```
/admin/bookings/new → isi form → submit
```
Berguna untuk booking via telepon/tatap muka.

### Filter & Cari Booking
```
/admin/bookings → filter by status, tanggal, item
```

---

## Manajemen Pembayaran

### Verifikasi Pembayaran
1. `/admin/payments` → tab menunggu verifikasi
2. Klik booking → lihat bukti transfer yang diupload peminjam
3. **Verifikasi** → status booking berubah ke `active`
4. **Tolak** → status kembali ke `approved` dengan catatan

### Generate QR Code Pembayaran
- Per booking: `/admin/bookings/[id]` → Generate QR
- Batch: `/admin/qr/batch` → pilih beberapa booking → Generate & Print

---

## Pengembalian

### Record Pengembalian
1. `/admin/returns` → pilih booking yang sudah `active`
2. Cek kondisi item saat dikembalikan
3. Isi form: tanggal pengembalian, kondisi, catatan
4. Submit → status booking berubah ke `completed`

---

## Manajemen Pengguna (Admin)

### Lihat Daftar User
```
/admin/users → daftar semua pengguna
```

### Edit Role User
```
/admin/users → klik user → edit → ubah role → simpan
```

---

## Super Admin

### Akses Super Admin
```
/super-admin → hanya bisa diakses dengan role super_admin
```

### Fitur Eksklusif Super Admin
- Manajemen admin users (tambah/edit/hapus akun admin)
- Override data yang tidak bisa diubah admin biasa

### Cara Buat Akun Super Admin Pertama
```sql
-- Jalankan di Supabase SQL Editor setelah user register biasa
UPDATE public.users SET role = 'super_admin' WHERE email = 'email@domain.com';
```

---

## Tips Operasional

### Export Data untuk Laporan
- Equipment: `/admin/equipment` → Export → .xlsx
- Booking: `/admin/bookings` → Export → .xlsx

### QR Scanner Cepat
Gunakan `/admin/scan` dengan kamera device untuk scan QR booking tanpa buka browser terpisah.

### Konfigurasi Sistem
```
/admin/settings → atur profil institusi, template notifikasi, metode pembayaran
```

### Jika Ada Masalah
Lihat [TROUBLESHOOTING.md](TROUBLESHOOTING.md) atau hubungi developer.
