# History Perubahan - Sewa Ruang System

## 6 Mei 2026

### Perubahan Struktur URL Equipment
**File**: `src/app/(admin)/admin/equipment/[slug]/edit/page.tsx` (baru)

**Sebelum**:
- URL menggunakan UUID: `/admin/equipment/abc-123-xyz/edit`
- Folder: `[id]/edit/page.tsx`

**Sesudah**:
- URL menggunakan nama alat (slug): `/admin/equipment/proyektor-sony/edit`
- Folder: `[slug]/edit/page.tsx`
- Ditambahkan fungsi `createSlug()` untuk konversi nama ke URL-friendly format
- Ditambahkan fungsi `slugMatchesEquipment()` untuk matching slug dengan nama alat

**Alasan**: URL lebih readable dan user-friendly

---

### Perbaikan Dropdown Ruangan
**File**: `src/app/(admin)/admin/equipment/[slug]/edit/page.tsx`

**Sebelum**:
```tsx
<SelectItem key={room.id} value={room.id}>
  {room.name} ({room.room_code})
</SelectItem>
```
Menampilkan: "Ruang Meeting A (A101)"

**Sesudah**:
```tsx
<SelectItem key={room.id} value={room.id}>
  {room.name}
</SelectItem>
```
Menampilkan: "Ruang Meeting A"

**Alasan**: Menghilangkan kode ruangan yang membingungkan di dropdown

---

### Perbaikan Image/Photo Components
**File**: 
- `src/components/shared/SafeImage.tsx` (baru)
- `src/components/shared/ImageUpload.tsx` (modifikasi)
- `src/components/shared/PhotoUpload.tsx` (modifikasi)

**Masalah**: Next.js Image component menyebabkan error di Server Components

**Solusi**:
- Membuat SafeImage Client Component wrapper untuk `<img>` tag
- Menambahkan error handling dengan fallback
- Mengubah dari Next.js Image ke standard img tag

**Hasil**: Image upload dan display bekerja tanpa error

---

### Perbaikan Photo Display
**File**: Multiple files menggunakan SafeImage

**Sebelum**:
```tsx
className="object-cover"
```

**Sesudah**:
```tsx
className="object-contain"
```

**Alasan**: Mencegah cropping foto, menampilkan foto secara utuh

---

### Update Catalog Page
**File**: `src/app/catalog/page.tsx`

**Perubahan**:
- Query dari tabel `rooms` dan `equipment` (bukan `assets` yang lama)
- Menambahkan display pricing per kategori pengguna
- Update UI untuk menampilkan tarif sewa

---

### Pembuatan EquipmentRatesForm Component
**File**: `src/app/(admin)/admin/equipment/EquipmentRatesForm.tsx` (baru)

**Fitur**:
- Form untuk mengatur tarif sewa per kategori pengguna:
  - Mahasiswa S1
  - Mahasiswa S2
  - Dosen
  - MOU Unesa
  - Umum
- Input rate per hari dan per jam
- Checkbox untuk supervisi requirement
- Support create dan update rates

---

### Integrasi Tarif Sewa di Equipment Edit
**File**: `src/app/(admin)/admin/equipment/[slug]/edit/page.tsx`

**Penambahan**:
- Section "Tarif Sewa per Kategori" di form edit
- Integrasi dengan EquipmentRatesForm
- Server action untuk upsert/delete rates
- Redirect ke URL baru jika nama alat berubah

---

### Update Equipment List Page
**File**: `src/app/(admin)/admin/equipment/page.tsx`

**Penambahan**:
- Link menggunakan slug: `/admin/equipment/${slug}/edit`
- Display lowest rate untuk setiap alat
- Badge "Perlu Supervisi" jika ada kategori yang memerlukan supervisi
- Warning untuk nama alat yang duplicate
- Filter per kategori

---

### Struktur Folder Baru
```
src/app/(admin)/admin/equipment/
├── page.tsx                    # List equipment
├── new/page.tsx               # Add new equipment
├── [slug]/edit/page.tsx       # Edit equipment (NEW - replaces [id])
├── EquipmentImageUpload.tsx   # Image upload component
└── EquipmentRatesForm.tsx     # Rates form component
```

