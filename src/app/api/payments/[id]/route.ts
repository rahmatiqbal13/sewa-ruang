import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Handles deletion of either a `payments` row or a `payment_proofs` row.
// Pass ?type=proof to target payment_proofs; default targets payments.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const type = new URL(req.url).searchParams.get('type') // 'proof' | null

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

    const table = type === 'proof' ? 'payment_proofs' : 'payments'

    const { data: row } = await admin.from(table).select('id').eq('id', id).single()
    if (!row) return NextResponse.json({ error: 'Record not found' }, { status: 404 })

    const { error } = await admin.from(table).delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Delete payment error:', msg)
    return NextResponse.json({ error: 'Gagal menghapus data pembayaran', details: msg }, { status: 500 })
  }
}
