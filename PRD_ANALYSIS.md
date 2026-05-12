# 📊 ANALISIS PRD vs SISTEM EXISTING
## SIMPORA - Sistem Informasi Peminjaman Olahraga & Ruangan

---

## 🎯 Executive Summary

Berdasarkan PRD versi 1.1 dan audit sistem yang ada, berikut adalah status kesesuaian:

| Status | Keterangan | Persentase |
|--------|-----------|------------|
| ✅ **Week 1 (Foundation)** | Hampir lengkap | ~90% |
| ⏳ **Week 2 (Booking Flow)** | Partial, kurang payment | ~60% |
| ❌ **Week 3-4 (Payment & Reports)** | Belum dimulai | ~20% |
| **TOTAL PROGRESS** | | **~55%** |

---

## ✅ WEEK 1: FOUNDATION (Status: 90% Complete)

| Fitur PRD | Status | Evidence |
|-----------|--------|----------|
| Setup Next.js 15 + Supabase + shadcn/ui | ✅ **DONE** | Project berjalan, build success |
| CRUD Equipment + Kategori + Tarif | ✅ **DONE** | `/admin/equipment` - Full CRUD dengan tarif per kategori user |
| CRUD Ruangan + Gedung + Inventaris | ✅ **DONE** | `/admin/rooms`, `/admin/buildings`, `/admin/inventory` |
| Katalog Publik + Filter & Search | ✅ **DONE** | `/catalog` - Bisa akses tanpa login |
| Upload Foto via Supabase Storage | ✅ **DONE** | `ImageUpload.tsx`, `PhotoUpload.tsx` berfungsi |
| Auth Roles (admin/peminjam/dosen/kepala_unit) | ⏳ **PARTIAL** | Ada role di database, tapi RLS perlu dikonfigurasi ulang |
| **Total** | **5.5/6** | **92%** |

### Catatan Week 1:
- ✅ Semua fitur dasar CRUD berfungsi dengan baik
- ✅ UI/UX menggunakan shadcn/ui sudah modern dan responsive
- ⏳ RLS (Row Level Security) perlu review ulang untuk keamanan

---

## ⏳ WEEK 2: BOOKING FLOW (Status: 60% Complete)

| Fitur PRD | Status | Evidence | Keterangan |
|-----------|--------|----------|------------|
| **Booking Form Alat & Ruangan** | ✅ **DONE** | `BookingForm.tsx` - Bisa booking keduanya sekaligus | Fitur ini sudah lengkap |
| **Kalender Ketersediaan** | ❌ **NOT DONE** | Belum ada visual calendar | Hanya ada filter, tidak ada calendar view |
| **Anti Double Booking** | ✅ **DONE** | `schema-v2.sql` - Table `room_booking_slots` & `equipment_booking_slots` dengan EXCLUDE constraint | Sudah di database level |
| **Approval Center** | ✅ **DONE** | `/admin/bookings` - Approve/reject dengan notifikasi | Lengkap dengan status badge |
| **QR Scan Ambil & Kembali** | ⏳ **PARTIAL** | QR generation ada, tapi scan interface belum lengkap | Bisa generate QR, belum ada mobile scan page |
| **Foto Kondisi Wajib** | ⏳ **PARTIAL** | `CompleteReturnForm.tsx` - Ada foto saat return, tapi belum mandatory | Perlu enforce wajib upload |
| **Notifikasi Email** | ✅ **DONE** | `/api/notifications/send` - SMTP, WhatsApp, Telegram | Sistem notifikasi lengkap |
| **Total** | **4.5/7** | **64%** | |

### Critical Gap Week 2:
❌ **Kalender Ketersediaan Visual** - PRD mensyaratkan kalender real-time, tapi yang ada hanya filter sederhana

---

## ❌ WEEK 3: PAYMENT & LAPORAN (Status: 20% Complete)

| Fitur PRD | Status | Evidence | Priority |
|-----------|--------|----------|----------|
| **Integrasi Midtrans Snap (QRIS)** | ❌ **NOT IMPLEMENTED** | Hanya ada "online" di payment methods, tidak ada integrasi Midtrans | 🔴 **CRITICAL** |
| **Webhook Payment Callback** | ❌ **NOT IMPLEMENTED** | Tidak ada endpoint webhook untuk Midtrans | 🔴 **CRITICAL** |
| **Kalkulasi Denda Otomatis** | ⏳ **PARTIAL** | Ada overdue detection, tapi belum ada kalkulasi otomatis | 🟠 HIGH |
| **Dashboard KPI Real-time** | ❌ **NOT IMPLEMENTED** | Dashboard ada tapi belum ada KPI metrics | 🟠 HIGH |
| **Export Laporan XLSX** | ✅ **DONE** | `/admin/reports` - Export Excel sudah ada | |
| **Surat Konfirmasi PDF** | ⏳ **PARTIAL** | `pdf-generator.ts` ada tapi belum diintegrasikan dengan booking | 🟡 MEDIUM |
| **Total** | **1.5/6** | **25%** | |

