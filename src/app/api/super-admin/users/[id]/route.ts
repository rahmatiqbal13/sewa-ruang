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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('users') as any).select('role').eq('id', user.id).single() as { data: { role: string } | null }
  return data?.role === 'super_admin'
}

// PATCH /api/super-admin/users/[id] — update profile, role, and/or password
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifySuperAdmin()) {
    return NextResponse.json({ error: 'Akses ditolak. Hanya Super Admin.' }, { status: 403 })
  }

  const admin = adminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Konfigurasi server tidak lengkap.' }, { status: 500 })
  }

  const { id } = await params
  const body = await req.json()
  const { name, phone, institution, class_division, identity_number, telegram_username, role, password } = body

  // Build profile update payload (exclude plain_password — handled separately)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileUpdate: Record<string, any> = {}
  if (name !== undefined) profileUpdate.name = name
  if (phone !== undefined) profileUpdate.phone = phone || null
  if (institution !== undefined) profileUpdate.institution = institution || null
  if (class_division !== undefined) profileUpdate.class_division = class_division || null
  if (identity_number !== undefined) profileUpdate.identity_number = identity_number || null
  if (telegram_username !== undefined) profileUpdate.telegram_username = telegram_username || null
  if (role !== undefined) profileUpdate.role = role

  if (Object.keys(profileUpdate).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (admin.from('users') as any).update(profileUpdate).eq('id', id)
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
  }

  // Update password in Supabase Auth if provided
  if (password && password !== '') {
    const { error: authError } = await admin.auth.admin.updateUserById(id, { password })
    if (authError) {
      return NextResponse.json({ error: 'Gagal update password: ' + authError.message }, { status: 400 })
    }

    // Password updated in Supabase Auth above. Do NOT store plaintext.
  }

  return NextResponse.json({ success: true })
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
