# 🎯 TODO NEXT - Langkah Selanjutnya

## Prioritas Tindakan

### 🔴 CRITICAL - Harus Dilakukan Segera

#### 1. Jalankan Migration SQL di Supabase
**File yang harus dijalankan (urut):**

```bash
# 1. Fix RLS (jika belum)
supabase/migrations/20250512_fix_users_rls_final.sql

# 2. Activity Log System
supabase/migrations/20250513_create_activity_logs.sql

# 3. Booking Reminders
supabase/migrations/20250514_create_booking_reminders.sql

# 4. Avatar Storage (untuk foto profil)
supabase/migrations/20250514_create_avatar_storage.sql
```

**Cara menjalankan:**
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Klik "SQL Editor" di sidebar
4. Copy-paste isi file SQL
5. Klik "Run"

---

### 🟡 HIGH - Penting untuk Fungsionalitas

#### 2. Setup Environment Variables
**Cek file `.env.local`:**

```env
# Wajib ada
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Untuk Email (jika belum)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com

# Untuk Payment (jika pakai QRIS/VA)
# Biarkan kosong jika tidak pakai Midtrans
```

#### 3. Setup Vercel Cron Job (untuk Reminders)
**File: `vercel.json`** (buat di root project)

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

Ini akan menjalankan reminder setiap jam.

---

### 🟢 MEDIUM - Peningkatan UX

#### 4. Update Navigation untuk Menampilkan Foto Profil
**File:** `src/components/layouts/BorrowerNav.tsx`

Update layout untuk menerima `photoUrl` dan menampilkan di Avatar:

```typescript
// Tambahkan prop photoUrl
interface Props { 
  userName: string
  photoUrl?: string 
}

// Ganti AvatarFallback dengan AvatarImage jika ada foto
<Avatar className="h-8 w-8">
  {photoUrl ? (
    <AvatarImage src={photoUrl} alt={userName} />
  ) : (
    <AvatarFallback className="bg-blue-950 text-white">
      {userName.charAt(0).toUpperCase()}
    </AvatarFallback>
  )}
</Avatar>
```

#### 5. Test Fitur Utama
**Buat checklist testing:**

- [ ] **Register**: Buat akun baru + upload foto
- [ ] **Login**: Cek tidak ada error 500
- [ ] **Profile**: Edit data dan ganti foto
- [ ] **Catalog**: Lihat kalender ketersediaan
- [ ] **Booking**: Buat peminjaman baru
- [ ] **Admin Dashboard**: Cek grafik statistik
- [ ] **Activity Log**: Lihat log perubahan
- [ ] **Invoice**: Generate PDF invoice

---

### 🔵 LOW - Optional / Nice to Have

#### 6. Install Chrome untuk PDF Generation (Production)
**Jika ingin generate PDF dengan Puppeteer:**

Untuk Vercel, tambahkan `chrome-aws-lambda`:
```bash
npm install chrome-aws-lambda puppeteer-core
```

Update `src/app/api/bookings/[id]/invoice/route.ts` untuk menggunakan chrome-aws-lambda.

#### 7. Custom Domain & SSL
- Setup custom domain di Vercel
- Update Supabase Auth redirect URLs
- Update institution profile dengan domain baru

---

## 🐛 Known Issues & Solusi

### Issue 1: "Database error creating new user"
**Solusi:**
```sql
-- Jalankan di Supabase SQL Editor
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Lalu recreate trigger (lihat migration 20250512_fix_auth_trigger.sql)
```

### Issue 2: Reminders tidak terkirim
**Solusi:**
- Pastikan cron job sudah di-setup di Vercel
- Cek Supabase Function Logs
- Verifikasi user punya email/phone yang valid

### Issue 3: Foto tidak muncul setelah upload
**Solusi:**
- Cek Supabase Storage → avatars bucket public
- Verifikasi RLS policies sudah dijalankan
- Cek Network tab di browser (CORS issue)

---

## 📊 Go-Live Checklist

Sebelum sistem di-deploy untuk produksi:

### Database
- [ ] Semua migration sudah dijalankan
- [ ] RLS policies aktif dan tested
- [ ] Triggers berfungsi normal
- [ ] Storage buckets public/private sesuai kebutuhan

### Aplikasi
- [ ] Environment variables lengkap
- [ ] Build berhasil tanpa error (`npm run build`)
- [ ] TypeScript check passed (`npx tsc --noEmit`)
- [ ] Testing semua fitur utama berhasil

### Production
- [ ] Domain sudah di-setup
- [ ] SSL certificate aktif
- [ ] Supabase project di-pause (bukan free tier untuk production)
- [ ] Backup schedule aktif
- [ ] Monitoring setup (Vercel Analytics, Supabase Logs)

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Run development
npm run dev

# Build for production
npm run build

# Check TypeScript
npx tsc --noEmit

# Check linting
npm run lint
```

---

## 📞 Need Help?

Jika ada error atau pertanyaan:

1. **Check Console**: Buka browser DevTools → Console
2. **Check Network**: Lihat API response di Network tab
3. **Check Supabase Logs**: Dashboard → Logs → API/Auth/Storage
4. **Check Vercel Logs**: Dashboard → Project → Logs

---

## 📅 Timeline Rekomendasi

| Hari | Task |
|------|------|
| **Hari 1** | Jalankan migrations, test login/register |
| **Hari 2** | Test booking flow, kalender, payments |
| **Hari 3** | Bug fixing, polish UI |
| **Hari 4** | UAT (User Acceptance Testing) |
| **Hari 5** | Deploy to production, monitoring |

---

**Last Updated:** 2025-05-12  
**Total New Features:** 12  
**Total Bug Fixes:** 5  
**Status:** Ready for Testing 🚀
