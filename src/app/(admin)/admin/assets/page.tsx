import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Package, User, MapPin } from 'lucide-react'
import { AssetActions } from './AssetActions'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { AvailabilityBadge } from '@/components/shared/AvailabilityBadge'
import { formatRupiah, cn } from '@/lib/utils'

const CONDITIONS = [
  { value: '',             label: 'Semua',          color: 'bg-zinc-800 text-white' },
  { value: 'good',         label: 'Baik',           color: 'bg-green-600 text-white' },
  { value: 'needs_repair', label: 'Rusak Ringan',   color: 'bg-yellow-500 text-white' },
  { value: 'damaged',      label: 'Rusak Berat',    color: 'bg-red-600 text-white' },
  { value: 'lost',         label: 'Hilang',         color: 'bg-zinc-500 text-white' },
]

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ condition?: string }>
}) {
  const { condition } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  let query = sb
    .from('assets')
    .select('id, name, asset_code, current_condition, rate_mahasiswa, is_active, merk, ketersediaan, status_tindakan, sumber, photo_url, building_id, buildings(name, code)')
    .eq('category', 'equipment')
    .order('name')
    .order('asset_code', { nullsFirst: false })

  if (condition) query = query.eq('current_condition', condition)

  const { data: assets } = await query as {
    data: Array<{
      id: string; name: string; asset_code: string | null
      current_condition: string; is_active: boolean; photo_url: string | null
      rate_mahasiswa: number | null; merk: string | null; ketersediaan: string | null
      status_tindakan: string | null; sumber: string | null; building_id: string | null
      buildings: { name: string; code: string } | null
    }> | null
  }

  // Count each condition for tab badges
  const { data: allAssets } = await sb
    .from('assets')
    .select('current_condition')
    .eq('category', 'equipment') as { data: Array<{ current_condition: string }> | null }

  const condCounts: Record<string, number> = {}
  for (const a of allAssets ?? []) {
    condCounts[a.current_condition] = (condCounts[a.current_condition] ?? 0) + 1
  }
  const totalCount = allAssets?.length ?? 0

  // Fetch active borrowers for equipment currently in use
  const borrowedIds = assets?.filter(a => a.ketersediaan === 'digunakan').map(a => a.id) ?? []
  let borrowerMap: Record<string, string> = {}
  if (borrowedIds.length > 0) {
    const { data: activeBorrows } = await sb
      .from('booking_assets')
      .select('asset_id, bookings(users(name), status)')
      .in('asset_id', borrowedIds) as {
        data: Array<{ asset_id: string; bookings: { users: { name: string } | null; status: string } | null }> | null
      }
    for (const row of activeBorrows ?? []) {
      if (row.bookings?.status === 'paid' || row.bookings?.status === 'approved') {
        borrowerMap[row.asset_id] = row.bookings?.users?.name ?? ''
      }
    }
  }

  // Auto-number duplicate names
  const nameCount: Record<string, number> = {}
  const nameIndex: Record<string, number> = {}
  for (const a of assets ?? []) nameCount[a.name] = (nameCount[a.name] ?? 0) + 1

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alat / Peralatan</h1>
          <p className="text-muted-foreground text-sm">Kelola inventaris peralatan yang dapat dipinjam</p>
        </div>
        <Link href="/admin/assets/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Alat
        </Link>
      </div>

      {/* Condition filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {CONDITIONS.map(tab => {
          const isActive = (condition ?? '') === tab.value
          const count = tab.value ? (condCounts[tab.value] ?? 0) : totalCount
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/assets?condition=${tab.value}` : '/admin/assets'}
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

      {assets?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Tidak ada alat {condition ? 'dengan kondisi ini' : ''}.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {assets?.map((a) => {
          const borrowerName = borrowerMap[a.id]
          const building = a.buildings as { name: string; code: string } | null
          // Auto-number: if multiple items share a name, append sequence number
          nameIndex[a.name] = (nameIndex[a.name] ?? 0) + 1
          const displayName = nameCount[a.name] > 1 ? `${a.name} ${nameIndex[a.name]}` : a.name
          return (
            <div key={a.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Photo */}
              <div className="relative h-36 bg-gradient-to-br from-green-50 to-green-100">
                {a.photo_url ? (
                  <Image src={a.photo_url} alt={a.name} fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-12 w-12 text-green-200" />
                  </div>
                )}
                {a.asset_code && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-white/90 backdrop-blur text-[10px] font-bold px-1.5 py-0.5 rounded font-mono text-green-700 border border-green-200">
                      {a.asset_code}
                    </span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <AvailabilityBadge status={(a.ketersediaan ?? 'tersedia') as 'tersedia' | 'digunakan' | 'hilang'} />
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-semibold text-zinc-900 text-sm truncate">{displayName}</h3>
                {a.merk && <p className="text-xs text-zinc-500 mt-0.5">{a.merk}</p>}

                <div className="mt-2 space-y-1">
                  {building && (
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-orange-400 shrink-0" />
                      {building.name}
                    </p>
                  )}
                  {borrowerName && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 flex items-center gap-1">
                      <User className="h-3 w-3 shrink-0" />
                      Dipinjam: <strong>{borrowerName}</strong>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <ConditionBadge condition={a.current_condition} />
                    {a.rate_mahasiswa != null && a.rate_mahasiswa > 0 && (
                      <span className="text-[10px] text-emerald-600 font-medium">{formatRupiah(a.rate_mahasiswa)}/hari</span>
                    )}
                  </div>
                  <AssetActions id={a.id} isActive={a.is_active} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
