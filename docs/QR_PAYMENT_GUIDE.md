# Panduan Sistem QR Payment

Sistem pembayaran menggunakan QR Code + upload bukti transfer manual (tanpa payment gateway/Midtrans).

---

## Alur Sistem

```
Booking dibuat (status: pending)
    ↓
Admin approve (status: approved)
    ↓
User buka halaman payment → Generate QR
    ↓ Kode unik: SIMP-{booking_id}-{random}
User transfer ke rekening yang tertera
    ↓
User upload screenshot bukti (status: payment_uploaded)
    ↓
Admin verifikasi di dashboard
    ↓
✅ Status booking: PAID
```

---

## Database Schema

### Kolom baru di `bookings`
```sql
payment_qr_url        TEXT
payment_code          VARCHAR(50)   -- SIMP-XXXX-XXXX
payment_proof_url     TEXT
payment_verified_at   TIMESTAMP
payment_verified_by   UUID          -- FK ke users (admin)
payment_method        VARCHAR(50)
payment_bank          VARCHAR(50)
```

### Tabel `payment_proofs`
```sql
id, booking_id, proof_url, bank_name, account_name,
transfer_amount, transfer_date, notes,
status (pending/verified/rejected),
verified_by, verified_at, rejection_reason
```

### Tabel `bank_accounts`
```sql
id, bank_name, bank_code, account_number, account_name,
branch, is_active, is_primary
```

**Rekening default:**
| Bank | No. Rekening | Atas Nama |
|------|--------------|-----------|
| BCA | 1234567890 | Direktorat Olahraga Unesa |
| Mandiri | 0987654321 | Direktorat Olahraga Unesa |
| BRI | 1122334455 | Direktorat Olahraga Unesa |

---

## Migration

**File:** `supabase/migrations/20250512_qr_payment_system.sql`

Jalankan di Supabase Dashboard → SQL Editor. Verifikasi dengan:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('payment_proofs', 'bank_accounts');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name LIKE 'payment_%';
```

---

## Setup Storage Bucket

Buka Supabase Dashboard → Storage → bucket **"payments"** → Policies → tambah:

| Policy | Operation | Roles | Definition |
|--------|-----------|-------|------------|
| Allow public read | SELECT | anon, authenticated | `true` |
| Allow authenticated uploads | INSERT | authenticated | `true` |
| Allow users to update own files | UPDATE | authenticated | `true` |

---

## API Endpoints

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/payments/generate-qr` | POST/GET | Generate QR code untuk booking |
| `/api/payments/upload-proof` | POST | Upload bukti transfer |
| `/api/payments/verify` | POST | Verifikasi pembayaran (admin) |
| `/api/payments/get-qr` | GET | Ambil data QR yang sudah dibuat |
| `/api/payments/get-va` | GET | Ambil info virtual account |

## URL Halaman

| URL | Deskripsi | Akses |
|-----|-----------|-------|
| `/booking/[id]/payment` | Halaman pembayaran + QR | User |
| `/booking/[id]/upload-proof` | Upload bukti transfer | User |
| `/admin/payments/verify` | Dashboard verifikasi | Admin |

---

## File Implementasi

**Database:** `supabase/migrations/20250512_qr_payment_system.sql`

**API:**
- `src/app/api/payments/generate-qr/route.ts`
- `src/app/api/payments/upload-proof/route.ts`
- `src/app/api/payments/verify/route.ts`
- `src/app/api/payments/get-qr/route.ts`
- `src/app/api/payments/get-va/route.ts`

**UI:**
- `src/app/(borrower)/booking/[id]/payment/page.tsx`
- `src/app/(borrower)/booking/[id]/upload-proof/page.tsx`
- `src/app/(admin)/admin/payments/verify/page.tsx`
- `src/components/payment/QRPaymentDisplay.tsx`
- `src/components/payment/ProofUploadForm.tsx`

---

## Checklist Setup

- [x] Migration SQL dijalankan
- [x] Tabel `payment_proofs` dan `bank_accounts` dibuat
- [x] Kolom `payment_*` ditambah ke `bookings`
- [x] Storage bucket `payments` dibuat
- [ ] Storage bucket policies ditambah (lihat bagian Setup Storage di atas)
- [ ] Test sistem setelah policies dibuat

---

## Keunggulan Sistem

- **Gratis**: Tanpa biaya payment gateway
- **Familiar**: User transfer bank seperti biasa
- **Aman**: Verifikasi manual oleh admin
- **Transparan**: Semua bukti tersimpan di storage
- **Fleksibel**: Bisa pakai semua bank
