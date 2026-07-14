import { createAdminDbClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RoomForm } from '../../RoomForm'
import Link from 'next/link'
import { ArrowLeft, DoorOpen } from 'lucide-react'

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const sb = createAdminDbClient()

  // Find room by slug
  const { data: allRooms } = await sb.from('rooms').select('id, name')
  const matched = allRooms?.find((r: { id: string; name: string }) => createSlug(r.name) === slug)
  if (!matched) notFound()
  const id = matched.id

  const [roomRes, buildingsRes, ratesRes] = await Promise.all([
    sb.from('rooms')
      .select('id, name, building_id, floor_number, room_sequence, description, capacity, is_for_rent, photo_url, door_photo_url')
      .eq('id', id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .single() as any,
    sb.from('buildings')
      .select('id, name, code, floor_count')
      .eq('is_active', true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .order('name') as any,
    sb.from('room_rates')
      .select('usage_category, rate_per_hour, rate_per_day')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('room_id', id) as any,
  ])

  if (!roomRes.data) notFound()

  // Merge room_rates into room data
  const roomData = {
    ...roomRes.data,
    room_rates: ratesRes.data || []
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Back Button */}
      <Link 
        href="/admin/rooms"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar ruangan
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 bg-primary rounded-[14px] flex items-center justify-center shadow-lg">
          <DoorOpen className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Ruangan</h1>
          <p className="text-muted-foreground">Perbarui informasi ruangan: {roomRes.data.name}</p>
        </div>
      </div>

      <RoomForm 
        key={roomData.id} 
        room={roomData} 
        buildings={buildingsRes.data ?? []} 
      />
    </div>
  )
}
