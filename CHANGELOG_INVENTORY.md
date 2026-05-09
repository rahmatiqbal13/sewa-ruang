# Changelog - Update Inventory Management

## 📅 Tanggal: 2025-01-09

## ✅ Fitur Baru

### 1. Halaman Inventory Utama
- **Tampilan Card & Table**: Toggle view seperti halaman Alat
- **Info Cards**: Menampilkan statistik Total Item, Baik, Perlu Perbaikan, Rusak
- **Filter Kondisi**: Tab filter dengan badge jumlah
- **Pagination**: Navigasi halaman (12 item per halaman)
- **Export/Import**: Fitur export ke Excel dan import dari Excel

### 2. Auto-Generate Kode Inventaris
- Format: `INV-XXXX` (contoh: INV-0001, INV-0002)
- Dibuat otomatis berdasarkan urutan terakhir di database
- Input **read-only** (tidak dapat diubah)

### 3. Edit dengan Pindah Lokasi
- Dialog edit lengkap dengan section "Lokasi"
- Dropdown Gedung & Ruangan terpisah
- Bisa memindahkan item ke ruangan lain
- Tampilan nama gedung & ruangan (bukan UUID)

### 4. Tampilan Card
- Photo item dengan placeholder
- Badge kondisi (Baik/Perlu Perbaikan/Rusak)
- Informasi lokasi: Nama Ruangan + Gedung
- Jumlah unit
- Tombol Edit & Menu Actions

### 5. Database Query
- Join manual rooms & buildings untuk performa lebih baik
- Menggunakan tabel `rooms` (bukan `assets` yang deprecated)

## 🐛 Bug Fixes
- ✅ Fixed: Dropdown lokasi menampilkan UUID
- ✅ Fixed: Ruangan tidak muncul saat pilih gedung
- ✅ Fixed: Lokasi tidak muncul di card
- ✅ Fixed: Kode inventaris bisa diubah

## 📁 File yang Diubah
- `src/app/(admin)/admin/inventory/page.tsx`
- `src/app/(admin)/admin/inventory/InventoryList.tsx`
- `src/app/(admin)/admin/inventory/InventoryForm.tsx`
- `src/app/(admin)/admin/inventory/[roomId]/EditInventoryItemDialog.tsx`
- `src/app/(admin)/admin/inventory/[roomId]/RoomInventoryList.tsx`
- `src/app/(admin)/admin/inventory/[roomId]/InventoryItemActions.tsx`
- `src/app/(admin)/admin/inventory/new/page.tsx`

## 🔄 RLS Policy (Database)
- Migration: `20250509_fix_inventory_rls_policies.sql`
- Fix RLS untuk tabel `room_inventory_items`

## 📋 Catatan
- Inventory items = barang di dalam ruangan (tidak untuk disewakan)
- Equipment/Alat = barang yang bisa disewakan
- Kode inventaris immutable (tidak bisa diubah setelah dibuat)
