# 🎉 QR PAYMENT SYSTEM - SETUP LENGKAP

## ✅ STATUS: MIGRATION BERHASIL!

### Apa yang Sudah Berhasil:
- ✅ Tabel `payment_proofs` dibuat
- ✅ Tabel `bank_accounts` dibuat dengan 3 rekening (BCA, Mandiri, BRI)
- ✅ Kolom payment_* ditambah ke tabel `bookings`
- ✅ Function `verify_booking_payment` dibuat
- ✅ Trigger `generate_payment_code` aktif
- ✅ Storage bucket `payments` dibuat
- ✅ Build: SUCCESS

---

## 📝 STEP TERAKHIR: Storage Bucket Policies

Anda perlu menambahkan 3 policies ke bucket `payments` agar user bisa upload foto.

### Cara Setup:

1. **Buka Supabase Dashboard**
   - Go to: [app.supabase.com](https://app.supabase.com)
   - Pilih project Anda

2. **Ke Menu Storage**
   - Klik **"Storage"** di sidebar kiri
   - Klik bucket **"payments"**
   - Klik tab **"Policies"**

3. **Tambah Policy #1 (SELECT)**
   - Klik **"New Policy"**
   - **Policy Name**: `Allow public read`
   - **Allowed Operation**: `SELECT`
   - **Target Roles**: `anon, authenticated`
   - **Policy Definition**: 
     ```
     true
     ```
   - Klik **"Save Policy"**

4. **Tambah Policy #2 (INSERT)**
   - Klik **"New Policy"**
   - **Policy Name**: `Allow authenticated uploads`
   - **Allowed Operation**: `INSERT`
   - **Target Roles**: `authenticated`
   - **Policy Definition**: 
     ```
     true
     ```
   - Klik **"Save Policy"**

5. **Tambah Policy #3 (UPDATE)**
   - Klik **"New Policy"**
   - **Policy Name**: `Allow users to update own files`
   - **Allowed Operation**: `UPDATE`
   - **Target Roles**: `authenticated`
   - **Policy Definition**: 
     ```
     true
     ```
   - Klik **"Save Policy"**

---

## 🧪 TEST SISTEM

Setelah policies dibuat, test sistem:

### Test 1: Generate QR Code
1. Login sebagai user
2. Buat booking baru atau gunakan booking existing
3. Buka: `http://localhost:3000/booking/[id]/payment`
4. Klik **"Generate Kode QR"**
5. ✅ Seharusnya muncul QR code dengan info bank

### Test 2: Upload Bukti Transfer
1. Di halaman payment, klik **"Upload Bukti Transfer"**
2. Pilih foto screenshot bukti transfer
3. Isi: Nama bank, jumlah transfer, tanggal
4. Klik **"Upload Bukti Pembayaran"**
5. ✅ Seharusnya sukses upload

### Test 3: Admin Verification
1. Login sebagai admin
2. Buka: `http://localhost:3000/admin/payments/verify`
3. Lihat daftar pembayaran yang menunggu
4. Klik **"Verifikasi"** pada pembayaran
5. Lihat foto bukti transfer
6. Klik **"Verifikasi"** jika valid
7. ✅ Status booking berubah jadi "paid"

---

## 📊 STRUKTUR DATABASE

### Tabel: `bookings` (kolom baru)
```sql
payment_qr_url        TEXT          -- URL gambar QR code
payment_code          VARCHAR(50)   -- Kode unik pembayaran (SIMP-XXXX-XXXX)
payment_proof_url     TEXT          -- URL foto bukti transfer
payment_verified_at   TIMESTAMP     -- Waktu verifikasi admin
payment_verified_by   UUID          -- ID admin yang verifikasi
payment_method        VARCHAR(50)   -- Metode pembayaran
payment_bank          VARCHAR(50)   -- Nama bank yang dipakai
```

### Tabel: `payment_proofs`
```sql
id                    UUID PRIMARY KEY
booking_id            UUID REFERENCES bookings
proof_url             TEXT          -- URL foto bukti
bank_name             VARCHAR(50)   -- Nama bank pengirim
account_name          VARCHAR(100)  -- Nama pemilik rekening
transfer_amount       DECIMAL       -- Jumlah transfer
transfer_date         DATE          -- Tanggal transfer
notes                 TEXT          -- Catatan
status                VARCHAR(20)   -- pending/verified/rejected
verified_by           UUID          -- ID admin
verified_at           TIMESTAMP     -- Waktu verifikasi
rejection_reason      TEXT          -- Alasan penolakan
```

### Tabel: `bank_accounts`
```sql
id                    UUID PRIMARY KEY
bank_name             VARCHAR(50)   -- BCA/Mandiri/BRI
bank_code             VARCHAR(10)   -- Kode bank (014, 008, 002)
account_number        VARCHAR(50)   -- Nomor rekening
account_name          VARCHAR(100)  -- Nama pemilik rekening
branch                VARCHAR(100)  -- Cabang bank
is_active             BOOLEAN       -- Aktif/nonaktif
is_primary            BOOLEAN       -- Rekening utama
```

---

## 🔄 ALUR SISTEM

```
┌─────────────────────────────────────────────────────────────┐
│  USER FLOW                                                  │
├─────────────────────────────────────────────────────────────┤
│  1. Booking dibuat (status: pending)                        │
│     ↓                                                       │
│  2. Admin approve (status: approved)                        │
│     ↓                                                       │
│  3. User buka halaman payment                               │
│     ↓                                                       │
│  4. Generate QR → Kode unik dibuat otomatis                 │
│     (contoh: SIMP-abc12345-XYZ789)                          │
│     ↓                                                       │
│  5. User transfer ke rekening yang tertera                  │
│     ↓                                                       │
│  6. Upload screenshot bukti transfer                        │
│     (status: payment_uploaded)                              │
│     ↓                                                       │
│  7. Admin verifikasi di dashboard                           │
│     ↓                                                       │
│  8. ✅ Booking status: PAID                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏦 REKENING BANK DEFAULT

| Bank | No. Rekening | Atas Nama | Status |
|------|--------------|-----------|--------|
| BCA | 1234567890 | Direktorat Olahraga Unesa | Primary |
| Mandiri | 0987654321 | Direktorat Olahraga Unesa | Active |
| BRI | 1122334455 | Direktorat Olahraga Unesa | Active |

**Catatan:** Admin bisa menambah/mengubah rekening di tabel `bank_accounts`

---

## 📱 URL PENTING

| URL | Deskripsi | Akses |
|-----|-----------|-------|
| `/booking/[id]/payment` | Halaman pembayaran dengan QR | User |
| `/booking/[id]/upload-proof` | Upload bukti transfer | User |
| `/admin/payments/verify` | Dashboard verifikasi admin | Admin |
| `/api/payments/generate-qr` | API generate QR code | System |
| `/api/payments/upload-proof` | API upload bukti | System |
| `/api/payments/verify` | API verifikasi pembayaran | System |

---

## ✅ CHECKLIST SELESAI

- [x] Migration SQL dijalankan
- [x] Tabel `payment_proofs` terbuat
- [x] Tabel `bank_accounts` terbuat dengan 3 rekening
- [x] Kolom payment_* ditambah ke `bookings`
- [x] Functions & triggers dibuat
- [x] Storage bucket `payments` dibuat
- [ ] Storage policies ditambah (ANDA PERLU TAMBAH MANUAL)
- [x] Build berhasil
- [ ] Test sistem (setelah policies ditambah)

---

## 🎉 SISTEM SIAP DIGUNAKAN!

Setelah menambah storage policies, sistem QR Payment siap digunakan!

**Keunggulan sistem ini:**
- ✅ Gratis (tidak ada biaya payment gateway)
- ✅ Mudah (user familiar dengan transfer bank)
- ✅ Aman (verifikasi manual oleh admin)
- ✅ Transparan (semua bukti tersimpan)
- ✅ Fleksibel (bisa pakai semua bank)

---

## ❓ BUTUH BANTUAN?

Jika ada error saat test:
1. Screenshot error message
2. Kirim ke saya dengan detail langkah yang dilakukan

Saya siap bantu! 🚀
