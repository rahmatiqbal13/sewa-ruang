import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { AdminShell } from '@/components/layouts/AdminShell'
import { isSuperAdmin } from '@/lib/permissions'

async function getInstitutionProfile() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) return null
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data } = await supabase.from('institution_profile').select('*').single()
    return data ?? null
  } catch {
    return null
  }
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = (await createAdminClient()) as any
  const { data: profile } = await adminDb
    .from('users')
    .select('role, name, photo_url')
    .eq('id', user.id)
    .single() as { data: { role: string; name: string; photo_url: string | null } | null }

  // Hanya super_admin yang boleh masuk ke route group ini
  if (!profile || !isSuperAdmin(profile.role)) {
    redirect('/admin/dashboard')
  }

  const institution = await getInstitutionProfile()

  return (
    <AdminShell
      userName={profile.name}
      userRole={profile.role}
      photoUrl={profile.photo_url ?? undefined}
      institution={institution}
    >
      {children}
    </AdminShell>
  )
}
