# Troubleshooting: Database Error Creating New User

## Masalah
Error database saat membuat user baru melalui Super Admin panel.

## Penyebab Umum & Solusi

### 1. RLS (Row Level Security) Policy

**Error:** `new row violates row-level security policy for table "users"`

**Solusi:**
```sql
-- Jalankan di Supabase SQL Editor
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO service_role;
```

### 2. Missing Columns

**Error:** `column "X" of relation "users" does not exist`

**Solusi:**
```sql
-- Jalankan migration: supabase/migrations/20250511_fix_users_table.sql

-- Atau jalankan manual:
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

**Solusi:**
Tambahkan di `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Cara mendapatkan Service Role Key:
1. Buka Supabase Dashboard → Project Settings → API
2. Copy "service_role key" (bukan anon key!)
3. Paste ke `.env.local`

### 4. Constraint Violation

**Error:** `duplicate key value violates unique constraint "users_email_key"`

**Solusi:**
Email sudah terdaftar. Gunakan email lain atau hapus user yang sudah ada:
```sql
-- Cek user yang sudah ada
SELECT * FROM auth.users WHERE email = 'user@example.com';

-- Hapus jika perlu (hati-hati!)
DELETE FROM auth.users WHERE email = 'user@example.com';
DELETE FROM public.users WHERE email = 'user@example.com';
```

### 5. Auth User Created but Database Insert Failed

**Error:** User muncul di Authentication tapi tidak di tabel users

**Solusi:**
Ini terjadi jika insert ke tabel `public.users` gagal tapi auth user sudah terbuat.

**Manual fix:**
```sql
-- Insert manual ke tabel users
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

### 6. Column Cannot Be Null

**Error:** `null value in column "X" violates not-null constraint`

**Solusi:**
Pastikan API mengirim nilai default:
```typescript
// Di API route, tambahkan default values
role: role || 'borrower',
borrower_category: borrower_category || 'mahasiswa',
```

## Debug Steps

### 1. Check API Response
Buka browser DevTools → Network tab → Lihat response dari `/api/super-admin/users`

### 2. Check Server Logs
```bash
# Jalankan development server dengan logging
npm run dev
# Lihat error di terminal
```

### 3. Test API Manual
```bash
curl -X POST http://localhost:3000/api/super-admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "borrower"
  }'
```

### 4. Verify Table Structure
```sql
-- Cek struktur tabel users
\d public.users

-- Cek data types
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users';
```

### 5. Check RLS Policies
```sql
-- Lihat RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Cek apakah RLS enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'users';
```

## Quick Fix Script

Jalankan ini di Supabase SQL Editor untuk fix semua masalah umum:

```sql
-- Fix 1: Disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Fix 2: Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO service_role;

-- Fix 3: Add missing columns
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS borrower_category TEXT DEFAULT 'mahasiswa',
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS class_division TEXT,
  ADD COLUMN IF NOT EXISTS identity_number TEXT,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Fix 4: Set default values
ALTER TABLE public.users 
  ALTER COLUMN role SET DEFAULT 'borrower';

-- Fix 5: Create updated_at trigger
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

-- Verify
SELECT 'Users table fixed successfully!' as status;
```

## Environment Variables Checklist

Pastikan semua variabel ini ada di `.env.local`:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Optional (untuk email notifications)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

## Masih Error?

Jika masih ada error setelah mencoba solusi di atas:

1. **Copy error message lengkap** dari browser console
2. **Copy error dari terminal** (server logs)
3. **Screenshots** network response dari DevTools
4. Hubungi developer dengan informasi tersebut

## Verifikasi Berhasil

Setelah fix, coba buat user baru:
1. Login sebagai super_admin
2. Buka `/admin/users`
3. Klik "Tambah Pengguna"
4. Isi form dengan data valid
5. Klik "Buat Akun"
6. Harusnya muncul toast "Akun berhasil dibuat"
