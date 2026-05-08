import { createClient } from '@/lib/supabase/server'
import { RoomsPageClient } from './RoomsPageClient'

interface SearchParams {
  for_rent?: string
  building?: string
  floor?: string
}

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { for_rent, building: buildingFilter, floor: floorFilter } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Get all buildings for filter dropdown (include floor_count)
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name, code, floor_count')
    .eq('is_active', true)
    .order('name')

  // Build query with filters - fetch ALL rooms for export functionality
  let query = sb
    .from('rooms')
    .select('id, name, room_code, floor_number, capacity, rate_per_hour, current_condition, is_active, is_for_rent, photo_url, room_type, description, building_id, floor, buildings(id, name, code)')
    .order('name')

  // Apply building filter
  if (buildingFilter) {
    query = query.eq('building_id', buildingFilter)
  }

  // Apply floor filter
  if (floorFilter) {
    query = query.eq('floor_number', parseInt(floorFilter))
  }

  // Apply rent filter
  if (for_rent === 'true')  query = query.eq('is_for_rent', true)
  if (for_rent === 'false') query = query.eq('is_for_rent', false)

  const { data: rooms } = await query as {
    data: Array<{
      id: string; name: string; room_code: string | null; floor_number: number | null
      capacity: number | null; rate_per_hour: number | null; current_condition: string
      is_active: boolean; is_for_rent?: boolean; photo_url: string | null
      room_type?: string; description?: string | null; building_id?: string | null
      floor?: number | null
      buildings: { id: string; name: string; code: string } | null
    }> | null
  }

  return (
    <RoomsPageClient 
      rooms={rooms} 
      buildings={buildings} 
      for_rent={for_rent}
      buildingFilter={buildingFilter}
      floorFilter={floorFilter}
    />
  )
}
