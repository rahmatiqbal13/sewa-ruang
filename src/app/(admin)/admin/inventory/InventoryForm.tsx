'use client'

import { useState } from 'react'
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
import { Loader2, Boxes, ArrowLeft, Camera, Building2, DoorOpen, Hash, AlertCircle } from 'lucide-react'
import { PhotoUpload } from '@/components/shared/PhotoUpload'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'

const CONDITIONS = [
  { value: 'good', label: 'Baik', color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'needs_repair', label: 'Perlu Perbaikan', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { value: 'damaged', label: 'Rusak', color: 'text-red-600', bg: 'bg-red-50' },
]

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
  condition: z.enum(['good', 'needs_repair', 'damaged']),
  inventory_code: z.string().optional(),
  notes: z.string().optional(),
  photo_url: z.string().optional(),
  room_asset_id: z.string().min(1, 'Ruangan wajib dipilih'),
})

type FormData = z.infer<typeof schema>

interface Building {
  id: string
  name: string
  code: string
}

interface Room {
  id: string
  name: string
  room_code: string | null
  building_id: string | null
  building_name: string
  building_code: string
}

interface InventoryItem {
  id: string
  name: string
  quantity: number
  condition: 'good' | 'needs_repair' | 'damaged'
  inventory_code: string | null
  notes: string | null
  photo_url: string | null
  room_asset_id: string
}

