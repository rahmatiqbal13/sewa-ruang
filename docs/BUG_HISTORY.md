# Riwayat Bug & Solusi — Sewa Ruang & Alat

> Dokumen ini mencatat bug yang pernah terjadi, penyebab, dan solusinya. Dirancang agar AI agent atau developer berikutnya tidak mengulang kesalahan yang sama.

---

## BUG-01 — RLS Recursive Policy pada Tabel `users` (Fatal 500)

**Gejala:** Halaman admin mengembalikan 500 Internal Server Error saat query data.

**Penyebab:** Policy RLS menggunakan subquery ke `public.users` di dalam `USING` clause — menyebabkan infinite recursion.

**Solusi:**
```sql
-- ❌ WRONG — recursive, langsung crash
CREATE POLICY "admin_all" ON public.users FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ✅ CORRECT — non-recursive
CREATE POLICY "users_select_authenticated" ON public.users FOR SELECT
  TO authenticated USING (true);
-- Operasi admin: gunakan service_role key (bypass RLS)
```

**Aturan permanen:** TIDAK PERNAH query `public.users` di dalam policy `users`. Selalu gunakan `auth.uid()` langsung.

---

## BUG-02 — Ambiguous FK ke `users` dari Tabel `bookings`

**Gejala:** Query PostgREST ke `bookings` dengan join `users(...)` mengembalikan 400 Bad Request.

**Penyebab:** Tabel `bookings` memiliki DUA foreign key ke `users`:
- `user_id` (peminjam)
- `payment_verified_by` (admin yang verifikasi)

PostgREST tidak tahu FK mana yang dipakai tanpa hint eksplisit.

**Solusi:**
```typescript
// ❌ WRONG — ambiguous, error 400
.select('*, users(name, email, phone)')

// ✅ CORRECT — explicit FK hint
.select('*, users!user_id(name, email, phone, telegram_username, institution)')
```

**Aturan permanen:** Selalu gunakan FK hint `!user_id` saat join `bookings` → `users`.

---

## BUG-03 — Kolom `payment_status` Tidak Ada di Tabel `bookings`

**Gejala:** Query error atau data tidak muncul di halaman payments.

**Penyebab:** Ada asumsi bahwa tabel `bookings` punya kolom `payment_status`, padahal tidak ada. Kolom yang ada hanya `status`.

**Solusi:**
```typescript
// ❌ WRONG
.select('status, payment_status, ...')

// ✅ CORRECT
.select('status, payment_code, ...')
```

---

## BUG-04 — Admin Page Gagal Load (500) karena RLS

**Gejala:** Halaman admin (list data) tidak muncul atau error 500.

**Penyebab:** Page server component menggunakan `createClient()` (anon key) sehingga RLS memblokir query.

**Solusi:**
```typescript
// ❌ WRONG — di page.tsx admin
import { createClient } from '@/lib/supabase/server'

// ✅ CORRECT — semua page.tsx di /admin/** harus pakai ini
import { createAdminClient } from '@/lib/supabase/server'
```

---

## BUG-05 — Image Cropping / Tidak Tampil

**Gejala:** Foto alat atau ruangan terpotong atau tidak tampil.

**Penyebab:**
1. Menggunakan `next/image` di Server Component context menyebabkan error
2. `object-cover` memotong gambar dengan proporsi berbeda

**Solusi:**
```typescript
// ❌ WRONG — pakai next/image langsung
import Image from 'next/image'
<Image src={url} fill ... />

// ✅ CORRECT — pakai SafeImage wrapper
import { SafeImage } from '@/components/shared/SafeImage'
<SafeImage src={url} ... className="object-contain" />  // contain bukan cover
```

---

## BUG-06 — URL Ruangan / Alat Menggunakan UUID (Tidak Readable)

**Gejala:** URL seperti `/equipment/123e4567-e89b-...` — susah dibaca dan dikirim.

**Penyebab:** Awalnya menggunakan UUID sebagai parameter URL.

**Solusi:** Gunakan slug (nama yang di-slugify) sebagai parameter URL:
```typescript
function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
// "Proyektor Sony" → "proyektor-sony"
// URL: /equipment/proyektor-sony
```

Di halaman detail, cari item berdasarkan slug:
```typescript
const { data: allItems } = await sb.from('equipment').select('id, name')
const matched = allItems?.find(r => createSlug(r.name) === slug)
if (!matched) notFound()
```

---

## BUG-07 — Room Dropdown di Form Menampilkan UUID

**Gejala:** Dropdown pilih ruangan di form admin menampilkan UUID alih-alih nama ruangan.

**Penyebab:** Komponen dropdown tidak memisahkan `value` (UUID) dengan `label` (nama).

**Solusi:** Buat Client Component `RoomSelect.tsx` yang mengambil `rooms` dari API dan render dengan nama ruangan sebagai label, UUID sebagai value.

---

## BUG-08 — Vercel Build Gagal (Turbopack `nft.json`)

**Gejala:** Build di Vercel gagal dengan error terkait Turbopack `nft.json`.

**Penyebab:** Bug di Next.js 16 Turbopack saat ada `middleware.ts`.

**Solusi:** Hapus `middleware.ts` dan pindahkan logika auth ke `src/proxy.ts` yang dipanggil secara manual dari komponen server.

---

## BUG-09 — Forgot Password Tidak Bisa Diakses (307 Redirect)

**Gejala:** User yang lupa password tidak bisa membuka halaman `/forgot-password` — redirect ke login.

**Penyebab:** `PUBLIC_ROUTES` di `src/proxy.ts` tidak menyertakan `/forgot-password` dan `/reset-password`.

**Solusi:**
```typescript
// src/proxy.ts
const PUBLIC_ROUTES = [
  '/', '/catalog', '/login', '/register',
  '/forgot-password', '/reset-password'  // ← tambahkan ini
]
```

**Status:** Belum diperbaiki per 2026-05-29.

---

## BUG-10 — Service Worker Gagal Registrasi

**Gejala:** 4 console error di setiap halaman tentang service worker gagal register.

**Penyebab (ganda):**
1. File `public/service-worker.js` terhapus dari repository
2. Middleware redirect `/service-worker.js` ke login

**Solusi:** Pulihkan file service worker ATAU hapus pemanggilan `registerServiceWorker()` dari `src/components/providers/PWAProvider.tsx`.

**Status:** Belum diperbaiki per 2026-05-29.

---

## Pola Berulang yang Perlu Diwaspadai

1. **Setiap query admin** → selalu `createAdminClient()`, bukan `createClient()`
2. **Setiap join bookings + users** → selalu pakai FK hint `!user_id`
3. **Setiap halaman auth publik** → pastikan masuk ke `PUBLIC_ROUTES`
4. **Setiap gambar** → pakai `SafeImage` dengan `object-contain`
5. **Setiap URL resource** → gunakan slug, bukan UUID
