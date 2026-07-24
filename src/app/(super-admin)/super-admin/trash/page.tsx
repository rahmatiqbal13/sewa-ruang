import { createAdminDbClient } from '@/lib/supabase/server'
import { Trash2 } from 'lucide-react'
import { TrashClient, type TrashItem } from './TrashClient'

export default async function TrashPage() {
  const sb = createAdminDbClient()

  const [equipmentRes, roomsRes, inventoryRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any).from('equipment')
      .select('id, name, equipment_code, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any).from('rooms')
      .select('id, name, room_code, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any).from('room_inventories')
      .select('id, name, inventory_code, merk, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200),
  ])

  const items: TrashItem[] = [
    ...((equipmentRes.data ?? []) as Array<{ id: string; name: string; equipment_code: string | null; deleted_at: string }>)
      .map(e => ({
        id: e.id,
        name: e.name,
        code: e.equipment_code,
        type: 'equipment' as const,
        typeLabel: 'Alat',
        deletedAt: e.deleted_at,
        extra: null,
      })),

    ...((roomsRes.data ?? []) as Array<{ id: string; name: string; room_code: string | null; deleted_at: string }>)
      .map(r => ({
        id: r.id,
        name: r.name,
        code: r.room_code,
        type: 'room' as const,
        typeLabel: 'Ruangan',
        deletedAt: r.deleted_at,
        extra: null,
      })),

    ...((inventoryRes.data ?? []) as Array<{ id: string; name: string; inventory_code: string | null; merk: string | null; deleted_at: string }>)
      .map(i => ({
        id: i.id,
        name: i.name,
        code: i.inventory_code,
        type: 'inventory' as const,
        typeLabel: 'Inventaris',
        deletedAt: i.deleted_at,
        extra: i.merk,
      })),
  ].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-red-500" />
          Trash / Recycle Bin
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Item yang dihapus. Bisa direstore atau dihapus permanen dari sini.
        </p>
      </div>

      <TrashClient items={items} />
    </div>
  )
}
