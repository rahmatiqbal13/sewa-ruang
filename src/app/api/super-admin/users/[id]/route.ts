import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdmin(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function verifySuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  // Read own profile — RLS allows users to read their own row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('users') as any).select('role').eq('id', user.id).single() as { data: { role: string } | null }
  return data?.role === 'super_admin'
}

// DELETE /api/super-admin/users/[id] — permanently delete user
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifySuperAdmin()) {
    return NextResponse.json({ error: 'Akses ditolak. Hanya Super Admin yang dapat menghapus pengguna.' }, { status: 403 })
  }

  const admin = adminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Konfigurasi server tidak lengkap (SUPABASE_SERVICE_ROLE_KEY belum diset di environment).' }, { status: 500 })
  }

  const { id } = await params

  // Delete auth user (cascade triggers public.users deletion if configured)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    // If auth deletion failed, still try to clean up public.users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('users') as any).delete().eq('id', id)
    return NextResponse.json({ error: `Gagal menghapus: ${error.message}` }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
