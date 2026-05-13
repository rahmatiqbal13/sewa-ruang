'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Package, 
  Users, 
  MapPin, 
  Search, 
  Filter,
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  ArrowRight,
  Clock,
  Tag,
  Info
} from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { AvailabilityBadge } from '@/components/shared/AvailabilityBadge'
import { CalendarView } from '@/components/calendar/CalendarView'

const PAGE_SIZE = 12

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

interface RoomRate { 
  usage_category: string
  rate_per_hour: number | null
  rate_per_day: number | null 
}

interface Room {
  id: string
  name: string
  capacity: number | null
  current_condition: string
  room_code: string | null
  is_active: boolean
  is_for_rent: boolean | null
  room_rates: RoomRate[] | null
  photo_url?: string | null
}

interface BuildingRow { 
  id: string
  name: string
  code: string
  assets: Room[] 
}

interface EquipmentRate {
  user_category: string
  rate_per_day: number
  rate_per_hour: number | null
  requires_supervision: boolean
}

interface EquipmentRow {
  id: string
  name: string
  description: string | null
  current_condition: string
  ketersediaan: string | null
  merk: string | null
  is_active: boolean
  photo_url?: string | null
  equipment_rates: EquipmentRate[] | null
}

interface InstitutionProfile {
  id?: string
  name: string
  short_name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  operating_hours: string | null
}

interface Props { 
  buildings: BuildingRow[]
  equipment: EquipmentRow[]
  institution: InstitutionProfile | null
}

const EQUIP_CATEGORY_LABELS: Record<string, string> = {
  'mahasiswa_s1': 'Mahasiswa S1',
  'mahasiswa_s2': 'Mahasiswa S2/S3',
  'dosen': 'Dosen/Karyawan',
  'mou_unesa': 'Kerjasama',
  'umum': 'Umum'
}

const ROOM_CATEGORY_LABELS: Record<string, string> = {
  'perkuliahan': 'Perkuliahan',
  'event_mahasiswa': 'Event Mahasiswa',
  'event_umum': 'Event Umum',
}

function getRateByCategory(rates: EquipmentRate[] | null | undefined, category: string): number | null {
  if (!rates || rates.length === 0) return null
  const rate = rates.find(r => r.user_category === category)
  return rate ? rate.rate_per_day : null
}

