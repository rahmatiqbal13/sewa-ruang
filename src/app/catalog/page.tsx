import { createClient } from '@/lib/supabase/server'
import { CatalogClient } from './CatalogClient'

export const revalidate = 30

export default async function CatalogPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Query dari tabel rooms (baru) dan equipment (baru)
  const [{ data: buildingsData }, { data: roomsData }, { data: equipmentData }] = await Promise.all([
    sb.from('buildings')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name') as Promise<{ data: any[] | null }>,
    sb.from('rooms')
      .select('id, name, building_id, capacity, current_condition, room_code, is_active, is_for_rent, room_rates(usage_category, rate_per_hour, rate_per_day)')
      .eq('is_active', true)
      .eq('is_for_rent', true)
      .order('name') as Promise<{ data: any[] | null }>,
    sb.from('equipment')
      .select(`
        id, name, description, current_condition, ketersediaan, merk, is_active, photo_url,
        equipment_rates(user_category, rate_per_day, rate_per_hour, requires_supervision)
      `)
      .eq('is_active', true)
      .eq('current_condition', 'good')
      .order('name') as Promise<{ data: any[] | null }>,
  ])

  console.log('Buildings data:', buildingsData?.length || 0, 'items')
  console.log('Rooms data:', roomsData?.length || 0, 'items')
  console.log('Equipment data:', equipmentData?.length || 0, 'items')

  // Transform data buildings untuk compatibility dengan CatalogClient
  // Gabungkan buildings dengan rooms
  const transformedBuildings = buildingsData?.map(building => ({
    id: building.id,
    name: building.name,
    code: building.code,
    assets: roomsData?.filter(room => room.building_id === building.id) || []
  })).filter(b => b.assets.length > 0) || []

  console.log('Transformed buildings:', transformedBuildings.length, 'items')
  console.log('Sample building:', transformedBuildings[0])

  return (
    <CatalogClient
      buildings={transformedBuildings}
      equipment={equipmentData ?? []}
    />
  )
}