Folder lama `[id]/edit/page.tsx` dihapus.

---

## Ringkasan Perubahan

### Files Created
1. `src/app/(admin)/admin/equipment/[slug]/edit/page.tsx` - Edit page dengan slug URL
2. `src/components/shared/SafeImage.tsx` - Safe image wrapper
3. `src/app/(admin)/admin/equipment/EquipmentRatesForm.tsx` - Rates management form

### Files Modified
1. `src/components/shared/ImageUpload.tsx` - Fixed image handling
2. `src/components/shared/PhotoUpload.tsx` - Fixed photo handling
3. `src/app/catalog/page.tsx` - Updated to use new tables
4. `src/app/(admin)/admin/equipment/page.tsx` - Updated links to use slug

### Files Deleted
1. `src/app/(admin)/admin/equipment/[id]/edit/page.tsx` - Replaced by [slug] version

### Database
- Menggunakan tabel `equipment` dan `equipment_rates` (schema v2)
- Tabel `assets` deprecated (data dimigrasi)

### URL Changes
| Sebelum | Sesudah |
|---------|---------|
| `/admin/equipment/abc-123/edit` | `/admin/equipment/proyektor-sony/edit` |
| `/admin/assets` | `/admin/equipment` |

---

## Status
✅ URL menggunakan nama alat (slug)
✅ Dropdown ruangan menampilkan nama (bukan code)
✅ Image upload berfungsi tanpa error
✅ Photo display tanpa cropping
✅ Tarif sewa per kategori berfungsi
✅ Catalog page updated dengan pricing

## Next Steps (Untuk Sesi Berikutnya)
- Testing end-to-end equipment flow
- Implementasi booking equipment
- Integrasi dengan sistem booking ruangan
- Testing URL slug matching untuk edge cases (nama dengan special characters)

---

### Perbaikan Dropdown Ruangan (RoomSelect Client Component)
**File**: 
- `src/app/(admin)/admin/equipment/RoomSelect.tsx` (baru)
- `src/app/(admin)/admin/equipment/[slug]/edit/page.tsx` (modifikasi)

**Masalah**: Setelah memilih ruangan dari dropdown, yang ditampilkan adalah UUID (id) ruangan, bukan nama ruangan.

**Solusi**: Membuat Client Component `RoomSelect` untuk mengatasi masalah display value pada Select component.

**Perubahan**:
- Membuat RoomSelect.tsx sebagai Client Component dengan 'use client'
- RoomSelect menerima props rooms, defaultValue, dan name
- Menampilkan nama ruangan yang dipilih di SelectValue
- Menambahkan opsi "-- Tidak ada --" untuk value kosong
- Update edit page untuk menggunakan RoomSelect component

---

## 7 Mei 2026

### 1. Fix Dropdown Display (UUID → Nama)
**Files**:
- `src/app/(admin)/admin/rooms/RoomForm.tsx`
- `src/app/(admin)/admin/inventory/InventoryForm.tsx`
- `src/app/(admin)/admin/equipment/EquipmentForm.tsx`

**Perubahan**:
- Building dropdown: tampil "Nama Gedung (Kode)" bukan UUID
- Floor dropdown: tampil "Lantai X" bukan angka saja
- Room dropdown: tampil "Gedung → Ruangan (Kode)" bukan UUID
- Category, Condition, Ketersediaan, Status: tampil label bukan code

---

### 2. Halaman Detail Alat Baru (`/admin/equipment/[slug]`)
**File**: `src/app/(admin)/admin/equipment/[slug]/page.tsx` (baru)

**Fitur**:
- Layout modern 3 kolom (foto, status, lokasi)
- Status ketersediaan real-time dengan indikator visual
- Jadwal penggunaan (booking aktif & mendatang)
- Riwayat penggunaan (5 booking terakhir)
- Info booking lengkap: kode, peminjam, tujuan, waktu

---

### 3. QR Code Generator
**File**: `src/app/(admin)/admin/equipment/EquipmentQRCode.tsx` (baru)

