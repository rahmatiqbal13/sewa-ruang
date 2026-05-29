# Sewa Ruang & Alat — Direktorat USC Unesa

Platform digital terpusat untuk manajemen peminjaman ruangan dan peralatan universitas.

## Quick Start

```bash
npm install
cp .env.example .env.local   # isi environment variables
npm run dev
```

Buka `http://localhost:3000`.

## Tech Stack

Next.js 16 · TypeScript · PostgreSQL (Supabase) · Tailwind CSS · shadcn/ui

## Dokumentasi

Semua dokumentasi ada di folder [`docs/`](docs/):

| Dokumen | Isi |
|---------|-----|
| [docs/INDEX.md](docs/INDEX.md) | **Mulai di sini** — ringkasan sistem, pola kritis, masalah aktif |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tech stack, skema DB, struktur direktori, API routes |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Tujuan produk, pengguna, brand, prinsip desain |
| [docs/SETUP.md](docs/SETUP.md) | Setup lokal, environment variables, deployment |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | SOP penggunaan untuk admin dan staff |
| [docs/FEATURES.md](docs/FEATURES.md) | QR payment, notifikasi, PWA, import/export |
| [docs/QA_TESTING.md](docs/QA_TESTING.md) | Laporan QA dan functional testing |
| [docs/SECURITY.md](docs/SECURITY.md) | Panduan keamanan dan incident history |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Solusi masalah umum |
| [docs/BUG_HISTORY.md](docs/BUG_HISTORY.md) | Riwayat bug dan solusinya |
| [CHANGELOG.md](CHANGELOG.md) | Riwayat perubahan versi |

## Deployment

Deploy ke Vercel. Lihat [docs/SETUP.md](docs/SETUP.md) untuk panduan lengkap.
