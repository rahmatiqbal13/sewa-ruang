import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RoomForm } from '../../RoomForm'

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [roomRes, buildingsRes] = await Promise.all([
    sb.from('rooms')
      .select('id, name, building_id, floor_number, room_sequence, description, capacity, is_for_rent, photo_url, room_rates(usage_category, rate_per_hour, rate_per_day)')
      .eq('id', id)
      .single(),
    sb.from('buildings')
      .select('id, name, code, floor_count')
      .eq('is_active', true)
      .order('name'),
  ])

  if (!roomRes.data) notFound()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Edit Ruangan</h1>
      <p className="text-muted-foreground text-sm mb-6">Perbarui data ruangan</p>
      <RoomForm room={roomRes.data} buildings={buildingsRes.data ?? []} />
    </div>
  )
}
