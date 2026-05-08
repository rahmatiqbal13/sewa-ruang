import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RoomInventoryList } from './RoomInventoryList'

export default async function InventoryPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Get room info
  const { data: room } = await sb
    .from('assets')
    .select('id, name, room_code, buildings(name)')
    .eq('id', roomId)
    .single()

  if (!room) notFound()

  // Get paginated items (for display)
  const { data: items } = await sb
    .from('room_inventory_items')
    .select('*, users:last_updated_by(name)')
    .eq('room_asset_id', roomId)
    .eq('is_active', true)
    .order('name')

  // Get ALL items for export (without pagination)
  const { data: allItems } = await sb
    .from('room_inventory_items')
    .select('*, users:last_updated_by(name)')
    .eq('room_asset_id', roomId)
    .eq('is_active', true)
    .order('name')

  return (
    <RoomInventoryList
      room={room}
      items={items || []}
      allItems={allItems || []}
      roomId={roomId}
    />
  )
}
