import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Building2, Package, Users, Clock, MapPin } from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'

export const revalidate = 30

export default async function CatalogPage() {
  const supabase = await createClient()
  type BuildingRow = {id:string;name:string;code:string;assets:Array<{id:string;name:string;capacity:number|null;rate_per_hour:number|null;rate_per_day:number|null;current_condition:string;room_code:string|null;is_active:boolean}>}
  type EquipmentRow = {id:string;name:string;description:string|null;rate_per_hour:number|null;rate_per_day:number|null;current_condition:string;is_active:boolean}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: buildings }, { data: equipment }] = await Promise.all([
    sb
      .from('buildings')
      .select('id, name, code, assets(id, name, capacity, rate_per_hour, rate_per_day, current_condition, room_code, is_active)')
      .eq('is_active', true)
      .order('name') as Promise<{data: BuildingRow[] | null}>,
    sb
      .from('assets')
      .select('id, name, description, rate_per_hour, rate_per_day, current_condition, is_active')
      .eq('category', 'equipment')
      .eq('is_active', true)
      .order('name') as Promise<{data: EquipmentRow[] | null}>,
  ])

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-primary">
            <Building2 className="h-5 w-5" />
            Sewa Ruang & Alat
          </div>
          <div className="flex gap-2">
            <Link href="/login" className={buttonVariants({ variant: 'outline' })}>Masuk</Link>
            <Link href="/register" className={buttonVariants()}>Daftar</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-3xl font-bold mb-1">Katalog Ruang & Alat</h1>
          <p className="text-muted-foreground">Temukan dan pesan ruang atau alat yang tersedia</p>
        </div>

        {/* Rooms by building */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Ruang
          </h2>
          {buildings?.map((building) => {
            const rooms = (building.assets as Array<{id:string;name:string;capacity:number|null;rate_per_hour:number|null;rate_per_day:number|null;current_condition:string;room_code:string|null;is_active:boolean}>)?.filter(a => a.is_active) ?? []
            if (rooms.length === 0) return null
            return (
              <div key={building.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-muted-foreground">{building.name}</h3>
                  <Badge variant="outline" className="font-mono text-xs">{building.code}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rooms.map((room) => (
                    <Card key={room.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{room.name}</p>
                            {room.room_code && (
                              <Badge variant="outline" className="font-mono text-xs mt-1">{room.room_code}</Badge>
                            )}
                          </div>
                          <Badge variant={room.current_condition === 'good' ? 'default' : 'destructive'} className="text-xs">
                            {room.current_condition === 'good' ? 'Tersedia' : 'Tidak Tersedia'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2 space-y-1">
                        {room.capacity && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> Kapasitas {room.capacity} orang
                          </p>
                        )}
                        {room.rate_per_hour && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatRupiah(room.rate_per_hour)}/jam
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="gap-2">
                        <Link href={`/rooms/${room.id}/inventory`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1')}>
                          Inventaris
                        </Link>
                        <Link href="/login" className={cn(buttonVariants({ size: 'sm' }), 'flex-1')}>
                          Pesan
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </section>

        {/* Equipment */}
        {equipment && equipment.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" /> Alat & Peralatan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipment.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <p className="font-semibold">{item.name}</p>
                      <Badge variant={item.current_condition === 'good' ? 'default' : 'destructive'} className="text-xs">
                        {item.current_condition === 'good' ? 'Tersedia' : 'Tidak Tersedia'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {item.rate_per_hour && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatRupiah(item.rate_per_hour)}/jam
                      </p>
                    )}
                    {item.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                  </CardContent>
                  <CardFooter>
                    <Link href="/login" className={cn(buttonVariants({ size: 'sm' }), 'w-full')}>Pesan</Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
