// ============================================================
// BOOKING FLOW TEST — Manual verification for category refactor
// Run: npx tsx scripts/test-booking-flow.ts
// ============================================================

import {
  isFreeBooking,
  calculateEquipmentPrice,
  calculateRoomPrice,
  migrateBorrowerCategory,
  getBorrowerCategoryLabel,
  BORROWER_CATEGORIES,
} from '../src/lib/categories'

let passed = 0
let failed = 0

function test(name: string, fn: () => boolean) {
  try {
    const ok = fn()
    if (ok) {
      console.log(`  ✅ ${name}`)
      passed++
    } else {
      console.log(`  ❌ ${name}`)
      failed++
    }
  } catch (err: any) {
    console.log(`  ❌ ${name} — ERROR: ${err.message}`)
    failed++
  }
}

console.log('=== TEST: isFreeBooking ===')

test('Mahasiswa S1 + Perkuliahan = GRATIS', () =>
  isFreeBooking('mahasiswa_s1', 'perkuliahan') === true
)

test('Mahasiswa S1 + Penelitian = BAYAR', () =>
  isFreeBooking('mahasiswa_s1', 'penelitian') === false
)

test('Mahasiswa S1 + Event Mahasiswa = BAYAR', () =>
  isFreeBooking('mahasiswa_s1', 'event_mahasiswa') === false
)

test('Mahasiswa S1 + purpose "perkuliahan" (fallback) = GRATIS', () =>
  isFreeBooking('mahasiswa_s1', 'lainnya', 'Mata Kuliah Fisika') === true
)

test('Mahasiswa S2 + Perkuliahan = BAYAR', () =>
  isFreeBooking('mahasiswa_s2', 'perkuliahan') === false
)

test('Dosen + Perkuliahan = BAYAR', () =>
  isFreeBooking('dosen', 'perkuliahan') === false
)

test('Umum + Perkuliahan = BAYAR', () =>
  isFreeBooking('umum', 'perkuliahan') === false
)

console.log('\n=== TEST: migrateBorrowerCategory ===')

test('Legacy "mahasiswa" → mahasiswa_s1', () =>
  migrateBorrowerCategory('mahasiswa') === 'mahasiswa_s1'
)

test('Legacy "pascasarjana" → mahasiswa_s2', () =>
  migrateBorrowerCategory('pascasarjana') === 'mahasiswa_s2'
)

test('Legacy "dosen_karyawan" → dosen', () =>
  migrateBorrowerCategory('dosen_karyawan') === 'dosen'
)

test('Legacy "borrower" → umum', () =>
  migrateBorrowerCategory('borrower') === 'umum'
)

test('Null → mahasiswa_s1 (default)', () =>
  migrateBorrowerCategory(null) === 'mahasiswa_s1'
)

test('Already valid "umum" stays umum', () =>
  migrateBorrowerCategory('umum') === 'umum'
)

console.log('\n=== TEST: getBorrowerCategoryLabel ===')

test('Label for mahasiswa_s1', () =>
  getBorrowerCategoryLabel('mahasiswa_s1') === 'Mahasiswa S1'
)

test('Label for dosen', () =>
  getBorrowerCategoryLabel('dosen') === 'Dosen & Karyawan'
)

test('Invalid key returns itself', () =>
  getBorrowerCategoryLabel('invalid') === 'invalid'
)

console.log('\n=== TEST: calculateEquipmentPrice ===')

const rates = [
  { user_category: 'mahasiswa_s1', rate_per_day: 0 },
  { user_category: 'umum', rate_per_day: 150000 },
  { user_category: 'dosen', rate_per_day: 100000 },
]

test('Equipment: Umum, 3 hari, 1 unit = Rp 450.000', () => {
  const result = calculateEquipmentPrice(rates, 'umum', 3, 1)
  return result.total === 450000 && result.breakdown.includes('150.000')
})

test('Equipment: Dosen, 3 hari, 1 unit = Rp 300.000', () => {
  const result = calculateEquipmentPrice(rates, 'dosen', 3, 1)
  return result.total === 300000 && result.breakdown.includes('100.000')
})

test('Equipment: unknown category falls back to umum', () => {
  const result = calculateEquipmentPrice(rates, 'unknown', 3, 1)
  return result.total === 450000
})

test('Equipment: rate 0 returns 0', () => {
  const result = calculateEquipmentPrice(rates, 'mahasiswa_s1', 3, 1)
  return result.total === 0 && result.breakdown.includes('Tarif belum diatur')
})

test('Equipment: no rates returns 0', () => {
  const result = calculateEquipmentPrice([], 'umum', 3, 1)
  return result.total === 0 && result.breakdown.includes('Tarif tidak tersedia')
})

console.log('\n=== TEST: calculateRoomPrice ===')

const roomRates = [
  { usage_category: 'mahasiswa_s1', rate_per_hour: 50000, rate_per_day: 300000 },
  { usage_category: 'umum', rate_per_hour: 100000, rate_per_day: 600000 },
]

