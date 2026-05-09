import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RoomForm } from '../../RoomForm'
import Link from 'next/link'
import { ArrowLeft, DoorOpen } from 'lucide-react'

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [roomRes, buildingsRes, ratesRes] = await Promise.all([
    sb.from('rooms')
      .select('id, name, building_id, floor_number, room_sequence, description, capacity, is_for_rent, photo_url')
      .eq('id', id)
      .single(),
    sb.from('buildings')
      .select('id, name, code, floor_count')
      .eq('is_active', true)
      .order('name'),
    sb.from('room_rates')
      .select('usage_category, rate_per_hour, rate_per_day')
      .eq('room_id', id),
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
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar ruangan
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
          <DoorOpen className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Ruangan</h1>
          <p className="text-slate-500">Perbarui informasi ruangan: {roomRes.data.name}</p>
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
