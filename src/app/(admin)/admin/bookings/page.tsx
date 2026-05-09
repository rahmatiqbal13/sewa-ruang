import { createClient } from '@/lib/supabase/server'
import { BookingsList } from './BookingsList'

export default async function AdminBookingsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ status?: string }> 
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  // Query bookings with users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('bookings') as any)
    .select(`
      id, reference_no, status, start_datetime, end_datetime, 
      total_amount, purpose, created_at,
      users(name, email, phone, institution, class_division)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: bookingsData } = await query

  // Get all booking IDs
  const bookingIds = (bookingsData || []).map((b: any) => b.id)

  // Fetch booking items separately
  let bookingItemsData: any[] = []
  if (bookingIds.length > 0) {
    const { data: items } = await (supabase.from('booking_items') as any)
      .select(`
        id, booking_id, item_type, quantity,
        room:room_id(id, name, room_code, building_id),
        equipment:equipment_id(id, name, equipment_code)
      `)
      .in('booking_id', bookingIds)
    
    bookingItemsData = items || []
  }

  // Merge bookings with items
  const bookings = (bookingsData || []).map((booking: any) => ({
    ...booking,
    booking_items: bookingItemsData.filter((item: any) => item.booking_id === booking.id)
  }))

  // Get counts for each status
  const { data: allBookings } = await (supabase.from('bookings') as any)
    .select('status')

  const statusCounts: Record<string, number> = {}
  for (const b of allBookings ?? []) {
    const s = b.status as string
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  }

  return (
    <BookingsList 
      bookings={bookings || []} 
      statusCounts={statusCounts}
      currentStatus={status || ''}
    />
  )
}
