import { createAdminClient as createClient } from '@/lib/supabase/server'
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

  // Get all buildings
  const { data: buildingsData } = await supabase
    .from('buildings')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')

  // Get all rooms with building info
  const { data: roomsData } = await supabase
    .from('rooms')
    .select('id, name, room_code, building_id, buildings(name, code)')
    .eq('is_active', true)
    .order('name')

  // Transform buildings data
  const buildings = buildingsData?.map((b: any) => ({
    id: b.id,
    name: b.name,
    code: b.code,
  })) ?? []

  // Transform rooms data
  const rooms = roomsData?.map((room: any) => ({
    id: room.id,
    name: room.name,
    room_code: room.room_code,
    building_id: room.building_id,
    building_name: room.buildings?.name || 'Unknown',
    building_code: room.buildings?.code || '',
  })) ?? []

  // Generate next inventory code
  // Get the highest existing code number
  const { data: maxCodeData } = await sb
    .from('room_inventory_items')
    .select('inventory_code')
    .not('inventory_code', 'is', null)
    .ilike('inventory_code', 'INV-%')
    .order('inventory_code', { ascending: false })
    .limit(1)
    .single()

  let nextCode = 'INV-0001'
  if (maxCodeData?.inventory_code) {
    const match = maxCodeData.inventory_code.match(/INV-(\d+)/)
    if (match) {
      const lastNum = parseInt(match[1], 10)
      nextCode = `INV-${String(lastNum + 1).padStart(4, '0')}`
    }
  }

  return (
    <div className="p-6">
      <InventoryForm 
        buildings={buildings}
        rooms={rooms}
        preselectedRoomId={roomId}
        nextCode={nextCode}
      />
    </div>
  )
}
