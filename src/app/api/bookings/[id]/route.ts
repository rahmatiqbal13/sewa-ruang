import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: me } = await (supabase as any).from('users').select('role').eq('id', user.id).single()
    if (!['admin', 'super_admin'].includes(me?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sb = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = sb as any

    // Verify booking exists
    const { data: booking } = await admin
      .from('bookings')
      .select('id, reference_no')
      .eq('id', id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Delete — cascade handles booking_items, payments, returns, payment_proofs, reminders
    const { error } = await admin.from('bookings').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true, reference_no: booking.reference_no })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Delete booking error:', msg)
    return NextResponse.json({ error: 'Gagal menghapus booking', details: msg }, { status: 500 })
  }
}
