import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export const revalidate = 60

export default async function PublicInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: room }, { data: items }] = await Promise.all([
    sb.from('assets').select('id, name, room_code, description, buildings(name, code)').eq('id', id).single() as Promise<{data:{id:string;name:string;room_code:string|null;description:string|null;buildings:{name:string;code:string}|null}|null}>,
    sb.from('room_inventory_items')
      .select('id, name, quantity, condition, notes, last_updated_at')
      .eq('room_asset_id', id)
      .eq('is_active', true)
      .order('name') as Promise<{data:Array<{id:string;name:string;quantity:number;condition:string;notes:string|null;last_updated_at:string}>|null}>,
  ])

  if (!room) notFound()

  const conditionMap: Record<string, { label: string; variant: 'default'|'outline'|'destructive'; color: string }> = {
    good: { label: 'Baik', variant: 'default', color: 'text-green-700' },
    needs_repair: { label: 'Perlu Perbaikan', variant: 'outline', color: 'text-amber-700' },
    damaged: { label: 'Rusak', variant: 'destructive', color: 'text-red-700' },
  }

  const lastUpdated = items?.reduce((latest, item) =>
    !latest || item.last_updated_at > latest ? item.last_updated_at : latest, '')

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-bold text-primary">Sewa Ruang & Alat</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{room.name}</h1>
            {room.room_code && <Badge variant="outline" className="font-mono">{room.room_code}</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">
            {(room.buildings as {name:string}|null)?.name}
          </p>
          {room.description && <p className="text-sm mt-2">{room.description}</p>}
        </div>

        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Terakhir diperbarui: {formatDateTime(lastUpdated)}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventaris Ruangan ({items?.length ?? 0} item)</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {items?.length === 0 && (
              <p className="text-center text-muted-foreground py-6 text-sm">
                Belum ada data inventaris ruangan ini
              </p>
            )}
            {items?.map((item) => {
              const cond = conditionMap[item.condition]
              return (
                <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Jumlah: {item.quantity}</p>
                    {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                  </div>
                  <Badge variant={cond?.variant ?? 'secondary'}>{cond?.label ?? item.condition}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