### Critical Gap Week 3:
❌ **Payment Gateway (Midtrans)** - Ini adalah **BLOCKER** utama. Tanpa ini, sistem tidak bisa go-live karena:
- Deposit tidak bisa dibayar otomatis
- Denda tidak bisa diproses
- Tidak ada bukti pembayaran digital

---

## ❌ WEEK 4: POLISH & GO-LIVE (Status: 30% Complete)

| Fitur PRD | Status | Evidence | Keterangan |
|-----------|--------|----------|------------|
| **Bulk Import CSV 100+ Alat** | ✅ **DONE** | `/scripts/import-equipment.js` - Script import sudah ada | Bisa pakai untuk import massal |
| **UAT & Bug Fixing** | ⏳ **ONGOING** | - | Masih dalam tahap debugging |
| **Pelatihan Admin** | ❌ **NOT STARTED** | - | Belum dilakukan |
| **RLS Security Config** | ⏳ **PARTIAL** | Ada constraint tapi perlu review | Perlu audit keamanan |
| **Monitoring 48 Jam** | ❌ **NOT STARTED** | - | Belum go-live |
| **Total** | **1.5/5** | **30%** | |

---

## 📋 GAP ANALYSIS: PRD vs EXISTING

### Tabel Database yang MASIH KURANG

| Tabel PRD | Status | Tabel Existing | Gap |
|-----------|--------|----------------|-----|
| `kondisi_log` | ❌ Missing | `asset_tracking_logs` | ✅ Bisa pakai existing |
| `payments` | ✅ Ada | - | Lengkap |
| `notifications` | ✅ Ada | - | Lengkap |
| `activity_log` | ❌ Missing | - | Perlu dibuat untuk audit trail lengkap |

### Fitur KRITIS yang Belum Ada

| Fitur | Impact | Effort | Priority |
|-------|--------|--------|----------|
| **Midtrans Integration** | 🔴 BLOCKER | 3-5 hari | P0 - Harus dikerjakan pertama |
| **Kalender Visual** | 🟠 HIGH | 2-3 hari | P1 - User experience |
| **QR Scan Interface** | 🟠 HIGH | 2 hari | P1 - Tracking wajib |
| **Deposit System** | 🟠 HIGH | 1-2 hari | P1 - Business rule |
| **Denda Otomatis** | 🟡 MEDIUM | 1 hari | P2 - Bisa manual dulu |

---

## 🎯 REKOMENDASI IMPLEMENTASI

### Phase 1: CRITICAL - Must Have (1-2 Minggu)

#### 1. **Payment Gateway Midtrans** 🔴
```
Tasks:
- [ ] Install midtrans-client package
- [ ] Create /api/payments/midtrans/snap-token route
- [ ] Create /api/payments/midtrans/callback webhook
- [ ] Update BookingForm untuk redirect ke Midtrans Snap
- [ ] Update payment status dari "pending" ke "paid" via webhook
- [ ] Testing dengan Midtrans Sandbox

Files to create:
- /src/app/api/payments/midtrans/snap-token/route.ts
- /src/app/api/payments/midtrans/callback/route.ts
- /src/lib/midtrans.ts (config & helper)
```

#### 2. **Kalender Ketersediaan** 🟠
```
Tasks:
- [ ] Install react-big-calendar atau fullcalendar
- [ ] Create CalendarView component
- [ ] Integrasi dengan booking slots data
- [ ] Show red/green status per date
- [ ] Add to /catalog/[id] page

Files to modify:
- /src/app/catalog/page.tsx (add calendar tab)
- /src/app/(borrower)/booking/new/BookingForm.tsx (show calendar)
```

### Phase 2: HIGH Priority (1 Minggu)

#### 3. **QR Scan Check-out/Check-in** 🟠
```
Tasks:
- [ ] Create /admin/scan page
- [ ] Use html5-qrcode library
- [ ] Link scan result to booking update
- [ ] Enforce photo upload before status change
- [ ] Mobile-optimized interface
```

