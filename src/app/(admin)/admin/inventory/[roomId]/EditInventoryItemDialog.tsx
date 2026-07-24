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
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Camera, Hash, Building2, Boxes } from 'lucide-react'
import { PhotoUpload } from '@/components/shared/PhotoUpload'

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
  merk: z.string().optional(),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
  condition: z.enum(['good', 'needs_repair', 'damaged']),
  inventory_code: z.string().optional(),
  notes: z.string().optional(),
  photo_url: z.string().optional(),
  room_id: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface InventoryItem {
  id: string
  name: string
  merk: string | null
  quantity: number
  condition: 'good' | 'needs_repair' | 'damaged'
  inventory_code: string | null
  notes: string | null
  photo_url: string | null
  room_id: string | null
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
      merk: item.merk ?? '',
      quantity: item.quantity,
      condition: item.condition,
      inventory_code: item.inventory_code ?? '',
      notes: item.notes ?? '',
      photo_url: item.photo_url ?? '',
      room_id: item.room_id ?? '',
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
          if (item.room_id) {
            const currentRoom = formattedRooms.find(r => r.id === item.room_id)
            if (currentRoom) {
              setSelectedBuildingId(currentRoom.building_id)
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Gagal memuat data')
      }
      
      setLoadingData(false)
    }
    
    loadData()
  }, [open, item.room_id])

    const filteredRooms = selectedBuildingId
    ? rooms.filter(r => r.building_id === selectedBuildingId)
    : rooms

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const payload = {
      name: data.name.trim(),
      merk: data.merk?.trim() || null,
      quantity: data.quantity,
      condition: data.condition,
      inventory_code: data.inventory_code?.trim() || null,
      notes: data.notes?.trim() || null,
      photo_url: data.photo_url || null,
      room_id: data.room_id?.trim() || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('room_inventories') as any)
      .update(payload)
      .eq('id', item.id)

    if (error) {
      console.error('Supabase update error:', error)
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">

          {/* Name + Merk */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-foreground/80 font-medium">
                Nama Item <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Proyektor, AC, Kursi..."
                className="rounded-[10px]"
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="merk" className="text-foreground/80 font-medium">Merk / Tipe</Label>
              <Input
                id="merk"
                placeholder="Samsung, Epson, HP..."
                className="rounded-[10px]"
                {...register('merk')}
              />
            </div>
          </div>

          {/* Quantity & Inventory Code */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-foreground/80 font-medium">
                Jumlah <span className="text-red-500">*</span>
              </Label>
              <Input id="quantity" type="number" min={1} className="rounded-[10px]" {...register('quantity')} />
              {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inventory_code" className="text-foreground/80 font-medium flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-muted-foreground/70" />
                Kode Inventaris
              </Label>
              <Input id="inventory_code" placeholder="INV-0001" className="rounded-[10px]" {...register('inventory_code')} />
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-1.5">
            <Label className="text-foreground/80 font-medium">Kondisi <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((cond) => (
                <button
                  key={cond.value}
                  type="button"
                  onClick={() => setValue('condition', cond.value as FormData['condition'])}
                  className={`py-2.5 rounded-[10px] border-2 text-center transition-all text-sm font-medium ${
                    watch('condition') === cond.value
                      ? `${cond.bg} ${cond.border} ${cond.color}`
                      : 'border-border hover:border-muted-foreground/30 bg-card text-foreground/80'
                  }`}
                >
                  {cond.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lokasi — di tengah, setelah info utama */}
          <div className="rounded-[12px] border border-amber-200 bg-amber-50/50 p-3 space-y-3">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 uppercase tracking-wide">
              <Building2 className="h-3.5 w-3.5" />
              Lokasi
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-foreground/70">Gedung</Label>
                <Select
                  value={selectedBuildingId}
                  onValueChange={(value) => {
                    setSelectedBuildingId(value || '')
                    const roomsInBuilding = rooms.filter(r => r.building_id === value)
                    if (!roomsInBuilding.find(r => r.id === watch('room_id'))) {
                      setValue('room_id', roomsInBuilding[0]?.id || '')
                    }
                  }}
                >
                  <SelectTrigger className="h-9 rounded-[10px] text-sm">
                    {selectedBuildingId
                      ? buildings.find(b => b.id === selectedBuildingId)?.name ?? 'Pilih gedung...'
                      : <span className="text-muted-foreground/70">Pilih gedung...</span>}
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.code && `(${b.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground/70">Ruangan</Label>
                <Select
                  value={watch('room_id') || ''}
                  onValueChange={(value) => setValue('room_id', value || '')}
                  disabled={!selectedBuildingId}
                >
                  <SelectTrigger className="h-9 rounded-[10px] text-sm">
                    {watch('room_id')
                      ? (() => {
                          const r = rooms.find(r => r.id === watch('room_id'))
                          return r ? `${r.name}${r.room_code ? ` (${r.room_code})` : ''}` : 'Pilih...'
                        })()
                      : <span className="text-muted-foreground/70">{selectedBuildingId ? 'Pilih ruangan...' : 'Pilih gedung dulu'}</span>}
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} {r.room_code && `(${r.room_code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-foreground/80 font-medium">Catatan</Label>
            <Textarea
              id="notes"
              placeholder="Catatan tambahan..."
              rows={2}
              className="resize-none rounded-[10px]"
              {...register('notes')}
            />
          </div>

          {/* Photo Upload — paling bawah karena opsional */}
          <div className="space-y-1.5">
            <Label className="text-foreground/80 font-medium flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-muted-foreground/70" />
              Foto Item
            </Label>
            <PhotoUpload
              value={watch('photo_url')}
              onChange={(url) => setValue('photo_url', url ?? '')}
              folder="inventory"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={loading} className="flex-1 bg-amber-600 hover:bg-amber-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Batal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
