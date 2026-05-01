import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Boxes, ChevronRight, Building2, DoorOpen, Package } from 'lucide-react'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CONDITIONS = [
  { value: '',             label: 'Semua',        color: 'bg-zinc-800 text-white' },
  { value: 'good',         label: 'Baik',         color: 'bg-green-600 text-white' },
  { value: 'needs_repair', label: 'Rusak Ringan', color: 'bg-yellow-500 text-white' },
  { value: 'damaged',      label: 'Rusak Berat',  color: 'bg-red-600 text-white' },
]

export default async function InventoryIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ condition?: string }>
}) {
  const { condition } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

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

  // Count per condition (always from full set)
  const { data: allItems } = await sb
    .from('room_inventory_items')
    .select('condition')
    .eq('is_active', true) as { data: Array<{ condition: string }> | null }

  const condCounts: Record<string, number> = {}
  for (const i of allItems ?? []) condCounts[i.condition] = (condCounts[i.condition] ?? 0) + 1

  type RoomInfo = { id: string; name: string; room_code: string | null; buildings: { name: string; code: string } | null }
  const rooms = new Map<string, { room: RoomInfo; count: number; id: string }>()
  for (const item of items ?? []) {
    if (item.assets && !rooms.has(item.room_asset_id)) {
      rooms.set(item.room_asset_id, { room: item.assets, count: 0, id: item.room_asset_id })
    }
    if (rooms.has(item.room_asset_id)) rooms.get(item.room_asset_id)!.count++
  }

  const conditionCardClass: Record<string, string> = {
    good: 'bg-emerald-50 border-emerald-200',
    needs_repair: 'bg-amber-50 border-amber-200',
    damaged: 'bg-red-50 border-red-200',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventaris Ruangan</h1>
          <p className="text-muted-foreground text-sm">Seluruh item inventaris di semua ruangan</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500 bg-white border rounded-lg px-3 py-1.5">
          <Boxes className="h-4 w-4 text-teal-500" />
          {allItems?.length ?? 0} item · {rooms.size} ruangan
        </div>
      </div>

      {/* Condition filter */}
      <div className="flex gap-2 flex-wrap">
        {CONDITIONS.map(tab => {
          const isActive = (condition ?? '') === tab.value
          const count = tab.value ? (condCounts[tab.value] ?? 0) : (allItems?.length ?? 0)
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/inventory?condition=${tab.value}` : '/admin/inventory'}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                isActive ? tab.color : 'bg-white border text-zinc-600 hover:bg-zinc-50'
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn('text-xs rounded-full px-1.5 py-0.5 font-bold', isActive ? 'bg-white/20' : 'bg-zinc-100')}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Room summary cards (only when no filter) */}
      {!condition && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from(rooms.values()).map(({ room, count, id }) => (
            <Link
              key={id}
              href={`/admin/inventory/${id}`}
              className="bg-white rounded-xl border shadow-sm p-3 hover:shadow-md hover:border-teal-300 transition-all group"
            >
              <div className="flex items-center gap-2 mb-1">
                <DoorOpen className="h-4 w-4 text-purple-400 shrink-0" />
                <span className="text-xs font-mono text-zinc-400">{room.room_code ?? '—'}</span>
              </div>
              <p className="text-sm font-semibold text-zinc-800 truncate group-hover:text-teal-700">{room.name}</p>
              {room.buildings && (
                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 text-orange-400 shrink-0" />
                  {room.buildings.name}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">{count} item</Badge>
                <ChevronRight className="h-3 w-3 text-zinc-300 group-hover:text-teal-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* All items grid */}
      <div>
        <h2 className="text-base font-semibold text-zinc-700 mb-3">
          {condition ? `Item kondisi — ${CONDITIONS.find(c => c.value === condition)?.label}` : 'Semua Item Inventaris'}
        </h2>
        {items?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Tidak ada item {condition ? 'dengan kondisi ini' : 'inventaris'}</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {items?.map((item) => {
            const room = item.assets
            const cardClass = conditionCardClass[item.condition] ?? 'bg-zinc-50 border-zinc-200'
            return (
              <div key={item.id} className={`rounded-xl border p-3 transition-shadow hover:shadow-md ${cardClass}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-zinc-900 truncate">{item.name}</p>
                    {item.inventory_code && (
                      <span className="text-xs font-mono text-zinc-400">{item.inventory_code}</span>
                    )}
                  </div>
                  <ConditionBadge condition={item.condition} />
                </div>

                <div className="mt-2 space-y-1 text-xs text-zinc-500">
                  {room && (
                    <>
                      <p className="flex items-center gap-1">
                        <DoorOpen className="h-3 w-3 text-purple-400 shrink-0" />
                        {room.name}
                        {room.room_code && <span className="font-mono">({room.room_code})</span>}
                      </p>
                      {room.buildings && (
                        <p className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-orange-400 shrink-0" />
                          {room.buildings.name}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5">
                  <span className="text-xs text-zinc-600 font-medium">{item.quantity} unit</span>
                  {room && (
                    <Link
                      href={`/admin/inventory/${item.room_asset_id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' h-6 px-2 text-xs'}
                    >
                      Detail <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
