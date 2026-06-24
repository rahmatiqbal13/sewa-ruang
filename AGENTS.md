# Konteks Sistem - Sewa Ruang & Alat

## Overview
Sistem manajemen penyewaan ruangan dan alat/peralatan untuk universitas. Sistem ini memiliki 2 entitas utama:

1. **Rooms (Ruangan)** - Ruangan fisik yang bisa disewa
2. **Equipment (Alat/Peralatan)** - Barang yang bisa disewakan terpisah dari ruangan

## Arsitektur

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Supabase
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: Supabase Auth

### Database Schema

#### Tabel Utama

**rooms**
- `id` (uuid, PK)
- `name` (text) - Nama ruangan
- `room_code` (text) - Kode ruangan (contoh: A101)
- `building_id` (uuid, FK)
- `capacity` (int)
- `floor` (int)
- `room_type` (text)
- `is_active` (boolean)
- `base_price` (int)
- `photo_url` (text)
- timestamps

**equipment** (sebelumnya: assets)
- `id` (uuid, PK)
- `name` (text) - Nama alat
- `equipment_code` (text) - Kode alat (tidak diubah setelah dibuat)
- `category` (text) - elektronik, mebel, transportasi, alat_tes_pengukuran, alat_gym, perlengkapan, lainnya
- `merk` (text)
- `description` (text)
- `current_condition` (text) - good, needs_repair, damaged, lost
- `ketersediaan` (text) - tersedia, digunakan, hilang
- `status_tindakan` (text) - normal, perawatan, menunggu_part, afkir
- `storage_room_id` (uuid, FK ke rooms)
- `current_location` (text)
- `sumber` (text) - sumber perolehan
- `is_active` (boolean)
- `photo_url` (text)
- timestamps

**equipment_rates**
- `equipment_id` (uuid, FK)
- `user_category` (text) - mahasiswa_s1, mahasiswa_s2, dosen, mou_unesa, umum
- `rate_per_day` (numeric)
- `rate_per_hour` (numeric, nullable)
- `requires_supervision` (boolean)
- PK: (equipment_id, user_category)

#### Tabel Relasi
- **buildings** - Gedung
- **room_inventory** - Inventaris per ruangan
- **bookings** - Pemesanan
- **booking_items** - Item dalam pemesanan (ruangan/alat)
- **users** - Pengguna dengan roles

### URL Structure

#### Admin Routes
- `/admin/dashboard` - Dashboard admin
- `/admin/buildings` - Manajemen gedung
- `/admin/rooms` - Manajemen ruangan
- `/admin/equipment` - Daftar alat (dengan filter & pagination)
- `/admin/equipment/new` - Tambah alat baru
- `/admin/equipment/[slug]/edit` - Edit alat (menggunakan nama alat sebagai slug)
- `/admin/inventory` - Inventaris ruangan
- `/admin/assets` - (deprecated, redirect ke equipment)

#### Public Routes
- `/catalog` - Katalog ruangan & alat
- `/rooms/[id]` - Detail ruangan
- `/login` - Login pengguna

### Komponen Penting

#### Shared Components
- `SafeImage.tsx` - Wrapper Client Component untuk img tag dengan error handling
- `ImageUpload.tsx` - Upload gambar dengan 3 mode: URL, File, Camera
- `PhotoUpload.tsx` - Upload foto untuk ruangan
- `ConditionBadge.tsx` - Badge kondisi barang

#### Equipment Components
- `EquipmentImageUpload.tsx` - Upload foto alat
- `EquipmentRatesForm.tsx` - Form tarif sewa per kategori pengguna
- `RoomSelect.tsx` - Client Component dropdown pemilihan ruangan (fix display UUID issue)

### Logic Penting

#### Slug Generation (URL-friendly names)
```typescript
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
// Contoh: "Proyektor Sony" → "proyektor-sony"
```

#### Equipment URL Pattern
- List: `/admin/equipment`
- Edit: `/admin/equipment/[slug]/edit` (menggunakan nama alat yang di-slugify)
- Contoh: `/admin/equipment/grip-strength/edit`

#### Image Handling
- Tidak menggunakan Next.js Image component untuk avoid Server Component issues
- Menggunakan standard `<img>` tag wrapped dalam SafeImage Client Component
- Object fit: `object-contain` (bukan `object-cover`) untuk menghindari cropping

#### Duplicate Name Handling
- Nama alat harus unik
- Jika duplicate terdeteksi, sistem otomatis menambahkan nomor: "Grip Strength (2)"

