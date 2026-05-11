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

---

## 9 Mei 2026

### 1. Fix Room Rates Loading Issue
**File**: `src/app/(admin)/admin/rooms/RoomForm.tsx`

**Masalah**: Tarif ruangan selalu menampilkan 0 setelah refresh halaman, meskipun data sudah tersimpan

**Solusi**:
- Query `room_rates` secara terpisah dari query rooms utama
- Merge data room_rates ke room data secara manual
- Gunakan `useEffect` dengan `reset()` dari react-hook-form untuk mengisi form setelah data tersedia
- Fix Zod schema untuk rates dengan struktur eksplisit per kategori

**Hasil**: Tarif ruangan sekarang tampil dengan benar (50K, 500K, 100K, 1.5M)

---

### 2. Admin Booking Form - Member Type & Dynamic Rates
**File**: `src/app/(admin)/admin/bookings/AdminBookingForm.tsx`

**Fitur Baru**:
- Field **Jenis Member** dengan opsi:
  - Mahasiswa Sarjana (S1)
  - Mahasiswa Pasca Sarjana (S2/S3)
  - Dosen/Karyawan
  - Umum
  - Kerjasama/MoU
- **Tarif Dinamis** berdasarkan jenis member:
  - Equipment: `mahasiswa_s1`, `mahasiswa_s2`, `dosen`, `umum`, `mou_unesa`
  - Rooms: `mahasiswa`, `pascasarjana`, `dosen`, `umum`, `kerjasama`
- Search functionality untuk rooms dan equipment
- Display foto dan detail item saat dipilih
- Perhitungan total otomatis berdasarkan tarif member

---

### 3. Fix Select Label & UUID Display
**File**: `src/app/(admin)/admin/bookings/AdminBookingForm.tsx`

**Perbaikan**:
- Label tipe item: "Ruang" dan "Alat" (bukan "room", "equipment")
- Fix Select trigger menampilkan nama item + kode (bukan UUID)
- Contoh: "Aula Lt.1 (A101)" bukan "c4b347a9-38df-46ce..."

---

### 4. Early Return Functionality
**Files**:
- `src/app/(admin)/admin/returns/[id]/CompleteReturnForm.tsx` (baru)
- `src/app/(admin)/admin/returns/page.tsx` (update)
- `src/app/(admin)/admin/returns/[id]/page.tsx` (update)

**Fitur**:
- Tombol "Pengembalian Lebih Cepat" untuk booking yang masih aktif
- **Perhitungan refund otomatis** berdasarkan waktu tidak terpakai
- Formula: `(Waktu tidak terpakai / Total waktu) × Total tagihan`
- Pencatatan kondisi aset saat pengembalian (Baik/Rusak Ringan/Rusak Berat/Hilang)
- Upload foto kondisi aset
- Integrasi dengan tabel `booking_early_returns`

**Migration**: `20250509_add_early_returns_table.sql`
- Tabel `booking_early_returns` untuk tracking pengembalian cepat
- Kolom `actual_end_datetime` di tabel `bookings`
- Kolom `is_early_return` dan `refund_amount` di tabel `returns`

---

### 5. Integrasi Bookings - Payments - Returns Workflow

#### Bookings Page (`/admin/bookings/[id]/page.tsx`)
- Hanya untuk **Approve/Reject** pengajuan
- Setelah disetujui, booking muncul di menu Payments dan Returns
- Link "Catat Pengembalian" mengarah ke Returns page
- **Invoice & Rincian Harga** di detail booking:
  - Durasi peminjaman (hari & jam)
  - Harga per item dengan unit price
  - Subtotal, pembayaran, dan sisa tagihan

#### Payments Page (`/admin/payments/page.tsx`)
- Menampilkan semua booking status `approved` (menunggu bayar)
- Tombol "Catat Pembayaran" dengan upload bukti transfer
- Setelah pembayaran tercatat, status booking → `paid`
- Riwayat pembayaran lengkap

