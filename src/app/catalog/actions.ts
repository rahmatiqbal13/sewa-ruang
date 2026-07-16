'use server'

import { createAdminDbClient } from '@/lib/supabase/server'
import { parseTstzrange, safeParseDate } from '@/lib/pg-range'

interface AvailabilityBooking {
  id: string
  reference_no: string
  start_datetime: string
  end_datetime: string
  status: string
}

interface AvailabilityClass {
  id: string
  mata_kuliah: string
  start_datetime: string
  end_datetime: string
}

interface DayData {
  date: string // yyyy-MM-dd
  bookings: AvailabilityBooking[]
  classes: AvailabilityClass[]
}

/**
 * Fetch availability data for a room or equipment for a given month.
 * Uses service role to bypass RLS (catalog is public).
 */
export async function fetchPublicAvailabilityAction(
  type: 'room' | 'equipment',
  id: string,
  year: number,
  month: number
): Promise<DayData[]> {
  const adminDb = createAdminDbClient()

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)
  const startDate = monthStart.toISOString().slice(0, 10)
  const endDate = monthEnd.toISOString().slice(0, 10)

  // ── 1. Legacy: booking_items + bookings ──
  const { data: bookingItems } = await adminDb
    .from('booking_items')
    .select('booking_id')
    .eq(type === 'room' ? 'room_id' : 'equipment_id', id)
    .eq('item_type', type)

  const bookingIds = (bookingItems ?? []).map((bi: { booking_id: string }) => bi.booking_id)

  const bookingMap = new Map<string, AvailabilityBooking>()
  if (bookingIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (adminDb as any)
      .from('bookings')
      .select('id, reference_no, start_datetime, end_datetime, status')
      .in('id', bookingIds)
      .in('status', ['pending', 'approved', 'paid', 'active', 'completed'])
      .lte('start_datetime', `${endDate}T23:59:59`)
      .gte('end_datetime', `${startDate}T00:00:00`)

    ;(data ?? []).forEach((b: AvailabilityBooking) => bookingMap.set(b.id, b))
  }

  // ── 2. New system: room_booking_slots / equipment_booking_slots ──
  const slotsTable = type === 'room' ? 'room_booking_slots' : 'equipment_booking_slots'
  const idColumn = type === 'room' ? 'room_id' : 'equipment_id'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: slotData } = await (adminDb as any)
    .from(slotsTable)
    .select('slot, booking_id, status')
    .eq(idColumn, id)
    .in('status', ['pending', 'approved', 'paid', 'active', 'completed'])

  const slotEntries: Array<{ booking: AvailabilityBooking; slotStart: string; slotEnd: string }> = []
  if (slotData && slotData.length > 0) {
    const slotBookingIds = Array.from(new Set(slotData.map((s: { booking_id: string }) => s.booking_id)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: slotBookingDetails } = await (adminDb as any)
      .from('bookings')
      .select('id, reference_no, start_datetime, end_datetime, status')
      .in('id', slotBookingIds)
      .in('status', ['pending', 'approved', 'paid', 'active', 'completed'])

    const detailMap = new Map<string, AvailabilityBooking>()
    ;(slotBookingDetails ?? []).forEach((b: AvailabilityBooking) => detailMap.set(b.id, b))

    for (const s of slotData) {
      const parsed = parseTstzrange(s.slot)
      if (!parsed) continue
      const detail = detailMap.get(s.booking_id)
      if (!detail) continue
      slotEntries.push({
        booking: { ...detail, status: s.status || detail.status },
        slotStart: parsed.start,
        slotEnd: parsed.end,
      })
      bookingMap.set(detail.id, { ...detail, status: s.status || detail.status })
    }
  }

  // ── 3. Class schedules (rooms only) ──
  let classes: AvailabilityClass[] = []
  if (type === 'room') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: classData } = await (adminDb as any)
      .from('room_schedule_blocks')
      .select('id, mata_kuliah, start_datetime, end_datetime')
      .eq('room_id', id)
      .lte('start_datetime', `${endDate}T23:59:59`)
      .gte('end_datetime', `${startDate}T00:00:00`)

    classes = classData ?? []
  }

  // ── Build per-day map ──
  const map = new Map<string, DayData>()

  const ensureDay = (dateStr: string) => {
    if (!map.has(dateStr)) map.set(dateStr, { date: dateStr, bookings: [], classes: [] })
    return map.get(dateStr)!
  }

  // Helper: iterate days between two dates (inclusive)
  const addBookingDays = (booking: AvailabilityBooking, startStr: string, endStr: string) => {
    const start = safeParseDate(startStr)
    const end = safeParseDate(endStr)
    if (!start || !end) return
    const effStart = start < monthStart ? monthStart : start
    const effEnd = end > monthEnd ? monthEnd : end
    if (effStart > effEnd) return
    for (let d = new Date(effStart); d <= effEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10)
      if (dateStr >= startDate && dateStr <= endDate) {
        ensureDay(dateStr).bookings.push(booking)
      }
    }
  }

  // Slot-based bookings use slot bounds
  for (const { booking, slotStart, slotEnd } of slotEntries) {
    addBookingDays(booking, slotStart, slotEnd)
  }

  // Legacy bookings not already covered by slots
  const slotBookingIds = new Set(slotEntries.map((s) => s.booking.id))
  for (const booking of bookingMap.values()) {
    if (slotBookingIds.has(booking.id)) continue
    addBookingDays(booking, booking.start_datetime, booking.end_datetime)
  }

  // Classes
  for (const cls of classes) {
    const start = safeParseDate(cls.start_datetime)
    const end = safeParseDate(cls.end_datetime)
    if (!start || !end) continue
    const effStart = start < monthStart ? monthStart : start
    const effEnd = end > monthEnd ? monthEnd : end
    if (effStart > effEnd) continue
    for (let d = new Date(effStart); d <= effEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10)
      if (dateStr >= startDate && dateStr <= endDate) {
        ensureDay(dateStr).classes.push(cls)
      }
    }
  }

  return Array.from(map.values())
}

