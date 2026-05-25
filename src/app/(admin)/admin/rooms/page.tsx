import { createAdminClient as createClient } from '@/lib/supabase/server'
import { RoomsPageClient } from './RoomsPageClient'

export const revalidate = 30

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

  try {
    // Get all buildings for filter dropdown (include floor_count)
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, code, floor_count')
      .eq('is_active', true)
      .order('name')

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError)
    }

    // Build query with filters - fetch ALL rooms for export functionality
    // Fix: Separate query for rooms to avoid join issues
    let roomsQuery = sb
      .from('rooms')
      .select('id, name, room_code, floor_number, capacity, rate_per_hour, rate_per_day, current_condition, is_active, is_for_rent, photo_url, description, building_id')
      .order('name')

    // Apply building filter
    if (buildingFilter) {
      roomsQuery = roomsQuery.eq('building_id', buildingFilter)
    }

    // Apply floor filter
    if (floorFilter) {
      roomsQuery = roomsQuery.eq('floor_number', parseInt(floorFilter))
    }

    // Apply rent filter
    if (for_rent === 'true')  roomsQuery = roomsQuery.eq('is_for_rent', true)
    if (for_rent === 'false') roomsQuery = roomsQuery.eq('is_for_rent', false)

    const { data: rooms, error: roomsError } = await roomsQuery as {
      data: Array<{
        id: string; name: string; room_code: string | null; floor_number: number | null
        capacity: number | null; rate_per_hour: number | null; rate_per_day: number | null
        current_condition: string; is_active: boolean; is_for_rent?: boolean
        photo_url: string | null; description?: string | null; building_id?: string | null
      }> | null
      error: any
    }

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError?.message ?? JSON.stringify(roomsError))
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-[10px] p-4">
            <h2 className="text-red-800 font-semibold">Error Loading Rooms</h2>
            <p className="text-red-600 mt-1">{roomsError.message}</p>
          </div>
        </div>
      )
    }

    // Get building info separately
    const roomsWithBuildings = rooms?.map(room => {
      const building = buildings?.find((b: { id: string }) => b.id === room.building_id)
      return {
        ...room,
        buildings: building || null
      }
    }) || []

    return (
      <RoomsPageClient 
        rooms={roomsWithBuildings} 
        buildings={buildings} 
        for_rent={for_rent}
        buildingFilter={buildingFilter}
        floorFilter={floorFilter}
      />
    )
  } catch (error) {
    console.error('Error in RoomsPage:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-[10px] p-4">
          <h2 className="text-red-800 font-semibold">Terjadi Kesalahan</h2>
          <p className="text-red-600 mt-1">Mohon refresh halaman atau hubungi admin</p>
        </div>
      </div>
    )
  }
}
