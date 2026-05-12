-- Fix Supabase Auth Database Issues
-- Jalankan ini di Supabase SQL Editor untuk mengatasi error "Database error creating new user"

-- 1. Cek apakah ada constraint atau trigger yang menghalangi
-- Lihat error log auth
SELECT * FROM auth.audit_log_entries 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Fix: Enable extension jika belum
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Fix: Pastikan auth schema permissions benar
GRANT ALL PRIVILEGES ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;

-- 4. Fix: Pastikan auth.users table bisa diakses
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.users TO supabase_auth_admin;

-- 5. Fix: Reset auth sequence jika ada issue
ALTER SEQUENCE IF EXISTS auth.users_id_seq RESTART;

-- 6. Fix: Pastikan tidak ada constraint aneh di auth.users
-- (Hati-hati: ini hanya untuk development!)

-- 7. Cek apakah service role key berfungsi dengan benar
-- Test dengan query sederhana:
SELECT COUNT(*) FROM auth.users;

-- 8. Fix: Pastikan RLS di auth schema tidak menghalangi
-- (Service role seharusnya bypass RLS, tapi cek saja)
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- 9. Jika masih error, coba recreate auth user dengan cara manual
-- Tapi sebaiknya jangan hapus data existing!

-- Verifikasi
SELECT 'Auth database fixes applied' as status;
