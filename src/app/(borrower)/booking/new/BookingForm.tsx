'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createBookingAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2, Info, Users, Building2, Package, Clock, Calendar,
  Wrench, Search, X, MapPin
} from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'
import type { BookableItem, RoomItem, EquipmentItem, UserProfile } from './page'
import {
  EVENT_TYPES,
  type BorrowerCategory,
  getBorrowerCategoryLabel,
  isFreeBooking,
} from '@/lib/categories'

interface SelectedRoom extends RoomItem {
  selected: boolean
}

interface SelectedEquipment extends EquipmentItem {
  selected: boolean
  quantity: number
}

interface FormData {
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  purpose: string
  event_type: string
  estimated_participants?: number
  agreed: boolean
}

const MAX_BOOKING_DAYS = 3

const schema = z.object({
  start_date: z.string().min(1, 'Tanggal pinjam wajib diisi'),
  start_time: z.string().optional(),
  end_date: z.string().min(1, 'Tanggal kembali wajib diisi'),
  end_time: z.string().optional(),
  purpose: z.string().min(10, 'Tujuan minimal 10 karakter').max(500),
  event_type: z.enum(['perkuliahan', 'event_mahasiswa', 'event_umum', 'penelitian', 'penelitian_tugas_akhir', 'lainnya']).default('lainnya'),
  estimated_participants: z.coerce.number().int().min(1).optional(),
  agreed: z.boolean().refine(v => v === true, 'Anda harus menyetujui perjanjian'),
}).refine((data) => {
  // Allow same-day: tanggal kembali >= tanggal pinjam
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    if (end < start) {
      return false
    }
  }
  return true
}, {
  message: 'Tanggal kembali tidak boleh sebelum tanggal pinjam',
  path: ['end_date'],
}).refine((data) => {
  // Validate max days
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    // Tanggal sama = 1 hari, beda = selisih + 1
    const diffDays = start.toDateString() === end.toDateString()
      ? 1
      : Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    if (diffDays > MAX_BOOKING_DAYS) {
      return false
    }
  }
  return true
}, {
  message: `Maksimal peminjaman ${MAX_BOOKING_DAYS} hari`,
  path: ['end_date'],
})

function getRateForEquipment(equipment: EquipmentItem, borrowerCategory: BorrowerCategory): number {
  const rate = equipment.rates.find(r => r.user_category === borrowerCategory)
    ?? equipment.rates.find(r => r.user_category === 'umum')
  return rate?.rate_per_day ?? 0
}

function requiresSupervision(equipment: EquipmentItem, borrowerCategory: BorrowerCategory): boolean {
  const rate = equipment.rates.find(r => r.user_category === borrowerCategory)
    ?? equipment.rates.find(r => r.user_category === 'umum')
  return rate?.requires_supervision ?? false
}

interface BookingFormProps {
  items: BookableItem[]
  profile: UserProfile | null
  borrowerCategory: BorrowerCategory
  defaultItemId?: string
  defaultItemType?: 'room' | 'equipment'
}

