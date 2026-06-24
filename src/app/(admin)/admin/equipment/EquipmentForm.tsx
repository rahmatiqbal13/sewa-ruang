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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Package, ArrowLeft, Camera, Building2, MapPin, Tag, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PhotoUpload } from '@/components/shared/PhotoUpload'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EquipmentRatesForm, Rate } from './EquipmentRatesForm'
import { BORROWER_CATEGORIES } from '@/lib/categories'

// Kategori alat
const EQUIPMENT_CATEGORIES = [
  { value: 'elektronik', label: 'Elektronik' },
  { value: 'mebel', label: 'Mebel' },
  { value: 'transportasi', label: 'Transportasi' },
  { value: 'alat_tes_pengukuran', label: 'Alat Tes Pengukuran' },
  { value: 'alat_gym', label: 'Alat Gym/Fitness' },
  { value: 'perlengkapan', label: 'Perlengkapan' },
  { value: 'lainnya', label: 'Lainnya' },
]

// Label mappings for dropdowns
const CONDITION_LABELS: Record<string, string> = {
  good: 'Baik',
  needs_repair: 'Perlu Perbaikan',
  damaged: 'Rusak',
  lost: 'Hilang',
}

const KETERSEDIAAN_LABELS: Record<string, string> = {
  tersedia: 'Tersedia',
  digunakan: 'Sedang Digunakan',
  hilang: 'Hilang',
  tidak_tersedia: 'Tidak Tersedia',
}

const STATUS_TINDAKAN_LABELS: Record<string, string> = {
  normal: 'Normal',
  perawatan: 'Dalam Perawatan',
  menunggu_part: 'Menunggu Part',
  afkir: 'Afkir/Tidak Digunakan',
}

// CATEGORIES and Rate are imported from EquipmentRatesForm

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  equipment_code: z.string().min(1, 'Kode alat wajib diisi'),
  merk: z.string().optional(),
  category: z.string().min(1, 'Kategori wajib dipilih'),
  description: z.string().optional(),
  current_condition: z.enum(['good', 'needs_repair', 'damaged', 'lost']),
  ketersediaan: z.enum(['tersedia', 'digunakan', 'hilang', 'tidak_tersedia']),
  status_tindakan: z.enum(['normal', 'perawatan', 'menunggu_part', 'afkir']),
  sumber: z.string().optional(),
  building_id: z.string().optional(),
  floor: z.coerce.number().optional(),
  location_manual: z.string().optional(),
  storage_room_id: z.string().optional(),
  photo_url: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Building { id: string; name: string; code: string; floor_count: number }
interface Room { id: string; name: string; room_code: string; building_id?: string; floor?: number }
interface Equipment {
  id: string
  name: string
  equipment_code: string
  merk: string | null
  category: string
  description: string | null
  current_condition: string
  ketersediaan: string
  status_tindakan: string
  sumber: string | null
  current_location: string | null
  building_id: string | null
  floor: number | null
  storage_room_id: string | null
  photo_url: string | null
  equipment_rates?: Array<{
    user_category: string
    rate_per_day: number
    rate_per_hour: number | null
    requires_supervision: boolean
  }>
}

