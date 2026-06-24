import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layouts/AdminShell'
import { getInstitutionProfile } from '@/lib/institution'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // createClient (anon) hanya untuk auth.getUser() — token ada di cookie user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // createAdminClient (service role) untuk role check — bypass RLS agar tidak
  // tergantung pada policy users table yang bisa berubah
  const adminDb = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await ((adminDb as any).from('users') as any)
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
