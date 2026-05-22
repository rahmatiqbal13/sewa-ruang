# Laporan Performance Testing — Sewa Ruang & Alat
**Tanggal**: 2026-05-22  
**Tester**: Performance Engineer (Claude)  
**Environment**: Development (`localhost:3000`, Next.js 16.2.6 Turbopack)  
**Metode**: Response time measurement, load testing, bundle analysis, static code analysis

---

## Executive Summary

| Kategori | Status | Skor |
|----------|--------|------|
| Response Time (single user) | ⚠️ Perlu perhatian | 60/100 |
| Load Handling (concurrent) | 🔴 Buruk | 35/100 |
| Bundle Size | ⚠️ Perlu perhatian | 55/100 |
| Caching Strategy | ⚠️ Perlu perhatian | 50/100 |
| Database Query Efficiency | 🔴 Buruk | 40/100 |
| Dependency Hygiene | ⚠️ Perlu perhatian | 55/100 |

---

## 1. Response Time Analysis

### 1.1 Single-User TTFB per Halaman

| Route | TTFB | HTML Size | Compressed | Status |
|-------|------|-----------|------------|--------|
| `/` (Homepage) | 442ms | 89 KB | 22 KB | ⚠️ Lambat |
| `/catalog` | 320ms | 101 KB | 21 KB | ⚠️ Lambat |
| `/login` | 63ms | 39 KB | ~8 KB | ✅ OK |
| `/admin/*` (redirect) | 5ms | 38B | — | ✅ OK |

> **Catatan**: Ini adalah dev server (Turbopack). Production akan **lebih cepat** untuk SSR karena tidak ada build-time overhead. Namun data SSR dari Supabase tetap menjadi bottleneck.

### 1.2 Distribusi Latensi Homepage (30 sampel)

```
P50 (median) : 0.207s  ✅
P90          : 0.241s  ✅
P99          : 0.485s  ⚠️  Spike signifikan
Average      : 0.223s
Min          : 0.193s
Max          : 0.485s
```

### 1.3 Distribusi Latensi Catalog (20 sampel)

```
P50 (median) : 0.247s  ✅
P90          : 0.512s  ⚠️  Melewati 500ms
P99          : 0.519s  ⚠️
Average      : 0.323s
Min          : 0.212s
Max          : 0.519s
```

**Temuan**: P99 catalog mencapai 519ms — kemungkinan karena Supabase cold query atau koneksi pool exhaustion.

---

## 2. Load Testing (Concurrent Users)

### 2.1 Hasil Load Test

| Skenario | Concurrent | Total Time | TTFB Terburuk | Status |
|----------|-----------|------------|---------------|--------|
| 20 concurrent → `/` | 20 | ~1.6s | 16.9s (outlier!) | 🔴 Kritis |
| 20 concurrent → `/catalog` | 20 | ~2.4s | 2.4s | ⚠️ Buruk |
| 50 concurrent → `/` | 50 | 6.2s | 4.0s | 🔴 Kritis |

### 2.2 Analisis

- **20 concurrent users**: Satu request anehnya memakan **16.9 detik** — ini mengindikasikan ada request yang di-queue/timeout di sisi Supabase connection pool
- **50 concurrent users**: Rata-rata TTFB naik ke **3–4 detik** (dari 200ms saat single user → melonjak 15–20×)
- Degradasi sangat curam → sistem **tidak scalable** untuk traffic >20 user bersamaan

**Root cause**: Semua dynamic pages (62 routes) melakukan DB fetch langsung ke Supabase di setiap request tanpa connection pooling yang optimal dan tanpa caching server-side yang memadai.

---

## 3. Bundle Size Analysis

### 3.1 Production Build Stats

```
Total JS Chunks : 100 files
Total JS Size   : 4.6 MB (unminified) → ~1.2 MB (estimasi gzip)
Total CSS Size  : 176 KB
Static Assets   : 4.9 MB
```

### 3.2 Largest JS Chunks

| File | Size | Keterangan |
|------|------|------------|
| `0~y5e-wfarx5-.js` | 395 KB | Chunk terbesar — kemungkinan vendor bundle |
| `13vz~nr1y~u27.js` | 350 KB | Duplikat chunk (kemungkinan route split issue) |
| `0r5loyi__179x.js` | 350 KB | Idem |
| `04rqmes7-80.x.js` | 302 KB | Besar |
| `0sto~_5i4-7jv.js` | 229 KB | |
| `11~61jveict4i.js` | 228 KB | |

### 3.3 Homepage Compression

