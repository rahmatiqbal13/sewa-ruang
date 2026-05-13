import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { AdminShell } from '@/components/layouts/AdminShell'

// Server-side fetch institution profile
async function getInstitutionProfile() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return null
    }
    
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    const { data, error } = await supabase
      .from('institution_profile')
      .select('*')
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching institution profile:', error)
    return null
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('users') as any)
    .select('role, name, photo_url')
    .eq('id', user.id)
    .single() as { data: { role: string; name: string; photo_url: string | null } | null }

  if (!profile || !['super_admin', 'admin', 'staff'].includes(profile.role)) {
    redirect('/dashboard')
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
