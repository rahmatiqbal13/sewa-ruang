# Keamanan Sistem — Sewa Ruang & Alat

---

## Masalah Aktif

### 🔴 Plaintext Password di Database

Password plaintext disimpan di kolom `plain_password` tabel `users`. Ini adalah pelanggaran prinsip keamanan fundamental.

**Lokasi kode yang harus dihapus:**
- `src/app/(auth)/register/page.tsx:65` — simpan saat register
- `src/app/api/super-admin/users/route.ts:168,201` — simpan saat admin buat user
- `src/app/api/super-admin/users/[id]/route.ts:64` — update saat ganti password
- `src/app/(admin)/admin/users/UserDetailSheet.tsx:65` — baca & tampilkan
- `src/app/(super-admin)/super-admin/users/page.tsx:26,128` — SELECT & tampilkan

**Tindakan yang harus dilakukan:**
1. Hapus kolom `plain_password` dari tabel `users` di database
2. Hapus semua kode yang menulis/membaca kolom tersebut
3. Gunakan Supabase Admin API untuk reset password: `supabase.auth.admin.updateUserById(id, { password: newPassword })`

---

## Insiden Security (Riwayat)

### Insiden: JWT & Service Role Key Terekspos di GitHub

**Tanggal terdeteksi:** Sekitar Mei 2026  
**Status:** Resolved (keys sudah di-rotate)

**Yang terjadi:** JWT tokens dan Supabase service role keys tidak sengaja ter-commit ke repository.

**Tindakan yang telah dilakukan:**
1. Reset JWT Secret di Supabase Dashboard (Project Settings → API → Generate New Secret)
2. Reset Service Role Key (Project Settings → API → Generate New Service Role Key)
3. Update environment variables di Vercel dan `.env.local`
4. Hapus file `.env.local.example` dan `.env.local.example.production` dari repository
5. Update `.gitignore` untuk mencegah commit `.env` files

**Verifikasi pembersihan:**
```bash
grep -r "eyJhbGciOiJIUzI1NiIs" .  # Cari sisa JWT
grep -r "supabase.*service_role" .  # Cari sisa service role key
```

**Jika ditemukan sisa di git history:** Gunakan BFG Repo-Cleaner atau `git-filter-repo` untuk membersihkan.

---

## Panduan Keamanan Ongoing

### RLS (Row Level Security) — Pola yang Benar

**JANGAN buat policy recursive pada tabel `users`:**
```sql
-- ❌ WRONG — infinite recursion → 500 error
CREATE POLICY "admin_all" ON public.users FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ✅ CORRECT — non-recursive
CREATE POLICY "users_select_authenticated" ON public.users FOR SELECT
  TO authenticated USING (true);

-- Admin ops: gunakan service_role key (bypass RLS), BUKAN policy rekursif
```

### Admin Data — Selalu Pakai Service Role

```typescript
// ✅ Semua page.tsx di /admin/** harus pakai ini
import { createAdminClient } from '@/lib/supabase/server'

// ❌ JANGAN pakai ini di admin pages
import { createClient } from '@/lib/supabase/server'
```

### Environment Variables — Yang Tidak Boleh di-commit

```
.env.local
.env.production
.env*.local
SUPABASE_SERVICE_ROLE_KEY (jangan masuk ke kode/file yang di-commit)
```

### API Routes — Checklist

- [ ] Semua endpoint yang menerima user input divalidasi dengan Zod
- [ ] Endpoint cron/internal diproteksi dengan `CRON_SECRET`
- [ ] Rate limiting aktif untuk endpoint yang rentan spam (forgot-password, send-notification)
- [ ] Response error tidak mengekspos stack trace di production

### CRON Secret — Validasi yang Benar

```typescript
// src/app/api/reminders/process/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // ❌ WRONG — jika CRON_SECRET tidak di-set, endpoint terbuka!
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ✅ CORRECT — fail-safe: jika secret tidak ada, tolak semua request
  if (!cronSecret) throw new Error('CRON_SECRET not configured')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

---

## Checklist Security Sebelum Go-Live

- [ ] Kolom `plain_password` dihapus dari database dan semua kode
- [ ] Semua env vars di Vercel sudah di-set (tidak ada yang undefined)
- [ ] `CRON_SECRET` sudah di-set dan validasi menggunakan pola fail-safe
- [ ] RLS aktif di semua tabel sensitif
- [ ] `.gitignore` mencakup semua file `.env*`
- [ ] Git history bersih dari secret (gunakan `git log --all -- .env*`)
- [ ] Audit log aktif untuk operasi admin penting
- [ ] Rate limiting aktif untuk forgot-password, register, dan send-notification
