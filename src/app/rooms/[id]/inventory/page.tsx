import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Building2, Clock, Package2, ImageOff } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import Image from 'next/image'

export const revalidate = 60

export default async function PublicInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: room }, { data: items }] = await Promise.all([
    sb.from('assets')
      .select('id, name, room_code, description, photo_url, buildings(name, code)')
      .eq('id', id)
      .single() as Promise<{data:{id:string;name:string;room_code:string|null;description:string|null;photo_url:string|null;buildings:{name:string;code:string}|null}|null}>,
    sb.from('room_inventory_items')
      .select('id, name, quantity, condition, notes, photo_url, inventory_code, last_updated_at')
      .eq('room_asset_id', id)
      .eq('is_active', true)
      .order('name') as Promise<{data:Array<{id:string;name:string;quantity:number;condition:string;notes:string|null;photo_url:string|null;inventory_code:string|null;last_updated_at:string}>|null}>,
  ])

  if (!room) notFound()

  const lastUpdated = items?.reduce((latest, item) =>
    !latest || item.last_updated_at > latest ? item.last_updated_at : latest, '')

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-blue-950 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <span className="font-bold">Sewa Ruang & Alat</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Room info card */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {room.photo_url ? (
            <div className="relative h-48 w-full">
              <Image src={room.photo_url} alt={room.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="h-32 bg-gradient-to-br from-blue-950 to-indigo-900 flex items-center justify-center">
              <Building2 className="h-12 w-12 text-white/30" />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold">{room.name}</h1>
              {room.room_code && (
                <span className="text-xs font-mono bg-zinc-100 border rounded px-2 py-0.5">{room.room_code}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {(room.buildings as {name:string}|null)?.name ?? 'Tanpa gedung'}
            </p>
            {room.description && <p className="text-sm text-zinc-600 mt-2">{room.description}</p>}
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
                <Clock className="h-3 w-3" />
                Inventaris terakhir diperbarui: {formatDateTime(lastUpdated)}
              </div>
            )}
          </div>
        </div>

        {/* Inventory section */}
        <div>
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
            Inventaris Ruangan — {items?.length ?? 0} item
          </h2>

          {items?.length === 0 && (
            <div className="bg-white rounded-2xl border shadow-sm p-10 text-center">
              <Package2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada data inventaris ruangan ini</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items?.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border shadow-sm overflow-hidden flex">
                {/* Photo column */}
                <div className="w-20 shrink-0 bg-zinc-100 flex items-center justify-center">
                  {item.photo_url ? (
                    <div className="relative w-20 h-full min-h-[80px]">
                      <Image src={item.photo_url} alt={item.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <ImageOff className="h-6 w-6 text-zinc-300" />
                  )}
                </div>
                {/* Content column */}
                <div className="flex-1 p-3 flex flex-col justify-between min-h-[80px]">
                  <div>
                    <p className="font-medium text-sm leading-tight">{item.name}</p>
                    {item.inventory_code && (
                      <p className="text-xs font-mono text-muted-foreground">{item.inventory_code}</p>
                    )}
                    {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Jml: {item.quantity}</span>
                    <ConditionBadge condition={item.condition as 'good' | 'needs_repair' | 'damaged' | 'lost'} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
