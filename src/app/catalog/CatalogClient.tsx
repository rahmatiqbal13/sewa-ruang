'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Building2, Package, Users, Clock, MapPin, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { AvailabilityBadge } from '@/components/shared/AvailabilityBadge'

const PAGE_SIZE = 10

interface Room {
  id: string; name: string; capacity: number | null; rate_per_hour: number | null
  rate_per_day: number | null; current_condition: string; room_code: string | null
  is_active: boolean; is_for_rent: boolean | null
}
interface BuildingRow { id: string; name: string; code: string; assets: Room[] }
interface EquipmentRow {
  id: string; name: string; description: string | null; rate_per_hour: number | null
  rate_per_day: number | null; current_condition: string; ketersediaan: string | null
  merk: string | null; is_active: boolean
}

interface Props { buildings: BuildingRow[]; equipment: EquipmentRow[] }

function Paginator({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-5">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="p-1.5 rounded border bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {Array.from({ length: total }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            'h-8 w-8 rounded border text-sm font-medium transition-colors',
            p === page ? 'bg-blue-950 text-white border-blue-950' : 'bg-white text-zinc-600 border-zinc-300 hover:border-blue-400'
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page === total}
        className="p-1.5 rounded border bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

export function CatalogClient({ buildings, equipment }: Props) {
  const [roomSearch, setRoomSearch] = useState('')
  const [roomBuilding, setRoomBuilding] = useState('all')
  const [equipSearch, setEquipSearch] = useState('')
  const [equipCondition, setEquipCondition] = useState('all')
  const [equipAvail, setEquipAvail] = useState('all')
  const [roomPage, setRoomPage] = useState(1)
  const [equipPage, setEquipPage] = useState(1)

  // Reset pages when filters change
  useEffect(() => { setRoomPage(1) }, [roomSearch, roomBuilding])
  useEffect(() => { setEquipPage(1) }, [equipSearch, equipCondition, equipAvail])

  // Rooms: filter is_active AND is_for_rent (null treated as true for backward compat)
  const allRooms = useMemo(() =>
    buildings.flatMap(b =>
      b.assets
        .filter(a => a.is_active && a.is_for_rent !== false)
        .map(a => ({ ...a, buildingName: b.name, buildingId: b.id }))
    ),
    [buildings]
  )

  // Auto-number duplicate room names
  const roomsWithNumbers = useMemo(() => {
    const nameCount: Record<string, number> = {}
    for (const r of allRooms) nameCount[r.name] = (nameCount[r.name] || 0) + 1
    const nameIndex: Record<string, number> = {}
    return allRooms.map(r => {
      nameIndex[r.name] = (nameIndex[r.name] || 0) + 1
      return { ...r, displayName: nameCount[r.name] > 1 ? `${r.name} ${nameIndex[r.name]}` : r.name }
    })
  }, [allRooms])

  // Auto-number duplicate equipment names
  const equipWithNumbers = useMemo(() => {
    const nameCount: Record<string, number> = {}
    for (const e of equipment) nameCount[e.name] = (nameCount[e.name] || 0) + 1
    const nameIndex: Record<string, number> = {}
    return equipment.map(e => {
      nameIndex[e.name] = (nameIndex[e.name] || 0) + 1
      return { ...e, displayName: nameCount[e.name] > 1 ? `${e.name} ${nameIndex[e.name]}` : e.name }
    })
  }, [equipment])

  const stats = useMemo(() => ({
    gedung: buildings.length,
    ruangan: allRooms.length,
    alat: equipment.length,
    tersedia: equipment.filter(e => !e.ketersediaan || e.ketersediaan === 'tersedia').length,
  }), [buildings, allRooms, equipment])

  const filteredRooms = useMemo(() => roomsWithNumbers.filter(r => {
    const matchSearch = !roomSearch || r.displayName.toLowerCase().includes(roomSearch.toLowerCase()) || (r.room_code?.toLowerCase().includes(roomSearch.toLowerCase()))
    const matchBuilding = roomBuilding === 'all' || r.buildingId === roomBuilding
    return matchSearch && matchBuilding
  }), [roomsWithNumbers, roomSearch, roomBuilding])

  const filteredEquip = useMemo(() => equipWithNumbers.filter(e => {
    const matchSearch = !equipSearch || e.displayName.toLowerCase().includes(equipSearch.toLowerCase()) || (e.merk?.toLowerCase().includes(equipSearch.toLowerCase()))
    const matchCond = equipCondition === 'all' || e.current_condition === equipCondition
    const matchAvail = equipAvail === 'all' || (e.ketersediaan ?? 'tersedia') === equipAvail
    return matchSearch && matchCond && matchAvail
  }), [equipWithNumbers, equipSearch, equipCondition, equipAvail])

  const roomTotalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE))
  const equipTotalPages = Math.max(1, Math.ceil(filteredEquip.length / PAGE_SIZE))
  const pagedRooms = filteredRooms.slice((roomPage - 1) * PAGE_SIZE, roomPage * PAGE_SIZE)
  const pagedEquip = filteredEquip.slice((equipPage - 1) * PAGE_SIZE, equipPage * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
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

      {/* Hero Stats */}
      <div className="bg-gradient-to-br from-blue-950 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold mb-1">Katalog Ruang & Alat</h1>
          <p className="text-blue-200 mb-8">Temukan dan pesan ruang atau alat yang tersedia</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Gedung', value: stats.gedung, icon: Building2, bg: 'bg-blue-700/50' },
              { label: 'Ruangan', value: stats.ruangan, icon: MapPin, bg: 'bg-indigo-600/50' },
              { label: 'Total Alat', value: stats.alat, icon: Package, bg: 'bg-blue-700/50' },
              { label: 'Alat Tersedia', value: stats.tersedia, icon: Users, bg: 'bg-green-600/50' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-xl p-4 flex items-center gap-3', s.bg)}>
                <s.icon className="h-8 w-8 text-white/80 shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-blue-200">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Rooms section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Ruang
            <span className="text-sm font-normal text-muted-foreground">({filteredRooms.length} ruangan)</span>
          </h2>

          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari ruangan..."
                value={roomSearch}
                onChange={e => setRoomSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <button
                onClick={() => setRoomBuilding('all')}
                className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors', roomBuilding === 'all' ? 'bg-blue-950 text-white border-blue-950' : 'bg-white text-zinc-600 border-zinc-300 hover:border-blue-400')}
              >
                Semua
              </button>
              {buildings.map(b => (
                <button
                  key={b.id}
                  onClick={() => setRoomBuilding(b.id)}
                  className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors', roomBuilding === b.id ? 'bg-blue-950 text-white border-blue-950' : 'bg-white text-zinc-600 border-zinc-300 hover:border-blue-400')}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {filteredRooms.length === 0 && (
            <p className="text-center text-muted-foreground py-10">Tidak ada ruangan ditemukan</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {pagedRooms.map(room => (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{room.displayName}</p>
                      {room.room_code && (
                        <span className="font-mono text-xs text-muted-foreground">{room.room_code}</span>
                      )}
                    </div>
                    <ConditionBadge condition={room.current_condition} />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" /> {room.buildingName}
                  </p>
                  {room.capacity && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3 shrink-0" /> {room.capacity} orang
                    </p>
                  )}
                  {room.rate_per_hour && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" /> {formatRupiah(room.rate_per_hour)}/jam
                    </p>
                  )}
                </CardContent>
                <CardFooter className="p-3 pt-0 gap-2">
                  <Link href={`/rooms/${room.id}/inventory`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1 text-xs h-7')}>
                    Inventaris
                  </Link>
                  <Link href="/login" className={cn(buttonVariants({ size: 'sm' }), 'flex-1 text-xs h-7')}>
                    Pesan
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
          <Paginator page={roomPage} total={roomTotalPages} onChange={setRoomPage} />
        </section>

        {/* Equipment section */}
        {equipment.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" /> Alat & Peralatan
              <span className="text-sm font-normal text-muted-foreground">({filteredEquip.length} item)</span>
            </h2>

            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari alat atau merk..."
                  value={equipSearch}
                  onChange={e => setEquipSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <select
                value={equipCondition}
                onChange={e => setEquipCondition(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Kondisi</option>
                <option value="good">Baik</option>
                <option value="needs_repair">Rusak Ringan</option>
                <option value="damaged">Rusak Berat</option>
              </select>
              <select
                value={equipAvail}
                onChange={e => setEquipAvail(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Ketersediaan</option>
                <option value="tersedia">Tersedia</option>
                <option value="digunakan">Digunakan</option>
                <option value="hilang">Hilang</option>
              </select>
            </div>

            {filteredEquip.length === 0 && (
              <p className="text-center text-muted-foreground py-10">Tidak ada alat ditemukan</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {pagedEquip.map(item => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate">{item.displayName}</p>
                        {item.merk && <p className="text-xs text-muted-foreground truncate">{item.merk}</p>}
                      </div>
                      <ConditionBadge condition={item.current_condition} />
                    </div>
                    <AvailabilityBadge status={item.ketersediaan ?? 'tersedia'} />
                    {item.rate_per_hour && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" /> {formatRupiah(item.rate_per_hour)}/jam
                      </p>
                    )}
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
                  </CardContent>
                  <CardFooter className="p-3 pt-0">
                    <Link href="/login" className={cn(buttonVariants({ size: 'sm' }), 'w-full text-xs h-7')}>Pesan</Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
            <Paginator page={equipPage} total={equipTotalPages} onChange={setEquipPage} />
          </section>
        )}
      </main>
    </div>
  )
}