```
Homepage: 91 KB → 22 KB (gzip, rasio 75.4%) ✅
Catalog:  103 KB → 22 KB (gzip, rasio 79.1%) ✅
```

Kompresi berjalan baik. Namun ukuran raw HTML sangat besar untuk SSR — mengindikasikan **over-rendering** atau banyak komponen yang di-embed langsung di HTML.

---

## 4. Dependency Bloat Analysis

### 4.1 Package yang Bermasalah

| Package | Versi | Issue | Severity |
|---------|-------|-------|----------|
| `puppeteer-core` | ^24.43.1 | ~150MB di node_modules, hanya untuk generate invoice PDF | 🔴 Kritis |
| `@tanstack/react-query-devtools` | ^5.100.5 | **Devtools masuk bundle production** — tidak ada guard `NODE_ENV` | 🔴 Kritis |
| `shadcn` | ^4.5.0 | CLI tool masuk production dependencies (seharusnya devDependencies) | 🟠 High |
| `xlsx` | ^0.18.5 | ~10MB library, tidak ada lazy import | 🟡 Medium |
| `pg` | ^8.20.0 | Direct PostgreSQL driver — Supabase sudah include driver, `pg` tidak dipakai langsung di src/ | 🟡 Medium |
| `react-big-calendar` | ^1.19.4 | Besar, tidak ada dynamic import | 🟡 Medium |

### 4.2 ReactQueryDevtools di Production

**File**: [src/components/layouts/QueryProvider.tsx](src/components/layouts/QueryProvider.tsx:4)

```tsx
// MASALAH: Devtools selalu dimuat, bahkan di production
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
// ...
<ReactQueryDevtools initialIsOpen={false} />
```

Ini menambah bundle size yang tidak perlu untuk semua user production.

---

## 5. Caching Strategy Analysis

### 5.1 HTTP Cache Headers

```
Homepage      : Cache-Control: no-cache, must-revalidate  ⚠️
Static chunks : Cache-Control: private, no-cache, no-store ⚠️ (dev mode)
```

> Di production (Vercel), Next.js otomatis set `immutable` cache untuk static chunks. Ini **OK untuk production** tapi dev mode tidak mencerminkan ini.

### 5.2 Server-Side Cache Coverage

| Halaman | Revalidate | Status |
|---------|-----------|--------|
| `/catalog` | 30 detik | ✅ Ada ISR |
| `/admin/dashboard` | 60 detik | ✅ Ada ISR |
| `/rooms/[id]` | 30 detik | ✅ Ada ISR |
| `/schedule` | 60 detik | ✅ Ada ISR |
| `/admin/bookings` | ❌ Tidak ada | ⚠️ Full dynamic |
| `/admin/equipment` | ❌ Tidak ada | ⚠️ Full dynamic |
| `/admin/rooms` | ❌ Tidak ada | ⚠️ Full dynamic |
| `/admin/payments` | ❌ Tidak ada | ⚠️ Full dynamic |
| `/booking/*` | ❌ Tidak ada | OK (user-specific) |

**Masalah**: 62 dari 69 pages (90%) adalah fully dynamic tanpa cache apapun. Ini membuat setiap request selalu hit database.

---

## 6. Database Query Efficiency

### 6.1 SELECT * Over-fetching

Ditemukan **31 query** menggunakan `.select('*')` yang mengambil semua kolom padahal hanya sebagian yang dipakai:

| File | Issue |
|------|-------|
| [admin/rooms/page.tsx](src/app/(admin)/admin/rooms/page.tsx:36) | `select('*')` untuk rooms |
| [admin/equipment/[slug]/page.tsx](src/app/(admin)/admin/equipment/[slug]/page.tsx:120) | `select('*')` untuk equipment |
| [admin/payment-methods/page.tsx](src/app/(admin)/admin/payment-methods/page.tsx:66) | `select('*')` untuk bank_accounts |
| `admin/buildings/[id]/edit/page.tsx` | `select('*')` untuk building |
| Dan 27 file lainnya... | |

### 6.2 Sequential Await vs Promise.all

- **Promise.all digunakan**: 10 lokasi ✅
- **Sequential await (berpotensi diparalelkan)**: 133 lokasi ⚠️

Contoh pola yang lambat (sequential):
```typescript
// ❌ Sequential: 3 DB calls berjalan satu-per-satu (~900ms total)
const { data: booking } = await supabase.from('bookings')...
const { data: items } = await supabase.from('booking_items')...
const { data: rooms } = await supabase.from('rooms')...
```

