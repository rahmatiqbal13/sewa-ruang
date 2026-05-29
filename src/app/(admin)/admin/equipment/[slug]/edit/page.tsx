import { createClient, createAdminDbClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Package, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EquipmentImageUpload } from '../../EquipmentImageUpload'
import { EquipmentRatesForm } from '../../EquipmentRatesForm'
import { RoomSelect } from '../../RoomSelect'
import { LocationSelect } from '../../LocationSelect'
import { BORROWER_CATEGORIES } from '@/lib/categories'

const EQUIPMENT_CATEGORIES = [
  { value: 'elektronik', label: 'Elektronik' },
  { value: 'mebel', label: 'Mebel' },
  { value: 'transportasi', label: 'Transportasi' },
  { value: 'alat_tes_pengukuran', label: 'Alat Tes Pengukuran' },
  { value: 'alat_gym', label: 'Alat Gym/Fitness' },
  { value: 'perlengkapan', label: 'Perlengkapan' },
  { value: 'lainnya', label: 'Lainnya' },
]

interface Props {
  params: Promise<{ slug: string }>
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function slugMatchesEquipment(slug: string, equipmentName: string): boolean {
  return createSlug(equipmentName) === slug
}

export default async function EditEquipmentPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const sb = createAdminDbClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: userData } = await sb
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
    redirect('/admin/dashboard')
  }

  // Get all equipment to find by slug
  const { data: allEquipment } = await sb
    .from('equipment')
    .select('id, name')

  // Find equipment that matches the slug
  const matchedEquipment = allEquipment?.find((eq: { id: string; name: string }) => slugMatchesEquipment(slug, eq.name))
  
  if (!matchedEquipment) {
    notFound()
  }

  const equipmentId = matchedEquipment.id

  // Get full equipment data
  const { data: equipment } = await sb
    .from('equipment')
    .select('*')
    .eq('id', equipmentId)
    .single() as any

  if (!equipment) {
    notFound()
  }

  // Get equipment rates
  const { data: equipmentRates } = await sb
    .from('equipment_rates')
    .select('user_category, rate_per_day, rate_per_hour, requires_supervision')
    .eq('equipment_id', equipmentId)

  // Get buildings for dropdown
  const { data: buildings } = await sb
    .from('buildings')
    .select('id, name, code, floor_count')
    .eq('is_active', true)
    .order('name')

  // Get rooms for storage dropdown
  const { data: rooms } = await sb
    .from('rooms')
    .select('id, name, room_code, building_id, floor_number')
    .eq('is_active', true)
    .order('name') as any

  // Get count of existing equipment names only (not the list)
  const { count: existingCount } = await sb
    .from('equipment')
    .select('name', { count: 'exact', head: true })
    .neq('id', equipmentId)

  async function updateEquipment(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    const sba = createAdminDbClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    let name = formData.get('name') as string
    let equipment_code = formData.get('equipment_code') as string
    const description = formData.get('description') as string
    const merk = formData.get('merk') as string
    const category = formData.get('category') as string
    const current_condition = formData.get('current_condition') as string
    const ketersediaan = formData.get('ketersediaan') as string
    const status_tindakan = formData.get('status_tindakan') as string
    const sumber = formData.get('sumber') as string
    const building_id = formData.get('building_id') as string || null
    const floor = formData.get('floor') as string
    const floor_number = floor ? parseInt(floor) : null
    const current_location = formData.get('current_location') as string
    const storage_room_id = formData.get('storage_room_id') as string || null
    const is_active = formData.has('is_active')
    const photo_url = formData.get('photo_url') as string || null

    // Generate equipment code if not exists
    if (!equipment_code) {
      const { data: maxCodeData } = await sba
        .from('equipment')
        .select('equipment_code')
        .not('equipment_code', 'is', null)
        .ilike('equipment_code', 'ALT-%')
        .order('equipment_code', { ascending: false })
        .limit(1)
        .single()

      if (maxCodeData?.equipment_code) {
        const match = maxCodeData.equipment_code.match(/ALT-(\d+)/)
        if (match) {
          const lastNum = parseInt(match[1], 10)
          equipment_code = `ALT-${String(lastNum + 1).padStart(4, '0')}`
        } else {
          equipment_code = 'ALT-0001'
        }
      } else {
        equipment_code = 'ALT-0001'
      }
    }

    // Check for duplicate names
    const { data: existingNames } = await sba
      .from('equipment')
      .select('name')
      .neq('id', equipmentId)

    if (existingNames) {
      const normalizedNewName = name.toLowerCase().trim()
      const existingBaseNames = existingNames.map((e: { name: string }) => e.name.toLowerCase().trim())
      
      if (existingBaseNames.includes(normalizedNewName)) {
        let counter = 2
        let newName = `${name} (${counter})`
        
        while (existingBaseNames.includes(newName.toLowerCase())) {
          counter++
          newName = `${name} (${counter})`
        }
        
        name = newName
      }
    }

    const { error } = await sba
      .from('equipment')
      .update({
        name,
        equipment_code,
        description,
        merk,
        category,
        current_condition,
        ketersediaan,
        status_tindakan,
        sumber,
        building_id,
        floor: floor_number,
        current_location,
        storage_room_id,
        is_active,
        photo_url,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', equipmentId)

    if (error) {
      throw new Error(error.message)
    }

    // Update equipment rates — gunakan adminDb (service role langsung) untuk bypass RLS
    const adminDb = createAdminDbClient()
    const userCategories = BORROWER_CATEGORIES.map(c => c.key)

    for (const cat of userCategories) {
      const dayValue = formData.get(`${cat}_day`) as string
      const hourValue = formData.get(`${cat}_hour`) as string
      const supervisionValue = formData.get(`${cat}_supervision`) as string

      const rateDay = dayValue && dayValue.trim() !== '' ? parseFloat(dayValue) : NaN
      const rateHour = hourValue && hourValue.trim() !== '' ? parseFloat(hourValue) : null
      const requiresSupervision = supervisionValue === 'true'

      if (!isNaN(rateDay) && rateDay > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: upsertError } = await (adminDb as any).from('equipment_rates').upsert({
          equipment_id: equipmentId,
          user_category: cat,
          rate_per_day: rateDay,
          rate_per_hour: rateHour,
          requires_supervision: requiresSupervision,
        }, { onConflict: 'equipment_id,user_category' })
        if (upsertError) console.error(`Rate upsert error [${cat}]:`, upsertError)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminDb as any).from('equipment_rates')
          .delete()
          .eq('equipment_id', equipmentId)
          .eq('user_category', cat)
      }
    }

    const newSlug = createSlug(name)
    if (newSlug !== slug) {
      redirect(`/admin/equipment/${newSlug}/edit`)
    }

    redirect('/admin/equipment')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/admin/equipment" 
          className="text-sm text-muted-foreground hover:text-foreground/80 flex items-center gap-1 mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Alat
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-primary rounded-[14px] flex items-center justify-center shadow-lg shadow-teal-500/25">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Alat</h1>
            <p className="text-muted-foreground">{equipment.name}</p>
          </div>
        </div>
      </div>

      {/* Compact Warning */}
      <Alert className="bg-amber-50 border-amber-200 mb-6">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm">
          <span className="font-medium">Nama alat harus unik.</span>{' '}
          Sistem otomatis menambahkan nomor urut jika nama sama ({existingCount || 0} alat tersedia).
        </AlertDescription>
      </Alert>

      <form action={updateEquipment} className="space-y-6">
        {/* Main Info Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Informasi Dasar</CardTitle>
            <CardDescription>Data identitas dan klasifikasi alat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Row 1: Name & Code */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="name" className="text-foreground/80">Nama Alat *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    required 
                    defaultValue={equipment.name}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="equipment_code" className="text-foreground/80">
                    Kode Alat {equipment.equipment_code ? '' : <span className="text-amber-600">*</span>}
                  </Label>
                  <Input
                    id="equipment_code"
                    name="equipment_code"
                    defaultValue={equipment.equipment_code || ''}
                    readOnly={!!equipment.equipment_code}
                    placeholder={equipment.equipment_code ? '' : 'Akan dibuat otomatis'}
                    className={cn(
                      "h-11 font-mono",
                      equipment.equipment_code 
                        ? "bg-muted text-muted-foreground" 
                        : "bg-amber-50 border-amber-200 text-amber-700 placeholder:text-amber-400"
                    )}
                  />
                  {!equipment.equipment_code && (
                    <p className="text-xs text-amber-600">Kode akan dibuat otomatis saat simpan</p>
                  )}
                </div>
              </div>

            {/* Row 2: Category & Merk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-foreground/80">Kategori</Label>
                <Select name="category" defaultValue={equipment.category || ''}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="merk" className="text-foreground/80">Merk/Brand</Label>
                <Input 
                  id="merk" 
                  name="merk" 
                  defaultValue={equipment.merk || ''}
                  className="h-11"
                  placeholder="Contoh: Technogym, Sony, dll"
                />
              </div>
            </div>

            {/* Row 3: Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground/80">Deskripsi</Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={equipment.description || ''}
                rows={3}
                placeholder="Deskripsi singkat alat..."
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Photo & Status Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Photo */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Foto Alat</CardTitle>
            </CardHeader>
            <CardContent>
              <EquipmentImageUpload initialValue={equipment.photo_url || ''} />
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="lg:col-span-2 border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Status & Kondisi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="current_condition" className="text-foreground/80 text-sm font-medium">Kondisi *</Label>
                  <Select name="current_condition" defaultValue={equipment.current_condition}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Pilih kondisi..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Baik</SelectItem>
                      <SelectItem value="needs_repair">Perlu Perbaikan</SelectItem>
                      <SelectItem value="damaged">Rusak</SelectItem>
                      <SelectItem value="lost">Hilang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="ketersediaan" className="text-foreground/80 text-sm font-medium">Ketersediaan *</Label>
                  <Select name="ketersediaan" defaultValue={equipment.ketersediaan}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Pilih ketersediaan..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tersedia">Tersedia</SelectItem>
                      <SelectItem value="digunakan">Digunakan</SelectItem>
                      <SelectItem value="hilang">Hilang</SelectItem>
                      <SelectItem value="tidak_tersedia">Tidak Tersedia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="status_tindakan" className="text-foreground/80 text-sm font-medium">Status Tindakan *</Label>
                  <Select name="status_tindakan" defaultValue={equipment.status_tindakan}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Pilih status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="perawatan">Perawatan</SelectItem>
                      <SelectItem value="menunggu_part">Menunggu Part</SelectItem>
                      <SelectItem value="afkir">Afkir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60 mt-4">
                <h4 className="text-sm font-semibold text-foreground/80 mb-3">Status Alat</h4>
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="is_active" 
                      value="true"
                      defaultChecked={equipment.is_active}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-card after:border-border after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                  <div>
                    <span className={`text-sm font-medium ${equipment.is_active ? 'text-teal-700' : 'text-muted-foreground'}`}>
                      {equipment.is_active ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {equipment.is_active 
                        ? 'Alat dapat dilihat dan disewa oleh peminjam' 
                        : 'Alat disembunyikan dari katalog peminjaman'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60 mt-4">
                <h4 className="text-sm font-semibold text-foreground/80 mb-4">Lokasi Penyimpanan</h4>
                <LocationSelect
                  buildings={buildings || []}
                  rooms={rooms || []}
                  defaultBuildingId={equipment.building_id}
                  defaultFloor={equipment.floor}
                  defaultRoomId={equipment.storage_room_id}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/60 mt-4">
                <div className="space-y-3">
                  <Label htmlFor="sumber" className="text-foreground/80 text-sm font-medium">Sumber Perolehan</Label>
                  <Input 
                    id="sumber" 
                    name="sumber" 
                    className="h-11"
                    defaultValue={equipment.sumber || ''}
                    placeholder="Contoh: Hibah, Pembelian"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="current_location" className="text-foreground/80 text-sm font-medium">
                    Keterangan Lokasi <span className="text-xs text-muted-foreground/70 font-normal">(opsional)</span>
                  </Label>
                  <Input 
                    id="current_location" 
                    name="current_location" 
                    className="h-11"
                    defaultValue={equipment.current_location || ''}
                    placeholder="Contoh: Rak B, Lemari Penyimpanan"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rates Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Tarif Sewa per Kategori</CardTitle>
            <CardDescription>Kosongkan kategori yang tidak tersedia</CardDescription>
          </CardHeader>
          <CardContent>
            <EquipmentRatesForm initialRates={equipmentRates || []} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/equipment">Batal</Link>
          </Button>
          <div className="flex gap-3">
            <Button 
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 h-11 px-6"
            >
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
