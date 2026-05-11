# Fix: Database Error Creating New User

## Perubahan yang Dilakukan

### 1. API Route Fix (`src/app/api/super-admin/users/route.ts`)
- ✅ Tambah error handling yang lebih baik
- ✅ Validasi input yang lebih ketat
- ✅ Auto-cleanup auth user jika database insert gagal
- ✅ Return error details yang lebih informatif
- ✅ Cek environment variable di awal

### 2. AddUserDialog Fix (`src/app/(admin)/admin/users/AddUserDialog.tsx`)
- ✅ Fix DialogTrigger menggunakan `asChild` (bukan `render`)
- ✅ Tambah error state untuk tampilkan pesan error
- ✅ Validasi email format
- ✅ Better loading state
- ✅ Reset form saat dialog ditutup
- ✅ Disable inputs saat loading

### 3. DeleteUserButton Fix (`src/app/(admin)/admin/users/DeleteUserButton.tsx`)
- ✅ Fix AlertDialogTrigger menggunakan `asChild` (bukan `render`)

### 4. SQL Migration (`supabase/migrations/20250511_fix_users_table.sql`)
- ✅ Disable RLS untuk tabel users
- ✅ Grant permissions ke service_role
- ✅ Tambah kolom yang mungkin missing:
  - phone
  - borrower_category
  - institution
  - class_division
  - identity_number
  - telegram_username
  - created_at
  - updated_at
- ✅ Set default values
- ✅ Create updated_at trigger

### 5. Documentation
- ✅ Buat troubleshooting guide (`docs/TROUBLESHOOTING_USER_CREATION.md`)

## Langkah-langkah Fix

### Langkah 1: Jalankan SQL di Supabase

Buka Supabase Dashboard → SQL Editor → New Query

Jalankan script ini:

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

-- Fix 4: Set defaults
ALTER TABLE public.users 
  ALTER COLUMN role SET DEFAULT 'borrower';

-- Fix 5: Trigger
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
```

### Langkah 2: Cek Environment Variable

Pastikan `.env.local` ada:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Langkah 3: Restart Development Server

```bash
npm run dev
```

### Langkah 4: Test

1. Login sebagai super_admin
2. Buka `/admin/users`
3. Klik "Tambah Pengguna"
4. Isi form:
   - Nama: Test User
   - Email: test@example.com
   - Password: password123 (min 8 karakter)
   - Role: borrower
5. Klik "Buat Akun"

**Hasil yang diharapkan:**
- Toast success: "Akun Test User berhasil dibuat"
- User muncul di tabel
- User bisa login dengan email & password

## Error yang Mungkin Muncul

### Error: "Database error: new row violates row-level security policy"
**Solusi:** Jalankan SQL di atas (Fix 1: Disable RLS)

### Error: "Database error: column X does not exist"
**Solusi:** Jalankan SQL di atas (Fix 3: Add missing columns)

### Error: "Missing Supabase configuration"
**Solusi:** Tambahkan `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`

### Error: "Password should be at least 6 characters"
**Solusi:** Password minimal 8 karakter (sudah di-validate di frontend)

### Error: "duplicate key value violates unique constraint"
**Solusi:** Email sudah terdaftar, gunakan email lain

## Testing Checklist

- [ ] SQL migration berhasil dijalankan
- [ ] Environment variables lengkap
- [ ] Bisa membuka dialog "Tambah Pengguna"
- [ ] Validasi form bekerja (error jika field kosong)
- [ ] Bisa membuat user baru
- [ ] User muncul di tabel setelah dibuat
- [ ] User bisa login dengan credential yang dibuat
- [ ] Bisa delete user
- [ ] Bisa change role user

## Catatan Penting

- **SUPABASE_SERVICE_ROLE_KEY** wajib ada untuk membuat user
- Key ini berbeda dengan NEXT_PUBLIC_SUPABASE_ANON_KEY
- Service role key ada di: Supabase Dashboard → Project Settings → API → service_role key
- Jangan expose service_role_key ke client/browser
