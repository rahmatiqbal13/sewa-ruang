import { createAdminClient as createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 60
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Layers, MapPin, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { BuildingActions } from './BuildingActions'
import { DeleteBuildingButton } from './DeleteBuildingButton'
import { cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'

interface Building {
  id: string
  name: string
  code: string
  floor_count: number
  address: string | null
  description: string | null
  photo_url: string | null
  is_active: boolean
}

export default async function BuildingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Check if user is super admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userProfile } = await (supabase.from('users') as any)
    .select('role')
    .eq('id', user!.id)
    .single()
  
  const isSuperAdmin = userProfile?.role === 'super_admin'
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: buildings } = await (supabase as any)
    .from('buildings')
    .select('*, rooms(count)')
    .order('name')

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Gedung
            {isSuperAdmin && <ShieldCheck className="h-4 w-4 text-purple-500" />}
          </h1>
          <p className="page-subtitle">
            {isSuperAdmin ? 'Kelola data gedung — Super Admin mode aktif' : 'Kelola data gedung dan lantai'}
          </p>
        </div>
        <Link
          href="/admin/buildings/new"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Tambah Gedung
        </Link>
      </div>

      {/* Summary Stats */}
      {buildings && buildings.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="mini-stat border-t-indigo-400">
            <p className="mini-stat-label">Total Gedung</p>
            <p className="mini-stat-value">{buildings.length}</p>
          </div>
          <div className="mini-stat border-t-emerald-400">
            <p className="mini-stat-label">Gedung Aktif</p>
            <p className="mini-stat-value">{(buildings as Building[]).filter((b: Building) => b.is_active).length}</p>
          </div>
          <div className="mini-stat border-t-amber-400">
            <p className="mini-stat-label">Total Lantai</p>
            <p className="mini-stat-value">{(buildings as Building[]).reduce((acc: number, b: Building) => acc + b.floor_count, 0)}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {buildings?.length === 0 && (
        <div className="empty-state">
          <Building2 className="h-10 w-10 mb-3 opacity-25" />
          <p className="text-sm font-medium">Belum ada data gedung</p>
          <Link href="/admin/buildings/new" className="mt-2 text-xs text-primary hover:underline">
            Tambah gedung pertama
          </Link>
        </div>
      )}

      {/* Buildings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(buildings as Building[] | null)?.map((building) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const roomCount = ((building as any).rooms as { count: number }[])?.[0]?.count ?? 0
          return (
            <div
              key={building.id}
              className="group bg-card rounded-[14px] border border-border overflow-hidden hover:shadow-soft hover:-translate-y-px transition-all duration-200"
            >
              {/* Photo */}
              <div className="relative h-40 bg-muted overflow-hidden flex items-center justify-center p-2">
                {building.photo_url ? (
                  <SafeImage
                    src={building.photo_url}
                    alt={building.name}
                    className="object-contain w-full h-full"
                    fallbackClassName="w-full h-full rounded-[10px]"
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-muted-foreground/20" />
                )}

                <span className="absolute bottom-2 left-2 bg-card/90 backdrop-blur text-[10px] font-bold font-mono px-2 py-0.5 rounded-[10px] text-indigo-700 border border-indigo-100">
                  {building.code}
                </span>

                <div className="absolute top-2.5 right-2.5">
                  <Badge variant={building.is_active ? 'success' : 'secondary'} className="text-[10px]">
                    {building.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
              </div>

              {/* Info */}
              <div className="p-3.5">
                <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                  {building.name}
                </h3>
                {building.address && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/70 truncate">
                    <MapPin className="h-3 w-3 shrink-0" /> {building.address}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Layers className="h-3 w-3 text-muted-foreground/70" /> {building.floor_count} Lantai</span>
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3 text-muted-foreground/70" /> {roomCount} Ruang</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/60">
                  <Link
                    href={`/admin/rooms?building=${building.id}`}
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
                  >
                    Lihat Ruangan <ArrowUpRight className="h-3 w-3" />
                  </Link>
                  <BuildingActions
                    id={building.id}
                    name={building.name}
                    isActive={building.is_active}
                    deleteButton={isSuperAdmin ? <DeleteBuildingButton id={building.id} buildingName={building.name} /> : undefined}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