Seharusnya:
```typescript
// ✅ Paralel: semua 3 calls berjalan bersamaan (~300ms total)
const [{ data: booking }, { data: items }, { data: rooms }] = await Promise.all([
  supabase.from('bookings')...,
  supabase.from('booking_items')...,
  supabase.from('rooms')...,
])
```

### 6.3 External API Dependency di BatchQR

**File**: [src/app/(admin)/admin/qr/batch/BatchQRClient.tsx:272](src/app/(admin)/admin/qr/batch/BatchQRClient.tsx#L272)

```tsx
// ❌ Mengandalkan external service untuk generate QR — tidak bisa offline
<img src="https://api.qrserver.com/v1/create-qr-code/?data=...&size=120x120" />
```

Jika `api.qrserver.com` down, semua QR code di halaman batch akan gagal.

---

## 7. Component Architecture Performance

### 7.1 Client vs Server Component Ratio

```
Total TSX files       : 157
Client Components ('use client') : 81 (52%)
Server Components               : 76 (48%)
```

**52% client components** adalah tinggi. Idealnya <30% untuk app yang data-heavy. Client components menyebabkan:
- JavaScript dikirim ke browser lebih banyak
- Hydration time lebih lama
- Interactivity tertunda (TTI naik)

### 7.2 Static vs Dynamic Pages

```
Static (○) : 7 pages (10%)
Dynamic (ƒ) : 62 pages (90%)
```

Terlalu sedikit halaman yang di-prerender. Beberapa halaman seperti `/register`, `/forgot-password`, `/reset-password` sudah static ✅. Namun banyak halaman admin yang bisa menggunakan ISR.

### 7.3 Tidak Ada Dynamic Import / Lazy Loading

```
Penggunaan next/dynamic atau React.lazy: 0 (NOL)
```

Library berat seperti `recharts`, `react-big-calendar`, `xlsx` semua diload di halaman utama tanpa code splitting manual. Ini menambah initial bundle size.

### 7.4 Puppeteer di Invoice API

**File**: [src/app/api/bookings/[id]/invoice/route.ts](src/app/api/bookings/[id]/invoice/route.ts)

Setiap request invoice melakukan:
1. Launch browser instance baru (Puppeteer)
2. Generate HTML
3. Render ke PDF

Ini **sangat berat** (~2-5 detik per request) dan tidak scalable. Di Vercel, Puppeteer juga sering gagal karena memory limit.

---

## 8. Rekomendasi Perbaikan (Prioritas)

### 🔴 Critical — Kerjakan Segera

#### P01: Tambah Guard Production untuk ReactQueryDevtools
**File**: [src/components/layouts/QueryProvider.tsx](src/components/layouts/QueryProvider.tsx)

```tsx
// Sebelum:
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
// ...
<ReactQueryDevtools initialIsOpen={false} />

// Sesudah:
{process.env.NODE_ENV === 'development' && (
  <ReactQueryDevtools initialIsOpen={false} />
)}
```
**Impact**: Mengurangi bundle size ~50-100 KB untuk semua user production.

#### P02: Pindahkan shadcn & devtools ke devDependencies
```json
// package.json - pindahkan dari dependencies ke devDependencies:
"devDependencies": {
  "shadcn": "^4.5.0",
  "@tanstack/react-query-devtools": "^5.100.5",
  ...
}
```
**Impact**: Mengurangi produksi bundle.

#### P03: Ganti QR Code Eksternal dengan Library Lokal di BatchQR
**File**: [src/app/(admin)/admin/qr/batch/BatchQRClient.tsx:272](src/app/(admin)/admin/qr/batch/BatchQRClient.tsx#L272)

```tsx
// Ganti:
<img src="https://api.qrserver.com/v1/create-qr-code/?data=...&size=120x120" />

// Dengan (gunakan react-qr-code yang sudah ada di dependencies):
import QRCode from 'react-qr-code'
<QRCode value={item.url} size={120} />
```
**Impact**: Eliminasi dependency eksternal → tidak gagal saat api.qrserver.com down.

---

### 🟠 High — Kerjakan Minggu Ini

#### P04: Ganti Puppeteer dengan PDF Library yang Lebih Ringan
Puppeteer terlalu berat untuk serverless. Alternatif:
- **`@react-pdf/renderer`** — pure JS, ringan, cocok untuk invoice sederhana
- **`jsPDF`** — alternatif ringan
- Atau gunakan HTML-to-PDF service external (misalnya WeasyPrint via microservice)

#### P05: Tambah Database Connection Pooler
Tambahkan Supabase connection pooler (PgBouncer) di Supabase dashboard:
- Mode: `Transaction` untuk serverless
- Ini sangat penting untuk menangani concurrent requests

Atau aktifkan di connection string:
```
NEXT_PUBLIC_SUPABASE_URL=...?pgbouncer=true&connection_limit=1
```

#### P06: Lazy Load Library Besar
```typescript
// recharts (di dashboard/reports)
const { BarChart, LineChart } = await import('recharts')

// react-big-calendar (di schedule)
const Calendar = dynamic(() => import('react-big-calendar'), { ssr: false })

// xlsx (di export functionality)
const XLSX = await import('xlsx')
```

#### P07: Tambah ISR untuk Admin Pages yang Bisa Di-cache
```typescript
// admin/equipment/page.tsx
export const revalidate = 30  // refresh tiap 30 detik

// admin/rooms/page.tsx
export const revalidate = 60

// admin/buildings/page.tsx
export const revalidate = 300  // 5 menit, jarang berubah
```

---

### 🟡 Medium — Kerjakan Sprint Berikutnya

#### P08: Paralelkan Sequential DB Queries
Audit halaman yang punya multiple sequential `await supabase.from(...)` dan wrap dengan `Promise.all`. 133 kandidat lokasi yang perlu di-review.

#### P09: Ganti SELECT * dengan Field Spesifik
31 query menggunakan `select('*')`. Ganti dengan hanya kolom yang diperlukan untuk mengurangi payload dari Supabase.

#### P10: Kurangi Client Components
Review 81 client components — banyak yang mungkin bisa di-convert ke server component dengan memindahkan event handler ke minimal wrapper.

#### P11: Tambah next/image dengan Priority untuk Above-the-fold
Gambar hero/logo di homepage belum menggunakan `priority` prop. Ini menyebabkan LCP yang lebih lama.

---

## 9. Metrik Benchmark

### Target Performa (Google Core Web Vitals)

| Metrik | Target (Good) | Estimasi Saat Ini | Gap |
|--------|--------------|-------------------|-----|
| TTFB | < 800ms | ~200-500ms (single) | ✅ OK single user |
| LCP | < 2.5s | ~2-4s (estimasi, ada Supabase img preload) | ⚠️ |
| FID/INP | < 200ms | N/A (perlu browser test) | — |
| CLS | < 0.1 | Risiko tinggi (img tanpa height) | ⚠️ |
| TTI | < 3.8s | Tinggi (81 client components) | ⚠️ |

### Kapasitas Saat Ini vs Target

| Kondisi | TTFB Saat Ini | Target |
|---------|--------------|--------|
| 1 user | 200ms | < 300ms ✅ |
| 20 concurrent | 1.1-16.9s | < 1s ❌ |
| 50 concurrent | 3-4s | < 2s ❌ |

---

## 10. Ringkasan Temuan

| # | Temuan | Severity | Dampak |
|---|--------|----------|--------|
| 1 | ReactQueryDevtools dimuat di production | 🔴 Critical | +50-100KB bundle semua user |
| 2 | 90% pages fully dynamic tanpa cache | 🔴 Critical | DB hit setiap request |
| 3 | Degradasi 15-20× saat 20+ concurrent users | 🔴 Critical | UX buruk, potential timeout |
| 4 | Puppeteer untuk invoice PDF (sangat berat) | 🟠 High | 2-5s per invoice, crash di Vercel |
| 5 | QR batch pakai external API (api.qrserver.com) | 🟠 High | Single point of failure |
| 6 | 31 query SELECT * (over-fetching) | 🟠 High | Payload lebih besar dari perlu |
| 7 | 133 sequential DB await (harusnya paralel) | 🟠 High | Waktu load 2-3× lebih lambat |
| 8 | 0 dynamic import untuk library besar | 🟡 Medium | Bundle besar, TTI lambat |
| 9 | shadcn masuk production deps | 🟡 Medium | Node_modules bloat |
| 10 | P99 catalog 519ms (spiky) | 🟡 Medium | User experience buruk di traffic tinggi |
| 11 | 52% client components (idealnya <30%) | 🟡 Medium | Hydration overhead |
| 12 | Tidak ada pg langsung di src/ tapi pg ada di deps | 🟢 Low | Unnecessary dependency |

---

*Laporan ini berdasarkan pengujian di development environment. Performance di production Vercel akan berbeda — caching, edge network, dan connection pooler Supabase akan memberikan hasil lebih baik untuk single-user. Namun masalah concurrency dan bundle size tetap berlaku.*