#### Returns Page (`/admin/returns/page.tsx`)
- Menampilkan semua booking status `approved` atau `paid`
- **Tiga kategori**:
  - Disetujui - Menunggu Pembayaran (bisa bayar langsung)
  - Lunas - Aktif (siap diproses pengembalian)
  - Lewat Jadwal (highlight merah)
- **Stats Dashboard**:
  - Menunggu Pengembalian
  - Disetujui (Belum Bayar)
  - Lunas (Aktif)
  - Selesai Hari Ini

**Alur Kerja**:
```
Bookings (Approve/Reject) → Payments (Bayar) → Returns (Proses Kembali)
```

---

### 6. Super Admin CRUD Permissions
**Super Admin** sekarang dapat **menambah, mengedit, dan menghapus** data:

#### Gedung (Buildings)
- **Tambah**: Tombol "Tambah Gedung"
- **Edit**: Menu dropdown "Edit Gedung"
- **Hapus**: Menu dropdown "Hapus Gedung" (Super Admin only)
  - Validasi: Gedung hanya bisa dihapus jika tidak memiliki ruangan

#### Ruangan (Rooms)
- **Tambah**: Tombol "Tambah Ruangan"
- **Edit**: Tombol "Edit" di detail ruangan
- **Hapus**: Tombol "Hapus" di detail ruangan (Super Admin only)
  - Validasi: Ruangan hanya bisa dihapus jika tidak memiliki riwayat peminjaman

#### Alat/Equipment
- **Tambah**: Tombol "Tambah Alat"
- **Edit**: Tombol "Edit" di list/grid view
- **Hapus**: Tombol "Hapus Alat" di dropdown menu (Super Admin only)
  - Validasi: Alat hanya bisa dihapus jika status nonaktif & tidak ada riwayat peminjaman
  - Otomatis menghapus tarif dan foto terkait

#### Pengguna (Users)
- **Tambah**: Dialog "Tambah Pengguna"
- **Edit**: Dialog "Edit Pengguna"
- **Hapus**: Tombol "Hapus"
- **Ganti Role**: Dropdown ganti role
- **Reset Password**: Tombol reset password

**Badge**: Super Admin badge ditampilkan di header setiap halaman manajemen

---

### 7. Database Migrations

#### `20250509_add_booking_columns.sql`
- Kolom untuk admin booking form:
  - `borrower_name`, `borrower_email`, `borrower_phone`
  - `borrower_institution`, `borrower_class`, `member_type`
  - `created_by_admin`

#### `20250509_add_early_returns_table.sql`
- Tabel `booking_early_returns`
- Kolom `actual_end_datetime` di `bookings`
- Kolom `is_early_return` dan `refund_amount` di `returns`
- RLS policies untuk early returns

#### `20250509_update_returns_workflow.sql`
- Update struktur returns table
- Policies untuk admin access

#### `20250509_fix_returns_columns.sql`
- Fix missing columns di returns table
- Alter table untuk menambahkan kolom yang diperlukan

---

### Files Baru Hari Ini:
1. `src/app/(admin)/admin/bookings/AdminBookingForm.tsx` - Form peminjaman admin
2. `src/app/(admin)/admin/returns/[id]/CompleteReturnForm.tsx` - Form pengembalian
3. `src/app/(admin)/admin/buildings/DeleteBuildingButton.tsx` - Hapus gedung
4. `src/app/(admin)/admin/rooms/DeleteRoomButton.tsx` - Hapus ruangan
5. `src/app/(admin)/admin/equipment/DeleteEquipmentButton.tsx` - Hapus alat
6. `supabase/migrations/20250509_*.sql` - Multiple migration files

### Files Modified:
1. `src/app/(admin)/admin/rooms/RoomForm.tsx` - Fix rates loading
2. `src/app/(admin)/admin/rooms/[id]/edit/page.tsx` - Query rates terpisah
3. `src/app/(admin)/admin/bookings/[id]/page.tsx` - Invoice & price breakdown
4. `src/app/(admin)/admin/returns/page.tsx` - Workflow integration
5. `src/app/(admin)/admin/buildings/page.tsx` - Super admin delete
6. `src/app/(admin)/admin/buildings/BuildingActions.tsx` - Delete button support
7. `src/app/(admin)/admin/equipment/page.tsx` & `EquipmentList.tsx` - Super admin