export function InventoryForm({ 
  item, 
  buildings,
  rooms,
  preselectedRoomId
}: { 
  item?: InventoryItem
  buildings: Building[]
  rooms: Room[]
  preselectedRoomId?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Get preselected building from preselected room
  const preselectedRoom = rooms.find(r => r.id === preselectedRoomId)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    preselectedRoom?.building_id || ''
  )

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: item ? {
      name: item.name,
      quantity: item.quantity,
      condition: item.condition,
      inventory_code: item.inventory_code ?? '',
      notes: item.notes ?? '',
      photo_url: item.photo_url ?? '',
      room_asset_id: item.room_asset_id,
    } : {
      quantity: 1,
      condition: 'good',
      room_asset_id: preselectedRoomId || '',
    }
  })

  const selectedRoomId = watch('room_asset_id')
  const selectedRoom = rooms.find(r => r.id === selectedRoomId)
  
  // Filter rooms by selected building
  const filteredRooms = selectedBuildingId
    ? rooms.filter(r => r.building_id === selectedBuildingId)
    : rooms

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Unauthorized')
      setLoading(false)
      return
    }

    const payload = {
      name: data.name.trim(),
      quantity: data.quantity,
      condition: data.condition,
      inventory_code: data.inventory_code?.trim() || null,
      notes: data.notes?.trim() || null,
      photo_url: data.photo_url || null,
      room_asset_id: data.room_asset_id,
      last_updated_by: user.id,
    }

    if (item) {
      // Update existing
      const { error } = await (supabase.from('room_inventory_items') as any)
        .update(payload)
        .eq('id', item.id)
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      toast.success('Item inventaris berhasil diperbarui')
    } else {
      // Create new
      const { error } = await (supabase.from('room_inventory_items') as any)
        .insert({ ...payload, is_active: true })
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      toast.success('Item inventaris berhasil ditambahkan')
    }

    router.push('/admin/inventory')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="max-w-3xl">
      {/* Back Button */}
      <Link 
        href="/admin/inventory"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar inventaris
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
          <Boxes className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {item ? 'Edit Item Inventaris' : 'Tambah Item Inventaris'}
          </h1>
          <p className="text-slate-500">
            {item ? 'Perbarui informasi item' : 'Tambahkan barang ke inventaris ruangan'}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <p className="font-medium">Apa itu Inventaris?</p>
          <p className="text-sm mt-1">
            Inventaris adalah barang-barang di dalam ruangan (meja, kursi, AC, dll) yang 
            <strong> tidak untuk disewakan</strong>. Untuk alat yang bisa disewakan, gunakan menu Alat & Peralatan.
          </p>
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Pilih Gedung & Ruangan */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-purple-500" />
              Pilih Lokasi
            </h2>
            
            <div className="space-y-4">
              {/* Step 1: Pilih Gedung */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    Langkah 1: Pilih Gedung
                  </span>
                </Label>
                <Select 
                  value={selectedBuildingId} 
                  onValueChange={(v) => {
                    setSelectedBuildingId(v ?? '')
                    // Reset room selection when building changes
                    if (!item) {
                      setValue('room_asset_id', '')
                    }
                  }}
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200">
                    {selectedBuildingId ? (
                      <span className="flex items-center gap-2 text-slate-900">
                        {buildings.find(b => b.id === selectedBuildingId)?.name}
                        <span className="text-xs text-slate-400">
                          ({buildings.find(b => b.id === selectedBuildingId)?.code})
                        </span>
                      </span>
                    ) : (
                      <SelectValue placeholder="Pilih gedung terlebih dahulu..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        <span className="flex items-center gap-2">
                          {building.name}
                          <span className="text-xs text-slate-400">({building.code})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Pilih Ruangan */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  <span className="flex items-center gap-2">
                    <DoorOpen className="h-4 w-4 text-slate-500" />
                    Langkah 2: Pilih Ruangan
                    {selectedBuildingId && (
                      <span className="text-xs text-slate-400 font-normal">
                        ({filteredRooms.length} ruangan tersedia)
                      </span>
                    )}
                  </span>
                </Label>
                <Select 
                  value={watch('room_asset_id')} 
                  onValueChange={(v) => setValue('room_asset_id', v ?? '')}
                  disabled={!selectedBuildingId}
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-amber-500 focus:ring-amber-500/20">
                    {selectedRoom ? (
                      <span className="flex items-center gap-2 text-slate-900">
                        {selectedRoom.name}
                        {selectedRoom.room_code && (
                          <span className="text-xs text-slate-400">({selectedRoom.room_code})</span>
                        )}
                      </span>
                    ) : (
                      <SelectValue placeholder={selectedBuildingId ? "Pilih ruangan..." : "Pilih gedung terlebih dahulu"} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        <span className="flex items-center gap-2">
                          {room.name}
                          {room.room_code && (
                            <span className="text-xs text-slate-400">({room.room_code})</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.room_asset_id && (
                  <p className="text-sm text-red-500 font-medium">{errors.room_asset_id.message}</p>
                )}
              </div>

              {/* Selected Room Info */}
              {selectedRoom && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                      <DoorOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{selectedRoom.name}</p>
                      <p className="text-sm text-slate-500">
                        {selectedRoom.building_name} 
                        {selectedRoom.room_code && (
                          <span className="ml-1 font-mono">({selectedRoom.room_code})</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informasi Item */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <Boxes className="h-5 w-5 text-amber-500" />
              Informasi Item
            </h2>
            
            <div className="space-y-6">
              {/* Photo Upload */}
              <div className="space-y-3">
                <Label className="text-slate-700 font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4 text-slate-400" />
                  Foto Item
                </Label>
                <PhotoUpload
                  value={watch('photo_url')}
                  onChange={(url) => setValue('photo_url', url ?? '')}
                  folder="inventory"
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-medium">
                  Nama Item <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="name"
                  placeholder="Contoh: Proyektor, AC, Papan Tulis, Meja, Kursi..." 
                  className="h-12 rounded-xl border-slate-200 focus:border-amber-500 focus:ring-amber-500/20"
                  {...register('name')} 
                />
                {errors.name && (
                  <p className="text-sm text-red-500 font-medium">{errors.name.message}</p>
                )}
              </div>

              {/* Quantity & Inventory Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-slate-700 font-medium">
                    Jumlah <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="quantity"
                    type="number"
                    min={1}
                    placeholder="1"
                    className="h-12 rounded-xl border-slate-200 focus:border-amber-500 focus:ring-amber-500/20"
                    {...register('quantity')} 
                  />
                  {errors.quantity && (
                    <p className="text-sm text-red-500 font-medium">{errors.quantity.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inventory_code" className="text-slate-700 font-medium flex items-center gap-2">
                    <Hash className="h-4 w-4 text-slate-400" />
                    Kode Inventaris
                  </Label>
                  <Input 
                    id="inventory_code"
                    placeholder="INV-001 (opsional)" 
                    className="h-12 rounded-xl border-slate-200 focus:border-amber-500 focus:ring-amber-500/20"
                    {...register('inventory_code')} 
                  />
                </div>
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  Kondisi <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {CONDITIONS.map((cond) => (
                    <button
                      key={cond.value}
                      type="button"
                      onClick={() => setValue('condition', cond.value as FormData['condition'])}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        watch('condition') === cond.value
                          ? `border-current ${cond.bg} ${cond.color}`
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className={`font-medium ${watch('condition') === cond.value ? cond.color : 'text-slate-700'}`}>
                        {cond.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-slate-700 font-medium">
                  Catatan
                </Label>
                <Textarea 
                  id="notes"
                  placeholder="Catatan tambahan tentang item ini..." 
                  rows={4}
                  className="rounded-xl border-slate-200 focus:border-amber-500 focus:ring-amber-500/20 resize-none"
                  {...register('notes')} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            type="submit" 
            disabled={loading}
            className="h-12 px-8 bg-amber-600 hover:bg-amber-700"
          >
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {item ? 'Simpan Perubahan' : 'Tambah Item'}
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
    </div>
  )
}
