import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RoomInventoryList } from './RoomInventoryList'

interface Room {
  id: string
  name: string
  room_code: string | null
  buildings: { name: string } | null
}

interface InventoryItem {
  id: string
  name: string
  quantity: number
  condition: 'good' | 'needs_repair' | 'damaged'
  inventory_code: string | null
  notes: string | null
  photo_url: string | null
  last_updated_at: string
  users: { name: string } | null
  room_asset_id: string
}

export default async function InventoryPage({ 
  params 
}: { 
  params: Promise<{ roomId: string }> 
}) {
  const { roomId } = await params
  const supabase = await createClient()

  try {
    // Get room info from rooms table (not assets)
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name, room_code, buildings(name)')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      console.error('Room fetch error:', roomError)
      notFound()
    }

    // Get inventory items for this room
    const { data: items, error: itemsError } = await supabase
      .from('room_inventory_items')
      .select('id, name, quantity, condition, inventory_code, notes, photo_url, last_updated_at, users:last_updated_by(name), room_asset_id')
      .eq('room_asset_id', roomId)
      .eq('is_active', true)
      .order('name')

    if (itemsError) {
      console.error('Items fetch error:', itemsError)
    }

    return (
      <RoomInventoryList
        room={room as Room}
        items={(items || []) as InventoryItem[]}
        allItems={(items || []) as InventoryItem[]}
        roomId={roomId}
      />
    )
  } catch (error) {
    console.error('Inventory page error:', error)
    notFound()
  }
}
