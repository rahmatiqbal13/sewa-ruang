import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AssetForm } from '../../../assets/AssetForm'

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [assetRes, buildingsRes] = await Promise.all([
    sb.from('assets').select('*').eq('id', id).single(),
    sb.from('buildings').select('id, name, code, floor_count').order('name'),
  ])

  if (!assetRes.data) notFound()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Ruangan</h1>
      <AssetForm asset={assetRes.data} buildings={buildingsRes.data ?? []} lockedCategory="room" />
    </div>
  )
}
