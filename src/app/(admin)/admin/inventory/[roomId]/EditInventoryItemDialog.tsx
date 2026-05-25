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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Camera, Boxes, Hash, AlertCircle, Building2, DoorOpen } from 'lucide-react'
import { PhotoUpload } from '@/components/shared/PhotoUpload'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'

const CONDITIONS = [
  { value: 'good', label: 'Baik', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { value: 'needs_repair', label: 'Perlu Perbaikan', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { value: 'damaged', label: 'Rusak', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
]

interface Building {
  id: string
  name: string
  code: string
}

interface Room {
  id: string
  name: string
  room_code: string | null
  building_id: string
  building_name: string
}

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
  condition: z.enum(['good', 'needs_repair', 'damaged']),
  inventory_code: z.string().optional(),
  notes: z.string().optional(),
  photo_url: z.string().optional(),
  room_asset_id: z.string().min(1, 'Ruangan wajib dipilih'),
})

type FormData = z.infer<typeof schema>

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

interface EditInventoryItemDialogProps {
  item: InventoryItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditInventoryItemDialog({ item, open, onOpenChange }: EditInventoryItemDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('')
  const [loadingData, setLoadingData] = useState(true)
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: item.name,
      quantity: item.quantity,
      condition: item.condition,
      inventory_code: item.inventory_code ?? '',
      notes: item.notes ?? '',
      photo_url: item.photo_url ?? '',
      room_asset_id: item.room_asset_id,
    }
  })

  // Load buildings and rooms
  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setBuildings([])
      setRooms([])
      setSelectedBuildingId('')
      return
    }
    
    async function loadData() {
      setLoadingData(true)
      const supabase = createClient()
      
      try {
        // Load buildings
        const { data: buildingsData, error: buildingsError } = await supabase
          .from('buildings')
          .select('id, name, code')
          .order('name')
        
        if (buildingsError) {
          console.error('Error loading buildings:', buildingsError)
          toast.error('Gagal memuat data gedung')
        }
        
        setBuildings(buildingsData || [])
        
        // Load all rooms with building info - menggunakan tabel rooms
        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select(`
            id, name, room_code, building_id
          `)
          .eq('is_active', true)
          .order('name')
        
        if (roomsError) {
          console.error('Error loading rooms:', roomsError)
          toast.error('Gagal memuat data ruangan: ' + roomsError.message)
        }
        
        if (roomsData) {
          // Create a map of building names for lookup
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const buildingMap = new Map((buildingsData as any[])?.map(b => [b.id, b.name]) || [])
          
          const formattedRooms = roomsData.map((room: { id: string; name: string; room_code: string | null; building_id: string }) => ({
            id: room.id,
            name: room.name,
            room_code: room.room_code,
            building_id: room.building_id,
            building_name: buildingMap.get(room.building_id) || '-',
          }))
          setRooms(formattedRooms)
          
          // Find building of current room
          const currentRoom = formattedRooms.find(r => r.id === item.room_asset_id)
          if (currentRoom) {
            setSelectedBuildingId(currentRoom.building_id)
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Gagal memuat data')
      }
      
      setLoadingData(false)
    }
    
    loadData()
  }, [open, item.room_asset_id])

  const filteredRooms = selectedBuildingId
    ? rooms.filter(r => r.building_id === selectedBuildingId)
    : rooms

  const selectedRoom = rooms.find(r => r.id === watch('room_asset_id'))

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
      last_updated_at: new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('room_inventory_items') as any)
      .update(payload)
      .eq('id', item.id)

    if (error) {
      toast.error('Gagal memperbarui: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('Item inventaris berhasil diperbarui')
    onOpenChange(false)
    router.refresh()
    setLoading(false)
  }

  if (loadingData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-amber-500" />
            Edit Item Inventaris
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Info Banner */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              Edit informasi barang inventaris. Anda juga dapat memindahkan item ke ruangan lain.
            </AlertDescription>
          </Alert>

          {/* Lokasi Section */}
          <Card className="border-amber-200">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-600" />
                Lokasi
              </h3>
              
              {/* Building Select */}
              <div className="space-y-2">
                <Label className="text-foreground/80">Gedung</Label>
                <Select
                  value={selectedBuildingId}
                  onValueChange={(value) => {
                    setSelectedBuildingId(value || '')
                    // Reset room selection when building changes
                    const roomsInBuilding = rooms.filter(r => r.building_id === value)
                    if (roomsInBuilding.length > 0 && !roomsInBuilding.find(r => r.id === watch('room_asset_id'))) {
                      setValue('room_asset_id', roomsInBuilding[0].id)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    {selectedBuildingId ? (
                      (() => {
                        const building = buildings.find(b => b.id === selectedBuildingId)
                        return building ? `${building.name} (${building.code})` : 'Pilih gedung...'
                      })()
                    ) : (
                      <span className="text-muted-foreground/70">Pilih gedung...</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name} ({building.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Room Select */}
              <div className="space-y-2">
                <Label className="text-foreground/80">
                  Ruangan <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('room_asset_id')}
                  onValueChange={(value) => setValue('room_asset_id', value || '')}
                  disabled={!selectedBuildingId}
                >
                  <SelectTrigger className="w-full">
                    {watch('room_asset_id') ? (
                      (() => {
                        const room = rooms.find(r => r.id === watch('room_asset_id'))
                        return room ? `${room.name}${room.room_code ? ` (${room.room_code})` : ''}` : 'Pilih ruangan...'
                      })()
                    ) : (
                      <span className="text-muted-foreground/70">{selectedBuildingId ? 'Pilih ruangan...' : 'Pilih gedung terlebih dahulu'}</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRooms.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground/70 text-center">
                        Tidak ada ruangan di gedung ini
                      </div>
                    ) : (
                      filteredRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} {room.room_code && `(${room.room_code})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.room_asset_id && (
                  <p className="text-sm text-red-500">{errors.room_asset_id.message}</p>
                )}
                
                {/* Current Location Info */}
                {selectedRoom && (
                  <div className="mt-2 p-3 bg-amber-50 rounded-[10px] text-sm">
                    <div className="flex items-center gap-2 text-amber-800">
                      <DoorOpen className="h-4 w-4" />
                      <span className="font-medium">Lokasi saat ini:</span>
                    </div>
                    <p className="text-amber-700 mt-1 ml-6">
                      {selectedRoom.name} {selectedRoom.room_code && `(${selectedRoom.room_code})`}
                      <br />
                      <span className="text-xs">{selectedRoom.building_name}</span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label className="text-foreground/80 font-medium flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground/70" />
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
            <Label htmlFor="name" className="text-foreground/80 font-medium">
              Nama Item <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="name"
              placeholder="Contoh: Proyektor, AC, Papan Tulis..." 
              {...register('name')} 
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Quantity & Inventory Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-foreground/80 font-medium">
                Jumlah <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="quantity"
                type="number"
                min={1}
                {...register('quantity')} 
              />
              {errors.quantity && (
                <p className="text-sm text-red-500">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventory_code" className="text-foreground/80 font-medium flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground/70" />
                Kode Inventaris
              </Label>
              <Input 
                id="inventory_code"
                placeholder="INV-001 (opsional)" 
                {...register('inventory_code')} 
              />
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label className="text-foreground/80 font-medium">
              Kondisi <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((cond) => (
                <button
                  key={cond.value}
                  type="button"
                  onClick={() => setValue('condition', cond.value as FormData['condition'])}
                  className={`p-3 rounded-[10px] border-2 text-center transition-all ${
                    watch('condition') === cond.value
                      ? `${cond.bg} ${cond.border} ${cond.color}`
                      : 'border-border hover:border-muted-foreground/30 bg-card'
                  }`}
                >
                  <span className={`text-sm font-medium ${watch('condition') === cond.value ? cond.color : 'text-foreground/80'}`}>
                    {cond.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground/80 font-medium">
              Catatan
            </Label>
            <Textarea 
              id="notes"
              placeholder="Catatan tambahan tentang item ini..." 
              rows={3}
              className="resize-none"
              {...register('notes')} 
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
