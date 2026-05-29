import { createAdminDbClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Building2, Clock, Package2, ImageOff } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { SafeImage } from '@/components/shared/SafeImage'
import { CreditFooter } from '@/components/shared/CreditFooter'

export const revalidate = 60

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default async function PublicInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const sb = createAdminDbClient()

  // Find room by slug
  const { data: allRooms } = await sb.from('rooms').select('id, name').eq('is_active', true)
  const matched = allRooms?.find((r: { id: string; name: string }) => createSlug(r.name) === slug)
  if (!matched) notFound()
  const id = matched.id

  const [{ data: room }, { data: items }] = await Promise.all([
    sb.from('rooms')
      .select('id, name, room_code, description, photo_url, buildings(name, code)')
      .eq('id', id)
      .single(),
    sb.from('room_inventory_items')
      .select('id, name, quantity, condition, notes, photo_url, inventory_code, last_updated_at')
      .eq('room_asset_id', id)
      .eq('is_active', true)
      .order('name'),
  ]) as [{ data: any }, { data: any[] | null }]

  if (!room) notFound()

  const lastUpdated = items?.reduce((latest: string, item: any) =>
    !latest || item.last_updated_at > latest ? item.last_updated_at : latest, '')

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-blue-950 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <span className="font-bold">Sewa Ruang & Alat</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Room info card */}
        <div className="bg-card rounded-[14px] border border-border shadow-soft overflow-hidden">
          {room.photo_url ? (
            <div className="relative h-48 w-full bg-muted flex items-center justify-center p-4">
              <SafeImage 
                src={room.photo_url} 
                alt={room.name} 
                className="object-contain w-full h-full"
                fallbackClassName="w-full h-full rounded-[10px]"
              />
            </div>
          ) : (
            <div className="h-32 bg-muted flex items-center justify-center">
              <Building2 className="h-12 w-12 text-white/30" />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold">{room.name}</h1>
              {room.room_code && (
                <span className="text-xs font-mono bg-muted border border-border rounded-[10px] px-2 py-0.5">{room.room_code}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {(room.buildings as {name:string}|null)?.name ?? 'Tanpa gedung'}
            </p>
            {room.description && <p className="text-sm text-muted-foreground mt-2">{room.description}</p>}
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
            <div className="bg-card rounded-[14px] border border-border shadow-soft p-10 text-center">
              <Package2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada data inventaris ruangan ini</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items?.map((item) => (
              <div key={item.id} className="bg-card rounded-[14px] border border-border shadow-soft overflow-hidden flex">
                {/* Photo column */}
                <div className="w-24 shrink-0 bg-muted flex items-center justify-center p-1">
                  {item.photo_url ? (
                    <div className="relative w-full h-full min-h-[80px] flex items-center justify-center">
                      <SafeImage 
                        src={item.photo_url} 
                        alt={item.name} 
                        className="object-contain w-full h-full max-h-20"
                        fallbackClassName="w-full h-full rounded"
                      />
                    </div>
                  ) : (
                    <ImageOff className="h-6 w-6 text-muted-foreground/30" />
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
      <CreditFooter />
    </div>
  )
}
