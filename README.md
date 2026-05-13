# Sewa Ruang & Alat — Direktorat Olahraga Unesa

Sistem manajemen penyewaan ruangan dan alat/peralatan untuk universitas.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Supabase
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: Supabase Auth

## Fitur Utama

- Manajemen ruangan & gedung (CRUD, inventaris, foto)
- Manajemen alat/peralatan (CRUD, tarif per kategori pengguna, kondisi)
- Sistem pemesanan (booking) untuk ruangan & alat
- Pembayaran via QR + upload bukti transfer manual
- Multi-role: super_admin, admin, borrower

## Kategori Pengguna & Tarif

Tarif sewa berbeda per kategori: Mahasiswa S1, Mahasiswa S2, Dosen, MoU Unesa, Umum.

## Cara Menjalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Struktur Route

| Route | Deskripsi |
|-------|-----------|
| `/admin/dashboard` | Dashboard admin |
| `/admin/rooms` | Manajemen ruangan |
| `/admin/equipment` | Manajemen alat |
| `/admin/buildings` | Manajemen gedung |
| `/admin/users` | Manajemen pengguna (super_admin only) |
| `/admin/payments/verify` | Verifikasi pembayaran |
| `/catalog` | Katalog publik |

## Dokumentasi

- [CHANGELOG.md](CHANGELOG.md) — Riwayat perubahan
- [claudefix_bug.md](claudefix_bug.md) — Daftar bug & solusi
- [docs/QR_PAYMENT_GUIDE.md](docs/QR_PAYMENT_GUIDE.md) — Sistem pembayaran QR
- [docs/USER_TROUBLESHOOTING.md](docs/USER_TROUBLESHOOTING.md) — Troubleshooting pembuatan user
- [AGENTS.md](AGENTS.md) — Konteks sistem untuk AI agent

## Deployment

Deploy ke Vercel. Pastikan environment variables sudah diset di Vercel dashboard.
