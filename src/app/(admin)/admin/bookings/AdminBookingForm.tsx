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
  purpose: z.string().min(5, 'Tujuan peminjaman wajib diisi'),
  start_datetime: z.string().min(1, 'Tanggal mulai wajib diisi'),
  end_datetime: z.string().min(1, 'Tanggal selesai wajib diisi'),
  items: z.array(z.object({
    item_type: z.enum(['room', 'equipment']),
    room_id: z.string().default(''),
    equipment_id: z.string().default(''),
    quantity: z.number().min(1).default(1),
  })).min(1, 'Minimal 1 item yang dipinjam'),
})

type FormData = z.infer<typeof schema>

interface Room {
  id: string
  name: string
  room_code: string | null
  building_name: string
  capacity: number | null
  photo_url: string | null
  rate_per_hour: number | null
  rate_per_day: number | null
}

interface Equipment {
  id: string
  name: string
  equipment_code: string | null
  merk: string | null
  photo_url: string | null
  rate_per_hour: number | null
  rate_per_day: number | null
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

  // Load rooms and equipment
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Load rooms with photos
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('id, name, room_code, capacity, photo_url, rate_per_hour, rate_per_day, buildings(name)')
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
          rate_per_hour: r.rate_per_hour,
          rate_per_day: r.rate_per_day,
        })))
      }

      // Load equipment with photos
      const { data: equipmentData } = await supabase
        .from('equipment')
        .select('id, name, equipment_code, merk, photo_url, rate_per_hour, rate_per_day, ketersediaan')
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
          rate_per_hour: e.rate_per_hour,
          rate_per_day: e.rate_per_day,
          ketersediaan: e.ketersediaan,
        })))
      }
    }
    
    loadData()
  }, [])

  // Calculate total
  useEffect(() => {
    if (!watchStart || !watchEnd) return
    
    const start = new Date(watchStart)
    const end = new Date(watchEnd)
    const hours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60)))
    const days = Math.ceil(hours / 24)
    
    let total = 0
    
    watchItems?.forEach((item: any) => {
      if (item.item_type === 'room' && item.room_id) {
        const room = rooms.find(r => r.id === item.room_id)
        if (room) {
          if (hours > 12 && room.rate_per_day) {
            total += room.rate_per_day * days * item.quantity
          } else if (room.rate_per_hour) {
            total += room.rate_per_hour * hours * item.quantity
          }
        }
      } else if (item.item_type === 'equipment' && item.equipment_id) {
        const eq = equipment.find(e => e.id === item.equipment_id)
        if (eq) {
          if (hours > 12 && eq.rate_per_day) {
            total += eq.rate_per_day * days * item.quantity
          } else if (eq.rate_per_hour) {
            total += eq.rate_per_hour * hours * item.quantity
          }
        }
      }
    })
    
    setTotalAmount(total)
  }, [watchItems, watchStart, watchEnd, rooms, equipment])

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

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          reference_no: referenceNo,
          user_id: user.id,
          borrower_name: data.borrower_name,
          borrower_email: data.borrower_email || null,
          borrower_phone: data.borrower_phone || null,
          borrower_institution: data.borrower_institution,
          borrower_class: data.borrower_class || null,
          purpose: data.purpose,
          start_datetime: data.start_datetime,
          end_datetime: data.end_datetime,
          total_amount: totalAmount,
          status: 'approved',
          created_by_admin: true,
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

      const { error: itemsError } = await supabase
        .from('booking_items')
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

            <div className="space-y-2">
              <Label>Kelas/Divisi</Label>
              <Input placeholder="Contoh: Kelas A / Divisi IT" {...register('borrower_class')} />
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
                          <SelectValue />
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
                            setValue(`items.${index}.room_id`, v)
                          } else {
                            setValue(`items.${index}.equipment_id`, v)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Pilih ${currentItem?.item_type === 'room' ? 'ruang' : 'alat'}...`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(currentItem?.item_type === 'room' ? rooms : equipment).map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} {item.room_code || item.equipment_code ? `(${item.room_code || item.equipment_code})` : ''}
                            </SelectItem>
                          ))}
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
                      {getFilteredItems(currentItem?.item_type || 'room').slice(0, 5).map((item: any) => (
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
                            Rp {(item.rate_per_day || item.rate_per_hour || 0).toLocaleString('id-ID')}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Item Info */}
                  {(selectedRoom || selectedEquipment) && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium mb-2">Item Terpilih:</p>
                      <div className="flex gap-4">
                        {(selectedRoom?.photo_url || selectedEquipment?.photo_url) ? (
                          <img 
                            src={selectedRoom?.photo_url || selectedEquipment?.photo_url} 
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
                            Tarif: Rp {(selectedRoom?.rate_per_day || selectedEquipment?.rate_per_day || selectedRoom?.rate_per_hour || selectedEquipment?.rate_per_hour || 0).toLocaleString('id-ID')}
                            /{(selectedRoom?.rate_per_day || selectedEquipment?.rate_per_day) ? 'hari' : 'jam'}
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
                <p className="text-sm text-blue-600">Estimasi Total</p>
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
