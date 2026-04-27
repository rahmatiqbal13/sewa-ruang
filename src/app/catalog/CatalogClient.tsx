'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Building2, Package, Users, Clock, MapPin, Search, Filter } from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { AvailabilityBadge } from '@/components/shared/AvailabilityBadge'

interface Room {
  id: string; name: string; capacity: number | null; rate_per_hour: number | null
  rate_per_day: number | null; current_condition: string; room_code: string | null; is_active: boolean
}
interface BuildingRow { id: string; name: string; code: string; assets: Room[] }
interface EquipmentRow {
  id: string; name: string; description: string | null; rate_per_hour: number | null
  rate_per_day: number | null; current_condition: string; ketersediaan: string | null
  merk: string | null; is_active: boolean
}

interface Props {
  buildings: BuildingRow[]
  equipment: EquipmentRow[]
}

export function CatalogClient({ buildings, equipment }: Props) {
  const [roomSearch, setRoomSearch] = useState('')
  const [roomBuilding, setRoomBuilding] = useState('all')
  const [equipSearch, setEquipSearch] = useState('')
  const [equipCondition, setEquipCondition] = useState('all')
  const [equipAvail, setEquipAvail] = useState('all')

  const allRooms = useMemo(() =>
    buildings.flatMap(b => b.assets.filter(a => a.is_active).map(a => ({ ...a, buildingName: b.name, buildingId: b.id }))),
    [buildings]
  )

  const stats = useMemo(() => ({
    gedung: buildings.length,
    ruangan: allRooms.length,
    alat: equipment.length,
    tersedia: equipment.filter(e => !e.ketersediaan || e.ketersediaan === 'tersedia').length,
  }), [buildings, allRooms, equipment])

  const filteredRooms = useMemo(() => allRooms.filter(r => {
    const matchSearch = !roomSearch || r.name.toLowerCase().includes(roomSearch.toLowerCase()) || (r.room_code?.toLowerCase().includes(roomSearch.toLowerCase()))
    const matchBuilding = roomBuilding === 'all' || r.buildingId === roomBuilding
    return matchSearch && matchBuilding
  }), [allRooms, roomSearch, roomBuilding])

  const filteredEquip = useMemo(() => equipment.filter(e => {
    const matchSearch = !equipSearch || e.name.toLowerCase().includes(equipSearch.toLowerCase()) || (e.merk?.toLowerCase().includes(equipSearch.toLowerCase()))
    const matchCond = equipCondition === 'all' || e.current_condition === equipCondition
    const matchAvail = equipAvail === 'all' || (e.ketersediaan ?? 'tersedia') === equipAvail
    return matchSearch && matchCond && matchAvail
  }), [equipment, equipSearch, equipCondition, equipAvail])

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
          </h2>

          {/* Room filters */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map(room => (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{room.name}</p>
                      {room.room_code && (
                        <span className="font-mono text-xs text-muted-foreground mt-0.5 block">{room.room_code}</span>
                      )}
                    </div>
                    <ConditionBadge condition={room.current_condition} />
                  </div>
                </CardHeader>
                <CardContent className="pb-2 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {room.buildingName}
                  </p>
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
        </section>

        {/* Equipment section */}
        {equipment.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" /> Alat & Peralatan
            </h2>

            {/* Equipment filters */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEquip.map(item => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        {item.merk && <p className="text-xs text-muted-foreground mt-0.5">{item.merk}</p>}
                      </div>
                      <ConditionBadge condition={item.current_condition} />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2 space-y-1">
                    <AvailabilityBadge status={item.ketersediaan ?? 'tersedia'} />
                    {item.rate_per_hour && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" /> {formatRupiah(item.rate_per_hour)}/jam
                      </p>
                    )}
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
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
