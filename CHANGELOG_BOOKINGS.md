# Changelog - Update Halaman Pengajuan (Bookings)

## 📅 Tanggal: 2025-01-09

## ✅ Fitur Baru

### 1. Tampilan Halaman Bookings Diperbarui
- **Design baru** mirip halaman Equipment/Inventory
- **Stats Cards**: Total, Pending, Lunas/Selesai, Ditolak/Batal
- **Filter Status**: Tab dengan badge jumlah
- **Toggle View**: Card view dan Table view
- **Search**: Filter berdasarkan nomor referensi/nama peminjam
- **Pagination**: Navigasi halaman

### 2. Peminjaman oleh Admin (Untuk Pimpinan)
- **Halaman baru**: `/admin/bookings/new`
- Form lengkap untuk input data peminjam:
  - Nama, Email, Nomor WA
  - Instansi, Kelas/Divisi
  - Tujuan peminjaman
  - Tanggal & waktu mulai/selesai
- **Multi-item**: Bisa meminjam ruang dan alat sekaligus
- **Auto-calculate**: Estimasi total otomatis
- **Auto-approved**: Peminjaman langsung disetujui

### 3. Detail Booking yang Ditingkatkan
- **Layout 3 kolom**: Info peminjam | Detail | Actions
- **Data peminjam lengkap**:
  - Avatar inisial nama
  - Instansi, Kelas/Divisi
  - Email, Nomor WhatsApp
- **Item yang dipinjam**:
  - Daftar lengkap dengan nomor urut
  - Badge tipe (Ruang/Alat)
  - Kode ruang/alat
  - Quantity
- **Riwayat pembayaran**:
  - Status pembayaran
  - Tanggal pembayaran
  - Bukti pembayaran (jika ada)

### 4. Kirim Pesan Manual
Tombol "Kirim Pesan" tersedia di:
- Halaman list bookings (icon pesan)
- Halaman detail booking (tombol di header)
- Card view (tombol di setiap card)

**Channel yang didukung:**
- ✅ **WhatsApp**: Buka wa.me dengan pesan terisi
- ✅ **Telegram**: Buka t.me dengan pesan terisi  
- ✅ **Email**: Kirim via SMTP (perlu konfigurasi)
- ✅ **SMS**: Buka aplikasi SMS default

**Fitur pesan:**
- Template pesan otomatis dengan data booking
- Editable sebelum kirim
- Copy to clipboard
- Auto-generate berdasarkan status booking

### 5. API Endpoint Baru
- `POST /api/notifications/send-email`
  - Kirim email via SMTP
  - Log notifikasi ke database
  - Verifikasi admin access

## 📁 File yang Dibuat/Diubah

### File Baru
- `src/app/(admin)/admin/bookings/BookingsList.tsx`
- `src/app/(admin)/admin/bookings/SendMessageDialog.tsx`
- `src/app/(admin)/admin/bookings/AdminBookingForm.tsx`
- `src/app/(admin)/admin/bookings/[id]/SendMessageButton.tsx`
- `src/app/(admin)/admin/bookings/new/page.tsx`
- `src/app/api/notifications/send-email/route.ts`

### File Diupdate
- `src/app/(admin)/admin/bookings/page.tsx` - Query menggunakan join manual
- `src/app/(admin)/admin/bookings/[id]/page.tsx` - Query menggunakan fetch terpisah

## 🔧 Perbaikan Teknis

### Query Database
- Menggunakan **join manual** (fetch terpisah + merge di JavaScript)
- Mengatasi masalah Supabase nested relations yang tidak mengembalikan data
- Performa lebih baik dengan query terpisah

### Tampilan Tabel
- **Barang/Ruang**: Tampilan dengan badge tipe (Ruang/Alat) dan nama item
- **Tanggal**: Menampilkan tanggal mulai dan tanggal selesai secara terpisah
- Link detail menggunakan ID yang benar

## 🔧 Konfigurasi yang Diperlukan

### Environment Variables (untuk email)
Tambahkan ke `.env.local`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
```

## 📝 Catatan Penggunaan

### Peminjaman oleh Admin
1. Klik tombol "Peminjaman Baru"
2. Isi data peminjam (bisa untuk pimpinan/tamu)
3. Pilih ruang dan/atau alat
4. Tentukan tanggal & waktu
5. Submit → langsung disetujui

### Kirim Pesan
1. Buka detail booking atau klik icon pesan di list
2. Edit pesan jika perlu
3. Pilih channel: WA/Telegram/Email/SMS
4. Pesan akan terbuka di aplikasi terpilih

## 🐛 Bug Fixes
- ✅ Layout detail booking lebih informatif
- ✅ Data peminjam lengkap tampil di detail
- ✅ Item yang dipinjam ditampilkan dengan jelas
