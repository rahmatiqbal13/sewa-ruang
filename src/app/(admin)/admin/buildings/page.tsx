import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Layers, MapPin, ArrowUpRight } from 'lucide-react'
import { BuildingActions } from './BuildingActions'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: buildings } = await (supabase as any)
    .from('buildings')
    .select('*, rooms(count)')
    .order('name')

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gedung</h1>
          <p className="text-slate-500 mt-1">Kelola data gedung dan lantai</p>
        </div>
        <Link 
          href="/admin/buildings/new" 
          className={cn(buttonVariants(), 'btn-gradient')}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah Gedung
        </Link>
      </div>

      {/* Empty State */}
      {buildings?.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="h-20 w-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Belum ada data gedung</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Mulai dengan menambahkan gedung pertama untuk mengelola ruangan dan aset
          </p>
          <Link 
            href="/admin/buildings/new" 
            className={cn(buttonVariants(), 'btn-gradient')}
          >
            <Plus className="mr-2 h-4 w-4" /> Tambah Gedung
          </Link>
        </div>
      )}

      {/* Buildings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {(buildings as Building[] | null)?.map((building) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const roomCount = ((building as any).rooms as { count: number }[])?.[0]?.count ?? 0
          return (
            <div 
              key={building.id} 
              className="group bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-900/5 overflow-hidden card-hover"
            >
              {/* Photo */}
              <div className="relative h-48 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden flex items-center justify-center p-3">
                {building.photo_url ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <SafeImage 
                      src={building.photo_url} 
                      alt={building.name} 
                      className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-105"
                      fallbackClassName="w-full h-full rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Building2 className="h-16 w-16 text-indigo-200" />
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Code Badge */}
                <div className="absolute top-4 left-4">
                  <span className="bg-white/95 backdrop-blur-sm text-xs font-bold px-3 py-1.5 rounded-xl font-mono text-indigo-700 shadow-sm border border-indigo-100">
                    {building.code}
                  </span>
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <Badge 
                    variant={building.is_active ? 'success' : 'secondary'} 
                    className="shadow-sm"
                  >
                    {building.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
              </div>

              {/* Info */}
              <div className="p-5">
                <h3 className="font-semibold text-lg text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                  {building.name}
                </h3>
                
                {building.address && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-4">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> 
                    <span className="truncate">{building.address}</span>
                  </p>
                )}
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
                    <Layers className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-medium text-slate-700">{building.floor_count} Lantai</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
                    <Building2 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-slate-700">{roomCount} Ruang</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <Link 
                    href={`/admin/rooms?building=${building.id}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group/link"
                  >
                    Lihat Ruangan 
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                  </Link>
                  <BuildingActions id={building.id} isActive={building.is_active} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      {buildings && buildings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Total Gedung</p>
                <p className="text-3xl font-bold mt-1">{buildings.length}</p>
              </div>
              <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Gedung Aktif</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {(buildings as Building[]).filter((b: Building) => b.is_active).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Badge variant="success" className="h-6 w-6 p-0 flex items-center justify-center">
                  <span className="text-xs">✓</span>
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Total Lantai</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {(buildings as Building[]).reduce((acc: number, b: Building) => acc + b.floor_count, 0)}
                </p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Layers className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
