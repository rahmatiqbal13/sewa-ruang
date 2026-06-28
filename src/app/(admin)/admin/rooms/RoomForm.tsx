'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Camera, Tag, Building2, Layers, Users, DoorOpen, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PhotoUpload } from '@/components/shared/PhotoUpload'

const USAGE_CATEGORIES = [
  { value: 'perkuliahan',     label: 'Perkuliahan',     accent: 'cyan' },
  { value: 'event_mahasiswa', label: 'Event Mahasiswa', accent: 'emerald' },
  { value: 'event_umum',      label: 'Event Umum',      accent: 'amber' },
]

const ACCENT_STYLES: Record<string, { border: string; text: string; dot: string }> = {
  cyan:    { border: 'border-[#0891B2]/20', text: 'text-[#0891B2]', dot: 'bg-[#0891B2]' },
  emerald: { border: 'border-emerald-300',   text: 'text-emerald-700', dot: 'bg-emerald-500' },
  amber:   { border: 'border-amber-300',      text: 'text-amber-700', dot: 'bg-amber-500' },
}

const rateSchema = z.object({
  rate_per_hour: z.string().optional().default(''),
  rate_per_day: z.string().optional().default(''),
})

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  building_id: z.string().min(1, 'Gedung wajib dipilih'),
  floor_number: z.coerce.number().min(1, 'Lantai wajib dipilih'),
  room_sequence: z.coerce.number().min(1).max(99, 'Nomor urut maksimal 99'),
  capacity: z.coerce.number().min(1, 'Kapasitas minimal 1').optional(),
  is_for_rent: z.boolean(),
  description: z.string().optional(),
  photo_url: z.string().optional(),
  door_photo_url: z.string().optional(),
  rates: z.object({
    perkuliahan: rateSchema.optional().default({ rate_per_hour: '', rate_per_day: '' }),
    event_mahasiswa: rateSchema.optional().default({ rate_per_hour: '', rate_per_day: '' }),
    event_umum: rateSchema.optional().default({ rate_per_hour: '', rate_per_day: '' }),
  }).optional().default({
    perkuliahan: { rate_per_hour: '', rate_per_day: '' },
    event_mahasiswa: { rate_per_hour: '', rate_per_day: '' },
    event_umum: { rate_per_hour: '', rate_per_day: '' },
  }),
})

type FormData = z.infer<typeof schema>

interface Building { id: string; name: string; code: string; floor_count: number }
interface RoomRate { usage_category: string; rate_per_hour: number | null; rate_per_day: number | null }
interface Room {
  id: string; name: string; building_id: string; floor_number: number; room_sequence: number
  description: string | null; capacity: number | null; is_for_rent: boolean
  photo_url: string | null; door_photo_url: string | null; room_rates: RoomRate[]
}

