# Template Notifikasi - Panduan Lengkap

## 📋 Variabel yang Tersedia

### **Variabel Dasar**
| Variabel | Deskripsi | Contoh Output |
|----------|-----------|---------------|
| `{{nama}}` | Nama lengkap peminjam | "Budi Santoso" |
| `{{no_booking}}` | Nomor referensi booking | "BK20240115-001" |
| `{{tanggal_mulai}}` | Tanggal dan waktu mulai | "15 Jan 2024, 08:00" |
| `{{tanggal_selesai}}` | Tanggal dan waktu selesai | "15 Jan 2024, 17:00" |
| `{{status}}` | Status booking | "Disetujui", "Ditolak", dll |
| `{{catatan_admin}}` | Catatan dari admin | "Silakan datang 15 menit awal" |

### **Variabel Ruangan & Alat (BARU)**
| Variabel | Deskripsi | Contoh Output |
|----------|-----------|---------------|
| `{{ruangan}}` | Semua item (ruang+alat) gabungan | "Ruang A101, Proyektor, Mic" |
| `{{daftar_ruangan}}` | **Daftar ruangan saja** | Lihat format di bawah |
| `{{daftar_alat}}` | **Daftar alat saja** | Lihat format di bawah |
| `{{jumlah_ruangan}}` | Jumlah ruangan (angka) | "2" |
| `{{jumlah_alat}}` | Jumlah alat (angka) | "3" |

---

## 🏢 Format Output `{{daftar_ruangan}}`

### Jika 1 Ruangan:
```
Ruangan: Ruang A101
```

### Jika Lebih dari 1 Ruangan:
```
Ruangan:
  1. Ruang A101
  2. Ruang B202
  3. Ruang Meeting 1
```

---

## 🔧 Format Output `{{daftar_alat}}`

### Jika 1 Alat:
```
Alat: Proyektor
```

### Jika Lebih dari 1 Alat:
```
Alat:
  1. Proyektor
  2. Microphone
  3. Layar LCD
```

---

## 📝 Contoh Template Email Lengkap

### Template: Pengajuan Diterima
```
Subject: {{nama}} - {{no_booking}} | Pengajuan Diterima

Body:
Halo {{nama}},

Pengajuan peminjaman Anda telah kami terima dengan detail:

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}
⏰ Status: Menunggu Persetujuan

Kami akan segera memproses pengajuan Anda.

Terima kasih,
Sport Center UNESA
```

### Hasil Jika Peminjam Pinjam 2 Ruang + 3 Alat:
```
Subject: Budi Santoso - BK20240115-001 | Pengajuan Diterima

Body:
Halo Budi Santoso,

Pengajuan peminjaman Anda telah kami terima dengan detail:

📋 No. Booking: BK20240115-001
🏢 Ruangan:
  1. Ruang A101
  2. Ruang Meeting Utama
Alat:
  1. Proyektor
  2. Mic Wireless
  3. Layar LCD
📅 Tanggal: 15 Jan 2024, 08:00 s/d 15 Jan 2024, 17:00
⏰ Status: Menunggu Persetujuan

Kami akan segera memproses pengajuan Anda.

Terima kasih,
Sport Center UNESA
```

---

## 💬 Contoh Template WhatsApp

```
Halo {{nama}}!

Pengajuan *{{no_booking}}* telah diterima.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

Kami akan segera konfirmasi.
```

### Hasil:
```
Halo Budi Santoso!

Pengajuan *BK20240115-001* telah diterima.

🏢 Ruangan:
  1. Ruang A101
  2. Ruang Meeting Utama
Alat:
  1. Proyektor
  2. Mic Wireless
📅 15 Jan 2024, 08:00 — 15 Jan 2024, 17:00

Kami akan segera konfirmasi.
```

---

## 🎯 Tips Penggunaan Template

### **1. Subject Line yang Baik**
✅ **Gunakan format**: `{{nama}} - {{no_booking}} | Status`
```
Budi Santoso - BK20240115-001 | Pengajuan Diterima
```

❌ **Hindari**:
```
Pengajuan Peminjaman Diterima  (tidak ada identitas)
```

### **2. Gunakan Emoji untuk Memudahkan Baca**
- 📋 = Nomor booking
- 🏢 = Ruangan
- 🔧 = Alat  
- 📅 = Tanggal
- ⏰ = Waktu/Status
- ✅ = Disetujui
- ❌ = Ditolak
- 💳 = Pembayaran

### **3. Format untuk Berbagai Skenario**

#### **Hanya Ruangan (1 item):**
```
🏢 Ruangan: Ruang A101
```

#### **Hanya Alat (2 item):**
```
🔧 Alat:
  1. Proyektor
  2. Mic
```

#### **Kombinasi Ruang + Alat:**
```
🏢 Ruangan: Ruang A101
🔧 Alat:
  1. Proyektor
  2. Layar LCD
```

---

## 🔄 Urutan Variabel yang Disarankan

### **Subject:**
```
{{nama}} - {{no_booking}} | [Status/Info]
```

### **Body Email:**
```
1. Sapaan: Halo {{nama}},

2. Informasi Utama:
   📋 No. Booking: {{no_booking}}

3. Detail Barang:
   🏢 {{daftar_ruangan}}
   🔧 {{daftar_alat}}

4. Waktu:
   📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

5. Status/Action:
   ⏰ Status: {{status}}
   [Instruksi selanjutnya]

6. Penutup:
   Terima kasih,
   Sport Center UNESA
```

---

## ⚠️ Catatan Penting

1. **`{{daftar_ruangan}}`** dan **`{{daftar_alat}}`** akan otomatis kosong jika tidak ada item tersebut
2. Gunakan variabel terbaru untuk tampilan yang lebih rapi
3. Variabel `{{ruangan}}` masih tersedia untuk backward compatibility
4. Pastikan ada baris kosong sebelum dan sesudah `{{daftar_alat}}` agar formatting rapi

---

## 🧪 Testing Template

Setelah edit template:
1. Klik **"Simpan Template"**
2. Buka halaman **Booking**
3. Pilih booking dengan multiple items
4. Klik **"Kirim Email"** atau **"Chat WhatsApp"**
5. Cek hasilnya!
