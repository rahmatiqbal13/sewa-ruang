# QR Payment System Design (Non-Midtrans)

## Overview
Sistem pembayaran menggunakan QR Code + Upload Bukti Transfer Manual (tanpa payment gateway)

## Flow Sistem

### 1. Generate QR Payment
```
Booking Created (status: pending_payment)
    ↓
Generate Unique Payment Code: SIMP-{booking_id}-{random}
    ↓
Generate QR Code containing:
  - Bank transfer info
  - Amount
  - Payment code
  - Reference number
    ↓
User scans QR → Pay via banking app → Upload proof
```

### 2. QR Code Content Format
```
SIMPORA PAYMENT
================
Bank: BCA / Mandiri / BRI
No Rek: 1234567890
Atas Nama: Direktorat Olahraga Unesa
Total: Rp 150.000
Kode Bayar: SIMP-ABC123-XYZ789
Ref: SEWA-20260512-0001
================
Transfer sesuai nominal unik untuk verifikasi otomatis
```

### 3. Database Schema
```sql
-- Add to bookings table
ALTER TABLE bookings ADD COLUMN payment_qr_url TEXT;
ALTER TABLE bookings ADD COLUMN payment_code VARCHAR(50) UNIQUE;
ALTER TABLE bookings ADD COLUMN payment_proof_url TEXT;
ALTER TABLE bookings ADD COLUMN payment_verified_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN payment_verified_by UUID REFERENCES users(id);

-- Payment proofs table
CREATE TABLE payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  proof_url TEXT NOT NULL,
  bank_name VARCHAR(50),
  account_name VARCHAR(100),
  transfer_amount DECIMAL(12,2),
  transfer_date DATE,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Bank accounts table
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name VARCHAR(50) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
```

### 4. API Routes Needed
```
POST /api/payments/generate-qr        → Generate QR for booking
POST /api/payments/upload-proof       → Upload bukti transfer
POST /api/payments/verify             → Admin verify payment
GET  /api/payments/pending            → List pending verifications
```

### 5. Pages Needed
```
/booking/[id]/payment      → Payment page with QR
/booking/[id]/upload-proof → Upload proof of payment
/admin/payments/verify     → Admin verification dashboard
```

## Implementation Plan

### Phase 1: Database & API (Hari 1)
1. Migration untuk kolom baru di bookings
2. Create payment_proofs table
3. Create bank_accounts table
4. API endpoint generate QR
5. API endpoint upload proof

### Phase 2: UI Components (Hari 2)
1. Payment QR display component
2. Upload proof form
3. Admin verification interface

### Phase 3: Integration (Hari 3)
1. Integrate ke booking flow
2. Update status workflow
3. Notifications

## Keunggulan Sistem Ini
1. ✅ Tidak perlu biaya payment gateway
2. ✅ Tidak perlu integrasi kompleks
3. ✅ Bisa pakai semua bank
4. ✅ Verifikasi manual lebih aman
5. ✅ Bisa track pembayaran dengan jelas
6. ✅ User familiar dengan transfer bank
