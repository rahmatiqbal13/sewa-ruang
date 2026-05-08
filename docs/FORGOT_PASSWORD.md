# Fitur Forgot Password

Fitur Forgot Password telah diimplementasikan dengan Server Actions, custom email template, dan rate limiting.

## 📁 File-file yang Diubah/Dibuat

### 1. Server Action
- **File**: `src/app/(auth)/forgot-password/actions.ts`
- **Fungsi**: 
  - `sendPasswordResetEmail()` - Mengirim email reset password dengan custom template
  - Rate limiting dengan Upstash Redis (3 kali per 15 menit per email)
  - Validasi input dengan Zod
  - Custom email template dengan HTML responsif

### 2. Forgot Password Page
- **File**: `src/app/(auth)/forgot-password/page.tsx`
- **Perubahan**:
  - Menggunakan Server Actions dengan `useActionState`
  - UI yang lebih clean dengan inline error messages
  - State management yang lebih baik

### 3. Dependencies
- `@upstash/ratelimit` - Untuk rate limiting
- `nodemailer` - Sudah terinstall untuk SMTP

## 🔧 Konfigurasi Environment Variables

Pastikan variabel berikut sudah di-set di `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # atau domain production

# Email SMTP (Brevo)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Sistem Sewa Ruang
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-smtp-user
SMTP_PASS=your-brevo-smtp-password

# Upstash Redis (untuk rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

## 🔄 Alur Kerja

1. **User Request Reset**
   - User memasukkan email di `/forgot-password`
   - Form dikirim ke Server Action `sendPasswordResetEmail()`

2. **Rate Limiting**
   - Sistem cek rate limit berdasarkan email (3x per 15 menit)
   - Jika melebihi limit, return error

3. **Validasi & Generate Link**
   - Validasi email dengan Zod
   - Cek apakah user ada di database
   - Generate password reset link via Supabase Admin API

4. **Kirim Email**
   - Email dikirim menggunakan SMTP (Brevo/Resend)
   - Template HTML responsif dengan branding
   - Link berlaku 1 jam (default Supabase)

5. **User Reset Password**
   - User klik link di email
   - Redirect ke `/auth/callback` untuk exchange code
   - Redirect ke `/reset-password`
   - User memasukkan password baru

## 📧 Template Email

Template email yang dikirim memiliki:
- Header dengan branding aplikasi
- Pesan personal dengan nama user
- Tombol "Reset Password" yang jelas
- Link alternatif (plain text)
- Warning box untuk keamanan
- Footer dengan informasi aplikasi

## 🛡️ Keamanan

1. **Rate Limiting**: 3 request per 15 menit per email
2. **Email Enumeration**: Sistem tidak mengungkapkan apakah email terdaftar atau tidak
3. **Secure Token**: Menggunakan Supabase Auth recovery token
4. **Token Expiration**: Link kadaluarsa dalam 1 jam
5. **Server-side Validation**: Validasi di Server Action, bukan client-side

## 🚀 Testing

### Lokal Development
1. Pastikan semua env variables sudah di-set
2. Jalankan `npm run dev`
3. Buka `http://localhost:3000/forgot-password`
4. Masukkan email yang terdaftar
5. Cek inbox email (atau Supabase Auth logs untuk development)

### Production
1. Pastikan SMTP credentials valid
2. Pastikan Upstash Redis URL dan token valid
3. Update `NEXT_PUBLIC_APP_URL` ke domain production
4. Test dengan email aktif

## 📝 Catatan Penting

- Fitur ini menggunakan **Supabase Auth Admin API** untuk generate link, sehingga memerlukan `SUPABASE_SERVICE_ROLE_KEY`
- Email dikirim melalui **SMTP Brevo** (atau provider lain yang dikonfigurasi)
- Rate limiting menggunakan **Upstash Redis** untuk mencegah abuse
- Link reset password di-generate oleh Supabase dan di-embed dalam email custom

## 🔧 Troubleshooting

### Email tidak terkirim
- Cek SMTP credentials di `.env.local`
- Pastikan firewall tidak memblok port SMTP (587 untuk TLS)
- Cek logs di Supabase Dashboard > Auth > Logs

### Rate limit error
- Tunggu 15 menit sebelum request ulang
- Atau reset rate limit di Upstash Redis dashboard

### Link tidak valid
- Link hanya berlaku 1 jam
- Pastikan user membuka link dari email yang sama
- Cek apakah code di URL valid

### Reset password gagal
- Pastikan password baru memenuhi requirements (min 8 karakter)
- Pastikan password dan konfirmasi sama
- Cek browser console untuk error details
