// ============================================================
// UNIFIED CATEGORY SYSTEM — Single Source of Truth
// ============================================================
//
// ⚠️ SEMUA kategori di aplikasi harus diambil dari file ini.
// Jangan definisikan ulang di file lain. Import dari sini.
//
// Borrower Category (users.borrower_category, equipment_rates.user_category)
//   mahasiswa_s1  → Mahasiswa S1
//   mahasiswa_s2  → Mahasiswa S2/S3
//   dosen         → Dosen & Karyawan
//   kerjasama     → Kerjasama / MoU
//   umum          → Umum
//
// Event Type (bookings.event_type)
//   perkuliahan      → Perkuliahan (gratis untuk Mhs S1)
//   event_mahasiswa  → Event Mahasiswa
//   event_umum       → Event Umum
//   penelitian       → Penelitian
//   lainnya          → Lainnya
//
// User Role (users.role)
//   borrower    → Peminjam
//   staff       → Staff
//   admin       → Admin
//   super_admin → Super Admin
//
// ============================================================

export const BORROWER_CATEGORIES = [
  { key: 'mahasiswa_s1', label: 'Mahasiswa S1', shortLabel: 'Mhs S1' },
  { key: 'mahasiswa_s2', label: 'Mahasiswa S2/S3', shortLabel: 'Mhs S2' },
  { key: 'dosen', label: 'Dosen & Karyawan', shortLabel: 'Dosen' },
  { key: 'kerjasama', label: 'Kerjasama / MoU', shortLabel: 'MoU' },
  { key: 'umum', label: 'Umum', shortLabel: 'Umum' },
] as const

export type BorrowerCategory = (typeof BORROWER_CATEGORIES)[number]['key']

export const EVENT_TYPES = [
  { key: 'perkuliahan', label: 'Perkuliahan', description: 'Kegiatan perkuliahan resmi' },
  { key: 'event_mahasiswa', label: 'Event Mahasiswa', description: 'Kegiatan mahasiswa (non-kuliah)' },
  { key: 'event_umum', label: 'Event Umum', description: 'Kegiatan umum/eksternal' },
  { key: 'penelitian', label: 'Penelitian', description: 'Kegiatan penelitian' },
  { key: 'lainnya', label: 'Lainnya', description: 'Tujuan lainnya' },
] as const

export type EventType = (typeof EVENT_TYPES)[number]['key']

export const USER_ROLES = [
  { key: 'borrower', label: 'Peminjam' },
  { key: 'staff', label: 'Staff' },
  { key: 'admin', label: 'Admin' },
  { key: 'super_admin', label: 'Super Admin' },
] as const

export type UserRole = (typeof USER_ROLES)[number]['key']

// ============================================================
// LABEL HELPERS
// ============================================================

const borrowerCategoryMap = new Map(BORROWER_CATEGORIES.map(c => [c.key, c]))
const eventTypeMap = new Map(EVENT_TYPES.map(e => [e.key, e]))
const userRoleMap = new Map(USER_ROLES.map(r => [r.key, r]))

export function getBorrowerCategoryLabel(category: string | null | undefined): string {
  if (!category) return 'Tidak diketahui'
  return borrowerCategoryMap.get(category as BorrowerCategory)?.label ?? category
}

export function getBorrowerCategoryShortLabel(category: string | null | undefined): string {
  if (!category) return '?'
  return borrowerCategoryMap.get(category as BorrowerCategory)?.shortLabel ?? category
}

export function getEventTypeLabel(eventType: string | null | undefined): string {
  if (!eventType) return 'Tidak diketahui'
  return eventTypeMap.get(eventType as EventType)?.label ?? eventType
}

export function getUserRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Tidak diketahui'
  return userRoleMap.get(role as UserRole)?.label ?? role
}

export function isValidBorrowerCategory(value: string): value is BorrowerCategory {
  return BORROWER_CATEGORIES.some(c => c.key === value)
}

export function isValidEventType(value: string): value is EventType {
  return EVENT_TYPES.some(e => e.key === value)
}

// ============================================================
// FREE BOOKING LOGIC
// ============================================================
//
// Perkuliahan oleh Mahasiswa S1 = Gratis (sesuai kebijakan internal)
//

