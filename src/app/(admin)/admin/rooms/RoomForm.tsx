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
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Camera, Tag, Building2, Layers, Users, DoorOpen } from 'lucide-react'
import { PhotoUpload } from '@/components/shared/PhotoUpload'

const USAGE_CATEGORIES = [
  { value: 'perkuliahan',     label: 'Perkuliahan',     color: 'blue' },
  { value: 'event_mahasiswa', label: 'Event Mahasiswa', color: 'purple' },
  { value: 'event_umum',      label: 'Event Umum',      color: 'orange' },
]

const COLOR_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-800' },
  purple: { bg: 'bg-purple-50/50', border: 'border-purple-200', text: 'text-purple-800' },
  orange: { bg: 'bg-orange-50/50', border: 'border-orange-200', text: 'text-orange-800' },
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
  photo_url: string | null; room_rates: RoomRate[]
}

export function RoomForm({ room, buildings }: { room?: Room; buildings: Building[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Debug: Log room data received
  console.log('Client - Room:', room?.id)
  console.log('Client - Room rates raw:', room?.room_rates)
  console.log('Client - Room rates count:', room?.room_rates?.length)

  // Build default rates from room data
  const buildDefaultRates = () => {
    console.log('Building default rates from:', room?.room_rates)
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

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isValid, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      building_id: '',
      floor_number: 1,
      room_sequence: 1,
      capacity: undefined,
      is_for_rent: true,
      description: '',
      photo_url: '',
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
      console.log('Resetting form with room data:', room.id)
      reset({
        name: room.name,
        building_id: room.building_id,
        floor_number: room.floor_number,
        room_sequence: room.room_sequence,
        capacity: room.capacity || undefined,
        is_for_rent: room.is_for_rent,
        description: room.description || '',
        photo_url: room.photo_url || '',
        rates: buildDefaultRates(),
      })
    }
  }, [room?.id, reset])

  const selectedBuildingId = watch('building_id')
  const isForRent = watch('is_for_rent')
  const rates = watch('rates')
  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId)

  async function onSubmit(data: FormData) {
    console.log('onSubmit called with data:', data)
    setLoading(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user?.id)

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
      }
      console.log('Room payload:', roomPayload)

      let roomId = room?.id
      if (room) {
        console.log('Updating existing room:', room.id)
        const { error } = await (supabase.from('rooms') as any)
          .update(roomPayload)
          .eq('id', room.id)
        if (error) { 
          console.error('Error updating room:', error)
          toast.error('Gagal update ruangan: ' + error.message) 
          setLoading(false) 
          return 
        }
        console.log('Room updated successfully')
      } else {
        console.log('Creating new room')
        const { data: newRoom, error } = await (supabase.from('rooms') as any)
          .insert({ ...roomPayload, created_by: user.id })
          .select('id')
          .single()
        if (error || !newRoom) {
          console.error('Error creating room:', error)
          toast.error(error?.message ?? 'Gagal membuat ruangan')
          setLoading(false)
          return
        }
        roomId = newRoom.id
        console.log('New room created:', roomId)
      }

      if (data.is_for_rent && roomId) {
        console.log('Saving rates for room:', roomId)
        for (const cat of USAGE_CATEGORIES) {
          const hourVal = data.rates[cat.value]?.rate_per_hour ?? ''
          const dayVal = data.rates[cat.value]?.rate_per_day ?? ''
          const rateHour = hourVal === '' ? null : parseFloat(hourVal)
          const rateDay = dayVal === '' ? null : parseFloat(dayVal)
          
          console.log(`Saving rate for ${cat.value}:`, { rateHour, rateDay })
          
          const { error: rateError } = await (supabase.from('room_rates') as any).upsert(
            { room_id: roomId, usage_category: cat.value, rate_per_hour: rateHour, rate_per_day: rateDay },
            { onConflict: 'room_id,usage_category' }
          )
          
          if (rateError) {
            console.error('Error saving rate for', cat.value, rateError)
            toast.error(`Gagal menyimpan tarif ${cat.label}: ${rateError.message}`)
            setLoading(false)
            return
          }
        }
        console.log('All rates saved successfully')
      }

      toast.success(room ? 'Ruangan berhasil diperbarui' : 'Ruangan berhasil ditambahkan')
      console.log('Form submission completed successfully')
      router.push('/admin/rooms')
      router.refresh()
      setLoading(false)
    } catch (err: any) {
      console.error('Unexpected error in onSubmit:', err)
      toast.error('Terjadi kesalahan: ' + (err.message || 'Unknown error'))
      setLoading(false)
    }
  }

  // Log form state for debugging
  console.log('Form errors:', errors)
  console.log('Form isValid:', isValid)
  console.log('Form isDirty:', isDirty)
  console.log('Loading state:', loading)

  const onError = (err: any) => {
    console.error('Form validation errors:', err)
    toast.error('Form tidak valid. Periksa field yang bertanda merah.')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
      {/* Informasi Dasar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-purple-500" />
            Informasi Ruangan
          </h2>
          
          <div className="space-y-6">
            {/* Photo Upload */}
            <div className="space-y-3">
              <Label className="text-slate-700 font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-slate-400" />
                Foto Ruangan
              </Label>
              <PhotoUpload
                value={watch('photo_url')}
                onChange={(url) => setValue('photo_url', url ?? '')}
                folder="rooms"
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700 font-medium">
                Nama Ruangan <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="name"
                placeholder="Contoh: Ruang Seminar A" 
                className="h-12 rounded-xl border-slate-200 focus:border-purple-500 focus:ring-purple-500/20"
                {...register('name')} 
              />
              {errors.name && (
                <p className="text-sm text-red-500 font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Building */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                Gedung <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('building_id') || ''}
                onValueChange={(v) => {
                  setValue('building_id', v ?? '')
                  setValue('floor_number', 1)
                }}
              >
                <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-purple-500 focus:ring-purple-500/20">
                  {selectedBuilding ? (
                    <span className="text-slate-900">{selectedBuilding.name} ({selectedBuilding.code})</span>
                  ) : (
                    <SelectValue placeholder="Pilih gedung..." />
                  )}
                </SelectTrigger>
                <SelectContent>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-400" />
                  Lantai <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('floor_number')?.toString() || '1'}
                  onValueChange={(v) => setValue('floor_number', parseInt(v ?? '1'))}
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-purple-500 focus:ring-purple-500/20">
                    {watch('floor_number') ? (
                      <span className="text-slate-900">Lantai {watch('floor_number')}</span>
                    ) : (
                      <SelectValue placeholder="Pilih lantai..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="room_sequence" className="text-slate-700 font-medium">
                  Nomor Urut <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="room_sequence"
                  type="number"
                  min={1}
                  max={99}
                  placeholder="1"
                  className="h-12 rounded-xl border-slate-200 focus:border-purple-500 focus:ring-purple-500/20"
                  {...register('room_sequence')}
                />
                {errors.room_sequence && (
                  <p className="text-sm text-red-500 font-medium">{errors.room_sequence.message}</p>
                )}
                <p className="text-xs text-slate-500">Kode ruang digenerate otomatis dari gedung + lantai + nomor urut</p>
              </div>
            </div>

            {/* Capacity */}
            <div className="space-y-2">
              <Label htmlFor="capacity" className="text-slate-700 font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                Kapasitas (orang)
              </Label>
              <Input 
                id="capacity"
                type="number"
                min={1}
                placeholder="30"
                className="h-12 rounded-xl border-slate-200 focus:border-purple-500 focus:ring-purple-500/20"
                {...register('capacity')}
              />
              {errors.capacity && (
                <p className="text-sm text-red-500 font-medium">{errors.capacity.message}</p>
              )}
            </div>

            {/* Is For Rent Switch */}
            <div className="flex items-center gap-3 py-2 px-4 bg-slate-50 rounded-xl border border-slate-200">
              <Switch 
                id="is_for_rent" 
                checked={isForRent} 
                onCheckedChange={(v) => setValue('is_for_rent', v)} 
              />
              <Label htmlFor="is_for_rent" className="cursor-pointer font-medium text-slate-700 flex items-center gap-2">
                <Tag className="h-4 w-4 text-purple-500" />
                Ruangan ini dapat disewakan
              </Label>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-700 font-medium">
                Deskripsi
              </Label>
              <Textarea 
                id="description"
                placeholder="Fasilitas, keterangan tambahan..." 
                rows={4}
                className="rounded-xl border-slate-200 focus:border-purple-500 focus:ring-purple-500/20 resize-none"
                {...register('description')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarif Sewa */}
      {isForRent && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Tarif Sewa per Kategori</h2>
          <p className="text-slate-500 mb-6">Atur harga per kategori penggunaan (kosongkan jika tidak tersedia)</p>
          
            <div className="space-y-4">
              {USAGE_CATEGORIES.map(cat => {
                const colors = COLOR_STYLES[cat.color]
                const rateValue = rates?.[cat.value] || { rate_per_hour: '', rate_per_day: '' }
                return (
                  <div key={cat.value} className={`border rounded-xl p-4 ${colors.bg} ${colors.border}`}>
                    <h4 className={`font-semibold mb-3 ${colors.text}`}>{cat.label}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-600">Tarif per Jam (Rp)</Label>
                        <Input 
                          type="number" 
                          min={0} 
                          placeholder="0"
                          value={rateValue.rate_per_hour}
                          onChange={(e) => setValue(`rates.${cat.value}.rate_per_hour`, e.target.value)}
                          className="h-10 rounded-lg border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-600">Tarif per Hari (Rp)</Label>
                        <Input 
                          type="number" 
                          min={0} 
                          placeholder="0"
                          value={rateValue.rate_per_day}
                          onChange={(e) => setValue(`rates.${cat.value}.rate_per_day`, e.target.value)}
                          className="h-10 rounded-lg border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          type="submit" 
          disabled={loading}
          className="h-12 px-8 bg-purple-600 hover:bg-purple-700"
        >
          {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {room ? 'Simpan Perubahan' : 'Tambah Ruangan'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          className="h-12 px-8 border-slate-200 hover:bg-slate-50"
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