test('Room: umum, 3 jam (≤12) = per jam', () => {
  const result = calculateRoomPrice(roomRates, 'umum', 3, 1)
  return result.total === 300000 && result.breakdown.includes('/jam')
})

test('Room: umum, 24 jam (>12) = per hari', () => {
  const result = calculateRoomPrice(roomRates, 'umum', 24, 1)
  return result.total === 600000 && result.breakdown.includes('/hari')
})

test('Room: mahasiswa_s1, 24 jam (>12) = per hari', () => {
  const result = calculateRoomPrice(roomRates, 'mahasiswa_s1', 24, 1)
  return result.total === 300000
})

test('Room: unknown category falls back to umum', () => {
  const result = calculateRoomPrice(roomRates, 'kerjasama', 3, 1)
  return result.total === 300000
})

test('Room: only daily rate, 3 hours → fallback to daily', () => {
  const dailyOnly = [{ usage_category: 'umum', rate_per_hour: null, rate_per_day: 500000 }]
  const result = calculateRoomPrice(dailyOnly, 'umum', 3, 1)
  return result.total === 500000 && result.breakdown.includes('/hari')
})

console.log('\n=== TEST: BORROWER_CATEGORIES integrity ===')

test('Exactly 5 categories', () => BORROWER_CATEGORIES.length === 5)

test('All keys are unique', () => {
  const keys = BORROWER_CATEGORIES.map(c => c.key)
  return new Set(keys).size === keys.length
})

test('Has dosen category', () =>
  BORROWER_CATEGORIES.some(c => c.key === 'dosen')
)

test('No legacy keys (mahasiswa, pascasarjana, dosen_karyawan, borrower)', () => {
  const legacy = ['mahasiswa', 'pascasarjana', 'dosen_karyawan', 'borrower']
  return !BORROWER_CATEGORIES.some(c => legacy.includes(c.key))
})

// ============================================================
// BOOKING FLOW SIMULATION
// ============================================================
console.log('\n=== SIMULATION: End-to-End Booking Scenarios ===')

function simulateBooking(
  borrowerCategory: string,
  eventType: string,
  purpose: string,
  roomHours: number,
  roomDays: number,
  equipmentDays: number,
  equipmentQty: number
) {
  const gratis = isFreeBooking(borrowerCategory, eventType, purpose)

  const roomTotal = gratis
    ? 0
    : calculateRoomPrice(roomRates, borrowerCategory, roomHours, roomDays).total

  const equipTotal = gratis
    ? 0
    : calculateEquipmentPrice(rates, borrowerCategory, equipmentDays, equipmentQty).total

  const total = roomTotal + equipTotal

  return { gratis, roomTotal, equipTotal, total }
}

// Scenario 1: Mahasiswa S1 — Perkuliahan (should be FREE)
const s1 = simulateBooking('mahasiswa_s1', 'perkuliahan', 'Mata Kuliah Fisika', 24, 1, 3, 1)
test('Scenario 1: Mhs S1 + Perkuliahan = GRATIS (Rp 0)', () =>
  s1.gratis === true && s1.total === 0
)
console.log(`    Room: ${s1.roomTotal}, Equipment: ${s1.equipTotal}, Total: ${s1.total}`)

// Scenario 2: Mahasiswa S1 — Penelitian (should PAY)
const s2 = simulateBooking('mahasiswa_s1', 'penelitian', 'Ambil data penelitian', 72, 3, 3, 1)
test('Scenario 2: Mhs S1 + Penelitian = BAYAR (> Rp 0)', () =>
  s2.gratis === false && s2.total > 0
)
console.log(`    Room: ${s2.roomTotal}, Equipment: ${s2.equipTotal}, Total: ${s2.total}`)

// Scenario 3: Umum — Event Umum (should PAY, highest rate)
const s3 = simulateBooking('umum', 'event_umum', 'Workshop Teknologi', 24, 1, 3, 1)
test('Scenario 3: Umum + Event Umum = BAYAR (tarif umum)', () =>
  s3.gratis === false && s3.total > 0
)
console.log(`    Room: ${s3.roomTotal}, Equipment: ${s3.equipTotal}, Total: ${s3.total}`)

// Scenario 4: Dosen — Perkuliahan (should PAY, dosen rate)
const s4 = simulateBooking('dosen', 'perkuliahan', 'Kuliah Dosen Tamu', 24, 1, 3, 1)
test('Scenario 4: Dosen + Perkuliahan = BAYAR (bukan gratis)', () =>
  s4.gratis === false && s4.total > 0
)
console.log(`    Room: ${s4.roomTotal}, Equipment: ${s4.equipTotal}, Total: ${s4.total}`)

// ============================================================
// SUMMARY
// ============================================================
console.log('\n===============================')
console.log(`  PASSED: ${passed}`)
console.log(`  FAILED: ${failed}`)
console.log('===============================')

if (failed > 0) {
  console.log('\n❌ SOME TESTS FAILED')
  process.exit(1)
} else {
  console.log('\n✅ ALL TESTS PASSED')
  process.exit(0)
}
