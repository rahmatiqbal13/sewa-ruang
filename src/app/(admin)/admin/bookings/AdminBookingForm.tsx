'use client'

import { useState, useEffect } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, User, Calendar, Package, ArrowLeft, Search } from 'lucide-react'
import { format, addHours } from 'date-fns'
import { id } from 'date-fns/locale'
import Link from 'next/link'

const schema = z.object({
  borrower_name: z.string().min(2, 'Nama peminjam wajib diisi'),
  borrower_email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  borrower_phone: z.string().optional(),
  borrower_institution: z.string().min(2, 'Instansi wajib diisi'),
  borrower_class: z.string().optional(),
  member_type: z.enum(['mahasiswa_s1', 'mahasiswa_s2', 'dosen_karyawan', 'umum', 'kerjasama']),
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

// Map member type to equipment_rates user_category
const memberTypeToEquipmentCategory: Record<string, string> = {
  'mahasiswa_s1': 'mahasiswa_s1',
  'mahasiswa_s2': 'mahasiswa_s2',
  'dosen_karyawan': 'dosen',
  'umum': 'umum',
  'kerjasama': 'mou_unesa',
}

// Map member type to room_rates usage_category  
const memberTypeToRoomCategory: Record<string, string> = {
  'mahasiswa_s1': 'mahasiswa',
  'mahasiswa_s2': 'pascasarjana',
  'dosen_karyawan': 'dosen',
  'umum': 'umum',
  'kerjasama': 'kerjasama',
}

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
  const [searchQuery, setSearchQuery] = useState('')

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      member_type: 'mahasiswa_s1',
      items: [{ item_type: 'room', room_id: '', equipment_id: '', quantity: 1 }],
      start_datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_datetime: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm"),
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  })

  const watchItems = watch('items')
  const watchStart = watch('start_datetime')
  const watchEnd = watch('end_datetime')
  const watchMemberType = watch('member_type')

  // Load rooms and equipment with their rates
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Load rooms with rates
      const { data: roomsData } = await (supabase.from('rooms') as any)
        .select(`
          id, name, room_code, capacity, photo_url,
          buildings(name),
          room_rates(usage_category, rate_per_hour, rate_per_day)
        `)
        .eq('is_active', true)
        .eq('is_for_rent', true)
        .order('name')
      
      if (roomsData) {
        setRooms(roomsData.map((r: any) => ({
          id: r.id,
          name: r.name,
          room_code: r.room_code,
          capacity: r.capacity,
          photo_url: r.photo_url,
          building_name: r.buildings?.name || '-',
          rates: r.room_rates || [],
        })))
      }

      // Load equipment with rates
      const { data: equipmentData } = await (supabase.from('equipment') as any)
        .select(`
          id, name, equipment_code, merk, photo_url, ketersediaan,
          equipment_rates(user_category, rate_per_hour, rate_per_day, requires_supervision)
        `)
        .eq('is_active', true)
        .eq('ketersediaan', 'tersedia')
        .order('name')
      
      if (equipmentData) {
        setEquipment(equipmentData.map((e: any) => ({
          id: e.id,
          name: e.name,
          equipment_code: e.equipment_code,
          merk: e.merk,
          photo_url: e.photo_url,
          ketersediaan: e.ketersediaan,
          rates: e.equipment_rates || [],
        })))
      }
    }
    
    loadData()
  }, [])

  // Get rate for specific member type
  const getRoomRate = (room: Room, memberType: string) => {
    const category = memberTypeToRoomCategory[memberType]
    const rate = room.rates.find(r => r.usage_category === category)
    return rate || room.rates[0] || { rate_per_hour: null, rate_per_day: null }
  }

  const getEquipmentRate = (eq: Equipment, memberType: string) => {
    const category = memberTypeToEquipmentCategory[memberType]
    const rate = eq.rates.find(r => r.user_category === category)
    return rate || eq.rates[0] || { rate_per_hour: null, rate_per_day: null }
  }

  // Calculate total based on member type rates
  useEffect(() => {
    if (!watchStart || !watchEnd || !watchMemberType) return
    
    const start = new Date(watchStart)
    const end = new Date(watchEnd)
    const hours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60)))
    const days = Math.ceil(hours / 24)
    
    let total = 0
    
    watchItems?.forEach((item: any) => {
      if (item.item_type === 'room' && item.room_id) {
        const room = rooms.find(r => r.id === item.room_id)
        if (room) {
          const rate = getRoomRate(room, watchMemberType)
          if (hours > 12 && rate.rate_per_day) {
            total += rate.rate_per_day * days * item.quantity
          } else if (rate.rate_per_hour) {
            total += rate.rate_per_hour * hours * item.quantity
          }
        }
      } else if (item.item_type === 'equipment' && item.equipment_id) {
        const eq = equipment.find(e => e.id === item.equipment_id)
        if (eq) {
          const rate = getEquipmentRate(eq, watchMemberType)
          if (hours > 12 && rate.rate_per_day) {
            total += rate.rate_per_day * days * item.quantity
          } else if (rate.rate_per_hour) {
            total += rate.rate_per_hour * hours * item.quantity
          }
        }
      }
    })
    
    setTotalAmount(total)
  }, [watchItems, watchStart, watchEnd, watchMemberType, rooms, equipment])

  // Filter items based on search
  const getFilteredItems = (type: 'room' | 'equipment') => {
    if (!searchQuery) {
      return type === 'room' ? rooms : equipment
    }
    
    const query = searchQuery.toLowerCase()
    if (type === 'room') {
      return rooms.filter(r => 
        r.name.toLowerCase().includes(query) ||
        (r.room_code && r.room_code.toLowerCase().includes(query))
      )
    } else {
      return equipment.filter(e => 
        e.name.toLowerCase().includes(query) ||
        (e.equipment_code && e.equipment_code.toLowerCase().includes(query))
      )
    }
  }

  // Get selected item details
  const getSelectedRoom = (roomId: string) => rooms.find(r => r.id === roomId)
  const getSelectedEquipment = (eqId: string) => equipment.find(e => e.id === eqId)

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Anda harus login')
        return
      }

      const dateStr = format(new Date(), 'yyyyMMdd')
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
      const referenceNo = `BK${dateStr}-${randomStr}`

      // Get rate snapshot for first item (for metadata)
      let snapshotRate: Record<string, unknown> = {}
      if (data.items.length > 0) {
        const firstItem = data.items[0]
        if (firstItem.item_type === 'room' && firstItem.room_id) {
          const room = rooms.find(r => r.id === firstItem.room_id)
          if (room) {
            const rate = getRoomRate(room, data.member_type)
            snapshotRate = { 
              item_type: 'room',
              item_name: room.name,
              rate_per_hour: rate.rate_per_hour,
              rate_per_day: rate.rate_per_day,
              member_type: data.member_type
            }
          }
        } else if (firstItem.item_type === 'equipment' && firstItem.equipment_id) {
          const eq = equipment.find(e => e.id === firstItem.equipment_id)
          if (eq) {
            const rate = getEquipmentRate(eq, data.member_type)
            snapshotRate = { 
              item_type: 'equipment',
              item_name: eq.name,
              rate_per_hour: rate.rate_per_hour,
              rate_per_day: rate.rate_per_day,
              member_type: data.member_type
            }
          }
        }
      }

      // Include borrower info in snapshot_rate until new columns are added
      snapshotRate = {
        ...snapshotRate,
        borrower_name: data.borrower_name,
        borrower_email: data.borrower_email,
        borrower_phone: data.borrower_phone,
        borrower_institution: data.borrower_institution,
        borrower_class: data.borrower_class,
        member_type: data.member_type,
        created_by_admin: true,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: booking, error: bookingError } = await (supabase.from('bookings') as any)
        .insert({
          reference_no: referenceNo,
          user_id: user.id,
          purpose: `${data.borrower_name} - ${data.borrower_institution}: ${data.purpose}`,
          start_datetime: data.start_datetime,
          end_datetime: data.end_datetime,
          total_amount: totalAmount,
          status: 'approved',
          snapshot_rate: snapshotRate,
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      const bookingItems = data.items.map(item => ({
        booking_id: booking.id,
        item_type: item.item_type,
        room_id: item.item_type === 'room' ? item.room_id || null : null,
        equipment_id: item.item_type === 'equipment' ? item.equipment_id || null : null,
        quantity: item.quantity,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await (supabase.from('booking_items') as any)
        .insert(bookingItems)

      if (itemsError) throw itemsError

      toast.success('Peminjaman berhasil dibuat')
      router.push('/admin/bookings')
      router.refresh()
    } catch (error: any) {
      toast.error('Gagal membuat peminjaman: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/bookings" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Calendar className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Peminjaman Baru</h1>
          <p className="text-slate-500">Buat pengajuan peminjaman untuk pimpinan/tamu</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Data Peminjam */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              Data Peminjam
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Peminjam <span className="text-red-500">*</span></Label>
                <Input placeholder="Nama lengkap" {...register('borrower_name')} />
                {errors.borrower_name && <p className="text-sm text-red-500">{errors.borrower_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Instansi/Organisasi <span className="text-red-500">*</span></Label>
                <Input placeholder="Nama instansi" {...register('borrower_institution')} />
                {errors.borrower_institution && <p className="text-sm text-red-500">{errors.borrower_institution.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" {...register('borrower_email')} />
              </div>
              <div className="space-y-2">
                <Label>Nomor WhatsApp</Label>
                <Input placeholder="08123456789" {...register('borrower_phone')} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jenis Member <span className="text-red-500">*</span></Label>
                <Select
                  value={watch('member_type')}
                  onValueChange={(v) => setValue('member_type', v as FormData['member_type'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mahasiswa_s1">Mahasiswa Sarjana (S1)</SelectItem>
                    <SelectItem value="mahasiswa_s2">Mahasiswa Pasca Sarjana (S2/S3)</SelectItem>
                    <SelectItem value="dosen_karyawan">Dosen/Karyawan</SelectItem>
                    <SelectItem value="umum">Umum</SelectItem>
                    <SelectItem value="kerjasama">Kerjasama/MoU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kelas/Divisi</Label>
                <Input placeholder="Contoh: Kelas A / Divisi IT" {...register('borrower_class')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detail Peminjaman */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Detail Peminjaman
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal & Waktu Mulai <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" {...register('start_datetime')} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal & Waktu Selesai <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" {...register('end_datetime')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tujuan Peminjaman <span className="text-red-500">*</span></Label>
              <Textarea placeholder="Jelaskan tujuan peminjaman..." rows={3} {...register('purpose')} />
              {errors.purpose && <p className="text-sm text-red-500">{errors.purpose.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Item yang Dipinjam */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Item yang Dipinjam
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const currentItem = watchItems?.[index]
              const selectedRoom = currentItem?.room_id ? getSelectedRoom(currentItem.room_id) : null
              const selectedEquipment = currentItem?.equipment_id ? getSelectedEquipment(currentItem.equipment_id) : null
              
              // Get rates for selected member type
              const roomRate = selectedRoom ? getRoomRate(selectedRoom, watchMemberType) : null
              const equipmentRate = selectedEquipment ? getEquipmentRate(selectedEquipment, watchMemberType) : null

              return (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Item #{index + 1}</h4>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-1" /> Hapus
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipe Item</Label>
                      <Select
                        value={currentItem?.item_type || 'room'}
                        onValueChange={(v) => {
                          setValue(`items.${index}.item_type`, v as 'room' | 'equipment')
                          setValue(`items.${index}.room_id`, '')
                          setValue(`items.${index}.equipment_id`, '')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {currentItem?.item_type === 'room' ? 'Ruang' : 'Alat'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="room">Ruang</SelectItem>
                          <SelectItem value="equipment">Alat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>{currentItem?.item_type === 'room' ? 'Pilih Ruang' : 'Pilih Alat'}</Label>
                      <Select
                        value={currentItem?.item_type === 'room' ? currentItem?.room_id || '' : currentItem?.equipment_id || ''}
                        onValueChange={(v) => {
                          if (currentItem?.item_type === 'room') {
                            setValue(`items.${index}.room_id`, v || '')
                          } else {
                            setValue(`items.${index}.equipment_id`, v || '')
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Pilih ${currentItem?.item_type === 'room' ? 'ruang' : 'alat'}...`}>
                            {(() => {
                              if (currentItem?.item_type === 'room' && currentItem?.room_id) {
                                const room = rooms.find(r => r.id === currentItem.room_id)
                                return room ? `${room.name} (${room.room_code || 'Tanpa Kode'})` : 'Pilih ruang...'
                              } else if (currentItem?.item_type === 'equipment' && currentItem?.equipment_id) {
                                const eq = equipment.find(e => e.id === currentItem.equipment_id)
                                return eq ? `${eq.name} (${eq.equipment_code || 'Tanpa Kode'})` : 'Pilih alat...'
                              }
                              return `Pilih ${currentItem?.item_type === 'room' ? 'ruang' : 'alat'}...`
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(currentItem?.item_type === 'room' ? rooms : equipment).map((item: any) => {
                            const rate = currentItem?.item_type === 'room' 
                              ? getRoomRate(item, watchMemberType)
                              : getEquipmentRate(item, watchMemberType)
                            const displayRate = rate.rate_per_day || rate.rate_per_hour || 0
                            
                            return (
                              <SelectItem key={item.id} value={item.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{item.name} {item.room_code || item.equipment_code ? `(${item.room_code || item.equipment_code})` : ''}</span>
                                  <span className="text-xs text-slate-500 ml-2">
                                    Rp {displayRate.toLocaleString('id-ID')}
                                  </span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Cari {currentItem?.item_type === 'room' ? 'Ruang' : 'Alat'}
                    </Label>
                    <Input
                      placeholder={`Ketik nama atau kode ${currentItem?.item_type === 'room' ? 'ruang' : 'alat'}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="mb-2"
                    />
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                      {getFilteredItems(currentItem?.item_type || 'room').slice(0, 5).map((item: any) => {
                        const rate = currentItem?.item_type === 'room' 
                          ? getRoomRate(item, watchMemberType)
                          : getEquipmentRate(item, watchMemberType)
                        const displayRate = rate.rate_per_day || rate.rate_per_hour || 0
                        
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (currentItem?.item_type === 'room') {
                                setValue(`items.${index}.room_id`, item.id)
                              } else {
                                setValue(`items.${index}.equipment_id`, item.id)
                              }
                              setSearchQuery('')
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 border-b last:border-b-0 text-left"
                          >
                            {item.photo_url ? (
                              <img src={item.photo_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg" />
                            ) : (
                              <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                                <Package className="h-6 w-6 text-slate-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-slate-500">
                                {item.room_code || item.equipment_code ? `Kode: ${item.room_code || item.equipment_code}` : ''}
                                {item.building_name ? ` • ${item.building_name}` : ''}
                                {item.merk ? ` • ${item.merk}` : ''}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              Rp {displayRate.toLocaleString('id-ID')}
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Selected Item Info */}
                  {(selectedRoom || selectedEquipment) && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium mb-2">Item Terpilih:</p>
                      <div className="flex gap-4">
                        {(selectedRoom?.photo_url || selectedEquipment?.photo_url) ? (
                          <img 
                            src={selectedRoom?.photo_url || selectedEquipment?.photo_url || ''} 
                            alt="Selected" 
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-slate-200 rounded-lg flex items-center justify-center">
                            <Package className="h-10 w-10 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h5 className="font-semibold">
                            {selectedRoom?.name || selectedEquipment?.name}
                          </h5>
                          {selectedRoom && (
                            <>
                              <p className="text-sm text-slate-600">Kode: {selectedRoom.room_code || '-'}</p>
                              <p className="text-sm text-slate-600">Gedung: {selectedRoom.building_name}</p>
                              <p className="text-sm text-slate-600">Kapasitas: {selectedRoom.capacity || '-'} orang</p>
                            </>
                          )}
                          {selectedEquipment && (
                            <>
                              <p className="text-sm text-slate-600">Kode: {selectedEquipment.equipment_code || '-'}</p>
                              <p className="text-sm text-slate-600">Merk: {selectedEquipment.merk || '-'}</p>
                              <p className="text-sm text-slate-600">Status: Tersedia</p>
                            </>
                          )}
                          <p className="text-sm font-medium text-blue-600 mt-1">
                            Tarif {(() => {
                              const labels: Record<string, string> = {
                                'mahasiswa_s1': '(Mahasiswa S1)',
                                'mahasiswa_s2': '(Mahasiswa S2/S3)',
                                'dosen_karyawan': '(Dosen/Karyawan)',
                                'umum': '(Umum)',
                                'kerjasama': '(Kerjasama/MoU)',
                              }
                              return labels[watchMemberType] || ''
                            })()}:
                            {' '}Rp {(roomRate?.rate_per_day || equipmentRate?.rate_per_day || roomRate?.rate_per_hour || equipmentRate?.rate_per_hour || 0).toLocaleString('id-ID')}
                            /{(roomRate?.rate_per_day || equipmentRate?.rate_per_day) ? 'hari' : 'jam'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Jumlah</Label>
                    <Input 
                      type="number"
                      min={1}
                      {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                      className="w-32"
                    />
                  </div>
                </div>
              )
            })}

            <Button
              type="button"
              variant="outline"
              onClick={() => append({ item_type: 'room', room_id: '', equipment_id: '', quantity: 1 })}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Tambah Item
            </Button>

            {errors.items && <p className="text-sm text-red-500">{errors.items.message}</p>}
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">
                  Estimasi Total 
                  <span className="ml-1 text-xs">
                    {(() => {
                      const labels: Record<string, string> = {
                        'mahasiswa_s1': '(Mahasiswa S1)',
                        'mahasiswa_s2': '(Mahasiswa S2/S3)',
                        'dosen_karyawan': '(Dosen/Karyawan)',
                        'umum': '(Umum)',
                        'kerjasama': '(Kerjasama/MoU)',
                      }
                      return labels[watchMemberType] || ''
                    })()}
                  </span>
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  Rp {totalAmount.toLocaleString('id-ID')}
                </p>
              </div>
              <p className="text-sm text-blue-600">Peminjaman ini akan langsung disetujui</p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" disabled={loading} className="flex-1 h-12 bg-blue-600 hover:bg-blue-700">
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Buat Peminjaman
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="h-12 px-8">
            Batal
          </Button>
        </div>
      </form>
    </div>
  )
}
