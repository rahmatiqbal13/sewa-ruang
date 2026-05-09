# Konfigurasi Notifikasi - Email, WhatsApp, Telegram

## 📧 1. KONFIGURASI EMAIL (SMTP)

### Environment Variables
Tambahkan ke `.env.local`:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=RentSpace
SMTP_FROM_EMAIL=noreply@rentspace.com
```

### Cara Mendapatkan App Password (Gmail)
1. Buka https://myaccount.google.com/security
2. Aktifkan 2-Step Verification
3. Buka "App passwords"
4. Pilih "Other (Custom name)" → beri nama "RentSpace"
5. Copy app password yang muncul
6. Paste ke `SMTP_PASS`

### Provider Email Alternatif

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.com
SMTP_PASS=your-mailgun-api-key
```

---

## 💬 2. KONFIGURASI WHATSAPP

### Option A: WhatsApp Business API (Official)

#### Requirement:
- Meta Business Account
- WhatsApp Business Account
- Phone number yang terverifikasi

#### Environment Variables:
```env
WHATSAPP_PROVIDER=meta
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
```

#### Setup:
1. Buka https://business.facebook.com
2. Buat Business Account
3. Tambahkan WhatsApp
4. Verifikasi nomor telepon
5. Generate Access Token di https://developers.facebook.com/tools/explorer
6. Copy Phone Number ID dari dashboard

### Option B: Twilio WhatsApp (Recommended untuk development)

#### Environment Variables:
```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=your-twilio-number
```

#### Setup:
1. Daftar di https://www.twilio.com
2. Dapatkan Account SID dan Auth Token
3. Aktifkan WhatsApp Sandbox
4. Copy Sandbox Number

### Option C: WhatsApp Web API (Baileys - Unofficial)

#### Environment Variables:
```env
WHATSAPP_PROVIDER=baileys
WHATSAPP_SESSION_PATH=./whatsapp-session
```

#### Catatan:
- Menggunakan library Baileys
- Tidak perlu Meta Business Account
- Nomor WhatsApp akan di-scan QR code
- Untuk development/testing saja

---

## 📱 3. KONFIGURASI TELEGRAM

### Setup Telegram Bot

1. Buka Telegram dan cari bot **@BotFather**
2. Kirim `/newbot`
3. Masukkan nama bot (contoh: RentSpace Bot)
4. Masukkan username bot (contoh: rentspace_bot)
5. Copy token yang diberikan

#### Environment Variables:
```env
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=rentspace_bot
```

### Mendapatkan Chat ID

1. Cari bot Anda di Telegram
2. Kirim pesan apa saja ke bot
3. Buka: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Cari `"chat":{"id":123456789` - angka itu adalah Chat ID

---

## 📋 Template Notifikasi

### Email Template Variables
```html
Halo {{name}},

Detail peminjaman Anda:
- No. Referensi: {{reference_no}}
- Status: {{status}}
- Tanggal: {{start_date}} - {{end_date}}
- Total: {{total_amount}}

{{message}}

Terima kasih,
RentSpace Team
```

### WhatsApp Template (HSM - Highly Structured Message)
```
Halo {{1}},

Peminjaman Anda *{{2}}* telah {{3}}.

📅 Tanggal: {{4}}
💰 Total: {{5}}

{{6}}

Terima kasih.
```

### Telegram Message Format
```
🔔 <b>Notifikasi Peminjaman</b>

👤 <b>{{name}}</b>
📋 No. Ref: <code>{{reference_no}}</code>
📊 Status: <b>{{status}}</b>

📅 Tanggal: {{start_date}}
⏰ Selesai: {{end_date}}
💰 Total: {{total_amount}}

{{message}}
```

---

## 🔄 Alur Notifikasi Otomatis

### Event yang Trigger Notifikasi:

1. **Booking Created**
   - Email: Konfirmasi pengajuan diterima
   - WhatsApp: Notifikasi ke admin
   - Telegram: Log ke channel admin

2. **Booking Approved**
   - Email: Peminjaman disetujui + instruksi pembayaran
   - WhatsApp: Pemberitahuan approval
   - Telegram: Update status

3. **Payment Received**
   - Email: Pembayaran berhasil + bukti
   - WhatsApp: Konfirmasi pembayaran
   - Telegram: Log transaksi

4. **Booking Completed**
   - Email: Peminjaman selesai + reminder pengembalian
   - WhatsApp: Reminder pengembalian
   - Telegram: Archive log

5. **Booking Cancelled/Rejected**
   - Email: Penjelasan pembatalan/penolakan
   - WhatsApp: Notifikasi (jika aktif)
   - Telegram: Log pembatalan

---

## 🚀 Implementasi

### 1. Install Dependencies
```bash
npm install nodemailer
npm install twilio
npm install node-telegram-bot-api
npm install @whiskeysockets/baileys
```

### 2. Setup Environment
```bash
# Copy template
cp .env.example .env.local

# Edit file
nano .env.local
```

### 3. Test Configuration
```bash
# Test Email
npm run test:email

# Test WhatsApp
npm run test:whatsapp

# Test Telegram
npm run test:telegram
```

---

## 🛡️ Keamanan

### Best Practices:
1. **Jangan commit** file `.env.local`
2. Gunakan **App Password** bukan password utama
3. Rotate API keys secara berkala
4. Gunakan **sandbox mode** untuk testing
5. Enable **2FA** untuk semua akun
6. Log semua notifikasi yang terkirim
7. Rate limiting untuk mencegah spam

---

## 📊 Monitoring

### Log Notifikasi
Semua notifikasi akan tersimpan di tabel `notifications`:
- `channel`: email/whatsapp/telegram
- `recipient`: penerima
- `status`: sent/failed/pending
- `sent_at`: waktu pengiriman
- `error_message`: jika gagal

### Dashboard (Opsional)
Buat halaman `/admin/notifications` untuk:
- Melihat log notifikasi
- Retry failed notifications
- Statistik pengiriman
- Template management

---

## ❓ Troubleshooting

### Email tidak terkirim
- Cek SMTP credentials
- Verifikasi app password benar
- Cek firewall/port blocking
- Lihat log error di console

### WhatsApp tidak terkirim
- Cek nomor terverifikasi
- Cek access token valid
- Untuk Twilio: pastikan sandbox active
- Cek rate limits

### Telegram tidak terkirim
- Cek bot token benar
- Pastikan bot dimulai (/start)
- Cek chat ID benar
- Bot harus admin jika ke grup

---

## 📝 Catatan Penting

1. **WhatsApp Business API** memerlukan Meta approval untuk production
2. **Twilio** gratis untuk development (sandbox mode)
3. **Telegram Bot** gratis tanpa limit
4. **Email SMTP** limit tergantung provider
5. Selalu gunakan **queue** untuk high volume notifications
6. Implement **retry mechanism** untuk failed notifications

## 🔗 Referensi

- Nodemailer: https://nodemailer.com
- Twilio WhatsApp: https://www.twilio.com/whatsapp
- Telegram Bot API: https://core.telegram.org/bots/api
- Meta WhatsApp API: https://business.whatsapp.com/products/business-platform
