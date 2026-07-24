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
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2, Info, Users, Building2, Package, Clock, Calendar,
  Search, XCircle, X, MapPin, Wrench, BadgeCheck, ChevronRight
} from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'
import type { BookableItem, RoomItem, EquipmentItem, UserProfile } from './page'
import {
  EVENT_TYPES,
  type BorrowerCategory,
  getBorrowerCategoryLabel,
  isFreeBooking,
} from '@/lib/categories'
import { BookingStepper } from './BookingStepper'
import { BookingSummary } from './BookingSummary'

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
  start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
  start_time: z.string().optional(),
  end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
  end_time: z.string().optional(),
  purpose: z.string().min(10, 'Tujuan minimal 10 karakter').max(500),
  event_type: z.enum(['perkuliahan', 'event_mahasiswa', 'event_umum', 'penelitian', 'penelitian_tugas_akhir', 'lainnya']).default('lainnya'),
  estimated_participants: z.coerce.number().int().min(1).optional(),
  agreed: z.boolean().refine(v => v === true, 'Anda harus menyetujui perjanjian'),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    // Tanggal sama = 1 hari, diperbolehkan
    if (end < start) {
      return false
    }
  }
  return true
}, {
  message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
  path: ['end_date'],
}).refine((data) => {
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

    // Tanggal sama = 1 hari; beda tanggal = selisih hari + 1 (inklusif)
    const isSameDay = startDate === endDate
    const days = isSameDay
      ? 1
      : Math.ceil((new Date(`${endDate}T00:00`).getTime() - new Date(`${startDate}T00:00`).getTime()) / 86400000) + 1
    const hours = isSameDay
      ? Math.ceil((end.getTime() - start.getTime()) / 3600000) || 1
      : Math.ceil((end.getTime() - start.getTime()) / 3600000)

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

  function updateEquipmentQuantity(equipmentId: string, quantity: number) {
    if (quantity < 1) return
    setSelectedEquipment(prev => prev.map(e =>
      e.id === equipmentId ? { ...e, quantity } : e
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

  // Determine current step for stepper
  const currentStep = !hasItems ? 0 : (!startDate || !endDate || !purpose || purpose.length < 10) ? 1 : 2

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Form */}
      <div className="lg:col-span-2 space-y-6">
        <BookingStepper currentStep={currentStep} />

        {/* Profile Info Banner */}
        {profile && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full shrink-0">
                <Info className="h-4 w-4 text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{profile.name}</span>
                  <span className="text-muted-foreground"> — {profile.institution}</span>
                  {profile.class_division && (
                    <span className="text-muted-foreground">, {profile.class_division}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tarif dihitung untuk kategori:{' '}
                  <Badge variant="secondary" className="text-xs ml-1">{categoryLabel}</Badge>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Free booking banner for mahasiswa_s1 */}
        {borrowerCategory === 'mahasiswa_s1' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Peminjaman Gratis untuk Mahasiswa S1
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                Peminjaman untuk kegiatan perkuliahan dan tugas akhir tidak dikenakan biaya.
              </p>
            </div>
          </div>
        )}

        {/* Room Selection */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Pilih Ruangan</h2>
            {hasRooms && (
              <Badge variant="secondary">{selectedRoomList.length} dipilih</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Anda dapat memilih lebih dari satu ruangan dengan waktu peminjaman yang sama
          </p>

          {/* Room Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama ruangan, kode, atau gedung..."
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {roomSearch && (
              <button
                type="button"
                onClick={() => setRoomSearch('')}
                aria-label="Hapus pencarian ruangan"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {roomSearch && (
            <p className="text-xs text-muted-foreground">
              Menampilkan {filteredRoomItems.length} dari {roomItems.length} ruangan
            </p>
          )}

          <ScrollArea className="h-[320px] border rounded-lg p-3">
            <div className="space-y-2">
              {filteredRoomItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {roomSearch ? 'Tidak ada ruangan yang cocok dengan pencarian' : 'Tidak ada ruangan tersedia'}
                </p>
              )}
              {filteredRoomItems.map((room) => {
                const isSelected = selectedRooms.find(r => r.id === room.id)?.selected ?? false
                return (
                  <div
                    key={room.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                      isSelected
                        ? 'bg-blue-50/60 border-blue-200'
                        : 'hover:bg-muted/50 border-border'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="mt-2 shrink-0"
                      onCheckedChange={() => toggleRoom(room.id)}
                      aria-label={`Pilih ${room.name}`}
                    />
                    <SafeImage
                      src={room.photo_url}
                      alt={room.name}
                      className="w-14 h-14 rounded-lg object-contain bg-muted shrink-0"
                      fallbackClassName="w-14 h-14 rounded-lg shrink-0"
                      fallback={
                        <div className="w-14 h-14 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Building2 className="h-6 w-6 text-blue-400" />
                        </div>
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{room.name}</span>
                        {room.room_code && (
                          <Badge variant="outline" className="text-xs font-mono">{room.room_code}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {room.building_name && <span>{room.building_name}</span>}
                        {room.capacity && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {room.capacity} orang
                          </span>
                        )}
                        {room.rate_per_hour ? (
                          <span className="text-green-600 font-medium">{formatRupiah(room.rate_per_hour)}/jam</span>
                        ) : room.rate_per_day ? (
                          <span className="text-green-600 font-medium">{formatRupiah(room.rate_per_day)}/hari</span>
                        ) : (
                          <span className="text-green-600 font-medium">Gratis</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </section>

        <Separator />

        {/* Equipment Selection */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold">Pilih Alat/Peralatan</h2>
            {hasEquipment && (
              <Badge variant="secondary">
                {selectedEquipmentList.reduce((sum, e) => sum + e.quantity, 0)} unit
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Anda dapat memilih beberapa alat untuk dipinjam pada hari yang sama
          </p>

          {/* Equipment Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama alat, kode, atau merk..."
              value={equipmentSearch}
              onChange={(e) => setEquipmentSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {equipmentSearch && (
              <button
                type="button"
                onClick={() => setEquipmentSearch('')}
                aria-label="Hapus pencarian alat"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {equipmentSearch && (
            <p className="text-xs text-muted-foreground">
              Menampilkan {filteredEquipmentItems.length} dari {equipmentItems.length} alat
            </p>
          )}

          <ScrollArea className="h-[320px] border rounded-lg p-3">
            <div className="space-y-2">
              {filteredEquipmentItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {equipmentSearch ? 'Tidak ada alat yang cocok dengan pencarian' : 'Tidak ada alat tersedia'}
                </p>
              )}
              {filteredEquipmentItems.map((equip) => {
                const selected = selectedEquipment.find(e => e.id === equip.id)
                const isSelected = selected?.selected ?? false
                const quantity = selected?.quantity ?? 1
                const rate = getRateForEquipment(equip, borrowerCategory)

                return (
                  <div
                    key={equip.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                      isSelected
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'hover:bg-muted/50 border-border'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="mt-2 shrink-0"
                      onCheckedChange={() => toggleEquipment(equip.id)}
                      aria-label={`Pilih ${equip.name}`}
                    />
                    <SafeImage
                      src={equip.photo_url}
                      alt={equip.name}
                      className="w-14 h-14 rounded-lg object-contain bg-muted shrink-0"
                      fallbackClassName="w-14 h-14 rounded-lg shrink-0"
                      fallback={
                        <div className="w-14 h-14 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <Wrench className="h-6 w-6 text-amber-400" />
                        </div>
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{equip.name}</span>
                        {equip.equipment_code && (
                          <Badge variant="outline" className="text-xs font-mono">{equip.equipment_code}</Badge>
                        )}
                        {requiresSupervision(equip, borrowerCategory) && (
                          <Badge variant="destructive" className="text-[10px]">Perlu Pendamping</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {equip.merk && <span>{equip.merk}</span>}
                        {rate > 0 ? (
                          <span className="text-green-600 font-medium">{formatRupiah(rate)}/hari</span>
                        ) : (
                          <span className="text-green-600 font-medium">Gratis</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 min-h-[44px] min-w-[44px]"
                          aria-label="Kurangi jumlah"
                          onClick={() => updateEquipmentQuantity(equip.id, quantity - 1)}
                          disabled={quantity <= 1}
                        >
                          -
                        </Button>
                        <span className="text-sm font-medium w-7 text-center">{quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 min-h-[44px] min-w-[44px]"
                          aria-label="Tambah jumlah"
                          onClick={() => updateEquipmentQuantity(equip.id, quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </section>

        <Separator />

        {/* Date & Time Selection */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Jadwal Peminjaman</h2>
            <Badge variant="outline" className="text-xs font-normal">Maks. {MAX_BOOKING_DAYS} hari</Badge>
          </div>

          <div className="bg-muted border border-border rounded-lg p-3">
            {hasRooms ? (
              <p className="text-sm text-muted-foreground">
                Anda meminjam ruangan. Silakan tentukan tanggal dan waktu peminjaman.
              </p>
            ) : hasEquipment ? (
              <p className="text-sm text-muted-foreground">
                Anda hanya meminjam alat. Silakan tentukan tanggal peminjaman (jam tidak diperlukan).
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pilih ruangan atau alat terlebih dahulu untuk mengatur jadwal.
              </p>
            )}
          </div>

          <div className={cn('grid gap-4', hasRooms ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2')}>
            <div className="space-y-2">
              <Label htmlFor="start_date">Tanggal Mulai</Label>
              <Input
                id="start_date"
                type="date"
                min={today}
                aria-describedby={errors.start_date ? 'start_date-error' : undefined}
                aria-invalid={!!errors.start_date}
                {...register('start_date')}
              />
              {errors.start_date && <p id="start_date-error" role="alert" className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>

            {hasRooms && (
              <div className="space-y-2">
                <Label htmlFor="start_time">Jam Mulai <span className="text-destructive">*</span></Label>
                <Input
                  id="start_time"
                  type="time"
                  aria-describedby={errors.start_time ? 'start_time-error' : undefined}
                  aria-invalid={!!errors.start_time}
                  {...register('start_time')}
                />
                {errors.start_time && <p id="start_time-error" role="alert" className="text-sm text-destructive">{errors.start_time.message}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="end_date">Tanggal Selesai</Label>
              <Input
                id="end_date"
                type="date"
                min={startDate || today}
                max={startDate ? new Date(new Date(startDate).getTime() + (MAX_BOOKING_DAYS - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined}
                aria-describedby={errors.end_date ? 'end_date-error' : undefined}
                aria-invalid={!!errors.end_date}
                {...register('end_date')}
              />
              {errors.end_date && <p id="end_date-error" role="alert" className="text-sm text-destructive">{errors.end_date.message}</p>}
            </div>

            {hasRooms && (
              <div className="space-y-2">
                <Label htmlFor="end_time">Jam Selesai <span className="text-destructive">*</span></Label>
                <Input
                  id="end_time"
                  type="time"
                  aria-describedby={errors.end_time ? 'end_time-error' : undefined}
                  aria-invalid={!!errors.end_time}
                  {...register('end_time')}
                />
                {errors.end_time && <p id="end_time-error" role="alert" className="text-sm text-destructive">{errors.end_time.message}</p>}
              </div>
            )}
          </div>

          {/* Duration info */}
          {startDate && endDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Durasi: {startDate === endDate ? 1 : Math.ceil((new Date(`${endDate}T00:00`).getTime() - new Date(`${startDate}T00:00`).getTime()) / 86400000) + 1} hari
                {hasRooms && startTime && endTime && ` (${startTime} - ${endTime})`}
              </span>
            </div>
          )}

          {hasRooms && (
            <div className="space-y-2">
              <Label htmlFor="participants">Estimasi Jumlah Peserta</Label>
              <Input
                id="participants"
                type="number"
                min={1}
                placeholder="Contoh: 30"
                {...register('estimated_participants')}
              />
            </div>
          )}
        </section>

        <Separator />

        {/* Purpose & Event Type */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Tujuan Peminjaman</h2>

          <div className="space-y-2">
            <Label htmlFor="event_type">Jenis Kegiatan <span className="text-destructive">*</span></Label>
            <select
              id="event_type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('event_type')}
            >
              {EVENT_TYPES.map(et => (
                <option key={et.key} value={et.key}>{et.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{EVENT_TYPES.find(et => et.key === eventType)?.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Tujuan Peminjaman <span className="text-destructive">*</span></Label>
            <Textarea
              id="purpose"
              placeholder="Jelaskan tujuan penggunaan dengan detail (minimal 10 karakter)..."
              rows={4}
              aria-describedby={errors.purpose ? 'purpose-error' : undefined}
              aria-invalid={!!errors.purpose}
              {...register('purpose')}
            />
            {errors.purpose && <p id="purpose-error" role="alert" className="text-sm text-destructive">{errors.purpose.message}</p>}
          </div>
        </section>

        <Separator />

        {/* Agreement */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Persyaratan</h2>
          <label htmlFor="agreed" className="flex items-start gap-3 cursor-pointer">
            <input
              id="agreed"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              aria-describedby={errors.agreed ? 'agreed-error' : undefined}
              aria-invalid={!!errors.agreed}
              {...register('agreed')}
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              Saya menyetujui <strong>perjanjian tanggung jawab peminjaman</strong> dan bertanggung jawab
              penuh atas kondisi aset yang dipinjam selama masa peminjaman. Saya bersedia mengganti
              kerugian jika terjadi kerusakan atau kehilangan.
            </span>
          </label>
          {errors.agreed && <p id="agreed-error" role="alert" className="text-sm text-destructive">{errors.agreed.message}</p>}
        </section>
      </div>

      {/* Right Column - Sticky Summary (desktop only) */}
      <div className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          <BookingSummary
            selectedRooms={selectedRoomList}
            selectedEquipment={selectedEquipmentList}
            priceBreakdown={priceBreakdown}
            estimatedTotal={estimatedTotal}
            onSubmit={handleSubmit(onSubmit)}
            loading={loading}
            isValid={isValid}
            hasItems={hasItems}
            borrowerCategory={borrowerCategory}
            startDate={startDate}
            endDate={endDate}
            startTime={startTime}
            endTime={endTime}
          />
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      {hasItems && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 safe-area-pb">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Estimasi</p>
              <p className="text-lg font-bold text-green-600">{formatRupiah(estimatedTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{selectedRoomList.length + selectedEquipmentList.length} item dipilih</p>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('booking-form-container')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-xs text-blue-600 flex items-center gap-0.5 ml-auto"
              >
                Lihat detail <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
          <Button
            onClick={handleSubmit(onSubmit)}
            className="w-full h-12 text-base"
            disabled={loading || !isValid}
          >
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {loading ? 'Mengirim...' : 'Kirim Pengajuan'}
          </Button>
        </div>
      )}
    </div>
  )
}