export function isFreeBooking(
  borrowerCategory: string | null | undefined,
  eventType: string | null | undefined,
  purpose?: string | null
): boolean {
  // Hanya mahasiswa_s1 yang bisa gratis
  if (borrowerCategory !== 'mahasiswa_s1') return false

  // Event perkuliahan = gratis
  if (eventType === 'perkuliahan') return true

  // Fallback: kalau purpose mengandung kata perkuliahan (untuk data lama tanpa event_type)
  if (purpose && /perkuliahan|kuliah|mata kuliah/.test(purpose.toLowerCase())) return true

  return false
}

// ============================================================
// ROOM PRICING LOGIC
// ============================================================
//
// Rooms: per jam kalau ≤ 12 jam, per hari kalau > 12 jam
//

interface RoomRate {
  usage_category: string
  rate_per_hour: number | string | null
  rate_per_day: number | string | null
}

export function calculateRoomPrice(
  rates: RoomRate[],
  borrowerCategory: string,
  durationHours: number,
  durationDays: number
): { total: number; breakdown: string } {
  const rate = rates.find(r => r.usage_category === borrowerCategory)
    ?? rates.find(r => r.usage_category === 'umum') // fallback ke umum

  if (!rate) return { total: 0, breakdown: 'Tarif tidak tersedia' }

  const ratePerHour = rate.rate_per_hour != null ? Number(rate.rate_per_hour) : 0
  const ratePerDay = rate.rate_per_day != null ? Number(rate.rate_per_day) : 0

  // Kalau > 12 jam dan ada tarif harian → pakai harian
  if (durationHours > 12 && ratePerDay > 0) {
    const total = ratePerDay * durationDays
    return { total, breakdown: `${formatRupiah(ratePerDay)}/hari × ${durationDays} hari` }
  }

  // Kalau ada tarif per jam → pakai per jam
  if (ratePerHour > 0) {
    const total = ratePerHour * durationHours
    return { total, breakdown: `${formatRupiah(ratePerHour)}/jam × ${durationHours} jam` }
  }

  // Kalau tidak ada tarif per jam tapi ada harian → pakai harian
  if (ratePerDay > 0) {
    const total = ratePerDay * durationDays
    return { total, breakdown: `${formatRupiah(ratePerDay)}/hari × ${durationDays} hari` }
  }

  return { total: 0, breakdown: 'Tarif belum diatur' }
}

// ============================================================
// EQUIPMENT PRICING LOGIC
// ============================================================
//
// Equipment: selalu per hari (tidak tergantung durasi)
//

interface EquipmentRate {
  user_category: string
  rate_per_day: number | string | null
  rate_per_hour?: number | string | null
}

export function calculateEquipmentPrice(
  rates: EquipmentRate[],
  borrowerCategory: string,
  durationDays: number,
  quantity: number
): { total: number; breakdown: string } {
  const rate = rates.find(r => r.user_category === borrowerCategory)
    ?? rates.find(r => r.user_category === 'umum') // fallback ke umum

  if (!rate) return { total: 0, breakdown: 'Tarif tidak tersedia' }

  const ratePerDay = rate.rate_per_day != null ? Number(rate.rate_per_day) : 0

  if (ratePerDay <= 0) {
    return { total: 0, breakdown: 'Tarif belum diatur' }
  }

  const total = ratePerDay * durationDays * quantity
  const qtyStr = quantity > 1 ? ` × ${quantity} unit` : ''
  return { total, breakdown: `${formatRupiah(ratePerDay)}/hari × ${durationDays} hari${qtyStr}` }
}

// ============================================================
// MIGRATION HELPERS (untuk data lama)
// ============================================================

const LEGACY_BORROWER_MAP: Record<string, BorrowerCategory> = {
  'mahasiswa': 'mahasiswa_s1',
  'pascasarjana': 'mahasiswa_s2',
  'dosen_karyawan': 'dosen',
  'kerjasama': 'kerjasama',
  'umum': 'umum',
  'borrower': 'umum',
}

export function migrateBorrowerCategory(legacy: string | null | undefined): BorrowerCategory {
  if (!legacy) return 'mahasiswa_s1'
  if (isValidBorrowerCategory(legacy)) return legacy
  return LEGACY_BORROWER_MAP[legacy] ?? 'mahasiswa_s1'
}

// ============================================================
// UTILS
// ============================================================

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}
