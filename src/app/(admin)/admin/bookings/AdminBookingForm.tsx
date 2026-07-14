'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, Plus, Trash2, User, Calendar, Package,
  ArrowLeft, Search, X, Building2, Wrench, CheckCircle2,
  DoorOpen, Clock,
} from 'lucide-react'
import { format, addHours } from 'date-fns'
import Link from 'next/link'
import { formatRupiah, cn } from '@/lib/utils'
import {
  BORROWER_CATEGORIES,
  EVENT_TYPES,
  isFreeBooking,
  getBorrowerCategoryLabel,
} from '@/lib/categories'

const schema = z.object({
  borrower_name: z.string().min(2, 'Nama peminjam wajib diisi'),
  borrower_email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  borrower_phone: z.string().optional(),
  borrower_institution: z.string().min(2, 'Instansi wajib diisi'),
  borrower_class: z.string().optional(),
  borrower_category: z.enum(['mahasiswa_s1', 'mahasiswa_s2', 'dosen', 'umum', 'kerjasama']),
  event_type: z.enum(['perkuliahan', 'event_mahasiswa', 'event_umum', 'penelitian', 'penelitian_tugas_akhir', 'lainnya']),
  purpose: z.string().min(5, 'Tujuan peminjaman wajib diisi'),
  start_datetime: z.string().min(1, 'Tanggal mulai wajib diisi'),
  end_datetime: z.string().min(1, 'Tanggal selesai wajib diisi'),
  items: z.array(z.object({
    item_type: z.enum(['room', 'equipment']),
    room_id: z.string(),
    equipment_id: z.string(),
    quantity: z.number().min(1),
  })).min(1, 'Minimal 1 item yang dipinjam'),
})

type FormData = z.infer<typeof schema>

interface RoomRate {
  usage_category: string
  rate_per_hour: number | null
  rate_per_day: number | null
}

interface Room {
  id: string
  name: string
  room_code: string | null
  building_name: string
  capacity: number | null
  photo_url: string | null
  rates: RoomRate[]
}

interface EquipmentRate {
  user_category: string
  rate_per_hour: number | null
  rate_per_day: number | null
  requires_supervision: boolean
}

interface Equipment {
  id: string
  name: string
  equipment_code: string | null
  merk: string | null
  photo_url: string | null
  rates: EquipmentRate[]
  ketersediaan: string
}

