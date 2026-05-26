import { createAdminDbClient } from '@/lib/supabase/server'
import { BookingsList } from './BookingsList'

const ITEMS_PER_PAGE = 10

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? '1', 10))
  const from = (currentPage - 1) * ITEMS_PER_PAGE
  const to = from + ITEMS_PER_PAGE - 1

  const sb = createAdminDbClient()

  // ── Single query dengan nested join — menggantikan 4 query terpisah ───────
  let query = sb
    .from('bookings')
    .select(
      `
      id, reference_no, status, start_datetime, end_datetime,
      total_amount, purpose, created_at, admin_notes,
      users!user_id(name, email, phone, telegram_username, institution, class_division),
      booking_items(
        id, item_type, quantity,
        rooms(id, name, room_code),
        equipment(id, name, equipment_code)
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = (query as any).eq('status', status)

  const { data: bookings, count } = await query

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // ── Status counts (lightweight query, hanya kolom status) ─────────────────
  const { data: allStatuses } = await sb
    .from('bookings')
    .select('status')

  const statusCounts: Record<string, number> = {}
  for (const b of allStatuses ?? []) {
    const s = b.status as string
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  }

  return (
    <BookingsList
      bookings={bookings ?? []}
      statusCounts={statusCounts}
      currentStatus={status ?? ''}
      totalCount={totalCount}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  )
}
