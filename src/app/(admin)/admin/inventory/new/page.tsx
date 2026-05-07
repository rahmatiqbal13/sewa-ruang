import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InventoryForm } from '../InventoryForm'

export default async function NewInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string }>
}) {
  const { roomId } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: userData } = await sb
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
    redirect('/admin/dashboard')
  }

  // Get all rooms with building info
  const { data: roomsData } = await supabase
    .from('rooms')
    .select('id, name, room_code, buildings(name, code)')
    .eq('is_active', true)
    .order('name')

  // Transform rooms data
  const rooms = roomsData?.map((room: any) => ({
    id: room.id,
    name: room.name,
    room_code: room.room_code,
    building_name: room.buildings?.name || 'Unknown',
    building_code: room.buildings?.code || '',
  })) ?? []

  return (
    <div className="p-6">
      <InventoryForm 
        rooms={rooms}
        preselectedRoomId={roomId}
      />
    </div>
  )
}
