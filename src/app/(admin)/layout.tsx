import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layouts/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('users') as any)
    .select('role, name')
    .eq('id', user.id)
    .single() as { data: { role: string; name: string } | null }

  if (!profile || !['super_admin', 'admin', 'staff'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return <AdminShell>{children}</AdminShell>
}
