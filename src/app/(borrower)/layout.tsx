import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BorrowerNav } from '@/components/layouts/BorrowerNav'
import { CreditFooter } from '@/components/shared/CreditFooter'

export default async function BorrowerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('users') as any)
    .select('role, name, photo_url')
    .eq('id', user.id)
    .single() as { data: { role: string; name: string; photo_url: string | null } | null }

  if (!profile) redirect('/login')
  if (profile.role === 'admin' || profile.role === 'staff') redirect('/admin/dashboard')

  return (
      <div className="min-h-screen bg-muted flex flex-col">
      <BorrowerNav userName={profile.name} photoUrl={profile.photo_url ?? undefined} />
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {children}
      </main>
      <CreditFooter />
    </div>
  )
}
