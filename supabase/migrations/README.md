# Supabase Migrations

## Struktur File

| File | Isi | Urutan |
|------|-----|--------|
| `consolidated_01_schema.sql` | Tabel, tipe, index, RLS policies (state final) | 1 |
| `consolidated_02_functions.sql` | Functions dan triggers (state final) | 2 |
| `consolidated_03_data.sql` | Seed data: rekening bank, tarif alat, institution profile | 3 |

## Cara Menjalankan

Buka **Supabase Dashboard → SQL Editor**, lalu jalankan ketiga file **secara berurutan**:

1. `consolidated_01_schema.sql`
2. `consolidated_02_functions.sql`
3. `consolidated_03_data.sql`

> **Catatan:** File-file ini dijalankan di atas schema dasar Supabase (tabel `users`, `rooms`, `buildings`, `equipment`, `bookings`, dst. sudah ada). File ini hanya menambahkan kolom, tabel baru, RLS, dan fungsi.

## Yang Tercakup

### Schema (File 01)
- Users: kolom tambahan (phone, institution, photo_url, dll) + RLS non-recursive
- Buildings, Rooms, Agreement Templates: RLS policies
- Equipment: kolom building_id, floor + RLS
- Equipment Rates: tabel baru + RLS + view `equipment_with_rates`
- Room Rates & Room Inventory: RLS policies
- Institution Profile: tabel baru
- Booking Status Enum: tambah nilai pending_payment, payment_uploaded, payment_rejected, active
- Bookings: kolom borrower, payment, actual_end_datetime
- Booking Items, Early Returns, Returns: RLS + kolom baru
- Booking Reminders: tabel baru + RLS
- Payment Proofs: tabel baru + RLS
- Bank Accounts: tabel baru (transfer + VA) + RLS
- Activity Logs: tabel baru + RLS
- Avatar Storage: bucket + policies

### Functions & Triggers (File 02)
- `generate_equipment_code()` — auto kode ALT-XXXX
- `generate_reference_no()` — kode booking SEWA-YYYYMMDD-XXXX
- `auto_create_booking_reminders()` — buat reminder saat booking approved
- `generate_payment_code()` — kode unik pembayaran SIMP-XXXX
- `verify_booking_payment()` — verifikasi pembayaran oleh admin
- `log_activity()` + 6 triggers — audit trail
- `get_recent_activity()`, `process_pending_reminders()`, dll.

### Seed Data (File 03)
- Rekening BCA, Mandiri, BRI (transfer)
- Virtual Account BTN (room & equipment)
- Default tarif 0 untuk semua alat aktif (5 kategori pengguna)
- Institution profile default

## Tabel Kritis — Jangan Dihapus

| Tabel/File | Alasan |
|-----------|--------|
| `20250512_fix_users_rls_final.sql` → sudah di-konsolidasi | Mencegah 500 error infinite recursion |
| `equipment_rates` | Sistem tarif sewa alat |
| `payment_proofs`, `bank_accounts` | Sistem pembayaran |
| `activity_logs` | Audit trail |
