import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifySuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('users') as any).select('role').eq('id', user.id).single() as { data: { role: string } | null }
  return data?.role === 'super_admin'
}

// DELETE /api/super-admin/users/[id] — permanently delete user
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifySuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = adminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