interface ScheduleBooking {
  id: string
  reference_no: string
  start_datetime: string
  end_datetime: string
  status: string
  purpose: string | null
}

interface ScheduleClass {
  id: string
  mata_kuliah: string
  dosen: string
  kelas: string
  semester: string
  start_datetime: string
  end_datetime: string
}

/**
 * Fetch upcoming schedule (bookings + classes) for a room or equipment.
 * Uses service role to bypass RLS.
 */
export async function fetchPublicScheduleAction(
  type: 'room' | 'equipment',
  id: string
): Promise<{ bookings: ScheduleBooking[]; classes: ScheduleClass[] }> {
  const adminDb = createAdminDbClient()
  const now = new Date().toISOString()

  // ── 1. Legacy: booking_items + bookings ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookingItems } = await (adminDb as any)
    .from('booking_items')
    .select('booking_id')
    .eq(type === 'room' ? 'room_id' : 'equipment_id', id)
    .eq('item_type', type)

  const bookingIds = (bookingItems ?? []).map((bi: { booking_id: string }) => bi.booking_id)

  const bookingMap = new Map<string, ScheduleBooking>()
  if (bookingIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (adminDb as any)
      .from('bookings')
      .select('id, reference_no, start_datetime, end_datetime, status, purpose')
      .in('id', bookingIds)
      .in('status', ['pending', 'approved', 'paid', 'active'])
      .gte('end_datetime', now)
      .order('start_datetime', { ascending: true })
      .limit(50)

    ;(data ?? []).forEach((b: ScheduleBooking) => bookingMap.set(b.id, b))
  }

  // ── 2. New system: slots ──
  const slotsTable = type === 'room' ? 'room_booking_slots' : 'equipment_booking_slots'
  const idColumn = type === 'room' ? 'room_id' : 'equipment_id'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: slotData } = await (adminDb as any)
    .from(slotsTable)
    .select('slot, booking_id, status')
    .eq(idColumn, id)
    .in('status', ['pending', 'approved', 'paid', 'active'])

  if (slotData && slotData.length > 0) {
    const slotBookingIds = Array.from(new Set(slotData.map((s: { booking_id: string }) => s.booking_id)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: slotBookingDetails } = await (adminDb as any)
      .from('bookings')
      .select('id, reference_no, start_datetime, end_datetime, status, purpose')
      .in('id', slotBookingIds)
      .in('status', ['pending', 'approved', 'paid', 'active'])
      .gte('end_datetime', now)
      .order('start_datetime', { ascending: true })
      .limit(50)

    const detailMap = new Map<string, ScheduleBooking>()
    ;(slotBookingDetails ?? []).forEach((b: ScheduleBooking) => detailMap.set(b.id, b))

    for (const s of slotData) {
      const parsed = parseTstzrange(s.slot)
      if (!parsed) continue
      const detail = detailMap.get(s.booking_id)
      if (!detail) continue
      const parsedEnd = safeParseDate(parsed.end)
      if (!parsedEnd || parsedEnd < new Date(now)) continue
      const key = `${s.booking_id}-${parsed.start}`
      bookingMap.set(key, {
        ...detail,
        status: s.status || detail.status,
        start_datetime: parsed.start,
        end_datetime: parsed.end,
      })
    }
  }

  // ── 3. Classes (rooms only) ──
  let classes: ScheduleClass[] = []
  if (type === 'room') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: classData } = await (adminDb as any)
      .from('room_schedule_blocks')
      .select('id, mata_kuliah, dosen, kelas, semester, start_datetime, end_datetime')
      .eq('room_id', id)
      .eq('schedule_type', 'class')
      .gte('end_datetime', now)
      .order('start_datetime', { ascending: true })
      .limit(20)

    classes = classData ?? []
  }

  const bookings = Array.from(bookingMap.values()).sort((a, b) => {
    const aDate = safeParseDate(a.start_datetime)
    const bDate = safeParseDate(b.start_datetime)
    if (!aDate || !bDate) return 0
    return aDate.getTime() - bDate.getTime()
  })

  return { bookings, classes }
}
