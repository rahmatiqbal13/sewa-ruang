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

    const { data: ret } = await admin.from('returns').select('id').eq('id', id).single()
    if (!ret) return NextResponse.json({ error: 'Return record not found' }, { status: 404 })

    const { error } = await admin.from('returns').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Delete return error:', msg)
    return NextResponse.json({ error: 'Gagal menghapus data pengembalian', details: msg }, { status: 500 })
  }
}
