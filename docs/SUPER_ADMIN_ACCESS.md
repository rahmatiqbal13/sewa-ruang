# Super Admin Full Access Implementation

## Overview
Super Admin (`super_admin`) sekarang memiliki akses penuh (CRUD) ke **SEMUA** halaman dan fitur dalam sistem.

## Akses Berdasarkan Role

### Super Admin (super_admin)
✅ **Akses Penuh ke Semua Modul:**
- Dashboard
- Buildings (Gedung) - CRUD
- Rooms (Ruangan) - CRUD  
- Equipment/Alat - CRUD
- Inventory (Inventaris) - CRUD
- Bookings (Pengajuan) - CRUD + Approve/Reject
- Payments (Pembayaran) - CRUD + Refund
- Returns (Pengembalian) - CRUD
- QR Code - Generate & Manage
- Reports (Laporan) - View & Export
- Notifications (Notifikasi) - Manage
- Settings (Pengaturan) - Edit
- **User Management (Pengguna)** - CRUD + Change Role
- **Database Management** - View Only (placeholder)
- **System Logs** - View Only (placeholder)
- **Trash/Recycle Bin** - Restore & Hard Delete (placeholder)

### Admin (admin)
✅ **Akses Terbatas:**
- Dashboard
- Buildings - CRUD
- Rooms - CRUD
- Equipment - CRUD
- Inventory - View & Manage
- Bookings - CRUD + Approve/Reject
- Payments - View & Manage
- Returns - View & Manage
- QR Code - Generate
- Reports - View & Export
- Notifications - View & Manage
- Settings - View & Edit

❌ **Tidak Bisa Akses:**
- User Management (hanya Super Admin)
- Database Management
- System Logs
- Trash/Recycle Bin

### Staff (staff)
✅ **Akses Read-Only + Limited Write:**
- Dashboard (View only)
- Buildings (View only)
- Rooms (View only)
- Equipment (View only)
- Inventory (View only)
- Bookings (View + Create)
- Returns (View + Manage)
- QR Code (View only)
- Reports (View only)

❌ **Tidak Bisa Akses:**
- Payments
- Notifications
- Settings
- User Management
- Semua Super Admin menu

## Menu Navigation

### Main Menu (Semua Role Admin)
1. Dashboard
2. Gedung
3. Ruangan
4. Alat
5. Inventaris
6. Pengajuan
7. Pembayaran
8. Pengembalian
9. QR Code
10. Laporan
11. Notifikasi
12. Pengaturan

### Super Admin Menu (Khusus Super Admin)
1. **Kelola Pengguna** (`/admin/users`)
   - Lihat semua user
   - Tambah user
   - Edit user
   - Hapus user
   - Reset password
   - Ganti role

2. **Database** (`/admin/database`)
   - Statistik database
   - Placeholder untuk backup/restore

3. **System Logs** (`/admin/logs`)
   - Monitoring aktivitas
   - Placeholder untuk audit trail

4. **Trash/Recycle** (`/admin/trash`)
   - Lihat data yang dihapus
   - Restore data
   - Hard delete permanen

## Permission Utility

File: `src/lib/permissions.ts`

```typescript
// Check permission
hasPermission(role, 'users.create') // boolean
hasAnyPermission(role, ['users.create', 'users.edit']) // boolean
hasAllPermissions(role, ['users.create', 'users.edit']) // boolean

// Check role
isSuperAdmin(role) // boolean
isAdmin(role) // boolean
canAccessAdmin(role) // boolean

// Get info
getRoleLabel(role) // string
getRoleColor(role) // string (Tailwind classes)
```

## Protected Pages

Semua halaman berikut dilindungi dan memeriksa role:

| Halaman | Super Admin | Admin | Staff |
|---------|------------|-------|-------|
| /admin/users | ✅ | ❌ | ❌ |
| /admin/database | ✅ | ❌ | ❌ |
| /admin/logs | ✅ | ❌ | ❌ |
| /admin/trash | ✅ | ❌ | ❌ |

## Implementation Details

### 1. Layout Protection
File: `src/app/(admin)/layout.tsx`
- Memeriksa role saat load
- Redirect ke `/dashboard` jika bukan admin/staff

### 2. Page Protection
Contoh: `src/app/(admin)/admin/users/page.tsx`
```typescript
if (!isSuperAdmin(currentProfile?.role)) {
  redirect('/admin/dashboard')
}
```

### 3. Sidebar Navigation
File: `src/components/layouts/AdminSidebar.tsx`
- Menu Super Admin ditampilkan dengan section khusus
- Badge purple "Super Admin" di header section
- Icon ShieldCheck untuk menandai menu khusus

### 4. API Protection
File: `src/lib/auth-check.ts`
```typescript
const result = await requireSuperAdmin()
if (result.error) {
  return NextResponse.json({ error: result.error }, { status: 403 })
}
```

## Visual Indicator

Super Admin memiliki visual indicator di sidebar:
- **Badge Role**: Purple badge dengan tulisan "Super Administrator"
- **Menu Separator**: Garis dengan label "Super Admin" berwarna purple
- **Menu Icons**: Icon ShieldCheck kecil di menu khusus Super Admin

## Future Enhancements

Modul placeholder yang bisa dikembangkan:

1. **Database Management**
   - Backup otomatis
   - Restore database
   - Query executor (read-only)
   - Performance monitoring

2. **System Logs**
   - Audit trail lengkap
   - Filter by date/user/action
   - Export logs
   - Real-time monitoring

3. **Trash/Recycle Bin**
   - Soft delete untuk semua entity
   - Restore dengan satu klik
   - Auto cleanup setelah X hari
   - Preview data sebelum restore

## Testing

1. Login sebagai `super_admin`
   - Pastikan semua menu tampil
   - Pastikan bisa akses `/admin/users`
   - Pastikan bisa akses `/admin/database`

2. Login sebagai `admin`
   - Pastikan menu Super Admin tidak tampil
   - Coba akses `/admin/users` → redirect ke dashboard

3. Login sebagai `staff`
   - Pastikan hanya menu terbatas yang tampil
   - Tidak bisa akses payment/notifications/settings
