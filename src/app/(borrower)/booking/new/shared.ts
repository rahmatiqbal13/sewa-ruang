// Shared utilities for booking pages (safe to import in Client Components)
//
// ⚠️ DEPRECATED — Prefer importing directly from '@/lib/categories.ts'
// File ini tetap ada untuk backward compatibility dengan re-export.

export {
  BORROWER_CATEGORIES,
  EVENT_TYPES,
  USER_ROLES,
  type BorrowerCategory,
  type EventType,
  type UserRole,
  getBorrowerCategoryLabel,
  getBorrowerCategoryShortLabel,
  getEventTypeLabel,
  getUserRoleLabel,
  isValidBorrowerCategory,
  isValidEventType,
  isFreeBooking,
  calculateRoomPrice,
  calculateEquipmentPrice,
  migrateBorrowerCategory,
} from '@/lib/categories'

// Legacy type aliases (dihapus — gunakan BorrowerCategory dari '@/lib/categories')
// export type UserBorrowerCategory = ...
// export type RateCategory = ...
