# SOP Penggunaan Sistem — Sewa Ruang & Alat

> Versi: 1.0 | Tanggal: 10 Mei 2026  
> Dokumen ini ditujukan untuk **operator/staff** yang mengelola sistem sehari-hari.

---

## Daftar Isi

1. [Akses & Login](#1-akses--login)
2. [SOP Manajemen Gedung](#2-sop-manajemen-gedung)
3. [SOP Manajemen Ruangan](#3-sop-manajemen-ruangan)
4. [SOP Manajemen Alat](#4-sop-manajemen-alat)
5. [SOP Inventaris Ruangan](#5-sop-inventaris-ruangan)
6. [SOP Proses Pemesanan (Booking)](#6-sop-proses-pemesanan-booking)
7. [SOP Pembayaran](#7-sop-pembayaran)
8. [SOP Pengembalian](#8-sop-pengembalian)
9. [SOP Manajemen Pengguna](#9-sop-manajemen-pengguna)
10. [SOP QR Code](#10-sop-qr-code)
11. [SOP Import & Export Data](#11-sop-import--export-data)
12. [SOP Laporan & Analitik](#12-sop-laporan--analitik)
13. [Referensi Cepat — Status & Kode](#13-referensi-cepat--status--kode)

---

## 1. Akses & Login

### Login Admin/Staff

1. Buka browser, akses URL sistem
2. Klik **Login** atau buka `/login`
3. Masukkan email dan password
4. Jika berhasil, akan diarahkan ke halaman sesuai role:
   - Admin/Staff → `/admin/dashboard`
   - Borrower → `/dashboard`

### Lupa Password

1. Klik **Lupa Password** di halaman login
2. Masukkan alamat email terdaftar
3. Cek email, klik link reset password
4. Masukkan password baru (minimal 8 karakter)

> **Catatan:** Fitur lupa password dibatasi **3 kali per 15 menit** per alamat IP untuk keamanan.

### Logout

- Klik foto profil / nama di pojok kanan atas → **Logout**

---

## 2. SOP Manajemen Gedung

### 2.1 Tambah Gedung Baru

1. Buka menu **Gedung** di sidebar admin
2. Klik tombol **+ Tambah Gedung**
3. Isi form:
   - **Nama Gedung** — wajib (contoh: "Gedung Teknik A")
   - **Kode Gedung** — wajib, huruf kapital/angka, maks 5 karakter (contoh: "GTA")
   - **Jumlah Lantai** — angka 1–99
   - **Alamat** — opsional
   - **Deskripsi** — opsional
4. Klik **Simpan**

> **Kode gedung bersifat unik dan tidak bisa duplikat.**

### 2.2 Edit Gedung

1. Di halaman daftar gedung, klik ikon edit (pensil) pada baris gedung
2. Ubah data yang diperlukan
3. Klik **Simpan**

### 2.3 Hapus Gedung

> **Perhatian:** Gedung tidak bisa dihapus jika masih memiliki ruangan aktif.

1. Klik ikon hapus (tempat sampah) pada baris gedung
2. Konfirmasi penghapusan di dialog yang muncul

---

## 3. SOP Manajemen Ruangan

### 3.1 Tambah Ruangan Baru

1. Buka menu **Ruangan** di sidebar admin
2. Klik **+ Tambah Ruangan**
3. Isi form:
   - **Nama Ruangan** — wajib (contoh: "Lab Komputer 1")
   - **Kode Ruangan** — wajib, unik per gedung (contoh: "A101")
   - **Gedung** — pilih gedung dari dropdown
   - **Lantai** — nomor lantai
   - **Kapasitas** — jumlah orang
   - **Tipe Ruangan** — jenis ruangan
   - **Harga Dasar** — tarif dalam Rupiah (angka saja, tanpa titik/koma)
   - **Fasilitas** — tambahkan fasilitas (AC, Proyektor, dll.)
   - **Foto** — upload foto ruangan
   - **Aktif** — centang jika ruangan tersedia
   - **Tersedia untuk Disewa** — centang agar muncul di katalog publik
4. Klik **Simpan**

### 3.2 Edit Ruangan

1. Dari daftar ruangan, klik nama ruangan atau ikon edit
2. Ubah data yang diperlukan
3. Klik **Simpan**

### 3.3 Nonaktifkan Ruangan

Ruangan yang sedang dalam renovasi atau tidak tersedia:
1. Buka edit ruangan
2. Hilangkan centang **Aktif** atau **Tersedia untuk Disewa**
3. Simpan — ruangan tidak akan muncul di katalog publik

### 3.4 Export Data Ruangan ke Excel

1. Di halaman daftar ruangan, klik tombol **Export**
2. File `.xlsx` akan otomatis terunduh

### 3.5 Import Data Ruangan dari Excel

1. Unduh template dengan melakukan export terlebih dahulu
2. Isi data di file Excel sesuai format kolom
3. Klik tombol **Import**, pilih file Excel
4. Periksa preview data, klik **Konfirmasi Import**

---

## 4. SOP Manajemen Alat

### 4.1 Tambah Alat Baru

1. Buka menu **Alat** di sidebar admin
2. Klik **+ Tambah Alat**
3. Isi form Tab **Informasi Dasar:**
   - **Nama Alat** — wajib, harus unik
   - **Kategori** — pilih dari dropdown (Elektronik, Mebel, dll.)
   - **Merk** — opsional
   - **Deskripsi** — opsional
   - **Ruang Penyimpanan** — lokasi penyimpanan normal
   - **Lokasi Saat Ini** — lokasi aktual
   - **Sumber Perolehan** — asal alat (pembelian, hibah, dll.)
   - **Foto** — upload foto alat
4. Isi Tab **Status:**
   - **Kondisi** — Baik / Perlu Perbaikan / Rusak / Hilang
   - **Ketersediaan** — Tersedia / Digunakan / Hilang
   - **Status Tindakan** — Normal / Perawatan / Menunggu Part / Afkir
5. Isi Tab **Tarif Sewa** (per kategori pengguna):
   - Isi tarif per hari dan/atau per jam untuk setiap kategori
   - Centang **Perlu Supervisi** jika pemakaian harus didampingi
6. Klik **Simpan**

> **Kode alat di-generate otomatis** dan tidak bisa diubah setelah dibuat.

### 4.2 Edit Alat

1. Di daftar alat, klik nama alat atau ikon edit
2. URL edit: `/admin/equipment/[nama-alat-slug]/edit`
3. Ubah data yang diperlukan
4. Klik **Simpan**

> **Catatan:** Jika nama alat diubah, URL-nya juga berubah. Bookmark lama tidak akan berfungsi.

### 4.3 Update Status/Kondisi Alat

Setelah alat kembali dari peminjaman atau selesai perbaikan:
1. Buka detail alat
2. Klik **Edit**
3. Update field **Kondisi**, **Ketersediaan**, dan **Status Tindakan**
4. Klik **Simpan**

**Panduan mengisi status:**

| Situasi | Kondisi | Ketersediaan | Tindakan |
|---------|---------|-------------|---------|
| Alat normal, siap dipinjam | Baik | Tersedia | Normal |
| Alat sedang dipinjam | Baik | Digunakan | Normal |
| Alat rusak ringan, masih bisa pakai | Perlu Perbaikan | Tersedia | Perawatan |
| Alat rusak, tidak bisa dipakai | Rusak | Tersedia | Menunggu Part |
| Alat rusak permanen | Rusak | Tersedia | Afkir |
| Alat hilang | Hilang | Hilang | Normal |

### 4.4 Soft Delete / Arsipkan Alat

Untuk menyembunyikan alat dari daftar aktif tanpa menghapus data:
1. Di daftar alat, klik tombol **Arsipkan** atau toggle **Aktif**
2. Alat tidak akan muncul di katalog publik, tapi data tetap tersimpan

### 4.5 Hapus Alat Permanen

> **Perhatian:** Hapus permanen tidak bisa dibatalkan. Pastikan alat tidak memiliki riwayat booking.

1. Klik ikon hapus pada baris alat
2. Konfirmasi di dialog

### 4.6 Bulk Action (Aksi Massal)

Untuk mengubah status/kondisi banyak alat sekaligus:
1. Centang checkbox pada baris alat yang ingin diubah
2. Klik dropdown **Aksi Massal**
3. Pilih aksi (update kondisi, update ketersediaan, dll.)
4. Konfirmasi

---

## 5. SOP Inventaris Ruangan

Inventaris mencatat barang-barang yang **ada di dalam** setiap ruangan (berbeda dari alat yang disewakan).

### 5.1 Lihat Inventaris Ruangan

1. Buka menu **Inventaris**
2. Pilih ruangan dari daftar
3. Lihat daftar item inventaris beserta jumlah dan kondisi

### 5.2 Tambah Item Inventaris

1. Buka inventaris ruangan yang dituju
2. Klik **+ Tambah Item**
3. Isi:
   - Nama item
   - Kode inventaris (jika ada)
   - Jumlah (quantity)
   - Kondisi (Baik / Perlu Perbaikan / Rusak)
   - Catatan
4. Klik **Simpan**

### 5.3 Update Kondisi Item

Dilakukan setelah pengecekan berkala atau setelah peminjam mengembalikan ruangan:
1. Klik ikon edit pada item inventaris
2. Update kondisi dan jumlah
3. Simpan

### 5.4 Export/Import Inventaris

- **Export:** Klik tombol Export di halaman inventaris → unduh Excel
- **Import:** Siapkan file Excel berformat template → klik Import → konfirmasi

---

## 6. SOP Proses Pemesanan (Booking)

### 6.1 Alur Booking Lengkap

```
Peminjam buat booking (status: PENDING)
        ↓
Admin/Staff review → APPROVE atau REJECT
        ↓ (jika approved)
Peminjam/Staff catat pembayaran → status: PAID
        ↓
Peminjam gunakan ruangan/alat
        ↓
Pengembalian dicatat → status: COMPLETED
```

### 6.2 Review Booking Masuk (Pending)

1. Buka menu **Pemesanan**
2. Filter status **Pending** untuk melihat booking yang perlu ditindak
3. Klik nomor referensi booking untuk melihat detail
4. Periksa:
   - Identitas peminjam
   - Item yang dipesan (ruangan/alat)
   - Tanggal & durasi peminjaman
   - Tujuan penggunaan
5. Klik **Setujui** atau **Tolak**
   - Jika tolak, isi alasan penolakan

### 6.3 Buat Booking Manual (Oleh Admin/Staff)

Untuk peminjam yang datang langsung tanpa booking online:
1. Buka **Pemesanan → + Buat Booking**
2. Pilih peminjam (cari dari database user)
3. Pilih item (ruangan dan/atau alat)
4. Tentukan tanggal dan durasi
5. Isi tujuan peminjaman
6. Sistem akan menghitung biaya otomatis berdasarkan tarif dan kategori user
7. Klik **Simpan** → booking langsung berstatus Approved

### 6.4 Kirim Pesan ke Peminjam

Untuk komunikasi terkait booking (klarifikasi, pengingat, dll.):
1. Buka detail booking
2. Klik **Kirim Pesan**
3. Ketik pesan
4. Pilih channel: Email / WhatsApp / Telegram
5. Klik **Kirim**

### 6.5 Perpanjangan Booking

Jika peminjam membutuhkan waktu tambahan:
1. Buka detail booking
2. Klik **Perpanjang**
3. Tentukan durasi tambahan
4. Sistem menghitung biaya tambahan
5. Setujui perpanjangan

### 6.6 Pengembalian Awal (Early Return)

Jika peminjam mengembalikan sebelum waktu selesai:
1. Buka detail booking
2. Klik **Pengembalian Awal**
3. Isi waktu aktual pengembalian
4. Sistem menghitung refund (jika ada)
5. Konfirmasi

---

## 7. SOP Pembayaran

### 7.1 Catat Pembayaran Tunai (Manual Cash)

1. Buka menu **Pembayaran** atau langsung dari detail booking
2. Klik **Catat Pembayaran**
3. Pilih metode: **Tunai**
4. Isi jumlah yang dibayar
5. Klik **Simpan** — status booking otomatis berubah ke **Paid**

### 7.2 Catat Pembayaran Transfer (Manual Transfer)

1. Klik **Catat Pembayaran**
2. Pilih metode: **Transfer Bank**
3. Isi jumlah dan nomor referensi transfer (opsional)
4. Klik **Simpan**

### 7.3 Catat Refund

Untuk pengembalian dana (karena early return atau pembatalan):
1. Buka detail booking
2. Klik **Catat Pembayaran**
3. Pilih metode: **Refund**
4. Isi jumlah refund
5. Klik **Simpan**

### 7.4 Verifikasi Pembayaran

Di halaman **Pembayaran**, admin bisa:
- Filter berdasarkan status (pending/paid)
- Lihat rekap pembayaran per periode
- Export data pembayaran

---

## 8. SOP Pengembalian

### 8.1 Catat Pengembalian Normal

Ketika peminjam mengembalikan ruangan/alat:
1. Buka menu **Pengembalian**
2. Cari booking berdasarkan nomor referensi atau nama peminjam
3. Klik **Proses Pengembalian**
4. Isi form **Record Return:**
   - Kondisi barang saat dikembalikan
   - Foto kondisi (opsional tapi direkomendasikan)
   - Catatan (kerusakan, kehilangan item, dll.)
5. Klik **Simpan**
6. Jika ada kerusakan/kehilangan, lanjut ke **Complete Return Form** untuk menentukan kompensasi
7. Klik **Selesaikan Pengembalian** → status booking jadi **Completed**

### 8.2 Kondisi Pengembalian

| Kondisi | Tindakan Selanjutnya |
|---------|---------------------|
| Baik | Selesaikan langsung |
| Kerusakan Ringan | Catat, bisa langsung diselesaikan dengan catatan |
| Kerusakan Berat | Catat, diskusikan kompensasi dengan peminjam |
| Hilang | Catat, proses klaim kehilangan |

### 8.3 Setelah Pengembalian

Setelah pengembalian dicatat:
1. Update kondisi alat di menu **Alat** (jika ada kerusakan)
2. Update kondisi inventaris ruangan jika ada item yang rusak/hilang
3. Catat refund jika berlaku (early return)

---

## 9. SOP Manajemen Pengguna

### 9.1 Lihat Daftar Pengguna

1. Buka menu **Pengguna**
2. Gunakan filter untuk mencari berdasarkan nama, email, atau role

### 9.2 Ubah Role Pengguna

1. Di daftar pengguna, klik **Ubah Role** pada baris pengguna
2. Pilih role baru: Admin / Staff / Borrower
3. Konfirmasi perubahan

> Role `super_admin` hanya bisa dibuat via API khusus, bukan melalui UI biasa.

### 9.3 Reset Password Pengguna

Jika pengguna lupa password dan tidak bisa reset sendiri:
1. Di daftar pengguna, klik **Reset Password**
2. Sistem mengirim email reset ke alamat email pengguna

### 9.4 Nonaktifkan/Hapus Pengguna

> **Perhatian:** Menghapus pengguna akan menghapus semua data terkait. Pertimbangkan untuk nonaktifkan saja.

1. Klik ikon hapus pada baris pengguna
2. Konfirmasi penghapusan

### 9.5 Tambah Akun Staff/Admin Baru

1. Buka menu **Pengguna → + Tambah Pengguna**
2. Isi nama, email, dan pilih role (Admin atau Staff)
3. Sistem mengirim email undangan ke email pengguna
4. Pengguna klik link di email untuk set password

---

## 10. SOP QR Code

### 10.1 Lihat/Download QR Code Satu Alat

1. Buka detail alat di `/admin/equipment/[nama-alat]`
2. Scroll ke bagian **QR Code**
3. Klik **Download QR** untuk menyimpan sebagai gambar

### 10.2 Generate QR Code Massal (Batch)

Untuk mencetak QR semua alat sekaligus:
1. Buka menu **QR Code → Batch**
2. Filter alat jika diperlukan (kategori, gedung, dll.)
3. Klik **Generate Semua**
4. Download atau print dari browser

### 10.3 Print QR Code untuk Ditempel

1. Download QR Code (single atau batch)
2. Cetak menggunakan printer label atau kertas biasa
3. Laminating untuk ketahanan
4. Tempel di alat/ruangan yang sesuai

### 10.4 Cara Kerja Scan QR oleh Peminjam/Publik

Saat QR di-scan dengan kamera smartphone:
1. Browser membuka `/assets/[id]/scan`
2. Menampilkan info alat: nama, kondisi, ketersediaan, lokasi
3. Aksi yang bisa dilakukan publik (tanpa login): lihat info
4. Log scan tersimpan otomatis di `asset_tracking_logs`

---

## 11. SOP Import & Export Data

### 11.1 Export Data ke Excel

Tersedia di halaman: Ruangan, Alat, Inventaris

1. Buka halaman yang ingin di-export
2. Terapkan filter jika hanya ingin export sebagian data
3. Klik tombol **Export Excel**
4. File `.xlsx` otomatis terunduh

### 11.2 Import Data dari Excel

> **Penting:** Selalu gunakan template dari hasil export sebagai panduan format kolom.

**Prosedur:**
1. Lakukan export terlebih dahulu untuk mendapat template format
2. Buka file Excel, isi data sesuai format kolom
3. Jangan ubah nama kolom di header
4. Simpan file
5. Di halaman yang sesuai, klik **Import**
6. Pilih file Excel yang sudah diisi
7. Sistem menampilkan preview data
8. Periksa apakah ada error pada kolom tertentu
9. Klik **Konfirmasi Import**

**Kolom yang biasanya wajib diisi:**
- Alat: nama, kategori, kondisi, ketersediaan
- Ruangan: nama, kode, gedung, kapasitas, harga
- Inventaris: nama item, jumlah, kondisi

---

## 12. SOP Laporan & Analitik

### 12.1 Akses Laporan

1. Buka menu **Laporan** di sidebar admin
2. Tersedia ringkasan statistik:
   - Total booking per periode
   - Pendapatan per periode
   - Alat/ruangan paling sering disewa
   - Status booking (pending, aktif, selesai)

### 12.2 Filter Periode Laporan

- Gunakan date picker untuk memilih rentang tanggal
- Laporan akan diperbarui sesuai filter

### 12.3 Export Laporan

- Klik **Export** di halaman laporan untuk mendapat data dalam format Excel

---

## 13. Referensi Cepat — Status & Kode

### Status Booking

| Status | Artinya | Aksi Selanjutnya |
|--------|---------|-----------------|
| `pending` | Menunggu review admin | Approve atau Reject |
| `approved` | Disetujui, belum bayar | Catat pembayaran |
| `rejected` | Ditolak admin | — |
| `paid` | Sudah bayar, aktif | Proses pengembalian |
| `completed` | Selesai | — |
| `cancelled` | Dibatalkan | — |

### Kondisi Alat

| Kode | Tampilan | Artinya |
|------|---------|---------|
| `good` | Baik | Kondisi prima |
| `needs_repair` | Perlu Perbaikan | Ada kerusakan ringan |
| `damaged` | Rusak | Rusak, perlu perbaikan besar |
| `lost` | Hilang | Tidak ditemukan |

### Ketersediaan Alat

| Kode | Tampilan | Artinya |
|------|---------|---------|
| `tersedia` | Tersedia | Siap dipinjam |
| `digunakan` | Digunakan | Sedang dipinjam |
| `hilang` | Hilang | Tidak ada |

### Status Tindakan Alat

| Kode | Artinya |
|------|---------|
| `normal` | Tidak ada tindakan khusus |
| `perawatan` | Sedang dalam perawatan/servis |
| `menunggu_part` | Menunggu suku cadang |
| `afkir` | Sudah tidak digunakan (obsolete) |

### Kondisi Pengembalian

| Kode | Artinya |
|------|---------|
| `good` | Kondisi baik, tidak ada kerusakan |
| `minor_damage` | Kerusakan ringan (lecet, dll.) |
| `major_damage` | Kerusakan berat |
| `lost` | Hilang / tidak dikembalikan |

### Metode Pembayaran

| Kode | Artinya |
|------|---------|
| `online` | Payment gateway/online |
| `manual_cash` | Tunai, dicatat staff |
| `manual_transfer` | Transfer bank, dicatat staff |
| `refund` | Pengembalian dana |

### Kategori Pengguna (untuk Tarif)

| Kode | Keterangan |
|------|-----------|
| `mahasiswa_s1` | Mahasiswa S1 |
| `mahasiswa_s2` | Mahasiswa S2/S3 |
| `dosen` | Dosen / Tenaga Pendidik |
| `mou_unesa` | Mitra MoU Universitas |
| `umum` | Masyarakat Umum / Eksternal |

---

## Kontak & Eskalasi

| Masalah | Hubungi |
|---------|---------|
| Bug sistem / error teknis | Developer / Tim IT |
| Akses ke Supabase Database | Super Admin / Developer |
| Konfigurasi email/notifikasi | Super Admin |
| Pertanyaan SOP | Supervisor / Admin |

---

*SOP ini berlaku mulai 10 Mei 2026. Review berkala setiap 6 bulan atau saat ada perubahan fitur signifikan.*
