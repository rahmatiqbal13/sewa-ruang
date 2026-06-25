import { NextResponse } from 'next/server'
import { createAdminDbClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const sb = createAdminDbClient()
    const now = new Date().toISOString()
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Bookings baru dalam 24 jam
    const { count: bookingCount } = await sb
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo)

    // Users baru dalam 24 jam
    const { count: userCount } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'borrower')
      .gte('created_at', oneDayAgo)

    // Overdue bookings
    const { count: overdueCount } = await sb
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .lt('end_datetime', now)
      .in('status', ['approved', 'paid'])

    const total = (bookingCount ?? 0) + (userCount ?? 0) + (overdueCount ?? 0)

    return NextResponse.json({ count: total })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