### Bug Fixes:
1. ✅ Duplicate Link import error
2. ✅ CompleteReturnForm file location
3. ✅ Missing columns in returns table (`recorded_by`, `is_early_return`)
4. ✅ Room rates showing 0 after refresh
5. ✅ Zod schema validation for rates

### Status Build: ✅ Sukses

---

## 11 Mei 2026

### 1. Fix TypeScript Build Errors - Vercel Deployment
**Files Modified**: Multiple files across the codebase

**Masalah**: Build gagal di Vercel karena banyak error TypeScript terkait Supabase types

**Error Pattern**:
- `Property 'X' does not exist on type 'never'`
- `No overload matches this call` untuk Supabase insert/update
- `Type 'boolean | null' is not assignable to type 'boolean'`
- Interface conflicts (e.g., `Building[]` is not assignable to `Building[]`)

**Solusi**:

#### Supabase Type Assertions
```typescript
// Sebelum (error):
const { data } = await supabase.from('bookings').update({...})

// Sesudah (fixed):
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data } = await (supabase.from('bookings') as any).update({...})
```

#### Zod Resolver Type Fix
```typescript
// Sebelum:
resolver: zodResolver(schema)

// Sesudah:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
resolver: zodResolver(schema) as any
```

#### Select Handler Null Fix
```typescript
// Sebelum:
onValueChange={(v) => setValue('field', v)}

// Sesudah:
onValueChange={(v) => setValue('field', v || '')}
```

#### Files Yang Diperbaiki:
1. `AdminBookingForm.tsx` - Zod schema, Supabase queries, Select handlers
2. `EarlyReturnButton.tsx` - Supabase insert/update type assertions
3. `ApprovalButtons.tsx` - Supabase update queries
4. `BookingQuickActions.tsx` - Status change queries
5. `CancelBookingButton.tsx` - Cancel booking query
6. `BuildingActions.tsx` - Toggle active status
7. `DeleteBuildingButton.tsx` - AlertDialogTrigger fix
8. `DeleteEquipmentButton.tsx` - AlertDialogTrigger fix
9. `DeleteRoomButton.tsx` - AlertDialogTrigger fix
10. `buildings/page.tsx` - Super admin check query
11. `equipment/page.tsx` - Super admin check query
12. `qr/page.tsx` & `qr/batch/page.tsx` - Data queries
13. `rooms/RoomForm.tsx` - Rates handling, setValue paths
14. `rooms/RoomsPageClient.tsx` - Building interface, Checkbox value
15. `rooms/RoomFilters.tsx` - Building interface
16. `rooms/importRooms.ts` - ImportResult type
17. `inventory/importInventory.ts` - ImportResult type
18. `inventory/InventoryList.tsx` - ImportResult type
19. `inventory/EditInventoryItemDialog.tsx` - Building map, Select handlers
20. `inventory/InventoryItemActions.tsx` - Item interface
21. `inventory/RoomInventoryList.tsx` - InventoryItem interface
22. `returns/[id]/CompleteReturnForm.tsx` - Supabase queries, Select handlers
23. `payments/RecordPaymentButton.tsx` - paidAmount prop
24. `api/notifications/send/route.ts` - User data queries
25. `api/notifications/send-email/route.ts` - User data queries
26. `auth/forgot-password/actions.ts` - User data query

---

### 2. Fix Delete All Equipment - Foreign Key Constraint
**File**: `src/app/(admin)/admin/equipment/importEquipment.ts`

**Masalah**: Tidak bisa menghapus semua data alat karena foreign key constraint

**Error**:
```
update or delete on table "equipment" violates foreign key constraint
"booking_items_equipment_id_fkey" on table "booking_items"
```

