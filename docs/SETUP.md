# Setup & Deployment — Sewa Ruang & Alat

---

## Setup Lokal

### Prerequisites

- Node.js 20+
- npm 10+
- Akun Supabase (gratis)

### Langkah

```bash
# 1. Clone repository
git clone <repo-url>
cd sewa-ruang

# 2. Install dependencies
npm install

# 3. Buat file environment
cp .env.example .env.local
# Edit .env.local dengan nilai yang sesuai (lihat bagian Environment Variables)

# 4. Jalankan development server
npm run dev
```

Buka `http://localhost:3000`.

### Commands Tersedia

```bash
npm run dev    # Development server (Turbopack)
npm run build  # Production build
npm run start  # Production server
npm run lint   # ESLint check
```

---

## Environment Variables

### Wajib

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Sistem Sewa Ruang & Alat
NODE_ENV=development
```

### Email (Wajib untuk forgot password & notifikasi)

```env
SMTP_HOST=smtp-relay.brevo.com      # atau smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@domain.com
EMAIL_FROM_NAME=Sistem Sewa Ruang & Alat
```

### Rate Limiting (Opsional tapi direkomendasikan)

```env
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

### Security

```env
CRON_SECRET=random-secret-string-panjang
```

---

## Setup Database (Supabase)

### 1. Jalankan Migration SQL

Buka Supabase Dashboard → SQL Editor, jalankan file-file ini secara berurutan:

```
supabase/migrations/20250512_fix_users_rls_final.sql    # Fix RLS
supabase/migrations/20250513_create_activity_logs.sql   # Activity log
supabase/migrations/20250514_create_booking_reminders.sql
supabase/migrations/20250514_create_avatar_storage.sql
```

### 2. Konfigurasi Auth

Di Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://sewa-ruang.vercel.app   (production)
http://localhost:3000           (development)
```

**Redirect URLs:**
```
https://sewa-ruang.vercel.app/auth/callback*
https://sewa-ruang.vercel.app/reset-password
http://localhost:3000/auth/callback*
http://localhost:3000/reset-password
```

### 3. Buat Admin Pertama

Jalankan di SQL Editor setelah user pertama register:

```sql
UPDATE public.users SET role = 'super_admin' WHERE email = 'your-email@domain.com';
```

---

## Deployment ke Vercel

### 1. Setup Environment Variables di Vercel

Buka Vercel Dashboard → Project → Settings → Environment Variables

Tambahkan semua variable dari bagian Environment Variables di atas.

### 2. Deploy

```bash
# Vercel otomatis deploy saat push ke main
git push origin main

# Atau deploy manual
npx vercel --prod
```

### 3. Setup Cron Job (untuk Reminders)

File `vercel.json` di root project:

```json
{
  "crons": [
    {
      "path": "/api/reminders/process",
      "schedule": "0 * * * *"
    }
  ]
}
```

Pastikan `CRON_SECRET` di-set di Vercel environment variables.

---

## Checklist Go-Live

### Database
- [ ] Semua migration dijalankan
- [ ] RLS policies aktif dan tested
- [ ] Storage buckets sudah dikonfigurasi

### Aplikasi
- [ ] Semua environment variables diset di Vercel
- [ ] `npm run build` berhasil tanpa error
- [ ] `/forgot-password` dan `/reset-password` bisa diakses tanpa login (fix `src/proxy.ts`)
- [ ] Kolom `plain_password` sudah dihapus

### Production
- [ ] Custom domain dikonfigurasi
- [ ] Supabase Auth redirect URLs diupdate ke domain production
- [ ] Cron job aktif di Vercel
- [ ] Monitoring aktif (Vercel Analytics, Supabase Logs)

---

## Troubleshooting Setup

| Error | Penyebab | Solusi |
|-------|---------|--------|
| "Database error creating new user" | Trigger auth tidak ada | Jalankan migration fix_users_rls_final.sql |
| "missing env var" | Environment variable tidak di-set | Cek `.env.local` dan Vercel settings |
| Build gagal di Vercel (nft.json) | Bug Turbopack + middleware.ts | Pastikan `middleware.ts` tidak ada di root |
| Foto tidak muncul | RLS storage atau CORS | Cek Supabase Storage bucket permissions |
| Email tidak terkirim | SMTP credentials salah | Test dengan `nodemailer` verifier |

Lihat juga [TROUBLESHOOTING.md](TROUBLESHOOTING.md) untuk masalah yang lebih spesifik.
