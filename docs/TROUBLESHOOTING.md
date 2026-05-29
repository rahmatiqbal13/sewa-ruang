# Troubleshooting — Sewa Ruang & Alat

Panduan solusi untuk masalah umum yang dihadapi developer maupun pengguna.

---

## Masalah Developer

### "Database error creating new user"
**Penyebab:** Trigger `on_auth_user_created` tidak ada atau error.  
**Solusi:**
```sql
-- Jalankan di Supabase SQL Editor
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Lalu jalankan: supabase/migrations/20250512_fix_users_rls_final.sql
```

### Halaman Admin Mengembalikan 500
**Penyebab A:** RLS memblokir query → pakai `createAdminClient()` bukan `createClient()`  
**Penyebab B:** RLS recursive policy pada tabel `users` → lihat [BUG_HISTORY.md](BUG_HISTORY.md#bug-01)

### Query Bookings Error 400
**Penyebab:** FK ambiguous ke tabel `users`  
**Solusi:** Tambahkan FK hint `!user_id`:
```typescript
.select('*, users!user_id(name, email, phone)')
```

### Build Gagal di Vercel (Turbopack nft.json)
**Penyebab:** Konflik `middleware.ts` + Turbopack  
**Solusi:** Pastikan tidak ada `middleware.ts` di root. Auth logic ada di `src/proxy.ts`.

### Foto Tidak Muncul Setelah Upload
**Kemungkinan penyebab:**
1. Supabase Storage bucket tidak public → cek dashboard → Storage → bucket settings
2. CORS issue → cek Network tab browser
3. RLS policy storage memblokir → cek policy di Supabase dashboard

### Service Worker Error di Console
```
Service Worker registration failed: SecurityError...
```
**Penyebab:** File `public/service-worker.js` terhapus dan middleware memblokir akses.  
**Solusi sementara:** Hapus `registerServiceWorker()` dari `src/components/providers/PWAProvider.tsx`.

### `/forgot-password` Redirect ke Login
**Penyebab:** Route tidak ada di `PUBLIC_ROUTES` di `src/proxy.ts`.  
**Solusi:**
```typescript
const PUBLIC_ROUTES = ['/', '/catalog', '/login', '/register', '/forgot-password', '/reset-password']
```

### Email Tidak Terkirim
**Kemungkinan penyebab:**
1. SMTP credentials salah → cek env vars
2. Port 587 diblokir → coba port 465 dengan `SMTP_SECURE=true`
3. Gmail: aktifkan "App Password" jika 2FA aktif

### Reminder Tidak Terkirim
1. Pastikan cron job sudah setup di `vercel.json`
2. Cek Vercel Function Logs
3. Verifikasi `CRON_SECRET` sudah di-set
4. Pastikan user punya email/phone yang valid di database

### QR Code Berisi "undefined"
**Penyebab:** `NEXT_PUBLIC_APP_URL` tidak di-set.  
**Solusi:** Set environment variable `NEXT_PUBLIC_APP_URL=https://your-domain.com`

---

## Masalah Pengguna

### Tidak Bisa Login
1. Pastikan email sudah terdaftar
2. Coba "Lupa Password" (jika fitur berfungsi)
3. Cek email untuk konfirmasi pendaftaran
4. Hubungi admin untuk reset password manual

### Lupa Password (Jika `/forgot-password` Tidak Bisa Diakses)
Ini adalah bug aktif. Hubungi admin untuk:
```sql
-- Admin jalankan di Supabase SQL Editor
-- Lalu reset via Supabase Auth dashboard → Users → cari email → Reset Password
```

### Foto Profil Tidak Tersimpan
1. Pastikan file kurang dari 5MB
2. Format yang didukung: JPG, PNG, WebP
3. Coba mode "URL" (masukkan link gambar langsung)

### Booking Tidak Bisa Dibuat
1. Pastikan semua field wajib terisi
2. Pastikan tanggal tidak overlap dengan booking yang sudah ada
3. Pastikan item dalam status "Tersedia"

### Status Booking Tidak Berubah
Status booking berubah secara manual oleh admin. Timeline:
- `pending` → admin review → `approved` atau `rejected`
- `approved` → user bayar → `active` (setelah admin verifikasi)
- `active` → item dikembalikan → `completed`

---

## Cek Log & Debugging

### Di Supabase
- **API Logs:** Dashboard → Logs → API
- **Auth Logs:** Dashboard → Logs → Auth
- **Database Logs:** Dashboard → Logs → Postgres

### Di Vercel
- **Function Logs:** Dashboard → Project → Deployments → Functions
- **Edge Logs:** Dashboard → Project → Deployments → Edge Network

### Di Browser
- **Console errors:** F12 → Console
- **Network requests:** F12 → Network → filter XHR/Fetch
- **Service Worker:** F12 → Application → Service Workers
