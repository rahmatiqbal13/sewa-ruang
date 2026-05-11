// Role-based access control utilities

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'borrower'

// Permission matrix
const PERMISSIONS: Record<string, UserRole[]> = {
  // Admin area access
  'admin.access': ['super_admin', 'admin', 'staff'],
  
  // Full CRUD operations (super_admin only)
  'super_admin.full_access': ['super_admin'],
  
  // User management
  'users.view': ['super_admin', 'admin'],
  'users.create': ['super_admin', 'admin'],
  'users.edit': ['super_admin', 'admin'],
  'users.delete': ['super_admin'],
  'users.manage_roles': ['super_admin'],
  
  // Buildings
  'buildings.view': ['super_admin', 'admin', 'staff'],
  'buildings.create': ['super_admin', 'admin'],
  'buildings.edit': ['super_admin', 'admin'],
  'buildings.delete': ['super_admin'],
  
  // Rooms
  'rooms.view': ['super_admin', 'admin', 'staff'],
  'rooms.create': ['super_admin', 'admin'],
  'rooms.edit': ['super_admin', 'admin'],
  'rooms.delete': ['super_admin'],
  
  // Equipment/Assets
  'equipment.view': ['super_admin', 'admin', 'staff'],
  'equipment.create': ['super_admin', 'admin'],
  'equipment.edit': ['super_admin', 'admin'],
  'equipment.delete': ['super_admin'],
  'equipment.manage_rates': ['super_admin', 'admin'],
  
  // Inventory
  'inventory.view': ['super_admin', 'admin', 'staff'],
  'inventory.manage': ['super_admin', 'admin'],
  
  // Bookings
  'bookings.view': ['super_admin', 'admin', 'staff'],
  'bookings.create': ['super_admin', 'admin', 'staff'],
  'bookings.edit': ['super_admin', 'admin'],
  'bookings.approve': ['super_admin', 'admin'],
  'bookings.reject': ['super_admin', 'admin'],
  'bookings.delete': ['super_admin'],
  
  // Payments
  'payments.view': ['super_admin', 'admin', 'staff'],
  'payments.manage': ['super_admin', 'admin'],
  'payments.refund': ['super_admin', 'admin'],
  
  // Returns
  'returns.view': ['super_admin', 'admin', 'staff'],
  'returns.manage': ['super_admin', 'admin'],
  
  // Reports
  'reports.view': ['super_admin', 'admin', 'staff'],
  'reports.export': ['super_admin', 'admin'],
  
  // QR Code
  'qr.view': ['super_admin', 'admin', 'staff'],
  'qr.generate': ['super_admin', 'admin'],
  
  // Notifications
  'notifications.view': ['super_admin', 'admin'],
  'notifications.manage': ['super_admin', 'admin'],
  
  // Settings
  'settings.view': ['super_admin', 'admin'],
  'settings.edit': ['super_admin', 'admin'],
  'settings.institution': ['super_admin', 'admin'],
}

export function hasPermission(role: UserRole | string | undefined, permission: string): boolean {
  if (!role) return false
  const allowedRoles = PERMISSIONS[permission] || []
  return allowedRoles.includes(role as UserRole)
}

export function hasAnyPermission(role: UserRole | string | undefined, permissions: string[]): boolean {
  return permissions.some(perm => hasPermission(role, perm))
}

export function hasAllPermissions(role: UserRole | string | undefined, permissions: string[]): boolean {
  return permissions.every(perm => hasPermission(role, perm))
}

// Check if user is super_admin
export function isSuperAdmin(role: UserRole | string | undefined): boolean {
  return role === 'super_admin'
}

// Check if user is admin or super_admin
export function isAdmin(role: UserRole | string | undefined): boolean {
  return role === 'admin' || role === 'super_admin'
}

// Check if user can access admin area
export function canAccessAdmin(role: UserRole | string | undefined): boolean {
  return ['super_admin', 'admin', 'staff'].includes(role || '')
}

// Get role label
export function getRoleLabel(role: UserRole | string | undefined): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
    borrower: 'Peminjam'
  }
  return labels[role || ''] || role || 'Unknown'
}

// Get role color/theme
export function getRoleColor(role: UserRole | string | undefined): string {
  const colors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
    admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    staff: 'bg-blue-100 text-blue-700 border-blue-200',
    borrower: 'bg-green-100 text-green-700 border-green-200'
  }
  return colors[role || ''] || 'bg-slate-100 text-slate-700 border-slate-200'
}
