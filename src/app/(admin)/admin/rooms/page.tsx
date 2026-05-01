import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, DoorOpen, Users, Building2, Layers, Tag, EyeOff } from 'lucide-react'
import { RoomActions } from './RoomActions'
import { formatRupiah, cn } from '@/lib/utils'
import { ConditionBadge } from '@/components/shared/ConditionBadge'

const RENT_TABS = [
  { value: '',      label: 'Semua Ruangan',   color: 'bg-zinc-800 text-white' },
  { value: 'true',  label: 'Disewakan',       color: 'bg-purple-600 text-white' },
  { value: 'false', label: 'Tidak Disewakan', color: 'bg-zinc-500 text-white' },
]

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ for_rent?: string }>
}) {
  const { for_rent } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Base query without is_for_rent (works even before migration)
  let query = sb
    .from('assets')
    .select('id, name, room_code, floor_number, capacity, rate_per_hour, current_condition, is_active, photo_url, buildings(name, code)')
    .eq('category', 'room')
    .order('name')

  // Add is_for_rent to select — if column doesn't exist, Supabase returns error and rooms = null
  let hasIsForRent = false
  const testRes = await sb
    .from('assets')
    .select('id, is_for_rent')
    .eq('category', 'room')
    .limit(1)
  if (!testRes.error) {
    hasIsForRent = true
    query = sb
      .from('assets')
      .select('id, name, room_code, floor_number, capacity, rate_per_hour, current_condition, is_active, is_for_rent, photo_url, buildings(name, code)')
      .eq('category', 'room')
      .order('name')
    if (for_rent === 'true')  query = query.eq('is_for_rent', true)
    if (for_rent === 'false') query = query.eq('is_for_rent', false)
  }

  const { data: rooms } = await query as {
    data: Array<{
      id: string; name: string; room_code: string | null; floor_number: number | null
      capacity: number | null; rate_per_hour: number | null; current_condition: string
      is_active: boolean; is_for_rent?: boolean; photo_url: string | null
      buildings: { name: string; code: string } | null
    }> | null
  }

  const rentCount   = rooms?.filter(r => r.is_for_rent !== false).length ?? 0
  const noRentCount = rooms?.filter(r => r.is_for_rent === false).length ?? 0
  const tabCounts: Record<string, number> = {
    '': rooms?.length ?? 0,
    'true': rentCount,
    'false': noRentCount,
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ruangan</h1>
          <p className="text-muted-foreground text-sm">Kelola ruangan yang tersedia untuk peminjaman</p>
        </div>
        <Link href="/admin/rooms/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Ruangan
        </Link>
      </div>

      {/* Rent filter tabs — only shown after migration */}
      {hasIsForRent && (
        <div className="flex gap-2 flex-wrap">
          {RENT_TABS.map(tab => {
            const isActive = (for_rent ?? '') === tab.value
            const count = tabCounts[tab.value] ?? 0
            return (
              <Link
                key={tab.value}
                href={tab.value ? `/admin/rooms?for_rent=${tab.value}` : '/admin/rooms'}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  isActive ? tab.color : 'bg-white border text-zinc-600 hover:bg-zinc-50'
                )}
              >
                {tab.value === 'true'  && <Tag    className="h-3.5 w-3.5" />}
                {tab.value === 'false' && <EyeOff className="h-3.5 w-3.5" />}
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
      )}

      {rooms?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <DoorOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada ruangan. <Link href="/admin/rooms/new" className="text-primary hover:underline">Tambah sekarang</Link></p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms?.map((room) => {
          const building = room.buildings as { name: string; code: string } | null
          const isForRent = room.is_for_rent !== false
          return (
            <div key={room.id} className={cn(
              'bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow',
              !isForRent && 'opacity-70'
            )}>
              {/* Photo */}
              <div className="relative h-36 bg-gradient-to-br from-purple-50 to-purple-100">
                {room.photo_url ? (
                  <Image src={room.photo_url} alt={room.name} fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <DoorOpen className="h-12 w-12 text-purple-200" />
                  </div>
                )}
                {room.room_code && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-white/90 backdrop-blur text-xs font-bold px-2 py-0.5 rounded-lg font-mono text-purple-700 border border-purple-200">
                      {room.room_code}
                    </span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                  <Badge variant={room.is_active ? 'default' : 'secondary'} className="text-xs">
                    {room.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  {hasIsForRent && (
                    isForRent ? (
                      <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <Tag className="h-2.5 w-2.5" /> Disewakan
                      </span>
                    ) : (
                      <span className="bg-zinc-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <EyeOff className="h-2.5 w-2.5" /> Tidak Disewakan
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-semibold text-zinc-900 text-sm truncate">{room.name}</h3>
                <div className="mt-2 space-y-1 text-xs text-zinc-500">
                  {building && (
                    <p className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-orange-400 shrink-0" />
                      {building.name}
                    </p>
                  )}
                  {room.floor_number && (
                    <p className="flex items-center gap-1">
                      <Layers className="h-3 w-3 text-blue-400 shrink-0" />
                      Lantai {room.floor_number}
                    </p>
                  )}
                  {room.capacity && (
                    <p className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-green-400 shrink-0" />
                      {room.capacity} orang
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t">
                  <div className="flex items-center gap-1.5">
                    <ConditionBadge condition={room.current_condition} />
                    {room.rate_per_hour && (
                      <span className="text-xs text-emerald-600 font-medium">{formatRupiah(room.rate_per_hour)}/jam</span>
                    )}
                  </div>
                  <RoomActions id={room.id} isActive={room.is_active} isForRent={isForRent} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