function getPriceRange(rates: EquipmentRate[] | null | undefined): { min: number | null; max: number | null } {
  if (!rates || rates.length === 0) return { min: null, max: null }
  const prices = rates.map(r => r.rate_per_day).filter(p => p > 0)
  if (prices.length === 0) return { min: null, max: null }
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

function Paginator({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  
  const getVisiblePages = () => {
    const pages: (number | string)[] = []
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', total)
      } else if (page >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total)
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', total)
      }
    }
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-1">
        {getVisiblePages().map((p, i) => (
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">...</span>
          ) : (
            <Button
              key={p}
              variant={page === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(p as number)}
              className={cn(
                'h-9 w-9 text-sm font-medium',
                page === p && 'bg-blue-950 hover:bg-blue-900'
              )}
            >
              {p}
            </Button>
          )
        ))}
      </div>
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page === total}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function RoomCard({ room }: { room: Room & { buildingName: string; displayName: string } }) {
  const lowestRate = useMemo(() => {
    if (!room.room_rates || room.room_rates.length === 0) return null
    const rates = room.room_rates.map(r => r.rate_per_day).filter(r => r && r > 0)
    return rates.length > 0 ? Math.min(...rates) : null
  }, [room.room_rates])

  return (
    <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-white">
      {/* Image Placeholder */}
      <div className="relative h-40 bg-gradient-to-br from-blue-100 to-indigo-100 overflow-hidden">
        {room.photo_url ? (
          <img 
            src={room.photo_url} 
            alt={room.displayName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-16 w-16 text-blue-300" />
          </div>
        )}
        
        {/* Overlay Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-xs font-medium">
            <MapPin className="h-3 w-3 mr-1" />
            {room.buildingName}
          </Badge>
        </div>
        
        {/* Condition Badge */}
        <div className="absolute top-3 right-3">
          <ConditionBadge condition={room.current_condition} />
        </div>
        
        {/* Room Code */}
        {room.room_code && (
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-blue-950/90 text-white text-xs font-mono">
              {room.room_code}
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1" title={room.displayName}>
          {room.displayName}
        </h3>
        
        {/* Capacity */}
        {room.capacity && (
          <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
            <Users className="h-4 w-4" />
            <span>Kapasitas {room.capacity} orang</span>
          </div>
        )}
        
        {/* Price */}
        <div className="mb-4">
          {lowestRate ? (
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-emerald-600">{formatRupiah(lowestRate)}</span>
              <span className="text-sm text-slate-400">/hari</span>
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">Tarif belum diatur</span>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger
              className="flex-1"
              render={<Button variant="outline" size="sm" className="w-full h-9" />}
            >
              <CalendarDays className="h-4 w-4 mr-1.5" />
              Jadwal
            </DialogTrigger>
            <DialogContent className="max-w-md p-0">
              <DialogHeader className="p-4 pb-0">
                <DialogTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Kalender - {room.displayName}
                </DialogTitle>
              </DialogHeader>
              <CalendarView roomId={room.id} compact className="border-0 shadow-none" />
            </DialogContent>
          </Dialog>
          
          <Link href={`/rooms/${createSlug(room.name)}/inventory`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-9">
              <Info className="h-4 w-4 mr-1.5" />
              Detail
            </Button>
          </Link>
          
          <Link href="/login" className="flex-[2]">
            <Button size="sm" className="w-full h-9 bg-blue-950 hover:bg-blue-900">
              Pesan
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function EquipmentCard({ item }: { item: EquipmentRow & { displayName: string } }) {
  const priceRange = getPriceRange(item.equipment_rates)
  const hasRates = item.equipment_rates && item.equipment_rates.length > 0

  return (
    <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-white">
      {/* Image Placeholder */}
      <div className="relative h-40 bg-gradient-to-br from-emerald-100 to-teal-100 overflow-hidden">
        {item.photo_url ? (
          <img 
            src={item.photo_url} 
            alt={item.displayName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-emerald-300" />
          </div>
        )}
        
        {/* Condition Badge */}
        <div className="absolute top-3 right-3">
          <ConditionBadge condition={item.current_condition} />
        </div>
        
        {/* Availability Badge */}
        <div className="absolute bottom-3 left-3">
          <AvailabilityBadge status={item.ketersediaan ?? 'tersedia'} />
        </div>
      </div>
      
      <CardContent className="p-4">
        {/* Title & Brand */}
        <h3 className="font-semibold text-slate-900 mb-0.5 line-clamp-1" title={item.displayName}>
          {item.displayName}
        </h3>
        {item.merk && (
          <p className="text-sm text-slate-500 mb-2">{item.merk}</p>
        )}
        
        {/* Description */}
        {item.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-3">
            {item.description}
          </p>
        )}
        
        {/* Price */}
        <div className="mb-4">
          {hasRates && priceRange.min !== null ? (
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-emerald-600">
                {formatRupiah(priceRange.min)}
              </span>
              <span className="text-sm text-slate-400">/hari</span>
              {priceRange.max !== priceRange.min && (
                <span className="text-xs text-slate-400 ml-1">
                  - {formatRupiah(priceRange.max as number)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">Tarif belum diatur</span>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger
              className="flex-1"
              render={<Button variant="outline" size="sm" className="w-full h-9" />}
            >
              <CalendarDays className="h-4 w-4 mr-1.5" />
              Jadwal
            </DialogTrigger>
            <DialogContent className="max-w-md p-0">
              <DialogHeader className="p-4 pb-0">
                <DialogTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Kalender - {item.displayName}
                </DialogTitle>
              </DialogHeader>
              <CalendarView equipmentId={item.id} compact className="border-0 shadow-none" />
            </DialogContent>
          </Dialog>
          
          <Link href="/login" className="flex-[2]">
            <Button size="sm" className="w-full h-9 bg-blue-950 hover:bg-blue-900">
              Pesan
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function CatalogClient({ buildings, equipment, institution }: Props) {
  const [activeTab, setActiveTab] = useState('rooms')
  const [roomSearch, setRoomSearch] = useState('')
  const [roomBuilding, setRoomBuilding] = useState('all')
  const [equipSearch, setEquipSearch] = useState('')
  const [equipAvail, setEquipAvail] = useState('all')
  const [roomPage, setRoomPage] = useState(1)
  const [equipPage, setEquipPage] = useState(1)

  useEffect(() => { setRoomPage(1) }, [roomSearch, roomBuilding])
  useEffect(() => { setEquipPage(1) }, [equipSearch, equipAvail])

  const allRooms = useMemo(() =>
    buildings.flatMap(b =>
      b.assets
        .filter(a => a.is_active && a.is_for_rent !== false)
        .map(a => ({ ...a, buildingName: b.name, buildingId: b.id }))
    ),
    [buildings]
  )

  const roomsWithNumbers = useMemo(() => {
    const nameCount: Record<string, number> = {}
    for (const r of allRooms) nameCount[r.name] = (nameCount[r.name] || 0) + 1
    const nameIndex: Record<string, number> = {}
    return allRooms.map(r => {
      nameIndex[r.name] = (nameIndex[r.name] || 0) + 1
      return { ...r, displayName: nameCount[r.name] > 1 ? `${r.name} ${nameIndex[r.name]}` : r.name }
    })
  }, [allRooms])

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
    const matchSearch = !roomSearch || 
      r.displayName.toLowerCase().includes(roomSearch.toLowerCase()) || 
      (r.room_code?.toLowerCase().includes(roomSearch.toLowerCase()))
    const matchBuilding = roomBuilding === 'all' || r.buildingId === roomBuilding
    return matchSearch && matchBuilding
  }), [roomsWithNumbers, roomSearch, roomBuilding])

  const filteredEquip = useMemo(() => equipWithNumbers.filter(e => {
    const matchSearch = !equipSearch || 
      e.displayName.toLowerCase().includes(equipSearch.toLowerCase()) || 
      (e.merk?.toLowerCase().includes(equipSearch.toLowerCase()))
    const matchAvail = equipAvail === 'all' || (e.ketersediaan ?? 'tersedia') === equipAvail
    return matchSearch && matchAvail
  }), [equipWithNumbers, equipSearch, equipAvail])

  const roomTotalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE))
  const equipTotalPages = Math.max(1, Math.ceil(filteredEquip.length / PAGE_SIZE))
  const pagedRooms = filteredRooms.slice((roomPage - 1) * PAGE_SIZE, roomPage * PAGE_SIZE)
  const pagedEquip = filteredEquip.slice((equipPage - 1) * PAGE_SIZE, equipPage * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Decorative Blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
              {institution?.name || 'Katalog Ruang & Alat'}
            </h1>
            <p className="text-xl text-blue-200 mb-2">
              {institution?.short_name}
            </p>
            <p className="text-blue-200/80 text-lg">
              {institution?.description || 'Temukan dan pesan ruang atau alat yang tersedia untuk kegiatan Anda'}
            </p>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { label: 'Gedung', value: stats.gedung, icon: Building2 },
              { label: 'Ruangan', value: stats.ruangan, icon: MapPin },
              { label: 'Total Alat', value: stats.alat, icon: Package },
              { label: 'Alat Tersedia', value: stats.tersedia, icon: Users },
            ].map((s, i) => (
              <div 
                key={s.label} 
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/20 transition-colors"
              >
                <s.icon className="h-6 w-6 mx-auto mb-2 text-blue-300" />
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-sm text-blue-200">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 -mt-8 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl shadow-lg p-2">
            <TabsList className="w-full grid grid-cols-2 h-14 bg-slate-100 p-1 rounded-xl">
              <TabsTrigger 
                value="rooms" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-950 font-medium transition-all"
              >
                <Building2 className="h-5 w-5 mr-2" />
                Ruangan
                <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-700">
                  {filteredRooms.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="equipment"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-950 font-medium transition-all"
              >
                <Package className="h-5 w-5 mr-2" />
                Alat & Peralatan
                <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-700">
                  {filteredEquip.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Rooms Tab */}
          <TabsContent value="rooms" className="space-y-6 mt-0">
            {/* Filters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari ruangan berdasarkan nama atau kode..."
                      value={roomSearch}
                      onChange={e => setRoomSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={roomBuilding === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRoomBuilding('all')}
                      className={cn(
                        "h-11 px-4 rounded-xl",
                        roomBuilding === 'all' && "bg-blue-950 hover:bg-blue-900"
                      )}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Semua Gedung
                    </Button>
                    
                    {buildings.slice(0, 3).map(b => (
                      <Button
                        key={b.id}
                        variant={roomBuilding === b.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRoomBuilding(b.id)}
                        className={cn(
                          "h-11 px-4 rounded-xl hidden sm:inline-flex",
                          roomBuilding === b.id && "bg-blue-950 hover:bg-blue-900"
                        )}
                      >
                        {b.name}
                      </Button>
                    ))}
                    
                    {buildings.length > 3 && (
                      <select
                        value={roomBuilding}
                        onChange={e => setRoomBuilding(e.target.value)}
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="all">Semua Gedung</option>
                        {buildings.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-slate-600">
                Menampilkan <span className="font-semibold text-slate-900">{pagedRooms.length}</span> dari{' '}
                <span className="font-semibold text-slate-900">{filteredRooms.length}</span> ruangan
              </p>
            </div>

            {/* Rooms Grid */}
            {filteredRooms.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Tidak ada ruangan ditemukan</h3>
                <p className="text-slate-500">Coba ubah kata kunci pencarian atau filter</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {pagedRooms.map(room => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </div>
                <Paginator page={roomPage} total={roomTotalPages} onChange={setRoomPage} />
              </>
            )}
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-6 mt-0">
            {/* Filters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari alat berdasarkan nama atau merk..."
                      value={equipSearch}
                      onChange={e => setEquipSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      value={equipAvail}
                      onChange={e => setEquipAvail(e.target.value)}
                      className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[160px]"
                    >
                      <option value="all">Semua Status</option>
                      <option value="tersedia">✅ Tersedia</option>
                      <option value="digunakan">🔵 Digunakan</option>
                      <option value="hilang">❌ Hilang</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-slate-600">
                Menampilkan <span className="font-semibold text-slate-900">{pagedEquip.length}</span> dari{' '}
                <span className="font-semibold text-slate-900">{filteredEquip.length}</span> alat
              </p>
            </div>

            {/* Equipment Grid */}
            {filteredEquip.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Tidak ada alat ditemukan</h3>
                <p className="text-slate-500">Coba ubah kata kunci pencarian atau filter</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {pagedEquip.map(item => (
                    <EquipmentCard key={item.id} item={item} />
                  ))}
                </div>
                <Paginator page={equipPage} total={equipTotalPages} onChange={setEquipPage} />
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-950 to-indigo-900 rounded-2xl p-8 sm:p-12 text-white text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Siap Meminjam?
          </h2>
          <p className="text-blue-200 mb-8 max-w-2xl mx-auto">
            Login untuk melakukan pemesanan dan kelola peminjaman Anda dengan mudah
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-white text-blue-950 hover:bg-blue-50 px-8 h-12 text-base">
              Login Sekarang
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
