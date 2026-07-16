'use server'

import { createClient } from '@/lib/supabase/server'
import {
  type BorrowerCategory,
  isFreeBooking,
  migrateBorrowerCategory,
} from '@/lib/categories'
import { sendEmailWithConfig } from '@/lib/services/emailServer'
import { buildBookingSubmittedEmail } from '@/lib/services/emailService'
import { z } from 'zod'

const MAX_BOOKING_DAYS = 3
const MAX_EQUIPMENT_QUANTITY = 100

const bookingSchema = z.object({
  start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
  start_time: z.string().optional(),
  end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
  end_time: z.string().optional(),
  purpose: z.string().min(10, 'Tujuan minimal 10 karakter').max(500),
  event_type: z.enum(['perkuliahan', 'event_mahasiswa', 'event_umum', 'penelitian', 'penelitian_tugas_akhir', 'lainnya']).optional().default('lainnya'),
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

export async function createBookingAction(input: CreateBookingInput): Promise<CreateBookingResult> {
  // Validate input
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }

  const { start_date, start_time, end_date, end_time, purpose, event_type, room_ids, equipment_items } = parsed.data

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

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('id, borrower_category')
    .eq('id', user.id)
    .single()

  if (!profile) return { success: false, error: 'Profil pengguna tidak ditemukan' }

  // Normalize borrower category (migrate legacy values)
  const borrowerCategory = migrateBorrowerCategory(profile.borrower_category) as BorrowerCategory

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

    // ── Check class schedule blocks ───────────────────────────────────────
    const { data: classBlocks } = await supabase
      .from('room_schedule_blocks')
      .select('mata_kuliah, dosen, start_datetime, end_datetime, room_id')
      .in('room_id', room_ids)
      .eq('schedule_type', 'class')
      .lt('start_datetime', endDt.toISOString())
      .gt('end_datetime', startDt.toISOString())
      .limit(1)

    if (classBlocks && classBlocks.length > 0) {
      const block = classBlocks[0]
      const { data: room } = await supabase
        .from('rooms')
        .select('name')
        .eq('id', block.room_id)
        .single()
      return {
        success: false,
        error: `Ruangan "${room?.name ?? 'tersebut'}" sedang dipakai untuk jadwal kuliah "${block.mata_kuliah}" (Dosen: ${block.dosen})`
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
  let equipList: EquipmentRow[] = []

  if (hasEquipment) {
    const { data: equipData, error: equipErr } = await supabase
      .from('equipment')
      .select('id, name, ketersediaan')
      .in('id', equipIds)
      .eq('is_active', true)

    if (equipErr || !equipData || equipData.length !== equipIds.length) {
      return { success: false, error: 'Beberapa alat tidak ditemukan atau tidak aktif' }
    }

    equipList = equipData as EquipmentRow[]

    const unavailable = equipList.find(e => e.ketersediaan !== 'tersedia')
    if (unavailable) {
      return { success: false, error: `Alat "${unavailable.name}" sedang tidak tersedia` }
    }
  }

  // ── Fetch equipment rates from DB (server-side) ──────────────────────────
  type RateRow = { equipment_id: string; rate_per_day: number | string }
  let ratesMap = new Map<string, number>()

  function toNumber(v: number | string | null | undefined): number {
    if (v == null) return 0
    const n = typeof v === 'number' ? v : Number(v)
    return isNaN(n) ? 0 : n
  }

  if (hasEquipment) {
    const { data: rates, error: ratesError } = await supabase
      .from('equipment_rates')
      .select('equipment_id, rate_per_day')
      .in('equipment_id', equipIds)
      .eq('user_category', borrowerCategory)

    if (ratesError) {
      console.error('Error fetching equipment rates:', ratesError)
    }

    ratesMap = new Map((rates as RateRow[] ?? []).map(r => [r.equipment_id, toNumber(r.rate_per_day)]))

    // Fallback: if any equipment has no rate for this category, try to get ANY rate for it
    for (const item of equipment_items) {
      if (!ratesMap.has(item.id) || ratesMap.get(item.id) === 0) {
        const { data: fallbackRates } = await supabase
          .from('equipment_rates')
          .select('equipment_id, rate_per_day')
          .eq('equipment_id', item.id)
          .order('rate_per_day', { ascending: false })
          .limit(1)

        if (fallbackRates && fallbackRates.length > 0) {
          const fallbackRate = fallbackRates[0] as RateRow
          ratesMap.set(item.id, toNumber(fallbackRate.rate_per_day))
        }
      }
    }

    // Validate that every equipment has a rate > 0
    for (const item of equipment_items) {
      const rate = ratesMap.get(item.id) ?? 0
      if (rate === 0) {
        const { data: eqInfo } = await supabase
          .from('equipment')
          .select('name')
          .eq('id', item.id)
          .single()
        return { success: false, error: `Tarif belum diatur untuk alat "${eqInfo?.name ?? item.id}". Silakan hubungi admin.` }
      }
    }
  }

  // ── Calculate total SERVER-SIDE (tidak percaya nilai dari client) ─────────
  const hours = Math.ceil((endDt.getTime() - startDt.getTime()) / 3_600_000)
  const days = Math.ceil((endDt.getTime() - startDt.getTime()) / 86_400_000)

  let totalAmount = 0

  // Check if booking qualifies for free (perkuliahan + mahasiswa_s1)
  const freeBooking = isFreeBooking(borrowerCategory, event_type, purpose)

  if (hasRooms && start_time && end_time && !freeBooking) {
    // Fetch room rates from room_rates table
    const { data: roomRates } = await supabase
      .from('room_rates')
      .select('room_id, usage_category, rate_per_hour, rate_per_day')
      .in('room_id', room_ids)

    for (const room of roomsData) {
      const ratesForRoom = (roomRates || []).filter((r: { room_id: string }) => r.room_id === room.id)
      const rate = ratesForRoom.find((r: { usage_category: string }) => r.usage_category === borrowerCategory)
        ?? ratesForRoom.find((r: { usage_category: string }) => r.usage_category === 'umum')

      if (rate) {
        const ratePerDay = rate.rate_per_day != null ? Number(rate.rate_per_day) : 0
        const ratePerHour = rate.rate_per_hour != null ? Number(rate.rate_per_hour) : 0

        if (hours > 12 && ratePerDay > 0) {
          totalAmount += ratePerDay * days
        } else if (ratePerHour > 0) {
          totalAmount += ratePerHour * hours
        } else if (ratePerDay > 0) {
          totalAmount += ratePerDay * days
        }
      }
    }
  }

  if (!freeBooking) {
    for (const item of equipment_items) {
      const ratePerDay = ratesMap.get(item.id) ?? 0
      totalAmount += days * ratePerDay * item.quantity
    }
  }

  // ── Snapshot rate (immutable record of prices at booking time) ────────────
  const snapshotRate = {
    borrower_category: borrowerCategory,
    event_type,
    hours,
    days,
    rooms: roomsData.map(r => ({ id: r.id, name: r.name, rate_per_hour: r.rate_per_hour, rate_per_day: r.rate_per_day })),
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
      event_type,
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

  // ── Insert room booking slots for tracking ────────────────────────────────
  if (hasRooms) {
    const slotRange = `["${startDt.toISOString()}", "${endDt.toISOString()}"]`
    const roomSlots = room_ids.map(roomId => ({
      room_id: roomId,
      booking_id: booking.id,
      slot: slotRange,
      status: 'pending' as const,
    }))

    const { error: roomSlotsError } = await supabase
      .from('room_booking_slots')
      .insert(roomSlots)

    if (roomSlotsError) {
      console.error('Error inserting room booking slots:', roomSlotsError)
      // Don't fail the booking, just log
    }
  }

  // ── Insert equipment booking slots for tracking ────────────────────────────
  if (hasEquipment) {
    const slotRange = `["${startDt.toISOString()}", "${endDt.toISOString()}"]`
    const equipmentSlots = equipment_items.map(e => ({
      equipment_id: e.id,
      booking_id: booking.id,
      slot: slotRange,
      quantity: e.quantity,
      status: 'pending',
    }))

    const { error: slotsError } = await supabase
      .from('equipment_booking_slots')
      .insert(equipmentSlots)

    if (slotsError) {
      console.error('Error inserting equipment booking slots:', slotsError)
      // Don't fail the booking, just log
    }
  }

  // ── Send confirmation email ───────────────────────────────────────────────
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('name, email, institution')
      .eq('id', user.id)
      .single()

    if (userData?.email) {
      const itemsForEmail = [
        ...roomsData.map(r => ({ name: r.name, type: 'room' as const })),
        ...equipment_items.map(e => {
          const eq = (equipList ?? []).find((x: any) => x.id === e.id)
          return { name: eq?.name || 'Alat', type: 'equipment' as const }
        }),
      ]

      const { subject, html } = buildBookingSubmittedEmail({
        name: userData.name || 'Peminjam',
        referenceNo: booking.reference_no,
        purpose,
        startDate: startDt.toISOString(),
        endDate: endDt.toISOString(),
        totalAmount,
        items: itemsForEmail,
      })

      await sendEmailWithConfig(
        userData.email,
        subject,
        html
      )
    }
  } catch (emailErr) {
    console.error('Booking confirmation email failed:', emailErr)
    // Don't fail the booking if email fails
  }

  return { success: true, bookingId: booking.id, referenceNo: booking.reference_no }
}
