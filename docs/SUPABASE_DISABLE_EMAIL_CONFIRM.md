# Panduan: Disable Email Confirmation di Supabase

## 🎯 Tujuan
Agar bisa membuat user dengan email apa saja (termasuk dummy/fake email) tanpa perlu verifikasi email.

---

## 📋 Langkah-langkah

### Step 1: Login ke Supabase Dashboard
1. Buka https://app.supabase.com
2. Login dengan akun Supabase kamu
3. Pilih project yang digunakan

### Step 2: Buka Authentication Settings
1. Di sidebar kiri, klik **"Authentication"**
2. Klik tab **"Providers"** (atau **"Email"** di versi baru)
3. Scroll ke bagian **"Email"**

### Step 3: Disable Confirm Email
1. Cari opsi **"Confirm email"** atau **"Enable email confirmations"**
2. **UNCHECK / DISABLE** opsi tersebut
3. Klik **"Save"**

#### Tampilannya kurang lebih seperti ini:
```
☐ Confirm email (disabled)
☑ Enable Signup (enabled)
```

### Step 4: (Opsional) Disable Secure Email Change
1. Cari opsi **"Secure email change"** atau **"Enable secure email change"**
2. **UNCHECK / DISABLE** opsi tersebut
3. Klik **"Save"**

### Step 5: Test
1. Buka aplikasi kamu
2. Coba buat user baru dengan email dummy: `test@example.com`
3. Harusnya berhasil tanpa error!

---

## 📝 Catatan Penting

### Sebelum Disable Email Confirmation:
- ❌ User harus verifikasi email sebelum bisa login
- ❌ Tidak bisa pakai email dummy/fake
- ❌ Supabase mengirim email konfirmasi

### Setelah Disable Email Confirmation:
- ✅ User langsung aktif tanpa verifikasi
- ✅ Bisa pakai email dummy/fake
- ✅ Tidak ada email yang dikirim
- ⚠️ Lebih rendah security (hanya untuk development/internal use)

### Untuk Production:
Jika nanti deploy ke production, sebaiknya:
1. Enable kembali email confirmation
2. Setup SMTP (SendGrid, Mailgun, dll) untuk mengirim email
3. Gunakan email yang valid

---

## 🔧 Alternatif: SQL Method

Jika tidak menemukan opsi di dashboard, bisa pakai SQL:

```sql
-- Disable email confirmation requirement
UPDATE auth.config 
SET confirm_email = false;
```

Atau via API:

```bash
curl -X PATCH 'https://[project-ref].supabase.co/auth/v1/config' \
  -H 'apikey: [service-role-key]' \
  -H 'Content-Type: application/json' \
  -d '{
    "mailer_autoconfirm": true,
    "mailer_secure_email_change_enabled": false
  }'
```

---

## ✅ Setelah Setup

Setelah disable email confirmation, API yang sudah saya buat akan bekerja dengan:
- ✅ Email valid (gmail, yahoo, dll)
- ✅ Email dummy/fake (test@example.com, user@localhost)
- ✅ Auto-confirm tanpa verifikasi

---

## 🆘 Troubleshooting

### Tidak menemukan menu "Confirm email"
- Coba versi baru Supabase: Buka Project Settings → Authentication
- Atau cari di: Authentication → Email Templates → Confirmation

### Changes tidak tersimpan
- Pastikan klik tombol "Save" setelah uncheck
- Refresh page dan cek kembali settingnya

### Masih error setelah disable
- Clear browser cache
- Restart development server
- Cek Console Supabase untuk error detail

---

## 📸 Screenshot Reference

Jika butuh bantuan visual, search di Google:
- "Supabase disable email confirmation"
- "Supabase auth email confirmation off"

Atau tanya di Discord Supabase: https://discord.gg/supabase
