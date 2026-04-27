import { createClient } from '@/lib/supabase/server'
import { BookingForm } from './BookingForm'

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  const { assetId } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: assets }, { data: profile }] = await Promise.all([
    sb.from('assets').select('id, name, category, rate_per_hour, rate_per_day, current_condition, room_code, buildings(name)').eq('is_active', true).order('name') as Promise<{ data: Array<{ id: string; name: string; category: string; rate_per_hour: number | null; rate_per_day: number | null; current_condition: string; room_code: string | null; buildings: { name: string } | null }> | null }>,
    sb.from('users').select('id, name, institution, class_division').eq('id', (await supabase.auth.getUser()).data.user!.id).single() as Promise<{ data: { id: string; name: string; institution: string; class_division: string } | null }>,
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Ajukan Peminjaman</h1>
      <BookingForm assets={assets ?? []} profile={profile} defaultAssetId={assetId} />
    </div>
  )
}