**Solusi**: Urutan penghapusan yang benar dengan service role client

```typescript
// 1. Delete equipment_booking_slots (foreign key: equipment_id)
await serviceSb.from('equipment_booking_slots').delete().gte('created_at', '1970-01-01')

// 2. Delete booking_items dengan item_type = 'equipment'
await serviceSb.from('booking_items').delete().eq('item_type', 'equipment').gte('created_at', '1970-01-01')

// 3. Try delete booking_waitlists (if column exists)
await serviceSb.from('booking_waitlists').delete().not('equipment_id', 'is', null)

// 4. Delete equipment_rates (foreign key: equipment_id)
await serviceSb.from('equipment_rates').delete().gte('created_at', '1970-01-01')

// 5. Finally delete all equipment
await serviceSb.from('equipment').delete().gte('created_at', '1970-01-01')
```

**Tables dengan ON DELETE CASCADE** (auto-delete):
- `equipment_images` - Hapus otomatis saat equipment dihapus
- `equipment_schedule_blocks` - Hapus otomatis saat equipment dihapus

---

### 3. Fix AlertDialogTrigger - asChild Property
**Files**:
- `DeleteBuildingButton.tsx`
- `DeleteEquipmentButton.tsx`
- `DeleteRoomButton.tsx`

**Masalah**: Property `asChild` tidak didukung oleh versi shadcn/ui AlertDialogTrigger

**Error**:
```
Type '{ children: Element; asChild: true; }' is not assignable to type 'IntrinsicAttributes & Props<unknown>'.
Property 'asChild' does not exist on type 'IntrinsicAttributes & Props<unknown>'.
```

**Solusi**: Hapus prop `asChild` dan gunakan struktur yang lebih sederhana

```tsx
// Sebelum:
<AlertDialogTrigger asChild>
  <DropdownMenuItem>...</DropdownMenuItem>
</AlertDialogTrigger>

// Sesudah:
<AlertDialogTrigger>
  <div className="...">
    ...
  </div>
</AlertDialogTrigger>
```

---

### 4. Fix ImportResult Interface
**Files**:
- `importInventory.ts`
- `importRooms.ts`
- `InventoryList.tsx`

**Masalah**: Property `importedIds` missing dalam return object

**Error**:
```
Property 'importedIds' is missing in type '{...}' but required in type 'ImportResult'
```

**Solusi**: Tambahkan `importedIds: []` ke semua return statements

```typescript
return {
  success: false,
  message: 'File tidak ditemukan',
  totalRows: 0,
  successCount: 0,
  errorCount: 1,
  importedIds: [],  // ← Ditambahkan
  errors: [{ row: 0, message: 'File tidak ditemukan' }]
}
```

---

### 5. Fix Interface Conflicts
**Files**:
- `RoomsPageClient.tsx`
- `RoomFilters.tsx`

**Masalah**: Dua interface `Building` yang berbeda-beda

**Solusi**: Sinkronisasi interface dengan membuat `floor_count` optional

```typescript
// RoomsPageClient.tsx & RoomFilters.tsx
interface Building {
  id: string
  name: string
  code: string
  floor_count?: number  // ← Ditambahkan optional
}
```

---

### 6. Fix Checkbox Checked Value
**File**: `RoomsPageClient.tsx`

**Masalah**: `boolean | null` not assignable to `boolean | undefined`

**Solusi**: Cast ke boolean

```typescript
// Sebelum:
const isAllSelected = rooms && rooms.length > 0 && selectedIds.length === rooms.length

// Sesudah:
const isAllSelected = !!rooms && rooms.length > 0 && selectedIds.length === rooms.length
```

---

### Summary Perubahan
| Kategori | Jumlah Files |
|----------|--------------|
| Supabase Type Assertions | 15+ files |
| Select/Form Handlers | 5 files |
| Interface Fixes | 3 files |
| Component Props | 2 files |
| Import/Export | 3 files |

### Status Build: ✅ Sukses (Vercel Ready)
