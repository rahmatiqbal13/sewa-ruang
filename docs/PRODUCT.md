# Konteks Produk — Sewa Ruang & Alat

---

## Tujuan Produk

Platform digital terpusat untuk peminjaman **ruangan** dan **peralatan** di UNESA (Universitas Negeri Surabaya), dikelola oleh Direktorat USC (Unesa Science Center). Menggantikan proses manual/kertas dengan alur digital yang transparan: pengajuan → verifikasi admin → pembayaran → penggunaan → pengembalian → dokumentasi.

**Sukses berarti:** Staff tidak perlu follow-up manual, peminjam tahu status real-time, pembayaran terverifikasi dengan bukti digital.

---

## Target Pengguna

| Segmen | Siapa | Cara Pakai |
|--------|-------|-----------|
| Mahasiswa S1 | Pengguna paling umum | Booking ruang kelas / lab untuk kegiatan UKM, penelitian |
| Mahasiswa S2/S3 | Volume lebih kecil, tarif berbeda | Kebutuhan lab penelitian lebih intensif |
| Dosen/Karyawan | Hak akses lebih luas | Booking ruang seminar, alat ukur lab |
| Kerjasama (MOU) | Institusi mitra | Tarif khusus, perlu supervisi |
| Umum | Luar universitas | Tarif tertinggi, paling diawasi |
| Admin/Staff | Pengguna intensif sehari-hari | Approval, verifikasi pembayaran, manajemen aset |

---

## Brand & Tone

**Kepribadian brand:** Tegas, Transparan, Terpusat.

Suara institusi yang percaya diri tapi tidak birokratis — jelas dalam bahasa, terstruktur dalam alur, tanpa ambiguitas. Bukan startup ramah-ramah, bukan portal pemerintah kaku.

**Anti-references (jangan jadi ini):**
- SaaS korporat generik: template biru-putih, gradient text, hero-metric cards seragam
- Portal pemerintah lama: tabel berat, tidak responsif, kesan dekade 2000-an
- Glassmorphism dekoratif tanpa fungsi

---

## Prinsip Desain

1. **Kejelasan di atas estetika** — setiap elemen harus punya fungsi jelas
2. **Status selalu terlihat** — pengguna harus tahu posisi mereka dan langkah selanjutnya
3. **Institusional tapi tidak kaku** — terpercaya seperti lembaga, bergerak seperti tool modern
4. **Satu jalur, tanpa cabang** — alur utama tidak memaksa pengguna berpikir
5. **Teks berbuat kerja** — label, heading, pesan error harus presisi

---

## Aksesibilitas

- WCAG AA: contrast ratio minimum 4.5:1 untuk teks
- Keyboard navigable penuh
- Focus indicator jelas
- `aria-label` dan `role` yang sesuai di form elements

---

## Fitur yang Sudah Ada

- Manajemen ruangan & gedung (CRUD, inventaris, foto)
- Manajemen alat/peralatan (CRUD, tarif per kategori, kondisi, ketersediaan)
- Sistem pemesanan ruangan
- Pembayaran via QR + upload bukti transfer manual
- Verifikasi pembayaran oleh admin
- Pengembalian dan pengecekan kondisi
- Notifikasi email (booking, reminder, status)
- Import/export data Excel
- Generator QR code batch
- Scanner QR code (web-based)
- Profil institusi yang dapat dikustomisasi
- Multi-role: super_admin, admin, staff, borrower

## Fitur yang Belum Ada

- Booking equipment (catalog sudah ada, flow booking belum)
- Availability calendar per alat
- Reporting & analytics (statistik pendapatan, utilisasi)
- Integrasi pembayaran otomatis (QRIS/Virtual Account)