export function EquipmentForm({ 
  equipment, 
  buildings, 
  rooms, 
  nextCode,
  existingNames = []
}: { 
  equipment?: Equipment
  buildings: Building[]
  rooms: Room[]
  nextCode: string
  existingNames?: string[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rates, setRates] = useState<Rate[]>([])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: equipment ? {
      name: equipment.name,
      equipment_code: equipment.equipment_code,
      merk: equipment.merk ?? '',
      category: equipment.category || '',
      description: equipment.description ?? '',
      current_condition: (equipment.current_condition || 'good') as FormData['current_condition'],
      ketersediaan: (equipment.ketersediaan || 'tersedia') as FormData['ketersediaan'],
      status_tindakan: (equipment.status_tindakan || 'normal') as FormData['status_tindakan'],
      sumber: equipment.sumber ?? '',
      building_id: equipment.building_id ?? '',
      floor: equipment.floor ?? 0,
      storage_room_id: equipment.storage_room_id ?? '',
      photo_url: equipment.photo_url ?? '',
    } : {
      name: '',
      equipment_code: nextCode,
      merk: '',
      category: '',
      description: '',
      current_condition: 'good',
      ketersediaan: 'tersedia',
      status_tindakan: 'normal',
      sumber: '',
      building_id: '',
      floor: 0,
      storage_room_id: '',
      photo_url: '',
    }
  })

  const selectedBuildingId = watch('building_id')
  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId)
  const selectedFloor = watch('floor')
  const selectedStorageRoomId = watch('storage_room_id')
  const selectedStorageRoom = rooms.find(r => r.id === selectedStorageRoomId)
  const selectedCategory = EQUIPMENT_CATEGORIES.find(c => c.value === watch('category'))
  
  // Filter rooms by building and floor
  const filteredRooms = rooms.filter(r => {
    if (selectedBuildingId && r.building_id !== selectedBuildingId) return false
    if (selectedFloor && r.floor !== selectedFloor) return false
    return true
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Unauthorized')
      setLoading(false)
      return
    }

    // Generate unique name if needed
    let finalName = data.name
    const normalizedBase = data.name.toLowerCase().trim()
    const existingBaseNames = existingNames.map(n => n.toLowerCase().trim())
    
    if (existingBaseNames.includes(normalizedBase)) {
      let counter = 2
      let newName = `${data.name} (${counter})`
      while (existingBaseNames.includes(newName.toLowerCase())) {
        counter++
        newName = `${data.name} (${counter})`
      }
      finalName = newName
    }

    const payload = {
      name: finalName,
      equipment_code: data.equipment_code,
      merk: data.merk || null,
      category: data.category,
      description: data.description || null,
      current_condition: data.current_condition,
      ketersediaan: data.ketersediaan,
      status_tindakan: data.status_tindakan,
      sumber: data.sumber || null,
      building_id: data.building_id || null,
      floor: data.floor || null,
      current_location: data.location_manual || null,
      storage_room_id: data.storage_room_id || null,
      photo_url: data.photo_url || null,
    }

    let equipmentId = equipment?.id

    if (equipment) {
      // Update existing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('equipment') as any)
        .update(payload)
        .eq('id', equipment.id)
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
    } else {
      // Create new
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newEquipment, error } = await (supabase.from('equipment') as any)
        .insert({ ...payload, created_by: user.id })
        .select('id')
        .single()
      if (error || !newEquipment) {
        toast.error(error?.message || 'Gagal membuat alat')
        setLoading(false)
        return
      }
      equipmentId = newEquipment.id
    }

    // Insert/update rates for all categories (including 0 for free items like mahasiswa_s1)
    for (const rate of rates) {
      // Always save rate, even if 0 (for free items)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('equipment_rates') as any).upsert({
        equipment_id: equipmentId,
        user_category: rate.user_category,
        rate_per_day: rate.rate_per_day,
        rate_per_hour: rate.rate_per_hour,
        requires_supervision: rate.requires_supervision,
      }, { onConflict: 'equipment_id,user_category' })
    }

    toast.success(equipment ? 'Alat berhasil diperbarui' : 'Alat berhasil ditambahkan')
    router.push('/admin/equipment')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="max-w-4xl">
      {/* Back Button */}
      <Link 
        href="/admin/equipment"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar alat
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 bg-teal-600 rounded-[14px] flex items-center justify-center shadow-soft">
          <Package className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {equipment ? 'Edit Alat' : 'Tambah Alat Baru'}
          </h1>
          <p className="text-muted-foreground">
            {equipment ? 'Perbarui informasi alat' : 'Isi detail alat yang dapat disewakan'}
          </p>
        </div>
      </div>

      {/* Warning tentang duplikat */}
      {!equipment && existingNames.length > 0 && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <p className="font-medium">Nama alat harus unik!</p>
            <p className="text-sm mt-1">
              Jika nama sama dengan alat yang sudah ada, sistem akan otomatis menambahkan nomor urut.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-card rounded-[14px] border border-border shadow-soft p-4 md:p-8 space-y-10">
          {/* Informasi Dasar */}
          <section className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Tag className="h-5 w-5 text-teal-500" />
              Informasi Dasar
            </h2>

            <div className="space-y-6">
              {/* Photo Upload */}
              <div className="space-y-3">
                <Label className="text-foreground/80 font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground/70" />
                  Foto Alat
                </Label>
                <PhotoUpload
                  value={watch('photo_url')}
                  onChange={(url) => setValue('photo_url', url ?? '')}
                  folder="equipment"
                />
              </div>

              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground/80 font-medium">
                    Nama Alat <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Contoh: Grip Strength Dynamometer"
                    className="h-10 md:h-12 rounded-[10px] md:rounded-[14px] border-border focus:border-teal-500 focus:ring-teal-500/20"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 font-medium">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment_code" className="text-foreground/80 font-medium">
                    Kode Alat
                  </Label>
                  <Input
                    id="equipment_code"
                    {...register('equipment_code')}
                    readOnly
                    className="h-12 rounded-[14px] border-border bg-muted font-mono focus:border-teal-500 focus:ring-teal-500/20"
                  />
                  <p className="text-xs text-muted-foreground">Kode dibuat otomatis oleh sistem</p>
                </div>
              </div>

              {/* Merk & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="merk" className="text-foreground/80 font-medium">
                    Merk/Brand
                  </Label>
                  <Input
                    id="merk"
                    placeholder="Contoh: Takei"
                    className="h-10 md:h-12 rounded-[10px] md:rounded-[14px] border-border focus:border-teal-500 focus:ring-teal-500/20"
                    {...register('merk')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-foreground/80 font-medium">
                    Kategori <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={watch('category') || ''}
                    onValueChange={(v) => v && setValue('category', v)}
                  >
                    <SelectTrigger className="h-12 rounded-[14px] border-border focus:border-teal-500 focus:ring-teal-500/20">
                      {selectedCategory ? (
                        <span className="text-foreground">{selectedCategory.label}</span>
                      ) : (
                        <SelectValue placeholder="Pilih kategori..." />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500 font-medium">{errors.category.message}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground/80 font-medium">
                  Deskripsi
                </Label>
                <Textarea
                  id="description"
                  placeholder="Deskripsi lengkap alat..."
                  rows={4}
                  className="rounded-[14px] border-border focus:border-teal-500 focus:ring-teal-500/20 resize-none"
                  {...register('description')}
                />
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* Status & Kondisi */}
          <section className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Status & Kondisi
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-foreground/80 font-medium">
                  Kondisi Fisik <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('current_condition') || 'good'}
                  onValueChange={(v) => v && setValue('current_condition', v as FormData['current_condition'])}
                >
                  <SelectTrigger className="h-12 rounded-[14px] border-border">
                    {watch('current_condition') ? (
                      <span className="text-foreground">{CONDITION_LABELS[watch('current_condition')]}</span>
                    ) : (
                      <SelectValue placeholder="Pilih kondisi..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Baik</SelectItem>
                    <SelectItem value="needs_repair">Perlu Perbaikan</SelectItem>
                    <SelectItem value="damaged">Rusak</SelectItem>
                    <SelectItem value="lost">Hilang</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground/80 font-medium">
                  Ketersediaan <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('ketersediaan') || 'tersedia'}
                  onValueChange={(v) => v && setValue('ketersediaan', v as FormData['ketersediaan'])}
                >
                  <SelectTrigger className="h-12 rounded-[14px] border-border">
                    {watch('ketersediaan') ? (
                      <span className="text-foreground">{KETERSEDIAAN_LABELS[watch('ketersediaan')]}</span>
                    ) : (
                      <SelectValue placeholder="Pilih ketersediaan..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tersedia">Tersedia</SelectItem>
                    <SelectItem value="digunakan">Sedang Digunakan</SelectItem>
                    <SelectItem value="hilang">Hilang</SelectItem>
                    <SelectItem value="tidak_tersedia">Tidak Tersedia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground/80 font-medium">
                  Status Tindakan <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('status_tindakan') || 'normal'}
                  onValueChange={(v) => v && setValue('status_tindakan', v as FormData['status_tindakan'])}
                >
                  <SelectTrigger className="h-12 rounded-[14px] border-border">
                    {watch('status_tindakan') ? (
                      <span className="text-foreground">{STATUS_TINDAKAN_LABELS[watch('status_tindakan')]}</span>
                    ) : (
                      <SelectValue placeholder="Pilih status..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="perawatan">Dalam Perawatan</SelectItem>
                    <SelectItem value="menunggu_part">Menunggu Part</SelectItem>
                    <SelectItem value="afkir">Afkir/Tidak Digunakan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sumber" className="text-foreground/80 font-medium">
                Sumber Perolehan
              </Label>
              <Input
                id="sumber"
                placeholder="Contoh: Hibah Dikti 2023 / Pembelian APBN"
                className="h-12 rounded-[14px] border-border focus:border-teal-500 focus:ring-teal-500/20"
                {...register('sumber')}
              />
            </div>
          </section>

          <hr className="border-border" />

          {/* Lokasi */}
          <section className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Lokasi
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-foreground/80 font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground/70" />
                  Gedung <span className="text-xs text-muted-foreground/70 font-normal">(opsional)</span>
                </Label>
                <Select
                  value={watch('building_id') || ''}
                  onValueChange={(v) => {
                    setValue('building_id', v || '')
                    setValue('floor', undefined)
                    setValue('storage_room_id', '')
                  }}
                >
                  <SelectTrigger className="h-12 rounded-[14px] border-border">
                    {selectedBuilding ? (
                      <span className="text-foreground">{selectedBuilding.name}</span>
                    ) : (
                      <SelectValue placeholder="Pilih gedung..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Belum ada gedung</SelectItem>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name} ({building.code}) - {building.floor_count} lantai
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground/80 font-medium">
                  Lantai <span className="text-xs text-muted-foreground/70 font-normal">(opsional)</span>
                </Label>
                <Select
                  value={selectedFloor ? selectedFloor.toString() : ''}
                  onValueChange={(v) => {
                    setValue('floor', v ? parseInt(v) : 0)
                    setValue('storage_room_id', '')
                  }}
                  disabled={!selectedBuilding}
                >
                  <SelectTrigger className={cn(
                    "h-12 rounded-[14px] border-border",
                    !selectedBuilding && "bg-muted text-muted-foreground/70"
                  )}>
                    {selectedFloor ? (
                      <span className="text-foreground">Lantai {selectedFloor}</span>
                    ) : (
                      <SelectValue placeholder={selectedBuilding ? "Pilih lantai..." : "Pilih gedung dulu"} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Belum ada lantai</SelectItem>
                    {selectedBuilding && Array.from({ length: selectedBuilding.floor_count }, (_, i) => i + 1).map((floor) => (
                      <SelectItem key={floor} value={floor.toString()}>
                        Lantai {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground/80 font-medium">
                  Ruangan <span className="text-xs text-muted-foreground/70 font-normal">(opsional)</span>
                </Label>
                <Select
                  value={watch('storage_room_id') || ''}
                  onValueChange={(v) => setValue('storage_room_id', v || '')}
                >
                  <SelectTrigger className={cn(
                    "h-12 rounded-[14px] border-border",
                    filteredRooms.length === 0 && !selectedStorageRoomId && "text-muted-foreground/70"
                  )}>
                    {selectedStorageRoom ? (
                      <span className="text-foreground">{selectedStorageRoom.name}</span>
                    ) : (
                      <SelectValue placeholder="Pilih ruangan..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Belum ada ruangan</SelectItem>
                    {(filteredRooms.length > 0 ? filteredRooms : rooms).map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} ({room.room_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_manual" className="text-foreground/80 font-medium">
                Keterangan Lokasi Tambahan <span className="text-xs text-muted-foreground/70 font-normal">(opsional)</span>
              </Label>
              <Input
                id="location_manual"
                placeholder="Contoh: Rak B, Lemari Penyimpanan A, dll"
                className="h-12 rounded-[14px] border-border focus:border-teal-500 focus:ring-teal-500/20"
                {...register('location_manual')}
              />
            </div>
          </section>

          <hr className="border-border" />

          {/* Tarif */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Tarif Sewa per Kategori</h2>
              <p className="text-sm text-muted-foreground mt-1">Kosongkan kategori yang tidak tersedia</p>
            </div>
            <EquipmentRatesForm
              initialRates={equipment?.equipment_rates ?? []}
              onRatesChange={setRates}
            />
          </section>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button
            type="submit"
            disabled={loading}
            className="h-12 px-8 bg-teal-600 hover:bg-teal-700"
          >
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {equipment ? 'Simpan Perubahan' : 'Tambah Alat'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-12 px-8 border-border hover:bg-muted"
          >
            Batal
          </Button>
        </div>
      </form>
    </div>
  )
}
