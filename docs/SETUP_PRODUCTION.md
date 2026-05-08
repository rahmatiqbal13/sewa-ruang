# Setup Production - sewa-ruang.vercel.app

Panduan lengkap untuk setup forgot password di production environment.

## 🎯 Ringkasan

Domain: `https://sewa-ruang.vercel.app`

## 📋 Checklist Setup

### 1. Supabase Dashboard Configuration ✅

Buka: https://supabase.com/dashboard/project/_/auth/url-configuration

**Site URL:**
```
https://sewa-ruang.vercel.app
```

**Redirect URLs (tambahkan semua):**
```
https://sewa-ruang.vercel.app/auth/callback*
https://sewa-ruang.vercel.app/reset-password
http://localhost:3000/auth/callback*
http://localhost:3000/reset-password
```

**Cara menambahkan:**
1. Klik "Add URL"
2. Masukkan URL
3. Klik "Save"
4. Ulangi untuk semua URL di atas

---

### 2. Environment Variables (Vercel) ✅

Buka: https://vercel.com/dashboard → Pilih project → Settings → Environment Variables

Tambahkan semua variable berikut:

#### Supabase (WAJIB)
```
NEXT_PUBLIC_SUPABASE_URL=https://omxfvkknhgnniimkfbvj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### App Config (WAJIB)
```
NEXT_PUBLIC_APP_URL=https://sewa-ruang.vercel.app
NEXT_PUBLIC_APP_NAME=Sistem Sewa Ruang & Alat
```

#### Email SMTP - Brevo (WAJIB untuk forgot password)
```
EMAIL_FROM=noreply@sewa-ruang.vercel.app
EMAIL_FROM_NAME=Sistem Sewa Ruang & Alat
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-login
SMTP_PASS=your-brevo-master-password
```

**Cara dapatkan Brevo credentials:**
1. Buka https://app.brevo.com/settings/keys/smtp
2. Login dengan akun Brevo Anda
3. Copy "Login" → masukkan ke SMTP_USER
4. Copy "Master Password" → masukkan ke SMTP_PASS
5. Jika belum ada Master Password, klik "Generate a new Master Password"

#### Upstash Redis (OPTIONAL - untuk rate limiting)
```
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**Catatan:** Jika tidak di-set, rate limiting akan di-disable (tidak error)

#### Telegram (OPTIONAL)
```
TELEGRAM_BOT_TOKEN=your-bot-token
```

#### Midtrans (OPTIONAL - jika pakai payment)
```
PAYMENT_GATEWAY=midtrans
MIDTRANS_SERVER_KEY=your-server-key
MIDTRANS_CLIENT_KEY=your-client-key
MIDTRANS_IS_PRODUCTION=true
```

---

### 3. Deploy ke Vercel ✅

#### Opsi A: Deploy via Git
```bash
# Commit changes
git add .
git commit -m "Setup forgot password with custom email"
git push origin main

# Vercel akan auto-deploy
```

#### Opsi B: Deploy via CLI
```bash
# Install Vercel CLI jika belum
npm i -g vercel

# Deploy
vercel --prod
```

---

## 🧪 Testing

### Test Forgot Password Flow:

1. **Buka halaman forgot password:**
   ```
   https://sewa-ruang.vercel.app/forgot-password
   ```

2. **Masukkan email yang terdaftar**

3. **Cek inbox email**
   - Email dari: noreply@sewa-ruang.vercel.app
   - Subject: "Reset Password - Sistem Sewa Ruang & Alat"

4. **Klik link reset password**
   - Seharusnya redirect ke: `https://sewa-ruang.vercel.app/reset-password`
   - Bukan ke halaman awal

5. **Masukkan password baru**
   - Password minimal 8 karakter
   - Konfirmasi password harus sama

6. **Login dengan password baru**

---

## 🐛 Troubleshooting

### Masalah: Link redirect ke halaman awal

**Penyebab:** URL redirect belum di-add di Supabase Dashboard

**Solusi:**
1. Buka https://supabase.com/dashboard/project/_/auth/url-configuration
2. Pastikan ada URL: `https://sewa-ruang.vercel.app/auth/callback*`
3. Klik Save
4. Coba kirim ulang email reset

### Masalah: Email tidak terkirim

**Penyebab:** SMTP credentials salah

**Solusi:**
1. Cek Brevo dashboard: https://app.brevo.com/settings/keys/smtp
2. Pastikan SMTP_USER dan SMTP_PASS benar
3. Test koneksi SMTP di Brevo
4. Redeploy Vercel setelah update env vars

### Masalah: "Invalid Link"

**Penyebab:**
- Link sudah kadaluarsa (1 jam)
- Link sudah digunakan
- Code tidak valid

**Solusi:**
- Minta link baru dari forgot password
- Pastikan membuka link dari email yang sama

### Masalah: Rate limiting error

**Penyebab:** Terlalu banyak request (3x per 15 menit)

**Solusi:**
- Tunggu 15 menit
- Atau disable rate limiting dengan menghapus Redis env vars

---

## 📊 Monitoring

### Check Vercel Logs:
1. Buka https://vercel.com/dashboard
2. Pilih project
3. Klik tab "Logs"
4. Filter by "Function" untuk melihat error

### Check Supabase Logs:
1. Buka https://supabase.com/dashboard
2. Pilih project
3. Buka "Authentication" → "Logs"
4. Cek auth events

### Debug Mode:
Callback route sekarang punya console.log untuk debugging:
- Buka browser DevTools (F12)
- Klik tab Console
- Lihat logs saat klik link reset password

---

## 📝 File yang Sudah Diupdate

1. ✅ `src/app/(auth)/forgot-password/actions.ts` - Server Action dengan custom email
2. ✅ `src/app/(auth)/forgot-password/page.tsx` - UI dengan Server Actions
3. ✅ `src/app/auth/callback/route.ts` - Callback dengan debug logging
4. ✅ `src/app/(auth)/reset-password/page.tsx` - Reset password form

---

## 🎉 Selesai!

Jika semua langkah di atas sudah dilakukan, fitur forgot password akan berfungsi di production.

**URL Production:**
- Forgot Password: https://sewa-ruang.vercel.app/forgot-password
- Reset Password: https://sewa-ruang.vercel.app/reset-password
- Login: https://sewa-ruang.vercel.app/login
