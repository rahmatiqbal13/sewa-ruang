import { createAdminDbClient } from '@/lib/supabase/server'
import { InventoryList } from './InventoryList'

export default async function InventoryIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ condition?: string }>
}) {
  const { condition } = await searchParams
  const sb = createAdminDbClient()

  try {
    // Query items
    let query = sb
      .from('room_inventory_items')
      .select(`
        id, name, quantity, condition, inventory_code, notes, photo_url, last_updated_at, room_asset_id
      `)
      .eq('is_active', true)
      .order('name')

    if (condition) query = (query as any).eq('condition', condition)

    const { data: itemsData, error: itemsError } = await query
    if (itemsError) {
      console.error('Error fetching inventory items:', itemsError)
      throw itemsError
    }

    // Get all room_ids from items
    const roomIds = [...new Set((itemsData || []).map((item) => item.room_asset_id).filter(Boolean))]

    // Fetch rooms data
    let roomsData: any[] = []
    if (roomIds.length > 0) {
      const { data: rooms, error: roomsError } = await sb
        .from('rooms')
        .select(`
          id, name, room_code, building_id,
          buildings!inner(name, code)
        `)
        .in('id', roomIds)

      if (roomsError) {
        console.error('Error fetching rooms:', roomsError)
      }
      roomsData = rooms || []
    }

    // Create rooms lookup map
    const roomsMap = new Map()
    roomsData.forEach((room: any) => {
      roomsMap.set(room.id, {
        id: room.id,
        name: room.name,
        room_code: room.room_code,
        buildings: room.buildings
      })
    })

    // Merge items with rooms data
    const items = (itemsData || []).map((item: any) => ({
      ...item,
      rooms: roomsMap.get(item.room_asset_id) || null
    }))

    // Query ALL items for export
    let allItemsQuery = sb
      .from('room_inventory_items')
      .select(`id, name, quantity, condition, inventory_code, notes, photo_url, last_updated_at, room_asset_id`)
      .eq('is_active', true)
      .order('name')

    if (condition) allItemsQuery = (allItemsQuery as any).eq('condition', condition)

    const { data: allItemsData } = await allItemsQuery

    // Merge all items with rooms data (reuse roomsMap)
    const allItems = (allItemsData || []).map((item: any) => ({
      ...item,
      rooms: roomsMap.get(item.room_asset_id) || null
    }))

    // Count per condition
    const { data: allConditionItems } = await sb
      .from('room_inventory_items')
      .select('condition')
      .eq('is_active', true)

    const condCounts: Record<string, number> = {}
    for (const i of allConditionItems ?? []) condCounts[i.condition] = (condCounts[i.condition] ?? 0) + 1

    // Build rooms summary for filter cards
    type RoomInfo = { id: string; name: string; room_code: string | null; buildings: { name: string; code: string } | null }
    const rooms = new Map<string, { room: RoomInfo; count: number; id: string }>()
    for (const item of items) {
      if (item.rooms && !rooms.has(item.room_asset_id)) {
        rooms.set(item.room_asset_id, { room: item.rooms, count: 0, id: item.room_asset_id })
      }
      if (rooms.has(item.room_asset_id)) {
        const current = rooms.get(item.room_asset_id)!
        current.count++
      }
    }

    return (
      <InventoryList
        items={items}
        allItems={allItems}
        rooms={Array.from(rooms.values())}
        condCounts={condCounts}
        totalCount={allConditionItems?.length || 0}
        currentCondition={condition || ''}
      />
    )
  } catch (error) {
    console.error('Inventory page error:', error)
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error loading inventory</h1>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    )
  }
}
