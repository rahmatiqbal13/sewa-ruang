/* eslint-disable react-hooks/error-boundaries */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
    // Query items — is_active = true AND deleted_at IS NULL ensures trash items never show
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (sb as any)
      .from('room_inventories')
      .select(`id, name, merk, quantity, condition, inventory_code, notes, photo_url, last_updated_at, room_id`)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name')

    if (condition) {
      query = (query as any).eq('condition', condition)
    }

    const { data: itemsData, error: itemsError } = await query
    if (itemsError) {
      console.error('Error fetching inventory items:', itemsError)
      throw itemsError
    }

    // Get all room_ids from items
    const roomIds = [...new Set((itemsData || []).map((item: any) => item.room_id).filter(Boolean))] as string[]

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
      rooms: roomsMap.get(item.room_id) || null
    }))

    // Query ALL items for export
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allItemsQuery = (sb as any)
      .from('room_inventories')
      .select(`id, name, merk, quantity, condition, inventory_code, notes, photo_url, last_updated_at, room_id`)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name')

    if (condition) {
      allItemsQuery = (allItemsQuery as any).eq('condition', condition)
    }

    const { data: allItemsData } = await allItemsQuery

    // Merge all items with rooms data (reuse roomsMap)
    const allItems = (allItemsData || []).map((item: any) => ({
      ...item,
      rooms: roomsMap.get(item.room_id) || null
    }))

    // Count per condition — exclude trash items from count
    const { data: allConditionItems } = await (sb as any)
      .from('room_inventories')
      .select('condition')
      .eq('is_active', true)
      .is('deleted_at', null)

    const condCounts: Record<string, number> = {}
    for (const i of allConditionItems ?? []) condCounts[i.condition] = (condCounts[i.condition] ?? 0) + 1

    // Build rooms summary for filter cards
    type RoomInfo = { id: string; name: string; room_code: string | null; buildings: { name: string; code: string } | null }
    const rooms = new Map<string, { room: RoomInfo; count: number; id: string }>()
    for (const item of items) {
      if (item.rooms && !rooms.has(item.room_id)) {
        rooms.set(item.room_id, { room: item.rooms, count: 0, id: item.room_id })
      }
      if (rooms.has(item.room_id)) {
        const current = rooms.get(item.room_id)!
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
