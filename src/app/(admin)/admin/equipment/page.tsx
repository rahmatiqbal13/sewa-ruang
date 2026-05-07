import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Package, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { SafeImage } from '@/components/shared/SafeImage'
import { EquipmentFilters } from './EquipmentFilters'

const AVAILABILITY_TABS = [
  { value: '',           label: 'Semua Alat',    color: 'bg-zinc-800 text-white' },
  { value: 'tersedia',   label: 'Tersedia',      color: 'bg-green-600 text-white' },
  { value: 'digunakan',  label: 'Digunakan',     color: 'bg-orange-600 text-white' },
  { value: 'hilang',     label: 'Hilang',        color: 'bg-red-600 text-white' },
]

const CATEGORY_LABELS: Record<string, string> = {
  'elektronik': 'Elektronik',
  'mebel': 'Mebel',
  'transportasi': 'Transportasi',
  'alat_tes_pengukuran': 'Alat Tes Pengukuran',
  'alat_gym': 'Alat Gym/Fitness',
  'perlengkapan': 'Perlengkapan',
  'lainnya': 'Lainnya',
}

const ITEMS_PER_PAGE = 10

// Helper function to create slug from name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ ketersediaan?: string; category?: string; page?: string; search?: string }>
}) {
  const { ketersediaan, category, page, search } = await searchParams
  const currentPage = parseInt(page || '1', 10)
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Build base query for counting
  let countQuery = sb.from('equipment').select('*', { count: 'exact', head: true })
  
  if (ketersediaan) {
    countQuery = countQuery.eq('ketersediaan', ketersediaan)
  }
  
  if (category) {
    countQuery = countQuery.eq('category', category)
  }

  if (search) {
    countQuery = countQuery.or(`name.ilike.%${search}%,equipment_code.ilike.%${search}%,merk.ilike.%${search}%`)
  }

  const { count: totalCount } = await countQuery

  // Query from new 'equipment' table with pagination
  let query = sb
    .from('equipment')
    .select(`
      id, name, equipment_code, description, merk, category,
      current_condition, ketersediaan, status_tindakan,
      is_active, photo_url, current_location, storage_room_id,
      equipment_rates(user_category, rate_per_day, rate_per_hour, requires_supervision)
    `)
    .order('name')
    .range(offset, offset + ITEMS_PER_PAGE - 1)

  if (ketersediaan) {
    query = query.eq('ketersediaan', ketersediaan)
  }
  
  if (category) {
    query = query.eq('category', category)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,equipment_code.ilike.%${search}%,merk.ilike.%${search}%`)
  }

  const { data: equipment } = await query as {
    data: Array<{
      id: string
      name: string
      equipment_code: string | null
      description: string | null
      merk: string | null
      category: string | null
      current_condition: string
      ketersediaan: string
      status_tindakan: string
      is_active: boolean
      photo_url: string | null
      current_location: string | null
      storage_room_id: string | null
      equipment_rates: Array<{
        user_category: string
        rate_per_day: number
        rate_per_hour: number | null
        requires_supervision: boolean
      }>
    }> | null
  }

  const totalItems = totalCount || 0
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  // Get categories for filter
  const { data: categories } = await sb
    .from('equipment')
    .select('category')
    .not('category', 'is', null)

  const uniqueCategories = [...new Set((categories as { category: string }[] | null)?.map(c => c.category).filter(Boolean) || [])]

  // Get counts for all availability (not just current page)
  const { data: allEquipment } = await sb
    .from('equipment')
    .select('ketersediaan')

  const availabilityCounts = {
    'tersedia': (allEquipment as { ketersediaan: string }[] | null)?.filter((e) => e.ketersediaan === 'tersedia').length ?? 0,
    'digunakan': (allEquipment as { ketersediaan: string }[] | null)?.filter((e) => e.ketersediaan === 'digunakan').length ?? 0,
    'hilang': (allEquipment as { ketersediaan: string }[] | null)?.filter((e) => e.ketersediaan === 'hilang').length ?? 0,
  }

  const getKetersediaanColor = (status: string) => {
    switch (status) {
      case 'tersedia': return 'bg-green-100 text-green-700 border-green-200'
      case 'digunakan': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'hilang': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getKetersediaanLabel = (status: string) => {
    switch (status) {
      case 'tersedia': return 'Tersedia'
      case 'digunakan': return 'Digunakan'
      case 'hilang': return 'Hilang'
      default: return status
    }
  }

  // Get lowest rate for display
  const getDisplayRate = (rates: { rate_per_day: number; rate_per_hour: number | null; user_category: string; requires_supervision: boolean }[] | null | undefined) => {
    if (!rates || rates.length === 0) return null
    const sorted = [...rates].sort((a, b) => a.rate_per_day - b.rate_per_day)
    return sorted[0]
  }

  // Check for duplicate names
  const getDuplicateNames = () => {
    if (!equipment) return new Set<string>()
    const nameCounts = new Map<string, number>()
    const baseNames = new Set<string>()
    
    equipment.forEach(item => {
      const baseName = item.name.replace(/\s*\(\d+\)$/, '').toLowerCase().trim()
      nameCounts.set(baseName, (nameCounts.get(baseName) || 0) + 1)
      if (nameCounts.get(baseName)! > 1) {
        baseNames.add(baseName)
      }
    })
    
    return baseNames
  }

  const duplicateBaseNames = getDuplicateNames()
  const hasDuplicates = duplicateBaseNames.size > 0

  // Build query string for pagination
  const buildQueryString = (newPage: number) => {
    const params = new URLSearchParams()
    if (ketersediaan) params.set('ketersediaan', ketersediaan)
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    params.set('page', newPage.toString())
    return params.toString()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">Apa itu Asset (Alat)?</h3>
            <p className="text-sm text-blue-700 mt-1">
              Asset adalah alat dan peralatan yang dapat <strong>disewakan</strong> oleh pengguna.
              Contoh: Alat tes pengukuran, alat gym, proyektor, dll.
              Untuk barang inventaris ruangan (meja, kursi, AC), gunakan menu
              <Link href="/admin/inventory" className="text-blue-800 underline hover:text-blue-900"> Inventaris</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Duplicate Warning Banner */}
      {hasDuplicates && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">Perhatian: Ada Nama Alat yang Sama!</h3>
              <p className="text-sm text-amber-700 mt-1">
                Terdapat {duplicateBaseNames.size} nama alat yang memiliki duplikat.
                Alat dengan nama sama ditandai dengan warna <span className="font-medium">oranye/amber</span>.
                Pertimbangkan untuk mengganti nama agar lebih spesifik (contoh: &quot;Grip Strength - Lab A&quot;, &quot;Grip Strength - Lab B&quot;).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alat & Peralatan (Asset)</h1>
          <p className="text-muted-foreground text-sm">Alat yang dapat disewakan dengan tarif per kategori pengguna</p>
        </div>
        <Link href="/admin/equipment/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Alat
        </Link>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-blue-600 text-sm font-medium">Total Alat</p>
          <p className="text-2xl font-bold text-blue-900">{totalItems}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-green-600 text-sm font-medium">Tersedia</p>
          <p className="text-2xl font-bold text-green-900">{availabilityCounts['tersedia']}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <p className="text-orange-600 text-sm font-medium">Digunakan</p>
          <p className="text-2xl font-bold text-orange-900">{availabilityCounts['digunakan']}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-red-600 text-sm font-medium">Hilang/Rusak</p>
          <p className="text-2xl font-bold text-red-900">{availabilityCounts['hilang']}</p>
        </div>
      </div>

      {/* Filters */}
      <EquipmentFilters categories={uniqueCategories} />

      {/* Pagination Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Menampilkan {equipment?.length || 0} dari {totalItems} alat
          {totalPages > 1 && ` (Halaman ${currentPage} dari ${totalPages})`}
        </p>
      </div>

      {/* Empty State */}
      {equipment?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>
            {search 
              ? `Tidak ada alat dengan kata kunci "${search}"` 
              : 'Belum ada alat.'} 
            <Link href="/admin/equipment/new" className="text-primary hover:underline">Tambah sekarang</Link>
          </p>
        </div>
      )}

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {equipment?.map((item) => {
          const lowestRate = getDisplayRate(item.equipment_rates)
          const baseName = item.name.replace(/\s*\(\d+\)$/, '').toLowerCase().trim()
          const isDuplicate = duplicateBaseNames.has(baseName)

          return (
            <div key={item.id} className={cn(
              "rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow group",
              isDuplicate ? "bg-amber-50 border-amber-300" : "bg-white"
            )}>
              {/* Photo - Clickable to detail */}
              <Link 
                href={`/admin/equipment/${createSlug(item.name)}`}
                className="relative h-44 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-2 block"
              >
                {item.photo_url ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <SafeImage 
                      src={item.photo_url} 
                      alt={item.name} 
                      className="object-contain w-full h-full max-h-40"
                      fallbackClassName="w-full h-full rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-12 w-12 text-blue-200" />
                  </div>
                )}
                {item.equipment_code && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-white/90 backdrop-blur text-xs font-bold px-2 py-0.5 rounded-lg font-mono text-blue-700 border border-blue-200">
                      {item.equipment_code}
                    </span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                  <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-xs">
                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                
                {/* Category Badge */}
                {item.category && (
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="p-4">
                <Link href={`/admin/equipment/${createSlug(item.name)}`}>
                  <h3 className="font-semibold text-zinc-900 text-sm truncate group-hover:text-blue-600 transition-colors" title={item.name}>
                    {item.name}
                  </h3>
                </Link>
                {item.merk && (
                  <p className="text-xs text-zinc-500 mt-0.5">{item.merk}</p>
                )}
                
                {/* Availability & Status */}
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', getKetersediaanColor(item.ketersediaan))}>
                    {getKetersediaanLabel(item.ketersediaan)}
                  </span>
                  {item.status_tindakan !== 'normal' && (
                    <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                      {item.status_tindakan === 'perawatan' ? 'Perawatan' :
                       item.status_tindakan === 'menunggu_part' ? 'Menunggu Part' : 'Afkir'}
                    </span>
                  )}
                  {isDuplicate && (
                    <span className="bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5">
                      <AlertTriangle className="h-3 w-3" /> Duplikat
                    </span>
                  )}
                </div>

                {/* Location */}
                {item.current_location && (
                  <p className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                    <span className="truncate">{item.current_location}</span>
                  </p>
                )}

                {/* Pricing */}
                <div className="mt-3 pt-2 border-t">
                  {lowestRate ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">Mulai dari</p>
                        <p className="text-sm font-semibold text-emerald-600">
                          {formatRupiah(lowestRate.rate_per_day)}/hari
                        </p>
                        {lowestRate.rate_per_hour && (
                          <p className="text-[10px] text-zinc-400">
                            {formatRupiah(lowestRate.rate_per_hour)}/jam
                          </p>
                        )}
                      </div>
                      {lowestRate.requires_supervision && (
                        <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-200">
                          Perlu Supervisi
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">Tarif belum diatur</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t">
                  <ConditionBadge condition={item.current_condition} />
                  <div className="flex gap-1">
                    <Link 
                      href={`/admin/equipment/${createSlug(item.name)}`}
                      className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
                    >
                      Detail
                    </Link>
                    <Link 
                      href={`/admin/equipment/${createSlug(item.name)}/edit`}
                      className="text-xs px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {/* Previous Button */}
          {currentPage > 1 ? (
            <Link
              href={`/admin/equipment?${buildQueryString(currentPage - 1)}`}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white border text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </span>
          )}

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              // Show first page, last page, current page, and pages around current
              const shouldShow = 
                pageNum === 1 || 
                pageNum === totalPages || 
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              
              const showEllipsis = 
                (pageNum === 2 && currentPage > 3) || 
                (pageNum === totalPages - 1 && currentPage < totalPages - 2)

              if (showEllipsis) {
                return <span key={`ellipsis-${pageNum}`} className="px-2 text-zinc-400">...</span>
              }

              if (!shouldShow) return null

              return (
                <Link
                  key={pageNum}
                  href={`/admin/equipment?${buildQueryString(pageNum)}`}
                  className={cn(
                    'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                    currentPage === pageNum
                      ? 'bg-zinc-800 text-white'
                      : 'bg-white border text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                  )}
                >
                  {pageNum}
                </Link>
              )
            })}
          </div>

          {/* Next Button */}
          {currentPage < totalPages ? (
            <Link
              href={`/admin/equipment?${buildQueryString(currentPage + 1)}`}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white border text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
            >
              Selanjutnya
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
              Selanjutnya
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      )}

      {/* Page Info Footer */}
      {totalPages > 1 && (
        <div className="text-center text-sm text-muted-foreground">
          Halaman {currentPage} dari {totalPages} • {ITEMS_PER_PAGE} item per halaman
        </div>
      )}
    </div>
  )
}