### State Management
- Server Actions untuk form submissions
- Server Components untuk data fetching
- Minimal client-side state

### Key Features

#### Equipment Management
- CRUD alat/peralatan
- Kategori: Elektronik, Mebel, Transportasi, Alat Tes Pengukuran, Alat Gym, Perlengkapan, Lainnya
- Status kondisi: Baik, Perlu Perbaikan, Rusak, Hilang
- Status ketersediaan: Tersedia, Digunakan, Hilang
- Status tindakan: Normal, Perawatan, Menunggu Part, Afkir
- Tarif per kategori pengguna (hari & jam)
- Supervisi flag per kategori
- Foto upload (URL/File/Camera)

#### Room Management
- CRUD ruangan
- Inventaris per ruangan
- Kapasitas & fasilitas
- Foto ruangan

#### Catalog (Public)
- Tampilan katalog ruangan & alat
- Filter & search
- Display pricing per category
- Availability status

### Development Notes

#### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)

#### Database Migration
- Migration scripts ada di folder `/scripts/`
- Schema v2 di `supabase/schema-v2.sql`

#### Important Constraints
- Equipment names must be unique (system auto-appends number for duplicates)
- Equipment codes are auto-generated and immutable
- Room codes are unique per building
- URLs use slugs (not IDs) for better readability

### RLS Policy Patterns (Critical)

#### Users Table - Non-Recursive Policies
**⚠️ NEVER create recursive policies on users table** - Policy that queries `public.users` inside USING clause causes infinite recursion → 500 error.

**Correct Pattern:**
```sql
-- SELECT: Allow all authenticated (for login role check)
CREATE POLICY "users_select_authenticated"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE/INSERT: Only own data
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Admin operations: Use service_role key (bypasses RLS)
-- Do NOT create "FOR ALL" policy with EXISTS subquery to users table
```

#### Admin Data Fetching Pattern
**All admin pages must use `createAdminClient` (service role)** to bypass RLS:

```typescript
// ❌ WRONG - Will fail with 500 if RLS blocks
import { createClient } from '@/lib/supabase/server'

// ✅ CORRECT - Bypasses RLS for admin data
import { createAdminClient as createClient } from '@/lib/supabase/server'
```

**Files affected:** All `page.tsx` in `src/app/(admin)/admin/**`

### Query Patterns

#### Bookings with User Data (Ambiguous FK Fix)
Table `bookings` has 2 FK to `users`: `user_id` and `payment_verified_by`

```typescript
// ❌ WRONG - Ambiguous which FK to use
.select(`..., users(name, email, ...)`)

// ✅ CORRECT - Explicit FK hint with !
.select(`..., users!user_id(name, email, phone, telegram_username, institution, class_division)`)
```

#### Payments Query
**Note:** Tabel `bookings` TIDAK punya kolom `payment_status` (itu type enum, bukan kolom). Gunakan `status` saja.

```typescript
// ❌ WRONG - Column doesn't exist
.select(`..., status, payment_status, ...`)

// ✅ CORRECT
.select(`..., status, payment_code, ...`)
```

### Known Issues & Solutions

1. **Image Upload Errors**: Solved by using SafeImage wrapper (Client Component) instead of Next.js Image
2. **Photo Cropping**: Fixed by using `object-contain` instead of `object-cover`
3. **URL Readability**: Changed from UUID to slug-based URLs
4. **Room Dropdown Display**: Shows room name only (not code) for better UX
5. **RLS 500 Error on Users Table**: Fixed by using non-recursive policies (see RLS Pattern above)
6. **Bookings Data Not Loading**: Fixed by adding FK hint `users!user_id(...)` to queries
7. **Payments Data Not Loading**: Fixed by removing non-existent `payment_status` column from queries
8. **Equipment Rates Not Loading on Edit**: Fixed by passing `equipment?.equipment_rates` to EquipmentRatesForm
9. **Landing Page Hardcoded Stats**: Removed fake "Kepuasan 0%" stat, now shows 3 real stats
10. **Nested Cards in Forms**: Flattened EquipmentForm from 4 nested cards to single wrapper with section dividers
11. **Catalog Filter Not Working**: Fixed real-time filtering, removed dead "Apply" button, added Active Filter Chips
12. **Database Category Standardization**: Added CHECK constraint for 7 valid equipment categories

### Next Steps / TODOs
- Implement booking flow for equipment
- Add equipment availability calendar
- Implement rental transactions
- Add reporting & analytics
- Generate Supabase TypeScript types (`npx supabase login` then `npx supabase gen types`)
