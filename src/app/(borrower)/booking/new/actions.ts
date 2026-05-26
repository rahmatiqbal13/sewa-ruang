'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const MAX_BOOKING_DAYS = 3
const MAX_EQUIPMENT_QUANTITY = 100

const bookingSchema = z.object({
  start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
  start_time: z.string().optional(),
  end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
  end_time: z.string().optional(),
  purpose: z.string().min(10, 'Tujuan minimal 10 karakter').max(500),
  room_ids: z.array(z.string().uuid()),
  equipment_items: z.array(z.object({
    id: z.string().uuid(),
    quantity: z.number().int().min(1).max(MAX_EQUIPMENT_QUANTITY),
  })),
})

export type CreateBookingInput = z.infer<typeof bookingSchema>

export type CreateBookingResult =
  | { success: true; bookingId: string; referenceNo: string }
  | { success: false; error: string }

const CATEGORY_MAP: Record<string, string> = {
  mahasiswa: 'mahasiswa_s1',
  pascasarjana: 'mahasiswa_s2',
  dosen_karyawan: 'dosen',
  kerjasama: 'mou_unesa',
  umum: 'umum',
}

export async function createBookingAction(input: CreateBookingInput): Promise<CreateBookingResult> {
  // Validate input
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }

  const { start_date, start_time, end_date, end_time, purpose, room_ids, equipment_items } = parsed.data

  const hasRooms = room_ids.length > 0
  const hasEquipment = equipment_items.length > 0

  if (!hasRooms && !hasEquipment) {
    return { success: false, error: 'Pilih minimal satu ruangan atau alat' }
  }

  if (hasRooms && (!start_time || !end_time)) {
    return { success: false, error: 'Waktu mulai dan selesai wajib diisi untuk peminjaman ruangan' }
  }

  // Parse datetimes
  const effectiveStart = hasRooms ? start_time! : '00:00'
  const effectiveEnd = hasRooms ? end_time! : '23:59'

  const startDt = new Date(`${start_date}T${effectiveStart}`)
  const endDt = new Date(`${end_date}T${effectiveEnd}`)

  if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
    return { success: false, error: 'Format tanggal tidak valid' }
  }

  if (endDt <= startDt) {
    return { success: false, error: 'Waktu selesai harus setelah waktu mulai' }
  }

  const diffDays = Math.ceil((endDt.getTime() - startDt.getTime()) / 86_400_000)
  if (diffDays > MAX_BOOKING_DAYS) {
    return { success: false, error: `Maksimal peminjaman ${MAX_BOOKING_DAYS} hari` }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesi habis, silakan login kembali' }

  // Get user profile for rate category
  const { data: profile } = await supabase
    .from('users')
    .select('id, borrower_category')
    .eq('id', user.id)
    .single()

  if (!profile) return { success: false, error: 'Profil pengguna tidak ditemukan' }

  const rateCategory = CATEGORY_MAP[profile.borrower_category ?? 'mahasiswa'] ?? 'mahasiswa_s1'

  // ── Conflict check for rooms ─────────────────────────────────────────────
  if (hasRooms) {
    const { data: overlappingBookings } = await supabase
      .from('bookings')
      .select('id')
      .in('status', ['pending', 'approved', 'paid', 'active'])
      .lt('start_datetime', endDt.toISOString())
      .gt('end_datetime', startDt.toISOString())

    if (overlappingBookings?.length > 0) {
      const overlappingIds = overlappingBookings.map((b: { id: string }) => b.id)

      const { data: conflictItems } = await supabase
        .from('booking_items')
        .select('room_id')
        .in('booking_id', overlappingIds)
        .in('room_id', room_ids)
        .limit(1)

      if (conflictItems?.length > 0) {
        const conflictRoomId = conflictItems[0].room_id
        const { data: room } = await supabase
          .from('rooms')
          .select('name')
          .eq('id', conflictRoomId)
          .single()
        return { success: false, error: `Ruangan "${room?.name ?? 'tersebut'}" sudah dipesan pada waktu tersebut` }
      }
    }
  }

  // ── Fetch and verify rooms ───────────────────────────────────────────────
  type RoomRow = { id: string; name: string; rate_per_hour: number | null; rate_per_day: number | null }
  let roomsData: RoomRow[] = []

  if (hasRooms) {
    const { data: rooms, error: roomsErr } = await supabase
      .from('rooms')
      .select('id, name, rate_per_hour, rate_per_day')
      .in('id', room_ids)
      .eq('is_active', true)
      .eq('is_for_rent', true)

    if (roomsErr || !rooms || rooms.length !== room_ids.length) {
      return { success: false, error: 'Beberapa ruangan tidak tersedia atau tidak dapat disewa' }
    }
    roomsData = rooms
  }

  // ── Verify equipment availability ────────────────────────────────────────
  type EquipmentRow = { id: string; name: string; ketersediaan: string }
  const equipIds = equipment_items.map(e => e.id)

  if (hasEquipment) {
    const { data: equipList, error: equipErr } = await supabase
      .from('equipment')
      .select('id, name, ketersediaan')
      .in('id', equipIds)
      .eq('is_active', true)

    if (equipErr || !equipList || equipList.length !== equipIds.length) {
      return { success: false, error: 'Beberapa alat tidak ditemukan atau tidak aktif' }
    }

    const unavailable = (equipList as EquipmentRow[]).find(e => e.ketersediaan !== 'tersedia')
    if (unavailable) {
      return { success: false, error: `Alat "${unavailable.name}" sedang tidak tersedia` }
    }
  }

  // ── Fetch equipment rates from DB (server-side) ──────────────────────────
  type RateRow = { equipment_id: string; rate_per_day: number }
  let ratesMap = new Map<string, number>()

  if (hasEquipment) {
    const { data: rates } = await supabase
      .from('equipment_rates')
      .select('equipment_id, rate_per_day')
      .in('equipment_id', equipIds)
      .eq('user_category', rateCategory)

    ratesMap = new Map((rates as RateRow[] ?? []).map(r => [r.equipment_id, r.rate_per_day]))
  }

  // ── Calculate total SERVER-SIDE (tidak percaya nilai dari client) ─────────
  const hours = Math.ceil((endDt.getTime() - startDt.getTime()) / 3_600_000)
  const days = Math.ceil((endDt.getTime() - startDt.getTime()) / 86_400_000)

  let totalAmount = 0

  if (hasRooms && start_time && end_time) {
    for (const room of roomsData) {
      const rate = room.rate_per_hour ?? 0
      totalAmount += hours * rate
    }
  }

  for (const item of equipment_items) {
    const ratePerDay = ratesMap.get(item.id) ?? 0
    totalAmount += days * ratePerDay * item.quantity
  }

  // ── Snapshot rate (immutable record of prices at booking time) ────────────
  const snapshotRate = {
    borrower_category: profile.borrower_category,
    rate_category: rateCategory,
    hours,
    days,
    rooms: roomsData.map(r => ({ id: r.id, name: r.name, rate_per_hour: r.rate_per_hour })),
    equipment: equipment_items.map(e => ({
      id: e.id,
      rate_per_day: ratesMap.get(e.id) ?? 0,
      quantity: e.quantity,
    })),
  }

  // ── Insert booking ────────────────────────────────────────────────────────
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      user_id: user.id,
      status: 'pending',
      purpose,
      start_datetime: startDt.toISOString(),
      end_datetime: endDt.toISOString(),
      total_amount: totalAmount,
      snapshot_rate: snapshotRate,
    })
    .select('id, reference_no')
    .single()

  if (bookingError || !booking) {
    return { success: false, error: bookingError?.message ?? 'Gagal membuat pengajuan' }
  }

  // ── Insert booking items (with rollback on failure) ───────────────────────
  const bookingItems = [
    ...room_ids.map(roomId => ({
      booking_id: booking.id,
      item_type: 'room' as const,
      room_id: roomId,
      equipment_id: null,
      quantity: 1,
    })),
    ...equipment_items.map(e => ({
      booking_id: booking.id,
      item_type: 'equipment' as const,
      room_id: null,
      equipment_id: e.id,
      quantity: e.quantity,
    })),
  ]

  const { error: itemsError } = await supabase
    .from('booking_items')
    .insert(bookingItems)

  if (itemsError) {
    // Rollback: hapus booking yang sudah dibuat
    await supabase.from('bookings').delete().eq('id', booking.id)
    return { success: false, error: 'Gagal menyimpan item peminjaman. Silakan coba lagi.' }
  }

  return { success: true, bookingId: booking.id, referenceNo: booking.reference_no }
}
