import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Layers, MapPin } from 'lucide-react'
import { BuildingActions } from './BuildingActions'

export default async function BuildingsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: buildings } = await (supabase.from('buildings') as any)
    .select('*, assets(count)')
    .order('name') as {
      data: Array<{
        id: string; name: string; code: string; floor_count: number
        is_active: boolean; address: string | null; photo_url: string | null
        assets: { count: number }[]
      }> | null
    }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gedung</h1>
          <p className="text-muted-foreground text-sm">Kelola data gedung dan lantai</p>
        </div>
        <Link href="/admin/buildings/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Gedung
        </Link>
      </div>

      {buildings?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada data gedung</p>
          <Link href="/admin/buildings/new" className="text-primary text-sm hover:underline mt-1 block">Tambah sekarang</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {buildings?.map((b) => {
          const roomCount = (b.assets as { count: number }[])?.[0]?.count ?? 0
          return (
            <div key={b.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Photo */}
              <div className="relative h-40 bg-gradient-to-br from-orange-50 to-orange-100">
                {b.photo_url ? (
                  <Image src={b.photo_url} alt={b.name} fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Building2 className="h-14 w-14 text-orange-200" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-lg font-mono text-orange-700 border border-orange-200">
                    {b.code}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <Badge variant={b.is_active ? 'default' : 'secondary'} className="text-xs">
                    {b.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-zinc-900">{b.name}</h3>
                {b.address && (
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {b.address}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-zinc-600">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-orange-400" />
                    {b.floor_count} lantai
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-purple-400" />
                    {roomCount} ruang
                  </span>
                </div>
                <div className="flex items-center justify-end mt-4 pt-3 border-t">
                  <BuildingActions id={b.id} isActive={b.is_active} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