#### 4. **Deposit & Denda System** 🟠
```
Tasks:
- [ ] Add deposit_amount field to bookings table
- [ ] Add late_fee_config to settings
- [ ] Create cron job untuk hitung denda otomatis
- [ ] Update return flow dengan deposit refund logic
```

### Phase 3: MEDIUM Priority (Opsional untuk Go-Live)

#### 5. **Public Schedule View**
- Kalender read-only tanpa login
- Show room availability

#### 6. **Activity Log / Audit Trail**
- Track semua perubahan data
- Append-only log

#### 7. **Auto-generate PDF Invoice**
- Integrasi pdf-generator.ts dengan booking

---

## ⚠️ RISIKO GO-LIVE

| Risiko | Probabilitas | Impact | Mitigasi |
|--------|-------------|--------|----------|
| Payment belum jalan | 🔴 Tinggi | 🔴 BLOCKER | Prioritas #1: Midtrans integration |
| User tidak familiar QR scan | 🟠 Sedang | 🟠 HIGH | Buat SOP + dampingi 2 minggu pertama |
| Data alat belum lengkap | 🟠 Sedang | 🟠 HIGH | Gunakan bulk import script |
| Konflik booking manual | 🟢 Rendah | 🟡 MEDIUM | Double booking prevention sudah ada |

---

## 📊 ESTIMASI SISA WAKTU

Berdasarkan PRD deadline **1 bulan (Juni 2026)**:

| Phase | Estimasi | Status |
|-------|----------|--------|
| Week 1 (Foundation) | ✅ DONE | 100% |
| Week 2 (Booking Flow) | ⏳ 70% | Tinggal kalender & QR polish |
| Week 3 (Payment) | ❌ 0% | **CRITICAL - Butuh 1 minggu fokus** |
| Week 4 (Go-Live) | ⏳ 30% | Perlu UAT intensif |

**Sisa waktu yang dibutuhkan: 2-3 minggu intensif**

Focus utama:
1. **Minggu ini**: Midtrans integration (CRITICAL)
2. **Minggu depan**: QR scan + Kalender + Polish
3. **Minggu ke-3**: UAT + Bug fixing + Data entry

---

## ✅ CHECKLIST GO-LIVE (Definisi DONE)

Dari PRD Section 5.3:

- [x] Project live di Vercel (sewa-ruang.vercel.app)
- [x] CRUD equipment + ruangan + gedung berfungsi
- [x] Upload foto via Supabase Storage berfungsi
- [x] Katalog publik dapat diakses tanpa login
- [x] Export laporan xlsx berfungsi
- [ ] **RLS Supabase dikonfigurasi untuk semua role** ⏳
- [ ] **Booking flow end-to-end berfungsi** ⏳ (kurang payment)
- [ ] **QR scan keluar & kembali + foto kondisi wajib** ⏳
- [ ] **Anti double booking via Supabase RPC** ✅ (sudah ada)
- [ ] **Pembayaran QRIS berhasil di test transaksi** ❌
- [ ] **Dashboard KPI kepala unit tersedia** ❌
- [ ] **100+ alat terdaftar dengan data lengkap** ⏳
- [ ] **0 error di Vercel/Supabase selama 24 jam** ⏳
- [ ] **Pelatihan admin selesai** ❌

**Progress Go-Live Checklist: 5/13 (38%)**

---

## 🎯 KESIMPULAN

### Apa yang SUDAH BAGUS ✅
1. **Foundation sangat kuat** - Tech stack modern, kode rapi
2. **CRUD lengkap** - Semua master data sudah bisa dikelola
3. **Booking flow berfungsi** - Dari submit sampai return sudah ada
4. **Notifikasi lengkap** - Email, WhatsApp, Telegram siap
5. **Conflict prevention** - Anti double booking di database level

### Apa yang PERLU DIBURU ❌
1. **🚨 Midtrans Payment Integration** - Ini blocker utama!
2. **Kalender visual** - Penting untuk UX
3. **QR scan workflow** - Wajib untuk tracking
4. **Deposit system** - Business rule penting

### Rekomendasi Jadwal:
```
Hari 1-3:  Midtrans Integration (Critical)
Hari 4-5:  QR Scan Interface
Hari 6-7:  Kalender Visual
Hari 8-10: Deposit & Denda System
Hari 11-14: UAT & Bug Fixing
Hari 15-17: Data Entry (100+ alat)
Hari 18-21: Pelatihan & Go-Live
```

**Total: 3 minggu intensif untuk Go-Live yang aman.**

---

*Laporan dibuat: 12 Mei 2026*
*Status: Siap untuk development Phase 2 (Payment Integration)*
