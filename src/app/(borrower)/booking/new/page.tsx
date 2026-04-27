import { createClient } from '@/lib/supabase/server'
import { BookingForm } from './BookingForm'

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  const { assetId } = await searchParams
  const supabase = await createClient()

  const [{ data: assets }, { data: profile }] = await Promise.all([
    supabase.from('assets').select('id, name, category, rate_per_hour, rate_per_day, current_condition, room_code, buildings(name)').eq('is_active', true).order('name'),
    supabase.from('users').select('id, name, institution, class_division').eq('id', (await supabase.auth.getUser()).data.user!.id).single(),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Ajukan Peminjaman</h1>
      <BookingForm assets={assets ?? []} profile={profile} defaultAssetId={assetId} />
    </div>
  )
}
