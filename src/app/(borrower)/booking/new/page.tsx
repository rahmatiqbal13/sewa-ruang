import { createClient } from '@/lib/supabase/server'
import { BookingForm } from './BookingForm'

type Asset = {
  id: string; name: string; category: string
  rate_per_hour: number | null; rate_per_day: number | null
  rate_mahasiswa: number | null; rate_pascasarjana: number | null
  rate_dosen_karyawan: number | null; rate_kerjasama: number | null; rate_umum: number | null
  current_condition: string; room_code: string | null; asset_code: string | null
  buildings: { name: string } | null
}

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  const { assetId } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const SELECT = 'id, name, category, rate_per_hour, rate_per_day, rate_mahasiswa, rate_pascasarjana, rate_dosen_karyawan, rate_kerjasama, rate_umum, current_condition, room_code, asset_code, buildings(name)'

  const [equipRes, roomRes, profileRes] = await Promise.all([
    sb.from('assets').select(SELECT).eq('is_active', true).eq('category', 'equipment').order('name') as Promise<{ data: Asset[] | null }>,
    // Only show rooms that are marked for rent (is_for_rent = true)
    sb.from('assets').select(SELECT).eq('is_active', true).eq('category', 'room').eq('is_for_rent', true).order('name') as Promise<{ data: Asset[] | null }>,
    sb.from('users').select('id, name, institution, class_division, borrower_category').eq('id', (await supabase.auth.getUser()).data.user!.id).single() as Promise<{ data: { id: string; name: string; institution: string; class_division: string; borrower_category: 'mahasiswa' | 'pascasarjana' | 'dosen_karyawan' | 'kerjasama' | 'umum' | null } | null }>,
  ])

  const assets = [...(equipRes.data ?? []), ...(roomRes.data ?? [])]

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Ajukan Peminjaman</h1>
      <BookingForm assets={assets} profile={profileRes.data} defaultAssetId={assetId} />
    </div>
  )
}