**Fitur**:
- Generate QR code otomatis saat dialog dibuka
- URL scan: `/assets/{equipmentId}/scan`
- Download QR code sebagai PNG
- Print QR code dengan informasi alat

---

### 4. Filter & Pencarian Alat
**File**: `src/app/(admin)/admin/equipment/EquipmentFilters.tsx` (baru)

**Fitur**:
- Search bar dengan icon
- Filter: Status Ketersediaan, Kategori, Kondisi
- URL-based filtering (bisa di-share)
- Reset filter button

---

### 5. Perbaikan Label Kondisi
**Files**: `ConditionBadge.tsx`, `InventoryForm.tsx`, `assets/page.tsx`, `inventory/page.tsx`

**Perubahan**:
- `needs_repair`: "Rusak Ringan" → "Perlu Perbaikan"
- `damaged`: "Rusak Berat" → "Rusak"

---

### 6. Optimasi Tampilan Edit Alat
**File**: `src/app/(admin)/admin/equipment/[slug]/edit/page.tsx`

**Yang dihapus**:
- Daftar 200+ nama alat yang terlalu ramai
- Chips nama alat yang memenuhi halaman

**Yang ditambahkan**:
- Layout terorganisir dengan Card
- Compact warning (hanya jumlah alat)
- Collapsible tarif per kategori dengan toggle switch
- Stats ringkas (Aktif: X/5, Terendah, Tertinggi)

---

### 7. Form Alat - Gedung, Lantai, Ruangan (Opsional)
**Migration**: `20250507_add_building_floor_to_equipment.sql`

**Database**:
- Tambah kolom `building_id` (UUID → buildings)
- Tambah kolom `floor` (INTEGER)
- Index untuk performance

**Form**:
- Dropdown Gedung (opsional) - "Belum ada gedung"
- Dropdown Lantai (opsional) - dinamis berdasarkan floor_count
- Dropdown Ruangan (opsional) - bisa filter by gedung & lantai
- Keterangan Lokasi Tambahan (opsional)

**Halaman Detail**:
- Tampil hierarki: Gedung → Lantai → Ruangan → Keterangan

---

### 8. Sistem Auto Kode Alat (ALT-XXXX)
**Migration**: `20250507_auto_generate_equipment_codes.sql`

**Fitur**:
- Format: `ALT-0001`, `ALT-0002`, dst (sequential)
- Trigger otomatis saat insert: `generate_equipment_code()`
- Backfill data lama yang kosong
- Generate kode saat edit jika belum ada

**Form**:
- Tambah Alat: Kode muncul otomatis (read-only)
- Edit Alat (tanpa kode): Field kode berwarna amber, pesan "Akan dibuat otomatis"

---

### 9. Fix Controlled/Uncontrolled Select Error
**File**: `src/app/(admin)/admin/equipment/EquipmentForm.tsx`

**Perubahan**:
- Semua defaultValues terdefinisi (tidak undefined)
- `building_id: ''`, `floor: 0`, `storage_room_id: ''`
- Select value selalu string: `watch('field') || ''`
- setValue menggunakan empty string bukan undefined

---

### 10. Fix Schema SQL - Dependency Error
**File**: `supabase/schema-v2.sql`

**Masalah**: `DROP FUNCTION get_user_role()` error karena masih dipakai policy

**Solusi**:
- Drop policies yang menggunakan function SEBELUM drop function
- Urutan: Drop policies → Drop functions → Recreate functions → Recreate policies

---

### Files Baru Hari Ini:
1. `src/app/(admin)/admin/equipment/[slug]/page.tsx` - Detail alat
2. `src/app/(admin)/admin/equipment/EquipmentQRCode.tsx` - QR generator
3. `src/app/(admin)/admin/equipment/EquipmentFilters.tsx` - Filter component
4. `supabase/migrations/20250507_add_building_floor_to_equipment.sql`
5. `supabase/migrations/20250507_auto_generate_equipment_codes.sql`
6. `supabase/migrations/20250507_fix_get_user_role_function.sql`

### Status Build: ✅ Sukses
