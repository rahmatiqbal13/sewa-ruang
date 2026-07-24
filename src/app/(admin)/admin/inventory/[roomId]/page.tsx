/* eslint-disable react-hooks/error-boundaries */
import { createAdminDbClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RoomInventoryList } from './RoomInventoryList'

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

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
  room_id: string
}

export default async function InventoryPage({ 
  params 
}: { 
  params: Promise<{ roomId: string }> 
}) {
  const { roomId: slug } = await params
  const sb = createAdminDbClient()

  try {
    // Find room by slug
    const { data: allRooms } = await sb.from('rooms').select('id, name')
    const matched = allRooms?.find((r: { id: string; name: string }) => createSlug(r.name) === slug)
    if (!matched) notFound()
    const roomId = matched.id

    // Get room info from rooms table (not assets)
    const { data: room, error: roomError } = await sb
      .from('rooms')
      .select('id, name, room_code, buildings(name)')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      console.error('Room fetch error:', roomError)
      notFound()
    }

    // Get inventory items for this room — is_active = true AND deleted_at IS NULL excludes trash
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items, error: itemsError } = await (sb as any)
      .from('room_inventories')
      .select('id, name, merk, quantity, condition, inventory_code, notes, photo_url, last_updated_at, users:last_updated_by(name), room_id')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name')

    if (itemsError) {
      console.error('Items fetch error:', itemsError)
    }

    return (
      <RoomInventoryList
        room={room as Room}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items={(items || []) as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allItems={(items || []) as any}
        roomId={roomId}
      />
    )
  } catch (error) {
    console.error('Inventory page error:', error)
    notFound()
  }
}
