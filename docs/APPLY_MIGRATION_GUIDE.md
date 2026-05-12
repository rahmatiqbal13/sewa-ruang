# 🚀 Panduan Apply Migration QR Payment

## CARA 1: Via Supabase Dashboard (Recommended)

### Step 1: Buka SQL Editor
1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Klik menu **"SQL Editor"** di sidebar kiri
4. Klik **"New query"**

### Step 2: Copy-Paste Migration
1. Buka file: `supabase/migrations/20250512_qr_payment_system.sql`
2. Copy SELURUH isi file (298 baris)
3. Paste ke SQL Editor di Supabase
4. Klik tombol **"Run"** atau tekan `Ctrl + Enter`

### Step 3: Verifikasi
Jalankan query ini untuk cek apakah migration berhasil:

```sql
-- Cek tabel baru
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payment_proofs', 'bank_accounts');

-- Cek kolom baru di bookings
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name LIKE 'payment%';

-- Cek data bank accounts
SELECT * FROM bank_accounts;
```

**Hasil yang diharapkan:**
- `payment_proofs` table: ✅
- `bank_accounts` table: ✅
- Kolom `payment_qr_url`, `payment_code`, dll di bookings: ✅
- 3 rekening bank default: ✅

---

## CARA 2: Via Script (Alternatif)

Jika Anda punya Supabase CLI atau akses psql:

```bash
# Dengan psql
psql $DATABASE_URL -f supabase/migrations/20250512_qr_payment_system.sql

# Atau dengan Supabase CLI (jika sudah install)
supabase db execute --file supabase/migrations/20250512_qr_payment_system.sql
```

---

## Step 4: Buat Storage Bucket

Setelah migration berhasil, Anda perlu buat bucket untuk menyimpan foto bukti transfer:

### Via Supabase Dashboard:

1. Di Supabase Dashboard, klik menu **"Storage"** di sidebar
2. Klik tombol **"New bucket"**
3. Isi form:
   - **Name**: `payments`
   - **Public bucket**: ✅ Centang (Yes)
   - **File size limit**: 5242880 (5MB dalam bytes)
   - **Allowed mime types**: `image/png,image/jpeg,image/jpg`
4. Klik **"Save"**

### Set Bucket Policies:

1. Klik bucket `payments` yang baru dibuat
2. Klik tab **"Policies"**
3. Klik **"New policy"**

**Policy 1: Allow public read**
- Policy name: `Allow public read`
- Allowed operation: `SELECT`
- Target roles: `anon, authenticated`
- Policy definition: `true`
- Click: **"Save policy"**

**Policy 2: Allow authenticated users to upload**
- Policy name: `Allow authenticated uploads`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Policy definition: `true`
- Click: **"Save policy"**

**Policy 3: Allow users to update own files**
- Policy name: `Allow users to update own files`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- Policy definition: `true`
- Click: **"Save policy"**

---

## Step 5: Test Sistem

Setelah semua setup selesai, test dengan:

### Test 1: Generate QR Code
1. Buat booking baru atau gunakan booking existing
2. Buka: `/booking/[id]/payment`
3. Klik "Generate Kode QR"
4. ✅ Seharusnya muncul QR code

### Test 2: Upload Bukti
1. Di halaman payment, klik "Upload Bukti Transfer"
2. Pilih foto bukti transfer
3. Isi form dan submit
4. ✅ Seharusnya sukses upload

### Test 3: Admin Verification
1. Login sebagai admin
2. Buka: `/admin/payments/verify`
3. Lihat bukti yang diupload
4. Klik "Verifikasi"
5. ✅ Status booking harus berubah jadi "paid"

---

## 🔧 Troubleshooting

### Error: "column does not exist"
**Solusi**: Migration belum diapply. Ulangi Step 2.

### Error: "relation does not exist"
**Solusi**: Tabel belum dibuat. Cek apakah migration berjalan tanpa error.

### Error: "storage bucket not found"
**Solusi**: Belum buat bucket `payments`. Ikuti Step 4.

### Error: "violates row-level security policy"
**Solusi**: RLS policy belum dibuat. Cek Step 4 bagian Set Bucket Policies.

---

## ✅ Checklist Selesai

- [ ] Migration SQL dijalankan di Supabase
- [ ] Tabel `payment_proofs` terbuat
- [ ] Tabel `bank_accounts` terbuat  
- [ ] Kolom payment_* ditambah ke tabel `bookings`
- [ ] Storage bucket `payments` dibuat
- [ ] Storage policies diatur
- [ ] Test generate QR berhasil
- [ ] Test upload bukti berhasil
- [ ] Test verifikasi admin berhasil

---

## 📞 Butuh Bantuan?

Jika ada error saat apply migration:
1. Screenshot error message
2. Cek baris mana yang error
3. Bisa skip bagian yang error dan jalankan manual bagian lain

**Kontak**: Screenshot error dan tanyakan! 🚀
