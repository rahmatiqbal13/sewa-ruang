# Troubleshooting: Pembuatan User Baru

Panduan ini mencakup error umum saat membuat user baru via Super Admin panel, beserta solusinya.

---

## Error Umum & Solusi

### 1. RLS Policy Violation

**Error:** `new row violates row-level security policy for table "users"`

```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO service_role;
```

### 2. Missing Columns

**Error:** `column "X" of relation "users" does not exist`

```sql
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS borrower_category TEXT DEFAULT 'mahasiswa',
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS class_division TEXT,
  ADD COLUMN IF NOT EXISTS identity_number TEXT,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

### 3. Missing Environment Variable

**Error:** `Missing Supabase configuration` atau `SUPABASE_SERVICE_ROLE_KEY belum diset`

Tambahkan di `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Dapatkan di: Supabase Dashboard → Project Settings → API → **service_role key** (bukan anon key).

### 4. Email Sudah Terdaftar

**Error:** `duplicate key value violates unique constraint "users_email_key"`

```sql
-- Cek apakah sudah ada
SELECT * FROM auth.users WHERE email = 'user@example.com';
```

Gunakan email lain, atau hapus user lama jika memang perlu.

### 5. Auth User Terbuat Tapi Tidak Ada di Tabel users

User muncul di Authentication tapi tidak di tabel `public.users`. Insert manual:

```sql
INSERT INTO public.users (id, name, email, role, created_at, updated_at)
VALUES (
  'user-uuid-dari-auth', 
  'Nama User', 
  'email@example.com', 
  'borrower',
  NOW(),
  NOW()
);
```

---

## Quick Fix Script

Jalankan di Supabase SQL Editor untuk memperbaiki semua masalah umum sekaligus:

```sql
-- Disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO service_role;

-- Add missing columns
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS borrower_category TEXT DEFAULT 'mahasiswa',
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS class_division TEXT,
  ADD COLUMN IF NOT EXISTS identity_number TEXT,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set defaults
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'borrower';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

SELECT 'Users table fixed successfully!' as status;
```

---

## Environment Variables Wajib

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## Debug Steps

1. **Network tab** — DevTools → Network → lihat response dari `/api/super-admin/users`
2. **Server logs** — terminal tempat `npm run dev` berjalan
3. **Verify RLS:**
   ```sql
   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'users';
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

---

## Verifikasi Berhasil

1. Login sebagai super_admin → `/admin/users`
2. Klik "Tambah Pengguna", isi form
3. Klik "Buat Akun" → toast success muncul
4. User muncul di tabel dan bisa login
