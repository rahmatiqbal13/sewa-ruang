import { NextResponse } from 'next/server'
import { createClient, createAdminDbClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Auth check — hanya admin/super_admin yang boleh akses
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ count: 0 }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userRow } = await (supabase as any).from('users').select('role').eq('id', user.id).single()
    if (!['admin', 'super_admin', 'staff'].includes(userRow?.role)) {
      return NextResponse.json({ count: 0 }, { status: 403 })
    }

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
