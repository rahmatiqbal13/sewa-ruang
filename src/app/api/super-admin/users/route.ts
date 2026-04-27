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

// POST /api/super-admin/users — create new user
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('users') as any).select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, email, password, role, phone, institution, class_division, identity_number, telegram_username } = body

  const admin = adminClient()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('users') as any).insert({
    id: authData.user.id,
    name, email, role,
    phone: phone || null,
    institution: institution || null,
    class_division: class_division || null,
    identity_number: identity_number || null,
    telegram_username: telegram_username || null,
  })

  return NextResponse.json({ success: true })
}
