# WhatsApp Integration dengan Template

## Overview
Tombol WhatsApp sekarang otomatis mengambil template pesan dari database berdasarkan **status booking**.

## Cara Kerja

### 1. Mapping Status ke Template

| Status Booking | Event Type | Template yang Digunakan |
|---------------|------------|------------------------|
| `pending` / `submitted` | booking_submitted | Pengajuan Diterima |
| `approved` | booking_approved | Booking Disetujui |
| `rejected` | booking_rejected | Booking Ditolak |
| `cancelled` | booking_cancelled | Booking Dibatalkan |
| `paid` / `completed` | payment_received | Pembayaran Diterima |

### 2. Alur Pemilihan Template

```
Admin klik tombol WhatsApp
        ↓
Cek status booking
        ↓
Ambil template dari database sesuai status
        ↓
Ganti variabel dengan data aktual
        ↓
Buka WhatsApp dengan pesan otomatis
```

### 3. Variabel yang Tersedia

Template bisa menggunakan variabel berikut:

| Variabel | Keterangan | Contoh Output |
|----------|-----------|---------------|
| `{{nama}}` | Nama peminjam | "Budi Santoso" |
| `{{no_booking}}` | Nomor referensi | "BOOK-2024-001" |
| `{{ruangan}}` | Nama ruang/alat | "Ruang A101, Proyektor" |
| `{{tanggal_mulai}}` | Waktu mulai | "15 Jan 2024, 08:00" |
| `{{tanggal_selesai}}` | Waktu selesai | "15 Jan 2024, 17:00" |
| `{{status}}` | Status booking | "Disetujui", "Ditolak", dll |
| `{{catatan_admin}}` | Catatan admin | "Silakan datang 15 menit awal" |

### 4. Default Template (Fallback)

Jika template tidak ditemukan di database, sistem akan menggunakan default template:

```
Pending: "Halo {{nama}}, pengajuan peminjaman {{ruangan}} ({{no_booking}}) 
         telah kami terima dan sedang diproses. Terima kasih!"

Approved: "Halo {{nama}}, selamat! Pengajuan peminjaman {{ruangan}} ({{no_booking}}) 
          telah DISETUJUI. Silakan lakukan pembayaran untuk konfirmasi."

Rejected: "Halo {{nama}}, mohon maaf pengajuan peminjaman {{ruangan}} ({{no_booking}}) 
          tidak dapat disetujui. Silakan hubungi admin untuk info lebih lanjut."
```

## Setup Template WhatsApp

### Langkah 1: Buka Halaman Notifikasi
Admin → Notifikasi → Tab Template Pesan

### Langkah 2: Pilih Event
Klik event sesuai status yang ingin diubah template-nya:
- **Pengajuan Baru** → untuk status `pending`
- **Pengajuan Disetujui** → untuk status `approved`
- **Pengajuan Ditolak** → untuk status `rejected`
- dst.

### Langkah 3: Pilih Channel WhatsApp
Klik tab **WhatsApp** di bagian Channel

### Langkah 4: Edit Template
- Edit isi pesan di textarea
- Gunakan variabel yang tersedia (klik chip variabel untuk menyisipkan)
- Klik **"Simpan Template"**

### Langkah 5: Test
1. Buka halaman booking dengan status tersebut
2. Klik tombol WhatsApp hijau
3. WhatsApp akan terbuka dengan pesan sesuai template

## Contoh Template

### Template untuk Status Pending
```
Halo {{nama}}! 👋

Pengajuan peminjaman Anda telah kami terima:
📋 No: {{no_booking}}
🏢 Ruang/Alat: {{ruangan}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

Status: ⏳ MENUNGGU PERSETUJUAN

Kami akan segera menghubungi Anda setelah pengajuan diproses.

Terima kasih,
Admin Sport Center UNESA
```

### Template untuk Status Approved
```
Selamat {{nama}}! 🎉

Pengajuan peminjaman Anda telah DISETUJUI:
📋 No: {{no_booking}}
🏢 Ruang/Alat: {{ruangan}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

Silakan lakukan pembayaran untuk mengkonfirmasi pemesanan Anda.

Terima kasih,
Admin Sport Center UNESA
```

### Template untuk Status Rejected
```
Halo {{nama}},

Mohon maaf, pengajuan peminjaman Anda tidak dapat disetujui:
📋 No: {{no_booking}}
🏢 Ruang/Alat: {{ruangan}}

Alasan: {{catatan_admin}}

Silakan hubungi kami untuk informasi lebih lanjut.

Terima kasih,
Admin Sport Center UNESA
```

## Tips

1. **Gunakan Emoji**: WhatsApp mendukung emoji untuk membuat pesan lebih menarik
2. **Keep it Short**: Pesan yang terlalu panjang bisa terpotong di preview
3. **Preview**: Selalu test template dengan klik tombol WhatsApp
4. **Backup**: Copy template ke notepad sebelum edit, jaga-jaga kalau salah

## Troubleshooting

### Template Tidak Muncul
- Cek apakah template sudah disimpan (klik "Simpan Template")
- Cek apakah template aktif (toggle Active harus ON)
- Refresh halaman booking setelah mengedit template

### Variabel Tidak Terganti
- Pastikan variabel ditulis dengan benar: `{{nama}}` (bukan `{nama}` atau `[[nama]]`)
- Pastikan variabel sesuai dengan yang tersedia

### Pesan Default Selalu Muncul
- Berarti template di database tidak ditemukan
- Cek kembali event_type dan channel di database
- Pastikan `is_active = true`
