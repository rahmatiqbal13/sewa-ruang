# 🚨 URGENT: Security Incident Response

## Masalah
JWT tokens dan Supabase service role keys terekspos di GitHub repository.

## Langkah-Langkah Perbaikan

### 1. RESET SUPABASE KEYS (WAJIB!)

#### A. Reset JWT Secret
1. Buka Supabase Dashboard: https://app.supabase.com
2. Pilih project Anda
3. Go to: Project Settings → Configuration → API
4. Klik **"Generate New Secret"** atau **"Regenerate JWT Secret"**
5. Ini akan invalidate semua token lama

#### B. Reset Service Role Key
1. Di halaman yang sama (Project Settings → API)
2. Klik **"Generate New Service Role Key"**
3. Copy key baru

#### C. Update Environment Variables
1. Update `.env.local` di local development
2. Update environment variables di Vercel/Netlify/hosting lainnya:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-new-key-here
   ```

### 2. CLEANUP GIT HISTORY (WAJIB!)

Token masih ada di git history. Anda perlu menghapusnya:

#### Option A: Using BFG Repo-Cleaner (Recommended)
```bash
# Download BFG
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Run BFG to remove secrets
java -jar bfg-1.14.0.jar --replace-text secrets.txt your-repo.git

# Push changes
git push --force
```

#### Option B: Using git-filter-repo
```bash
# Install git-filter-repo
pip install git-filter-repo

# Run filter
git filter-repo --replace-text <(echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9teGZ2a2tuaGdubmlpbWtmYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTg2MjksImV4cCI6MjA5Mjc5NDYyOX0.nIVIQTVD-I-yx1dqKsMwCBHoQvoUCGCzZqqpM_nLfoY==>REDACTED_ANON_KEY')

# Push
git push --force
```

#### Option C: Create New Repository (Simplest)
Jika repository masih baru, paling mudah:
1. Save semua code ke folder baru (tanpa .git)
2. Hapus repository lama di GitHub
3. Buat repository baru
4. Push code yang sudah dibersihkan

### 3. VERIFIKASI

Pastikan tidak ada secret lagi:
```bash
git log --all --full-history -- .env.local.example
git log --all --full-history -- .env.local.example.production
```

Cek dengan grep:
```bash
grep -r "eyJhbGciOiJIUzI1NiIs" .
grep -r "supabase.*service_role" .
```

### 4. NOTIFIKASI

Jika keys sudah digunakan di production:
1. Periksa access logs di Supabase
2. Periksa query yang tidak biasa
3. Consider notifying users jika ada data breach

## File yang Terdampak
- `.env.local.example` (deleted)
- `.env.local.example.production` (deleted)
- Git history (perlu cleanup)

## File Baru (Safe)
- `.env.example` (template dengan placeholder)
- `.gitignore` (updated)

## Referensi
- GitHub Docs: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- Supabase Docs: https://supabase.com/docs/guides/database/secure-data
