# Catatan Perubahan — Formulir PDF Peminjaman

## Tanggal: 2026-05-22

---

## 1. Perbaikan Error 404 "Booking not found"

**Masalah:** API `/api/bookings/[id]/formulir` mengembalikan 404 karena query Supabase mencoba select kolom `price` yang tidak ada di tabel `booking_items`.

**Perbaikan:**
- File: `src/app/api/bookings/[id]/formulir/route.ts`
- Menghapus `price` dari select query `booking_items`
- Menambahkan logging error Supabase agar masalah query lebih mudah ditelusuri
- Juga diterapkan pada `invoice/route.ts` dan `invoice/simple/route.ts`

---

## 2. Perbaikan Download HTML (Bukan PDF)

**Masalah:** File yang terdownload berupa HTML, bukan PDF. Penyebabnya `puppeteer-core` tidak menemukan executable Chrome.

**Perbaikan:**
- File: `.env.local`
  - Menambahkan `CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe`
- File: `src/app/api/bookings/[id]/formulir/route.ts`
  - Menambahkan fungsi `getChromeExecutablePath()` yang mendeteksi otomatis lokasi Chrome di Windows/Mac/Linux
  - Menambahkan error handling jika Chrome tidak ditemukan
- Juga diterapkan pada `invoice/route.ts`

---

## 3. Tombol Preview (Lihat) Sebelum Download

**Perubahan UI:**
- File: `src/app/(admin)/admin/bookings/BookingsList.tsx`
- Menambahkan import icon `Eye` dari lucide-react
- Menambahkan tombol 👁️ **Lihat Formulir PDF** di sebelah kiri tombol ⬇️ Download
- Berlaku untuk tampilan **Tabel** dan **Card**

**Perubahan API:**
- File: `src/app/api/bookings/[id]/formulir/route.ts`
- GET handler membaca query parameter `?preview=1`
- Jika `preview=1`: header `Content-Disposition: inline` (ditampilkan di browser)
- Jika tidak: header `Content-Disposition: attachment` (langsung download)

---

## 4. Struktur Halaman PDF Diperbarui

**Struktur sebelumnya (4 halaman terpisah):**
1. Formulir Peminjaman
2. Risiko dan Persetujuan
3. Invoice
4. Catatan Pembayaran + TTD

**Struktur baru (4 halaman):**
1. **Formulir Peminjaman** — Info peminjam + daftar alat/ruang yang dipinjam
2. **Risiko dan Persetujuan** — Pernyataan risiko + Tanda tangan Laboran & Pemohon
3. **Invoice + Catatan Pembayaran** — Rincian peminjaman + catatan VA (digabung jadi 1 halaman)
4. **Persetujuan dan Tanda Tangan** — Narasi persetujuan + TTD Admin USC & Pemohon (halaman khusus)

---

## 5. Pemisahan Tanda Tangan ke Halaman Khusus

**Masalah:** Tanda tangan di halaman 3 terpotong karena konten Invoice terlalu penuh.

**Perbaikan:**
- File: `src/lib/pdf-generator.ts`
- Tanda tangan di halaman Invoice dihapus, dipindahkan ke **halaman 4 terpisah**
- Halaman 4 berisi:
  - Header "PERSETUJUAN DAN TANDA TANGAN"
  - Narasi: *"Dengan menandatangani formulir ini, pemohon menyatakan telah membaca, memahami, dan menyetujui semua syarat dan ketentuan..."*
  - Kolom tanda tangan berdampingan: **Admin USC** (kiri) dan **Pemohon** (kanan)
  - Nama peminjam tertulis di bawah garis tanda tangan Pemohon

---

## 6. Catatan Pembayaran Dinamis Berdasarkan Jenis Item

**Logika baru:**
- File: `src/app/api/bookings/[id]/formulir/route.ts`
- Mengambil semua Virtual Account aktif dari `bank_accounts` dengan `payment_method_type = 'va'`
- Mendeteksi apakah booking memiliki item **ruang**, **alat**, atau **keduanya**
- Mengirim data `roomVA` dan `equipmentVA` secara terpisah ke generator PDF

**Tampilan catatan pembayaran di PDF:**
- Selalu menampilkan narasi instruksi m-banking:
  > *"Pembayaran dilakukan dengan m-banking melalui menu pembayaran Virtual Akun ke bank lain dan pilih Bank BTN."*
- Jika hanya sewa ruang → menampilkan detail VA Ruang
- Jika hanya sewa alat → menampilkan detail VA Alat
- Jika keduanya → menampilkan detail VA Ruang dan VA Alat

---

## 7. Format Detail Virtual Account di PDF

**Format yang digunakan (tabel rapi):**

```
Pembayaran Sewa Ruang:
  Bank              : BTN (Bank Tabungan Negara)
  No. Virtual Akun  : 942200220220400002
  Atas Nama         : Sewa Gedung Lab Dopping Unesa

Pembayaran Sewa Alat:
  Bank              : BTN (Bank Tabungan Negara)
  No. Virtual Akun  : 942200220220400001
  Atas Nama         : Laboratorium Anti Doping Unesa
```

---

## 8. Catatan Penting di Bawah Detail VA

**Konten:**
- Sertakan nomor referensi `[REFERENCE_NO]` pada keterangan transfer.
- Bukti Transfer dapat dikirim ke nomor Whatsapp: **+62 896-7704-2940 (Iqbal)**

---

## 9. Label Jenis Keanggotaan Diperbarui

**File:** `src/app/api/bookings/[id]/formulir/route.ts`

**Mapping baru:**

| Role di Database | Tampilan di PDF |
|---|---|
| `mahasiswa_s1` | Mahasiswa S1 |
| `mahasiswa_s2` | Mahasiswa Pasca Sarjana |
| `dosen` | Dosen/Karyawan |
| `staff` | Dosen/Karyawan |
| `mou_unesa` | Kerjasama |
| `umum` | Umum |
| `borrower` | Umum |
| *(role tidak dikenali)* | Umum |

---

## 10. Tanda Tangan Pemohon Menampilkan Nama

**File:** `src/lib/pdf-generator.ts`

- Di halaman 2 (Risiko & Persetujuan) dan halaman 4 (Persetujuan & Tanda Tangan), kolom tanda tangan **Pemohon** sekarang menampilkan nama peminjam di bawah garis tanda tangan.

---

## File yang Dimodifikasi

1. `src/app/api/bookings/[id]/formulir/route.ts`
2. `src/app/api/bookings/[id]/invoice/route.ts`
3. `src/app/api/bookings/[id]/invoice/simple/route.ts`
4. `src/app/(admin)/admin/bookings/BookingsList.tsx`
5. `src/lib/pdf-generator.ts`
6. `.env.local`

---

## Langkah Setelah Update

Restart dev server agar perubahan `.env.local` dan Next.js cache tersegar:

```bash
Ctrl + C
npm run dev
```