export function RoomForm({ room, buildings }: { room?: Room; buildings: Building[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Build default rates from room data
  const buildDefaultRates = () => {
    const defaultRates: Record<string, { rate_per_hour: string; rate_per_day: string }> = {
      perkuliahan: { rate_per_hour: '', rate_per_day: '' },
      event_mahasiswa: { rate_per_hour: '', rate_per_day: '' },
      event_umum: { rate_per_hour: '', rate_per_day: '' },
    }
    room?.room_rates?.forEach(rate => {
      if (defaultRates[rate.usage_category]) {
        defaultRates[rate.usage_category] = {
          rate_per_hour: rate.rate_per_hour?.toString() ?? '',
          rate_per_day: rate.rate_per_day?.toString() ?? '',
        }
      }
    })
    return defaultRates
  }

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: '',
      building_id: '',
      floor_number: 1,
      room_sequence: 1,
      capacity: undefined,
      is_for_rent: true,
      description: '',
      photo_url: '',
      door_photo_url: '',
      rates: {
        perkuliahan: { rate_per_hour: '', rate_per_day: '' },
        event_mahasiswa: { rate_per_hour: '', rate_per_day: '' },
        event_umum: { rate_per_hour: '', rate_per_day: '' },
      },
    }
  })

  // Reset form with room data when it becomes available
  useEffect(() => {
    if (room?.id) {
      reset({
        name: room.name,
        building_id: room.building_id,
        floor_number: room.floor_number,
        room_sequence: room.room_sequence,
        capacity: room.capacity || undefined,
        is_for_rent: room.is_for_rent,
        description: room.description || '',
        photo_url: room.photo_url || '',
        door_photo_url: room.door_photo_url || '',
        rates: buildDefaultRates(),
      })
    }
  }, [room?.id, reset])

  const selectedBuildingId = watch('building_id')
  const isForRent = watch('is_for_rent')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rates = watch('rates') as any
  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId)

  async function onSubmit(data: FormData) {
    setLoading(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Unauthorized - Anda harus login')
        setLoading(false)
        return
      }

      const roomPayload = {
        name: data.name.trim(),
        building_id: data.building_id,
        floor_number: data.floor_number,
        room_sequence: data.room_sequence,
        description: data.description?.trim() || null,
        capacity: data.capacity || null,
        is_for_rent: data.is_for_rent,
        photo_url: data.photo_url || null,
        door_photo_url: data.door_photo_url || null,
      }

      let roomId = room?.id
      if (room) {
        const { error } = // eslint-disable-next-line @typescript-eslint/no-explicit-any
 await (supabase.from('rooms') as any)
          .update(roomPayload)
          .eq('id', room.id)
        if (error) { 
          toast.error('Gagal update ruangan: ' + error.message) 
          setLoading(false) 
          return 
        }
      } else {
        const { data: newRoom, error } = // eslint-disable-next-line @typescript-eslint/no-explicit-any
 await (supabase.from('rooms') as any)
          .insert({ ...roomPayload, created_by: user.id })
          .select('id')
          .single()
        if (error || !newRoom) {
          toast.error(error?.message ?? 'Gagal membuat ruangan')
          setLoading(false)
          return
        }
        roomId = newRoom.id
      }

      if (data.is_for_rent && roomId) {
        for (const cat of USAGE_CATEGORIES) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rates = data.rates as any
          const hourVal = rates[cat.value]?.rate_per_hour ?? ''
          const dayVal = rates[cat.value]?.rate_per_day ?? ''
          const rateHour = hourVal === '' ? null : parseFloat(hourVal)
          const rateDay = dayVal === '' ? null : parseFloat(dayVal)
          
          const { error: rateError } = // eslint-disable-next-line @typescript-eslint/no-explicit-any
 await (supabase.from('room_rates') as any).upsert(
            { room_id: roomId, usage_category: cat.value, rate_per_hour: rateHour, rate_per_day: rateDay },
            { onConflict: 'room_id,usage_category' }
          )
          
          if (rateError) {
            toast.error(`Gagal menyimpan tarif ${cat.label}: ${rateError.message}`)
            setLoading(false)
            return
          }
        }
      }

      toast.success(room ? 'Ruangan berhasil diperbarui' : 'Ruangan berhasil ditambahkan')
      router.push('/admin/rooms')
      router.refresh()
      setLoading(false)
    } catch (err) {
      toast.error('Terjadi kesalahan: ' + ((err as Error).message || 'Unknown error'))
      setLoading(false)
    }
  }

  const onError = () => {
    toast.error('Form tidak valid. Periksa field yang bertanda merah.')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8">
      {/* Informasi Dasar */}
      <div className="space-y-6">
        <div className="border-b border-[#E5E7EB] pb-4">
          <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-[#0891B2]" />
            Informasi Ruangan
          </h2>
        </div>

        <div className="space-y-6">
          {/* Photo Upload */}
          <div className="space-y-3">
            <Label className="text-[#374151] font-medium flex items-center gap-2">
              <Camera className="h-4 w-4 text-[#9CA3AF]" />
              Foto Ruangan
            </Label>
            <PhotoUpload
              value={watch('photo_url')}
              onChange={(url) => setValue('photo_url', url ?? '')}
              folder="rooms"
            />
          </div>

          {/* Door Photo Upload */}
          <div className="space-y-3">
            <Label className="text-[#374151] font-medium flex items-center gap-2">
              <Camera className="h-4 w-4 text-[#9CA3AF]" />
              Foto Pintu Ruangan
            </Label>
            <p className="text-xs text-[#6B7280]">Membantu peminjam menemukan lokasi ruangan</p>
            <PhotoUpload
              value={watch('door_photo_url')}
              onChange={(url) => setValue('door_photo_url', url ?? '')}
              folder="rooms"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#374151] font-medium">
              Nama Ruangan <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Contoh: Ruang Seminar A"
              className="h-11 rounded-[10px] border-[#E5E7EB] focus:border-[#0891B2] focus:ring-[#0891B2]/20"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500 font-medium">{errors.name.message}</p>
            )}
          </div>

          {/* Building */}
          <div className="space-y-2">
            <Label className="text-[#374151] font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#9CA3AF]" />
              Gedung <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch('building_id') || ''}
              onValueChange={(v) => {
                setValue('building_id', v ?? '')
                setValue('floor_number', 1)
              }}
            >
              <SelectTrigger className="h-11 rounded-[10px] border-[#E5E7EB] focus:border-[#0891B2] focus:ring-[#0891B2]/20">
                {selectedBuilding ? (
                  <span className="text-[#111827]">{selectedBuilding.name} ({selectedBuilding.code})</span>
                ) : (
                  <SelectValue placeholder="Pilih gedung..." />
                )}
              </SelectTrigger>
              <SelectContent className="rounded-[10px]">
                {buildings.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.building_id && (
              <p className="text-sm text-red-500 font-medium">{errors.building_id.message}</p>
            )}
          </div>

          {/* Floor & Sequence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#374151] font-medium flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#9CA3AF]" />
                Lantai <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('floor_number')?.toString() || '1'}
                onValueChange={(v) => setValue('floor_number', parseInt(v ?? '1'))}
              >
                <SelectTrigger className="h-11 rounded-[10px] border-[#E5E7EB] focus:border-[#0891B2] focus:ring-[#0891B2]/20">
                  {watch('floor_number') ? (
                    <span className="text-[#111827]">Lantai {watch('floor_number')}</span>
                  ) : (
                    <SelectValue placeholder="Pilih lantai..." />
                  )}
                </SelectTrigger>
                <SelectContent className="rounded-[10px]">
                  {Array.from({ length: selectedBuilding?.floor_count ?? 10 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={n.toString()}>Lantai {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.floor_number && (
                <p className="text-sm text-red-500 font-medium">{errors.floor_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room_sequence" className="text-[#374151] font-medium">
                Nomor Urut <span className="text-red-500">*</span>
              </Label>
              <Input
                id="room_sequence"
                type="number"
                min={1}
                max={99}
                placeholder="1"
                className="h-11 rounded-[10px] border-[#E5E7EB] focus:border-[#0891B2] focus:ring-[#0891B2]/20"
                {...register('room_sequence')}
              />
              {errors.room_sequence && (
                <p className="text-sm text-red-500 font-medium">{errors.room_sequence.message}</p>
              )}
              <p className="text-xs text-[#6B7280]">Kode ruang digenerate otomatis dari gedung + lantai + nomor urut</p>
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity" className="text-[#374151] font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-[#9CA3AF]" />
              Kapasitas (orang)
            </Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              placeholder="30"
              className="h-11 rounded-[10px] border-[#E5E7EB] focus:border-[#0891B2] focus:ring-[#0891B2]/20"
              {...register('capacity')}
            />
            {errors.capacity && (
              <p className="text-sm text-red-500 font-medium">{errors.capacity.message}</p>
            )}
          </div>

          {/* Is For Rent Switch */}
          <div className="flex items-center gap-3 py-3 px-4 bg-[#F3F4F6] rounded-[10px] border border-[#E5E7EB]">
            <Switch
              id="is_for_rent"
              checked={isForRent}
              onCheckedChange={(v) => setValue('is_for_rent', v)}
            />
            <Label htmlFor="is_for_rent" className="cursor-pointer font-medium text-[#374151] flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#0891B2]" />
              Ruangan ini dapat disewakan
            </Label>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[#374151] font-medium">
              Deskripsi
            </Label>
            <Textarea
              id="description"
              placeholder="Fasilitas, keterangan tambahan..."
              rows={4}
              className="rounded-[10px] border-[#E5E7EB] focus:border-[#0891B2] focus:ring-[#0891B2]/20 resize-none"
              {...register('description')}
            />
          </div>
        </div>
      </div>

      {/* Tarif Sewa */}
      {isForRent && (
        <div className="space-y-6">
          <div className="border-b border-[#E5E7EB] pb-4">
            <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
              <Banknote className="h-5 w-5 text-[#0891B2]" />
              Tarif Sewa per Kategori
            </h2>
            <p className="text-sm text-[#6B7280] mt-1">Atur harga per kategori penggunaan (kosongkan jika tidak tersedia)</p>
          </div>

          <div className="space-y-4">
            {USAGE_CATEGORIES.map(cat => {
              const accent = ACCENT_STYLES[cat.accent]
              const rateValue = rates?.[cat.value] || { rate_per_hour: '', rate_per_day: '' }
              return (
                <div key={cat.value} className={cn("border rounded-[14px] p-4 bg-white", accent.border)}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn("w-2.5 h-2.5 rounded-full", accent.dot)} />
                    <h4 className={cn("font-semibold", accent.text)}>{cat.label}</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-[#6B7280]">Tarif per Jam (Rp)</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={rateValue.rate_per_hour}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onChange={(e) => setValue(`rates.${cat.value}.rate_per_hour` as any, e.target.value)}
                        className="h-11 rounded-[10px] border-[#E5E7EB]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-[#6B7280]">Tarif per Hari (Rp)</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={rateValue.rate_per_day}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onChange={(e) => setValue(`rates.${cat.value}.rate_per_day` as any, e.target.value)}
                        className="h-11 rounded-[10px] border-[#E5E7EB]"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#E5E7EB]">
        <Button
          type="submit"
          disabled={loading}
          className="h-11 px-8 bg-[#0891B2] hover:bg-[#0891B2]/90 rounded-[10px] text-white"
        >
          {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {room ? 'Simpan Perubahan' : 'Tambah Ruangan'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="h-11 px-8 border-[#E5E7EB] hover:bg-[#F3F4F6] rounded-[10px] text-[#374151]"
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