export function AdminBookingForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  // Per-item search state (keyed by field index)
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({})
  const [dropdownOpen, setDropdownOpen] = useState<Record<number, boolean>>({})
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      borrower_category: 'mahasiswa_s1',
      event_type: 'lainnya',
      items: [{ item_type: 'room', room_id: '', equipment_id: '', quantity: 1 }],
      start_datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_datetime: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm"),
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchItems = watch('items')
  const watchStart = watch('start_datetime')
  const watchEnd = watch('end_datetime')
  const watchBorrowerCategory = watch('borrower_category')
  const watchEventType = watch('event_type')

  // Load rooms and equipment
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roomsData } = await (supabase.from('rooms') as any)
        .select(`id, name, room_code, capacity, photo_url, buildings(name), room_rates(usage_category, rate_per_hour, rate_per_day)`)
        .eq('is_active', true)
        .eq('is_for_rent', true)
        .order('name')

      if (roomsData) {
        const rawRooms = roomsData as Array<{
          id: string; name: string; room_code: string | null; capacity: number | null
          photo_url: string | null; buildings: { name: string } | null; room_rates: RoomRate[]
        }>
        setRooms(rawRooms.map(r => ({
          id: r.id, name: r.name, room_code: r.room_code, capacity: r.capacity,
          photo_url: r.photo_url, building_name: r.buildings?.name || '-', rates: r.room_rates || [],
        })))
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: equipmentData } = await (supabase.from('equipment') as any)
        .select(`id, name, equipment_code, merk, photo_url, ketersediaan, equipment_rates(user_category, rate_per_hour, rate_per_day, requires_supervision)`)
        .eq('is_active', true)
        .eq('ketersediaan', 'tersedia')
        .order('name')

      if (equipmentData) {
        const rawEquipment = equipmentData as Array<{
          id: string; name: string; equipment_code: string | null; merk: string | null
          photo_url: string | null; ketersediaan: string; equipment_rates: EquipmentRate[]
        }>
        setEquipment(rawEquipment.map(e => ({
          id: e.id, name: e.name, equipment_code: e.equipment_code, merk: e.merk,
          photo_url: e.photo_url, ketersediaan: e.ketersediaan, rates: e.equipment_rates || [],
        })))
      }
    }
    loadData()
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      const anyOpen = Object.values(dropdownOpen).some(Boolean)
      if (!anyOpen) return
      const clickedInside = Object.values(dropdownRefs.current).some(ref => ref?.contains(target))
      if (!clickedInside) setDropdownOpen({})
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const getRoomRate = (room: Room, cat: string) =>
    room.rates.find(r => r.usage_category === cat) ??
    room.rates.find(r => r.usage_category === 'umum') ?? { rate_per_hour: null, rate_per_day: null }

  const getEquipmentRate = (eq: Equipment, cat: string) =>
    eq.rates.find(r => r.user_category === cat) ??
    eq.rates.find(r => r.user_category === 'umum') ?? { rate_per_hour: null, rate_per_day: null }

  // Calculate total
  useEffect(() => {
    if (!watchStart || !watchEnd || !watchBorrowerCategory) return
    const start = new Date(watchStart)
    const end = new Date(watchEnd)
    const hours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3_600_000))
    const days = Math.max(1, Math.ceil(hours / 24))
    const isGratis = isFreeBooking(watchBorrowerCategory, watchEventType)
    let total = 0
    if (!isGratis) {
      watchItems?.forEach((item) => {
        if (item.item_type === 'room' && item.room_id) {
          const room = rooms.find(r => r.id === item.room_id)
          if (room) {
            const rate = getRoomRate(room, watchBorrowerCategory)
            if (hours > 12 && rate.rate_per_day) total += rate.rate_per_day * days * item.quantity
            else if (rate.rate_per_hour) total += rate.rate_per_hour * hours * item.quantity
            else if (rate.rate_per_day) total += rate.rate_per_day * days * item.quantity
          }
        } else if (item.item_type === 'equipment' && item.equipment_id) {
          const eq = equipment.find(e => e.id === item.equipment_id)
          if (eq) {
            const rate = getEquipmentRate(eq, watchBorrowerCategory)
            if (rate.rate_per_day) total += rate.rate_per_day * days * item.quantity
            else if (rate.rate_per_hour) total += rate.rate_per_hour * hours * item.quantity
          }
        }
      })
    }
    setTotalAmount(total)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchItems, watchStart, watchEnd, watchBorrowerCategory, watchEventType, rooms, equipment])

  function getFilteredItems(type: 'room' | 'equipment', query: string) {
    const q = query.toLowerCase()
    if (type === 'room') {
      return rooms.filter(r =>
        !q || r.name.toLowerCase().includes(q) || (r.room_code ?? '').toLowerCase().includes(q) ||
        r.building_name.toLowerCase().includes(q)
      ).slice(0, 8)
    }
    return equipment.filter(e =>
      !q || e.name.toLowerCase().includes(q) || (e.equipment_code ?? '').toLowerCase().includes(q) ||
      (e.merk ?? '').toLowerCase().includes(q)
    ).slice(0, 8)
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Anda harus login'); return }

      const dateStr = format(new Date(), 'yyyyMMdd')
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
      const referenceNo = `BK${dateStr}-${randomStr}`

      let snapshotRate: Record<string, string | number | boolean | null | undefined> = {
        borrower_name: data.borrower_name, borrower_email: data.borrower_email,
        borrower_phone: data.borrower_phone, borrower_institution: data.borrower_institution,
        borrower_class: data.borrower_class, borrower_category: data.borrower_category,
        event_type: data.event_type, created_by_admin: true,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: booking, error: bookingError } = await (supabase.from('bookings') as any)
        .insert({
          reference_no: referenceNo,
          user_id: user.id,
          purpose: `${data.borrower_name} - ${data.borrower_institution}: ${data.purpose}`,
          event_type: data.event_type,
          start_datetime: data.start_datetime,
          end_datetime: data.end_datetime,
          total_amount: totalAmount,
          status: 'approved',
          snapshot_rate: snapshotRate,
        })
        .select().single()

      if (bookingError) throw bookingError

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await (supabase.from('booking_items') as any)
        .insert(data.items.map(item => ({
          booking_id: booking.id,
          item_type: item.item_type,
          room_id: item.item_type === 'room' ? item.room_id || null : null,
          equipment_id: item.item_type === 'equipment' ? item.equipment_id || null : null,
          quantity: item.quantity,
        })))

      if (itemsError) throw itemsError

      toast.success('Peminjaman berhasil dibuat')
      router.push('/admin/bookings')
      router.refresh()
    } catch (error) {
      toast.error('Gagal membuat peminjaman: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const isGratis = isFreeBooking(watchBorrowerCategory, watchEventType)

  // Duration for display
  const durationText = (() => {
    if (!watchStart || !watchEnd) return null
    const start = new Date(watchStart)
    const end = new Date(watchEnd)
    const hours = Math.ceil((end.getTime() - start.getTime()) / 3_600_000)
    if (hours <= 0) return null
    if (hours < 24) return `${hours} jam`
    return `${Math.ceil(hours / 24)} hari`
  })()

  return (
    <div className="admin-page max-w-3xl">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bookings"
            className="h-9 w-9 rounded-[10px] flex items-center justify-center border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="page-title">Peminjaman Baru</h1>
            <p className="page-subtitle">Buat pengajuan langsung untuk pimpinan / tamu</p>
          </div>
        </div>
        <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium self-start mt-1">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Langsung Disetujui
        </Badge>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Bagian 1: Data Peminjam ── */}
        <section className="bg-card rounded-[14px] border border-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2 bg-muted/40">
            <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <p className="text-sm font-semibold">Data Peminjam</p>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Nama Peminjam <span className="text-destructive">*</span>
                </Label>
                <Input placeholder="Nama lengkap" {...register('borrower_name')} />
                {errors.borrower_name && (
                  <p className="text-xs text-destructive">{errors.borrower_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Instansi/Organisasi <span className="text-destructive">*</span>
                </Label>
                <Input placeholder="Nama instansi" {...register('borrower_institution')} />
                {errors.borrower_institution && (
                  <p className="text-xs text-destructive">{errors.borrower_institution.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <Input type="email" placeholder="email@example.com" {...register('borrower_email')} />
                {errors.borrower_email && (
                  <p className="text-xs text-destructive">{errors.borrower_email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nomor WhatsApp</Label>
                <Input placeholder="08123456789" {...register('borrower_phone')} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Kategori <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch('borrower_category')}
                  onValueChange={v => setValue('borrower_category', v as FormData['borrower_category'])}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue>
                      {getBorrowerCategoryLabel(watch('borrower_category')) || 'Pilih kategori'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BORROWER_CATEGORIES.map(cat => (
                      <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Jenis Kegiatan <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch('event_type')}
                  onValueChange={v => setValue('event_type', v as FormData['event_type'])}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue>
                      {EVENT_TYPES.find(et => et.key === watch('event_type'))?.label || 'Pilih jenis kegiatan'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(et => (
                      <SelectItem key={et.key} value={et.key}>{et.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Kelas/Divisi</Label>
                <Input placeholder="Kelas A / Divisi IT" {...register('borrower_class')} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Bagian 2: Jadwal ── */}
        <section className="bg-card rounded-[14px] border border-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2 bg-muted/40">
            <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <p className="text-sm font-semibold">Jadwal Peminjaman</p>
            {durationText && (
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Durasi: <span className="font-medium text-foreground">{durationText}</span>
              </span>
            )}
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Mulai <span className="text-destructive">*</span>
                </Label>
                <Input type="datetime-local" className="h-9 text-sm" {...register('start_datetime')} />
                {errors.start_datetime && (
                  <p className="text-xs text-destructive">{errors.start_datetime.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Selesai <span className="text-destructive">*</span>
                </Label>
                <Input type="datetime-local" className="h-9 text-sm" {...register('end_datetime')} />
                {errors.end_datetime && (
                  <p className="text-xs text-destructive">{errors.end_datetime.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Tujuan Peminjaman <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Jelaskan tujuan penggunaan ruangan / alat..."
                rows={3}
                className="text-sm resize-none"
                {...register('purpose')}
              />
              {errors.purpose && (
                <p className="text-xs text-destructive">{errors.purpose.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Bagian 3: Item ── */}
        <section className="bg-card rounded-[14px] border border-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2 bg-muted/40">
            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Package className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold">Item yang Dipinjam</p>
            <Badge variant="secondary" className="ml-1 text-xs">{fields.length} item</Badge>
          </div>

          <div className="p-5 space-y-3">
            {fields.map((field, index) => {
              const currentItem = watchItems?.[index]
              const selectedRoom = currentItem?.room_id ? rooms.find(r => r.id === currentItem.room_id) : null
              const selectedEquipment = currentItem?.equipment_id ? equipment.find(e => e.id === currentItem.equipment_id) : null
              const isRoom = currentItem?.item_type === 'room'
              const query = searchQueries[index] ?? ''
              const filteredList = getFilteredItems(isRoom ? 'room' : 'equipment', query)
              const hasSelection = isRoom ? !!selectedRoom : !!selectedEquipment
              const rate = selectedRoom
                ? getRoomRate(selectedRoom, watchBorrowerCategory)
                : selectedEquipment
                ? getEquipmentRate(selectedEquipment, watchBorrowerCategory)
                : null
              const displayRate = rate?.rate_per_day ?? rate?.rate_per_hour ?? 0
              const rateUnit = rate?.rate_per_day ? 'hari' : 'jam'

              return (
                <div
                  key={field.id}
                  className={cn(
                    'rounded-[12px] border p-4 space-y-3 transition-colors',
                    hasSelection ? 'border-emerald-200 bg-emerald-50/30' : 'border-border bg-muted/20'
                  )}
                >
                  {/* Item header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Item #{index + 1}
                    </span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" /> Hapus
                      </button>
                    )}
                  </div>

                  {/* Type toggle */}
                  <div className="flex gap-2">
                    {[
                      { value: 'room', label: 'Ruangan', icon: DoorOpen },
                      { value: 'equipment', label: 'Alat', icon: Wrench },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setValue(`items.${index}.item_type`, value as 'room' | 'equipment')
                          setValue(`items.${index}.room_id`, '')
                          setValue(`items.${index}.equipment_id`, '')
                          setSearchQueries(p => ({ ...p, [index]: '' }))
                          setDropdownOpen(p => ({ ...p, [index]: false }))
                        }}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all',
                          currentItem?.item_type === value
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Search / Selection */}
                  <div
                    className="relative"
                    ref={el => { dropdownRefs.current[index] = el }}
                  >
                    {hasSelection ? (
                      /* Selected item chip */
                      <div className="flex items-center gap-3 p-3 bg-card rounded-[10px] border border-emerald-200">
                        <div className={cn(
                          'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                          isRoom ? 'bg-blue-50' : 'bg-amber-50'
                        )}>
                          {isRoom
                            ? <Building2 className="h-4 w-4 text-blue-500" />
                            : <Wrench className="h-4 w-4 text-amber-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {selectedRoom?.name ?? selectedEquipment?.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {selectedRoom
                              ? `${selectedRoom.room_code ?? 'Tanpa kode'} · ${selectedRoom.building_name}`
                              : `${selectedEquipment?.equipment_code ?? 'Tanpa kode'}${selectedEquipment?.merk ? ' · ' + selectedEquipment.merk : ''}`
                            }
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-emerald-700">
                            {displayRate > 0 ? `${formatRupiah(displayRate)}/${rateUnit}` : 'Gratis'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {getBorrowerCategoryLabel(watchBorrowerCategory)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (isRoom) setValue(`items.${index}.room_id`, '')
                            else setValue(`items.${index}.equipment_id`, '')
                          }}
                          className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                          aria-label="Hapus pilihan"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      /* Search input */
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                          <Input
                            placeholder={`Cari ${isRoom ? 'ruangan' : 'alat'} berdasarkan nama atau kode...`}
                            value={query}
                            onChange={e => {
                              setSearchQueries(p => ({ ...p, [index]: e.target.value }))
                              setDropdownOpen(p => ({ ...p, [index]: true }))
                            }}
                            onFocus={() => setDropdownOpen(p => ({ ...p, [index]: true }))}
                            className="pl-9 h-9 text-sm"
                          />
                          {query && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQueries(p => ({ ...p, [index]: '' }))
                                setDropdownOpen(p => ({ ...p, [index]: true }))
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown results */}
                        {dropdownOpen[index] && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-[10px] shadow-lg overflow-hidden">
                            {filteredList.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-6">
                                {query ? 'Tidak ada hasil' : `Belum ada ${isRoom ? 'ruangan' : 'alat'} tersedia`}
                              </p>
                            ) : (
                              <div className="max-h-52 overflow-y-auto divide-y divide-border">
                                {filteredList.map(item => {
                                  const r = isRoom
                                    ? getRoomRate(item as Room, watchBorrowerCategory)
                                    : getEquipmentRate(item as Equipment, watchBorrowerCategory)
                                  const dr = r.rate_per_day ?? r.rate_per_hour ?? 0
                                  const ru = r.rate_per_day ? 'hari' : 'jam'
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => {
                                        if (isRoom) setValue(`items.${index}.room_id`, item.id)
                                        else setValue(`items.${index}.equipment_id`, item.id)
                                        setSearchQueries(p => ({ ...p, [index]: '' }))
                                        setDropdownOpen(p => ({ ...p, [index]: false }))
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left transition-colors"
                                    >
                                      <div className={cn(
                                        'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                                        isRoom ? 'bg-blue-50' : 'bg-amber-50'
                                      )}>
                                        {isRoom
                                          ? <Building2 className="h-3.5 w-3.5 text-blue-500" />
                                          : <Wrench className="h-3.5 w-3.5 text-amber-500" />
                                        }
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {(item as Room).room_code || (item as Equipment).equipment_code
                                            ? `${(item as Room).room_code || (item as Equipment).equipment_code} · `
                                            : ''}
                                          {(item as Room).building_name || (item as Equipment).merk || ''}
                                        </p>
                                      </div>
                                      <span className="text-xs font-medium text-emerald-700 shrink-0">
                                        {dr > 0 ? `${formatRupiah(dr)}/${ru}` : 'Gratis'}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                </div>
              )
            })}

            {/* Add item */}
            <button
              type="button"
              onClick={() => append({ item_type: 'room', room_id: '', equipment_id: '', quantity: 1 })}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-[12px] text-sm text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" /> Tambah Item
            </button>

            {errors.items && typeof errors.items.message === 'string' && (
              <p className="text-xs text-destructive">{errors.items.message}</p>
            )}
          </div>
        </section>

        {/* ── Total ── */}
        <section className={cn(
          'rounded-[14px] border p-5',
          isGratis
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-blue-50 border-blue-200'
        )}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Estimasi Total · {getBorrowerCategoryLabel(watchBorrowerCategory)}
                {isGratis && (
                  <Badge className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Gratis
                  </Badge>
                )}
              </p>
              <p className={cn(
                'text-3xl font-bold',
                isGratis ? 'text-emerald-700' : 'text-blue-900'
              )}>
                {formatRupiah(totalAmount)}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground shrink-0">
              <p className="flex items-center gap-1 justify-end">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Langsung disetujui
              </p>
              <p className="mt-0.5 opacity-70">tanpa menunggu konfirmasi</p>
            </div>
          </div>
        </section>

        {/* ── Actions ── */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="sm:w-auto h-11"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 h-11"
          >
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
              : <><Calendar className="mr-2 h-4 w-4" /> Buat Peminjaman</>
            }
          </Button>
        </div>
      </form>
    </div>
  )
}
