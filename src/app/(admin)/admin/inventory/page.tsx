import { createClient } from '@/lib/supabase/server'
import { InventoryList } from './InventoryList'

export default async function InventoryIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ condition?: string }>
}) {
  const { condition } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Query paginated items (for display)
  let query = sb
    .from('room_inventory_items')
    .select('*, assets:room_asset_id(id, name, room_code, buildings(name, code))')
    .eq('is_active', true)
    .order('name')

  if (condition) query = query.eq('condition', condition)

  const { data: items } = await query as {
    data: Array<{
      id: string; name: string; quantity: number; condition: string
      inventory_code: string | null; notes: string | null
      room_asset_id: string
      assets: {
        id: string; name: string; room_code: string | null
        buildings: { name: string; code: string } | null
      } | null
    }> | null
  }

  // Query ALL items for export (without pagination)
  let allItemsQuery = sb
    .from('room_inventory_items')
    .select('*, assets:room_asset_id(id, name, room_code, buildings(name, code))')
    .eq('is_active', true)
    .order('name')

  if (condition) allItemsQuery = allItemsQuery.eq('condition', condition)

  const { data: allItems } = await allItemsQuery as {
    data: Array<{
      id: string; name: string; quantity: number; condition: string
      inventory_code: string | null; notes: string | null
      room_asset_id: string
      assets: {
        id: string; name: string; room_code: string | null
        buildings: { name: string; code: string } | null
      } | null
    }> | null
  }

  // Count per condition (always from full set)
  const { data: allConditionItems } = await sb
    .from('room_inventory_items')
    .select('condition')
    .eq('is_active', true) as { data: Array<{ condition: string }> | null }

  const condCounts: Record<string, number> = {}
  for (const i of allConditionItems ?? []) condCounts[i.condition] = (condCounts[i.condition] ?? 0) + 1

  type RoomInfo = { id: string; name: string; room_code: string | null; buildings: { name: string; code: string } | null }
  const rooms = new Map<string, { room: RoomInfo; count: number; id: string }>()
  for (const item of items ?? []) {
    if (item.assets && !rooms.has(item.room_asset_id)) {
      rooms.set(item.room_asset_id, { room: item.assets, count: 0, id: item.room_asset_id })
    }
    if (rooms.has(item.room_asset_id)) rooms.get(item.room_asset_id)!.count++
  }

  return (
    <InventoryList
      items={items || []}
      allItems={allItems || []}
      rooms={Array.from(rooms.values())}
      condCounts={condCounts}
      totalCount={allConditionItems?.length || 0}
      currentCondition={condition || ''}
    />
  )
}
