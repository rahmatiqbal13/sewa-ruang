import { createClient } from '@/lib/supabase/server'
import { BookingsList } from './BookingsList'

export default async function AdminBookingsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ status?: string }> 
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  // Fetch bookings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('bookings') as any)
    .select(`
      id, reference_no, status, start_datetime, end_datetime, 
      total_amount, purpose, created_at,
      users(name, email, phone, telegram_username, institution, class_division)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: bookingsData } = await query

  // Get booking items for all bookings
  const bookingIds = (bookingsData || []).map((b: any) => b.id)
  
  let bookingItemsData: any[] = []
  if (bookingIds.length > 0) {
    const { data: items } = await (supabase.from('booking_items') as any)
      .select(`
        id, booking_id, item_type, quantity, room_id, equipment_id
      `)
      .in('booking_id', bookingIds)
    
    bookingItemsData = items || []
  }

  // Get rooms data
  const roomIds = bookingItemsData
    .filter((item: any) => item.room_id)
    .map((item: any) => item.room_id)
  
  let roomsData: any[] = []
  if (roomIds.length > 0) {
    const { data: rooms } = await (supabase.from('rooms') as any)
      .select('id, name, room_code')
      .in('id', roomIds)
    roomsData = rooms || []
  }

  // Get equipment data
  const equipmentIds = bookingItemsData
    .filter((item: any) => item.equipment_id)
    .map((item: any) => item.equipment_id)
  
  let equipmentData: any[] = []
  if (equipmentIds.length > 0) {
    const { data: equipment } = await (supabase.from('equipment') as any)
      .select('id, name, equipment_code')
      .in('id', equipmentIds)
    equipmentData = equipment || []
  }

  // Merge data
  const bookings = (bookingsData || []).map((booking: any) => {
    const items = bookingItemsData
      .filter((item: any) => item.booking_id === booking.id)
      .map((item: any) => {
        if (item.item_type === 'room' && item.room_id) {
          return { ...item, room: roomsData.find((r: any) => r.id === item.room_id) }
        } else if (item.item_type === 'equipment' && item.equipment_id) {
          return { ...item, equipment: equipmentData.find((e: any) => e.id === item.equipment_id) }
        }
        return item
      })
    
    return { ...booking, booking_items: items }
  })

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
