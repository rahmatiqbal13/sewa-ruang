import { createClient } from '@/lib/supabase/server'
import { BatchQRClient } from './BatchQRClient'

export default async function BatchQRPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Check if super admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userProfile } = await (supabase.from('users') as any)
    .select('role')
    .eq('id', user!.id)
    .single()
  
  const isSuperAdmin = userProfile?.role === 'super_admin'

  // Fetch rooms
  const { data: roomsData } = await supabase
    .from('rooms')
    .select('id, name, room_code, buildings(name)')
    .eq('is_active', true)
    .eq('is_for_rent', true)
    .order('name')

  // Fetch equipment
  const { data: equipmentData } = await supabase
    .from('equipment')
    .select('id, name, equipment_code, category')
    .eq('is_active', true)
    .order('name')

  // Fetch inventory (only for super admin)
  let inventoryData: any[] = []
  if (isSuperAdmin) {
    const { data: inv } = await supabase
      .from('room_inventories')
      .select('id, name, inventory_code, category, rooms(name)')
      .eq('is_active', true)
      .order('name')
    inventoryData = inv || []
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Transform data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rooms = (roomsData as any[] || []).map(r => ({
    id: r.id,
    name: r.name,
    room_code: r.room_code,
    building_name: r.buildings?.name || '-'
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equipment = (equipmentData as any[] || []).map(e => ({
    id: e.id,
    name: e.name,
    equipment_code: e.equipment_code,
    category: e.category
  }))

  const inventory = (inventoryData || []).map(i => ({
    id: i.id,
    name: i.name,
    inventory_code: i.inventory_code,
    category: i.category,
    room_name: (i as any).rooms?.name || '-'
  }))

  return (
    <BatchQRClient 
      rooms={rooms} 
      equipment={equipment} 
      inventory={inventory}
      baseUrl={baseUrl}
      isSuperAdmin={isSuperAdmin}
    />
  )
}