export function BookingForm({ items, profile, borrowerCategory, defaultItemId, defaultItemType }: BookingFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const roomItems = useMemo(() => items.filter((i): i is RoomItem => i.item_type === 'room'), [items])
  const equipmentItems = useMemo(() => items.filter((i): i is EquipmentItem => i.item_type === 'equipment'), [items])

  const [roomSearch, setRoomSearch] = useState('')
  const [equipmentSearch, setEquipmentSearch] = useState('')

  const filteredRoomItems = useMemo(() => {
    if (!roomSearch.trim()) return roomItems
    const searchLower = roomSearch.toLowerCase()
    return roomItems.filter(room =>
      room.name.toLowerCase().includes(searchLower) ||
      room.room_code?.toLowerCase().includes(searchLower) ||
      room.building_name?.toLowerCase().includes(searchLower)
    )
  }, [roomItems, roomSearch])

  const filteredEquipmentItems = useMemo(() => {
    if (!equipmentSearch.trim()) return equipmentItems
    const searchLower = equipmentSearch.toLowerCase()
    return equipmentItems.filter(equip =>
      equip.name.toLowerCase().includes(searchLower) ||
      equip.equipment_code?.toLowerCase().includes(searchLower) ||
      equip.merk?.toLowerCase().includes(searchLower)
    )
  }, [equipmentItems, equipmentSearch])

  const [selectedRooms, setSelectedRooms] = useState<SelectedRoom[]>(
    roomItems.map(r => ({ ...r, selected: defaultItemId && defaultItemType === 'room' ? r.id === defaultItemId : false }))
  )
  const [selectedEquipment, setSelectedEquipment] = useState<SelectedEquipment[]>(
    equipmentItems.map(e => ({ ...e, selected: defaultItemId && defaultItemType === 'equipment' ? e.id === defaultItemId : false, quantity: 1 }))
  )

  const { register, handleSubmit, watch, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    mode: 'onChange',
    defaultValues: {
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
    },
  })

  const startDate = watch('start_date')
  const startTime = watch('start_time')
  const endDate = watch('end_date')
  const endTime = watch('end_time')
  const eventType = watch('event_type')
  const purpose = watch('purpose')

  const today = new Date().toISOString().split('T')[0]

  const selectedRoomList = selectedRooms.filter(r => r.selected)
  const selectedEquipmentList = selectedEquipment.filter(e => e.selected)
  const hasRooms = selectedRoomList.length > 0
  const hasEquipment = selectedEquipmentList.length > 0
  const hasItems = hasRooms || hasEquipment

  const [estimatedTotal, setEstimatedTotal] = useState<number>(0)
  const [priceBreakdown, setPriceBreakdown] = useState<Array<{name: string, type: string, price: number, details: string}>>([])

  useEffect(() => {
    const roomList = selectedRooms.filter(r => r.selected)
    const equipList = selectedEquipment.filter(e => e.selected)
    const roomsSelected = roomList.length > 0

    if (!startDate || !endDate) {
      setEstimatedTotal(0)
      setPriceBreakdown([])
      return
    }

    if (roomsSelected && (!startTime || !endTime)) {
      setEstimatedTotal(0)
      setPriceBreakdown([])
      return
    }

    const start = roomsSelected && startTime
      ? new Date(`${startDate}T${startTime}`)
      : new Date(`${startDate}T00:00`)
    const end = roomsSelected && endTime
      ? new Date(`${endDate}T${endTime}`)
      : new Date(`${endDate}T23:59`)

    if (end < start) {
      setEstimatedTotal(0)
      setPriceBreakdown([])
      return
    }

    let total = 0
    const breakdown: Array<{name: string, type: string, price: number, details: string}> = []

    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
    const hours = Math.ceil((end.getTime() - start.getTime()) / 3600000)

    const isGratis = isFreeBooking(borrowerCategory, eventType, purpose)

    if (roomsSelected && startTime && endTime && !isGratis) {
      roomList.forEach(room => {
        const ratePerDay = room.rate_per_day ?? 0
        const ratePerHour = room.rate_per_hour ?? 0

        let roomTotal = 0
        let details = ''

        if (hours > 12 && ratePerDay > 0) {
          roomTotal = ratePerDay * days
          details = `${formatRupiah(ratePerDay)}/hari × ${days} hari`
        } else if (ratePerHour > 0) {
          roomTotal = ratePerHour * hours
          details = `${formatRupiah(ratePerHour)}/jam × ${hours} jam`
        } else if (ratePerDay > 0) {
          roomTotal = ratePerDay * days
          details = `${formatRupiah(ratePerDay)}/hari × ${days} hari`
        }

        total += roomTotal
        breakdown.push({
          name: room.name,
          type: 'room',
          price: roomTotal,
          details: details || 'Tarif belum diatur'
        })
      })
    } else if (roomsSelected && isGratis) {
      roomList.forEach(room => {
        breakdown.push({
          name: room.name,
          type: 'room',
          price: 0,
          details: 'Gratis (Mahasiswa S1)'
        })
      })
    }

    if (!isGratis) {
      equipList.forEach(equip => {
        const ratePerDay = getRateForEquipment(equip, borrowerCategory)
        const equipTotal = days * ratePerDay * equip.quantity
        total += equipTotal
        breakdown.push({
          name: equip.name,
          type: 'equipment',
          price: equipTotal,
          details: `${formatRupiah(ratePerDay)}/hari × ${days} hari${equip.quantity > 1 ? ` × ${equip.quantity} unit` : ''}`
        })
      })
    } else {
      equipList.forEach(equip => {
        breakdown.push({
          name: equip.name,
          type: 'equipment',
          price: 0,
          details: 'Gratis (Mahasiswa S1)'
        })
      })
    }

    setEstimatedTotal(total)
    setPriceBreakdown(breakdown)
  }, [startDate, startTime, endDate, endTime, selectedRooms, selectedEquipment, eventType, borrowerCategory, purpose])

  function toggleRoom(roomId: string) {
    setSelectedRooms(prev => prev.map(r =>
      r.id === roomId ? { ...r, selected: !r.selected } : r
    ))
  }

  function toggleEquipment(equipmentId: string) {
    setSelectedEquipment(prev => prev.map(e =>
      e.id === equipmentId ? { ...e, selected: !e.selected } : e
    ))
  }

  async function onSubmit(data: unknown) {
    const formData = data as FormData

    if (!hasItems) {
      toast.error('Pilih minimal satu ruangan atau alat')
      return
    }

    setLoading(true)

    const result = await createBookingAction({
      start_date: formData.start_date,
      start_time: formData.start_time,
      end_date: formData.end_date,
      end_time: formData.end_time,
      purpose: formData.purpose,
      event_type: formData.event_type as 'perkuliahan' | 'event_mahasiswa' | 'event_umum' | 'penelitian' | 'penelitian_tugas_akhir' | 'lainnya',
      room_ids: selectedRoomList.map(r => r.id),
      equipment_items: selectedEquipmentList.map(e => ({ id: e.id, quantity: e.quantity })),
    })

    if (!result.success) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success('Pengajuan berhasil dikirim!')

    fetch('/api/notifications/booking-submitted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: result.bookingId }),
    }).catch(() => { /* Silent fail */ })

    router.push(`/bookings/${result.referenceNo}`)
    setLoading(false)
  }

  const categoryLabel = getBorrowerCategoryLabel(borrowerCategory)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Profile Banner */}
      {profile && (
        <div className="flex items-center gap-3 px-4 py-3 bg-card rounded-[12px] border border-border">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{profile.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {profile.institution}
              {profile.class_division ? ` · ${profile.class_division}` : ''}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">{categoryLabel}</Badge>
        </div>
      )}

      {/* ── Room Selection ── */}
      <section className="bg-card rounded-[14px] border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
          <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <p className="text-sm font-semibold">Pilih Ruangan</p>
          {hasRooms && (
            <Badge className="ml-auto bg-blue-100 text-blue-700 border border-blue-200 text-xs">
              {selectedRoomList.length} dipilih
            </Badge>
          )}
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Cari nama ruangan, kode, atau gedung..."
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {roomSearch && (
              <button type="button" onClick={() => setRoomSearch('')} aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <ScrollArea className="h-[220px] border border-border rounded-[10px]">
            <div className="p-2 space-y-1">
              {filteredRoomItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {roomSearch ? 'Tidak ada ruangan yang cocok' : 'Tidak ada ruangan tersedia'}
                </p>
              )}
              {filteredRoomItems.map((room) => {
                const isSelected = selectedRooms.find(r => r.id === room.id)?.selected ?? false
                return (
                  <div
                    key={room.id}
                    onClick={() => toggleRoom(room.id)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-[8px] cursor-pointer transition-colors select-none',
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-muted border border-transparent'
                    )}
                  >
                    <div className={cn(
                      'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-muted-foreground/30'
                    )}>
                      {isSelected && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{room.name}</span>
                        {room.room_code && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{room.room_code}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {room.building_name && <span>{room.building_name}</span>}
                        {room.capacity && <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{room.capacity}</span>}
                        <span className="text-emerald-600 font-medium">
                          {room.rate_per_hour ? `${formatRupiah(room.rate_per_hour)}/jam`
                            : room.rate_per_day ? `${formatRupiah(room.rate_per_day)}/hari`
                            : 'Gratis'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </section>

      {/* ── Equipment Selection ── */}
      <section className="bg-card rounded-[14px] border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
          <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Wrench className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="text-sm font-semibold">Pilih Alat/Peralatan</p>
          {hasEquipment && (
            <Badge className="ml-auto bg-amber-100 text-amber-700 border border-amber-200 text-xs">
              {selectedEquipmentList.length} alat
            </Badge>
          )}
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Cari nama alat, kode, atau merk..."
              value={equipmentSearch}
              onChange={(e) => setEquipmentSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {equipmentSearch && (
              <button type="button" onClick={() => setEquipmentSearch('')} aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <ScrollArea className="h-[220px] border border-border rounded-[10px]">
            <div className="p-2 space-y-1">
              {filteredEquipmentItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {equipmentSearch ? 'Tidak ada alat yang cocok' : 'Tidak ada alat tersedia'}
                </p>
              )}
              {filteredEquipmentItems.map((equip) => {
                const isSelected = selectedEquipment.find(e => e.id === equip.id)?.selected ?? false
                const rate = getRateForEquipment(equip, borrowerCategory)
                return (
                  <div
                    key={equip.id}
                    onClick={() => toggleEquipment(equip.id)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-[8px] cursor-pointer transition-colors select-none',
                      isSelected ? 'bg-amber-50 border border-amber-200' : 'hover:bg-muted border border-transparent'
                    )}
                  >
                    <div className={cn(
                      'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                      isSelected ? 'bg-amber-500 border-amber-500' : 'border-muted-foreground/30'
                    )}>
                      {isSelected && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{equip.name}</span>
                        {equip.equipment_code && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{equip.equipment_code}</span>}
                        {requiresSupervision(equip, borrowerCategory) && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">Perlu Pendamping</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {equip.merk && <span>{equip.merk}</span>}
                        <span className="text-emerald-600 font-medium">
                          {rate > 0 ? `${formatRupiah(rate)}/hari` : 'Gratis'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </section>

      {/* ── Selected Items ── */}
      {hasItems && (
        <section className="bg-emerald-50 rounded-[14px] border border-emerald-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-200 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Package className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-emerald-900">Item yang Dipilih</p>
            <Badge className="ml-auto bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs">
              {selectedRoomList.length + selectedEquipmentList.length} item
            </Badge>
          </div>
          <div className="p-3 space-y-2">
            {selectedRoomList.map((room) => (
              <div key={room.id} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-[10px] border border-emerald-100">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold">{room.name}</span>
                    {room.room_code && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{room.room_code}</span>}
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">Ruangan</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {room.building_name && <span className="flex items-center gap-1 inline-flex"><MapPin className="h-3 w-3" />{room.building_name}</span>}
                    {room.capacity && <span className="ml-2">· {room.capacity} orang</span>}
                    <span className="ml-2 text-emerald-600 font-medium">
                      · {!room.rate_per_day ? 'Gratis' : formatRupiah(room.rate_per_day) + '/hari'}
                    </span>
                  </p>
                </div>
                <button type="button" onClick={() => toggleRoom(room.id)} aria-label={`Hapus ${room.name}`}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {selectedEquipmentList.map((equip) => {
              const rate = getRateForEquipment(equip, borrowerCategory)
              return (
                <div key={equip.id} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-[10px] border border-emerald-100">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Wrench className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold">{equip.name}</span>
                      {equip.equipment_code && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{equip.equipment_code}</span>}
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Alat</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {equip.merk && <span>{equip.merk}</span>}
                      <span className="ml-1 text-emerald-600 font-medium">
                        {equip.merk ? '· ' : ''}{rate === 0 ? 'Gratis' : formatRupiah(rate) + '/hari'}
                      </span>
                    </p>
                  </div>
                  <button type="button" onClick={() => toggleEquipment(equip.id)} aria-label={`Hapus ${equip.name}`}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Schedule ── */}
      <section className="bg-card rounded-[14px] border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
          <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <p className="text-sm font-semibold">Jadwal Peminjaman</p>
          {startDate && endDate && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000))} hari
              {hasRooms && startTime && endTime && ` · ${startTime}–${endTime}`}
            </span>
          )}
        </div>
        <div className="p-4 space-y-4">
          {/* Context hint */}
          <p className="text-xs text-muted-foreground">
            {hasRooms
              ? 'Tentukan tanggal dan waktu mulai–selesai peminjaman ruangan.'
              : hasEquipment
              ? 'Isi tanggal pinjam dan kembali. Untuk 1 hari, gunakan tanggal yang sama.'
              : 'Pilih ruangan atau alat terlebih dahulu.'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Tanggal Pinjam */}
            <div className="space-y-1.5">
              <Label htmlFor="start_date" className="text-xs font-medium">Tanggal Pinjam</Label>
              <Input id="start_date" type="date" min={today}
                className="h-9 text-sm"
                aria-invalid={!!errors.start_date}
                {...register('start_date')} />
              {errors.start_date && <p role="alert" className="text-xs text-destructive">{errors.start_date.message}</p>}
            </div>
            {/* Jam Mulai (rooms only) */}
            {hasRooms ? (
              <div className="space-y-1.5">
                <Label htmlFor="start_time" className="text-xs font-medium">Jam Mulai <span className="text-destructive">*</span></Label>
                <Input id="start_time" type="time"
                  className="h-9 text-sm"
                  aria-invalid={!!errors.start_time}
                  {...register('start_time')} />
              </div>
            ) : <div />}
            {/* Tanggal Kembali */}
            <div className="space-y-1.5">
              <Label htmlFor="end_date" className="text-xs font-medium">Tanggal Kembali</Label>
              <Input id="end_date" type="date"
                min={startDate || today}
                max={startDate ? new Date(new Date(startDate).getTime() + MAX_BOOKING_DAYS * 86_400_000).toISOString().split('T')[0] : undefined}
                className="h-9 text-sm"
                aria-invalid={!!errors.end_date}
                {...register('end_date')} />
              {errors.end_date && <p role="alert" className="text-xs text-destructive">{errors.end_date.message}</p>}
            </div>
            {/* Jam Selesai (rooms only) */}
            {hasRooms ? (
              <div className="space-y-1.5">
                <Label htmlFor="end_time" className="text-xs font-medium">Jam Selesai <span className="text-destructive">*</span></Label>
                <Input id="end_time" type="time"
                  className="h-9 text-sm"
                  aria-invalid={!!errors.end_time}
                  {...register('end_time')} />
              </div>
            ) : <div />}
          </div>

          {hasRooms && (
            <div className="space-y-1.5">
              <Label htmlFor="participants" className="text-xs font-medium">Estimasi Jumlah Peserta</Label>
              <Input id="participants" type="number" min={1} placeholder="Contoh: 30"
                className="h-9 text-sm"
                {...register('estimated_participants')} />
            </div>
          )}
        </div>
      </section>

      {/* ── Price Summary ── */}
      {hasItems && startDate && endDate && (!hasRooms || (startTime && endTime)) && (
        <section className="bg-card rounded-[14px] border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Package className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold">Rincian Biaya</p>
          </div>
          <div className="p-4 space-y-3">
            {priceBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {item.type === 'room'
                    ? <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    : <Wrench className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.details}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold shrink-0">{formatRupiah(item.price)}</p>
              </div>
            ))}
            <Separator />
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Estimasi</p>
                <p className="text-2xl font-bold text-emerald-600">{formatRupiah(estimatedTotal)}</p>
              </div>
              <p className="text-[10px] text-muted-foreground pb-1">*dapat berubah sesuai kebijakan</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Purpose ── */}
      <section className="bg-card rounded-[14px] border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            <Info className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <p className="text-sm font-semibold">Tujuan Peminjaman</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="event_type" className="text-xs font-medium">
              Jenis Kegiatan <span className="text-destructive">*</span>
            </Label>
            <select
              id="event_type"
              className="h-9 w-full rounded-[8px] border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('event_type')}
            >
              {EVENT_TYPES.map(et => (
                <option key={et.key} value={et.key}>{et.label}</option>
              ))}
            </select>
            {eventType && (
              <p className="text-xs text-muted-foreground">
                {EVENT_TYPES.find(et => et.key === eventType)?.description}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="purpose" className="text-xs font-medium">
              Tujuan Peminjaman <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="purpose"
              placeholder="Jelaskan tujuan penggunaan dengan detail (minimal 10 karakter)..."
              rows={3}
              className="text-sm resize-none"
              aria-invalid={!!errors.purpose}
              {...register('purpose')}
            />
            {errors.purpose && <p role="alert" className="text-xs text-destructive">{errors.purpose.message}</p>}
          </div>
        </div>
      </section>

      {/* ── Agreement ── */}
      <label htmlFor="agreed" className="flex items-start gap-3 cursor-pointer px-4 py-3 bg-card rounded-[12px] border border-border hover:bg-muted/30 transition-colors">
        <input
          id="agreed"
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary shrink-0"
          aria-invalid={!!errors.agreed}
          {...register('agreed')}
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          Saya menyetujui <strong className="text-foreground">perjanjian tanggung jawab peminjaman</strong> dan
          bertanggung jawab penuh atas kondisi aset yang dipinjam. Saya bersedia mengganti kerugian jika
          terjadi kerusakan atau kehilangan.
        </span>
      </label>
      {errors.agreed && <p role="alert" className="text-xs text-destructive -mt-2 px-1">{errors.agreed.message}</p>}

      {/* ── Submit ── */}
      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold"
        disabled={loading || !isValid || !hasItems}
      >
        {loading
          ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Mengirim Pengajuan...</>
          : hasItems
          ? <><Calendar className="mr-2 h-5 w-5" />Kirim Pengajuan</>
          : 'Pilih Item Terlebih Dahulu'
        }
      </Button>
    </form>
  )
}
