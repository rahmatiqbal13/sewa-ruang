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
import { Separator } from '@/components/ui/separator'
import { Loader2, Plus, Trash2, User, Calendar, Package, ArrowLeft, Building2 } from 'lucide-react'
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
    room_id: z.string().optional(),
    equipment_id: z.string().optional(),
    quantity: z.number().min(1).default(1),
  })).min(1, 'Minimal 1 item yang dipinjam'),
})

type FormData = z.infer<typeof schema>

interface Room {
  id: string
  name: string
  room_code: string | null
  building_name: string
  rate_per_hour: number | null
  rate_per_day: number | null
}

interface Equipment {
  id: string
  name: string
  equipment_code: string | null
  rate_per_hour: number | null
  rate_per_day: number | null
  ketersediaan: string
}

export function AdminBookingForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [calculating, setCalculating] = useState(false)
  const [totalAmount, setTotalAmount] = useState(0)

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: [{ item_type: 'room', quantity: 1 }],
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
      
      // Load rooms
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('id, name, room_code, rate_per_hour, rate_per_day, buildings(name)')
        .eq('is_active', true)
        .eq('is_for_rent', true)
        .order('name')
      
      if (roomsData) {
        setRooms(roomsData.map((r: any) => ({
          id: r.id,
          name: r.name,
          room_code: r.room_code,
          building_name: r.buildings?.name || '-',
          rate_per_hour: r.rate_per_hour,
          rate_per_day: r.rate_per_day,
        })))
      }

      // Load equipment
      const { data: equipmentData } = await supabase
        .from('equipment')
        .select('id, name, equipment_code, rate_per_hour, rate_per_day, ketersediaan')
        .eq('is_active', true)
        .eq('ketersediaan', 'tersedia')
        .order('name')
      
      if (equipmentData) {
        setEquipment(equipmentData.map((e: any) => ({
          id: e.id,
          name: e.name,
          equipment_code: e.equipment_code,
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
          // Use daily rate if > 12 hours, otherwise hourly
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

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Anda harus login')
        return
      }

      // Generate reference number
      const dateStr = format(new Date(), 'yyyyMMdd')
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
      const referenceNo = `BK${dateStr}-${randomStr}`

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          reference_no: referenceNo,
          user_id: user.id, // Admin's user ID
          borrower_name: data.borrower_name,
          borrower_email: data.borrower_email || null,
          borrower_phone: data.borrower_phone || null,
          borrower_institution: data.borrower_institution,
          borrower_class: data.borrower_class || null,
          purpose: data.purpose,
          start_datetime: data.start_datetime,
          end_datetime: data.end_datetime,
          total_amount: totalAmount,
          status: 'approved', // Auto-approved for admin bookings
          created_by_admin: true,
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      // Insert booking items
      const bookingItems = data.items.map(item => ({
        booking_id: booking.id,
        item_type: item.item_type,
        room_id: item.item_type === 'room' ? item.room_id : null,
        equipment_id: item.item_type === 'equipment' ? item.equipment_id : null,
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
        <Link 
          href="/admin/bookings"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
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
                <Input 
                  placeholder="Nama lengkap"
                  {...register('borrower_name')}
                />
                {errors.borrower_name && (
                  <p className="text-sm text-red-500">{errors.borrower_name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Instansi/Organisasi <span className="text-red-500">*</span></Label>
                <Input 
                  placeholder="Nama instansi"
                  {...register('borrower_institution')}
                />
                {errors.borrower_institution && (
                  <p className="text-sm text-red-500">{errors.borrower_institution.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  placeholder="email@example.com"
                  {...register('borrower_email')}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Nomor WhatsApp</Label>
                <Input 
                  placeholder="08123456789"
                  {...register('borrower_phone')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kelas/Divisi</Label>
              <Input 
                placeholder="Contoh: Kelas A / Divisi IT"
                {...register('borrower_class')}
              />
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
                <Input 
                  type="datetime-local"
                  {...register('start_datetime')}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tanggal & Waktu Selesai <span className="text-red-500">*</span></Label>
                <Input 
                  type="datetime-local"
                  {...register('end_datetime')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tujuan Peminjaman <span className="text-red-500">*</span></Label>
              <Textarea 
                placeholder="Jelaskan tujuan peminjaman..."
                rows={3}
                {...register('purpose')}
              />
              {errors.purpose && (
                <p className="text-sm text-red-500">{errors.purpose.message}</p>
              )}
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
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Item #{index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Hapus
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipe Item</Label>
                    <Select
                      value={watchItems?.[index]?.item_type}
                      onValueChange={(v) => setValue(`items.${index}.item_type`, v as 'room' | 'equipment')}
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
                    <Label>{watchItems?.[index]?.item_type === 'room' ? 'Pilih Ruang' : 'Pilih Alat'}</Label>
                    <Select
                      value={watchItems?.[index]?.item_type === 'room' 
                        ? watchItems?.[index]?.room_id 
                        : watchItems?.[index]?.equipment_id
                      }
                      onValueChange={(v) => {
                        if (watchItems?.[index]?.item_type === 'room') {
                          setValue(`items.${index}.room_id`, v)
                        } else {
                          setValue(`items.${index}.equipment_id`, v)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih item..." />
                      </SelectTrigger>
                      <SelectContent>
                        {watchItems?.[index]?.item_type === 'room' ? (
                          rooms.map(room => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name} {room.room_code && `(${room.room_code})`} - {room.building_name}
                            </SelectItem>
                          ))
                        ) : (
                          equipment.map(eq => (
                            <SelectItem key={eq.id} value={eq.id}>
                              {eq.name} {eq.equipment_code && `(${eq.equipment_code})`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Jumlah</Label>
                  <Input 
                    type="number"
                    min={1}
                    defaultValue={1}
                    {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                    className="w-32"
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => append({ item_type: 'room', quantity: 1 })}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Tambah Item
            </Button>

            {errors.items && (
              <p className="text-sm text-red-500">{errors.items.message}</p>
            )}
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
              <p className="text-sm text-blue-600">
                Peminjaman ini akan langsung disetujui
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            type="submit" 
            disabled={loading}
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
          >
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Buat Peminjaman
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => router.back()}
            className="h-12 px-8"
          >
            Batal
          </Button>
        </div>
      </form>
    </div>
  )
}
