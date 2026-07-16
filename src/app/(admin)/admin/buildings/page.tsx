import { createClient, createAdminDbClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 60
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Layers, MapPin, ArrowUpRight, ShieldCheck, Eye, Pencil } from 'lucide-react'
import { BuildingActions } from './BuildingActions'
import { DeleteBuildingButton } from './DeleteBuildingButton'
import { SafeImage } from '@/components/shared/SafeImage'
import { cn } from '@/lib/utils'

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

  const sb = createAdminDbClient()

  // Check if user is super admin
  const { data: userProfile } = await sb
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isSuperAdmin = userProfile?.role === 'super_admin'

  const { data: buildings } = await sb
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {(buildings as Building[] | null)?.map((building) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const roomCount = ((building as any).rooms as { count: number }[])?.[0]?.count ?? 0
          return (
            <div
              key={building.id}
              className={cn(
                "group overflow-hidden border border-[#E5E7EB] rounded-[14px] bg-white shadow-sm hover:shadow-md transition-all duration-300",
                !building.is_active && "opacity-60"
              )}
            >
              {/* Photo — Catalog Style */}
              <Link
                href={`/admin/rooms?building=${building.id}`}
                className="relative aspect-[4/3] bg-[#F3F4F6] block overflow-hidden"
              >
                {building.photo_url ? (
                  <SafeImage
                    src={building.photo_url}
                    alt={building.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    fallbackClassName="w-full h-full flex items-center justify-center"
                    fallback={<Building2 className="h-12 w-12 text-[#D1D5DB]" />}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-[#D1D5DB]" />
                  </div>
                )}

                {/* Code overlay */}
                <span className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
                  {building.code}
                </span>

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <Badge className={cn(
                    "text-xs font-medium border-0",
                    building.is_active ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  )}>
                    {building.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>

                {/* Nonaktif overlay */}
                {!building.is_active && (
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">NONAKTIF</span>
                  </div>
                )}
              </Link>

              {/* Info — Catalog Style */}
              <div className="p-4">
                <Link href={`/admin/rooms?building=${building.id}`}>
                  <h3 className={cn(
                    "font-bold text-[#111827] text-base mb-1 truncate group-hover:text-[#0891B2] transition-colors",
                    !building.is_active && "line-through"
                  )} title={building.name}>
                    {building.name}
                  </h3>
                </Link>

                {building.address && (
                  <p className="text-sm text-[#6B7280] flex items-center gap-1 mb-3">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{building.address}</span>
                  </p>
                )}

                {/* Stats with dot indicators */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-xs text-[#6B7280]">{building.floor_count} Lantai</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-[#6B7280]">{roomCount} Ruang</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-3 border-t border-[#E5E7EB]">
                  <Link
                    href={`/admin/rooms?building=${building.id}`}
                    className="flex-1 h-9 flex items-center justify-center rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors text-xs font-medium"
                  >
                    Lihat Ruangan
                  </Link>
                  <Link
                    href={`/admin/buildings/${building.id}/edit`}
                    className="flex-1 h-9 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] transition-colors text-xs font-medium"
                  >
                    Edit
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
