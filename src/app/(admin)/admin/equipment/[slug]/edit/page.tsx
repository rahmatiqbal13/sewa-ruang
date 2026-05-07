import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Package, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EquipmentImageUpload } from '../../EquipmentImageUpload'
import { EquipmentRatesForm } from '../../EquipmentRatesForm'
import { RoomSelect } from '../../RoomSelect'

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

// Helper function to create slug from name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Helper function to match slug to equipment
function slugMatchesEquipment(slug: string, equipmentName: string): boolean {
  const equipmentSlug = createSlug(equipmentName)
  return equipmentSlug === slug
}

export default async function EditEquipmentPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
    redirect('/admin/dashboard')
  }

  // Get all equipment to find by slug
  const { data: allEquipment } = await supabase
    .from('equipment')
    .select('id, name')

  // Find equipment that matches the slug
  const matchedEquipment = allEquipment?.find(eq => slugMatchesEquipment(slug, eq.name))
  
  if (!matchedEquipment) {
    notFound()
  }

  const equipmentId = matchedEquipment.id

  // Get full equipment data
  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', equipmentId)
    .single()

  if (!equipment) {
    notFound()
  }

  // Get equipment rates
  const { data: equipmentRates } = await supabase
    .from('equipment_rates')
    .select('user_category, rate_per_day, rate_per_hour, requires_supervision')
    .eq('equipment_id', equipmentId)

  // Get rooms for storage dropdown - only select name (not room_code in display)
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, room_code')
    .eq('is_active', true)
    .order('name')

  // Get all existing equipment names (excluding current) untuk cek duplikat
  const { data: existingNames } = await supabase
    .from('equipment')
    .select('name')
    .neq('id', equipmentId)
    .order('name')

  async function updateEquipment(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    let name = formData.get('name') as string
    // equipment_code tidak diubah - baca dari form tapi tidak diupdate ke DB
    formData.get('equipment_code') // consume from form
    const description = formData.get('description') as string
    const merk = formData.get('merk') as string
    const category = formData.get('category') as string
    const current_condition = formData.get('current_condition') as string
    const ketersediaan = formData.get('ketersediaan') as string
    const status_tindakan = formData.get('status_tindakan') as string
    const sumber = formData.get('sumber') as string
    const current_location = formData.get('current_location') as string
    const storage_room_id = formData.get('storage_room_id') as string || null
    const is_active = formData.get('is_active') === 'true'
    const photo_url = formData.get('photo_url') as string || null

    // Check for duplicate names (excluding current equipment)
    const { data: existingNames } = await supabase
      .from('equipment')
      .select('name')
      .neq('id', equipmentId)
      .order('name')

    // Generate unique name if duplicate exists
    if (existingNames) {
      const normalizedNewName = name.toLowerCase().trim()
      const existingBaseNames = existingNames.map(e => e.name.toLowerCase().trim())
      
      if (existingBaseNames.includes(normalizedNewName)) {
        // Find available number
        let counter = 2
        let newName = `${name} (${counter})`
        
        while (existingBaseNames.includes(newName.toLowerCase())) {
          counter++
          newName = `${name} (${counter})`
        }
        
        name = newName
      }
    }

    const { error } = await supabase
      .from('equipment')
      .update({
        name,
        // equipment_code tidak diupdate - kode tetap sama
        description,
        merk,
        category,
        current_condition,
        ketersediaan,
        status_tindakan,
        sumber,
        current_location,
        storage_room_id,
        is_active,
        photo_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)

    if (error) {
      throw new Error(error.message)
    }

    // Update equipment rates
    const userCategories = ['mahasiswa_s1', 'mahasiswa_s2', 'dosen', 'mou_unesa', 'umum']
    
    for (const category of userCategories) {
      const rateDay = parseFloat(formData.get(`${category}_day`) as string)
      const rateHour = parseFloat(formData.get(`${category}_hour`) as string) || null
      const requiresSupervision = formData.get(`${category}_supervision`) === 'true'

      if (!isNaN(rateDay) && rateDay > 0) {
        // Upsert rate (insert or update)
        await supabase.from('equipment_rates').upsert({
          equipment_id: equipmentId,
          user_category: category,
          rate_per_day: rateDay,
          rate_per_hour: rateHour,
          requires_supervision: requiresSupervision,
        }, {
          onConflict: 'equipment_id,user_category'
        })
      } else {
        // Delete rate if 0 or empty
        await supabase.from('equipment_rates')
          .delete()
          .eq('equipment_id', equipmentId)
          .eq('user_category', category)
      }
    }

    // Redirect to new slug URL if name changed
    const newSlug = createSlug(name)
    if (newSlug !== slug) {
      redirect(`/admin/equipment/${newSlug}/edit`)
    }

    redirect('/admin/equipment')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/equipment" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Alat
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" /> Edit Alat
        </h1>
        <p className="text-muted-foreground">Perbarui informasi alat: {equipment.name}</p>
      </div>

      {/* Warning tentang duplikat */}
      {existingNames && existingNames.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <p className="font-medium mb-1">Nama alat harus unik!</p>
            <p className="text-sm">
              Jika nama sama dengan alat yang sudah ada, sistem akan otomatis menambahkan nomor urut
              (contoh: &quot;Grip Strength&quot; menjadi &quot;Grip Strength (2)&quot;).
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Daftar nama yang sudah ada */}
      {existingNames && existingNames.length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Nama alat yang sudah ada ({existingNames.length}):
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {existingNames.map((eq, idx) => (
              <span
                key={idx}
                className="text-xs bg-white border px-2 py-1 rounded"
                title={eq.name}
              >
                {eq.name.length > 30 ? eq.name.substring(0, 30) + '...' : eq.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <form action={updateEquipment}>
        <Card>
          <CardHeader>
            <CardTitle>Informasi Alat</CardTitle>
            <CardDescription>Data dasar alat atau peralatan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Alat *</Label>
                <Input id="name" name="name" required defaultValue={equipment.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipment_code">Kode Alat</Label>
                <Input
                  id="equipment_code"
                  name="equipment_code"
                  defaultValue={equipment.equipment_code || ''}
                  readOnly
                  className="bg-gray-100 font-mono"
                />
                <p className="text-xs text-muted-foreground">Kode alat tidak dapat diubah</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="merk">Merk/Brand</Label>
                <Input id="merk" name="merk" defaultValue={equipment.merk || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select name="category" defaultValue={equipment.category || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea id="description" name="description" defaultValue={equipment.description || ''} />
            </div>

            {/* Foto Alat */}
            <div className="space-y-2 pt-4 border-t">
              <Label>Foto Alat</Label>
              <EquipmentImageUpload initialValue={equipment.photo_url || ''} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_condition">Kondisi *</Label>
                <Select name="current_condition" defaultValue={equipment.current_condition}>
                  <SelectTrigger>
                    <SelectValue />
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
                <Label htmlFor="ketersediaan">Ketersediaan *</Label>
                <Select name="ketersediaan" defaultValue={equipment.ketersediaan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tersedia">Tersedia</SelectItem>
                    <SelectItem value="digunakan">Digunakan</SelectItem>
                    <SelectItem value="hilang">Hilang</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status_tindakan">Status Tindakan *</Label>
                <Select name="status_tindakan" defaultValue={equipment.status_tindakan}>
                  <SelectTrigger>
                    <SelectValue />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sumber">Sumber Perolehan</Label>
                <Input id="sumber" name="sumber" defaultValue={equipment.sumber || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_location">Lokasi Saat Ini</Label>
                <Input id="current_location" name="current_location" defaultValue={equipment.current_location || ''} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage_room_id">Ruangan Penyimpanan</Label>
              <RoomSelect 
                rooms={rooms?.map(r => ({ id: r.id, name: r.name })) || []} 
                defaultValue={equipment.storage_room_id || ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">Status Aktif</Label>
              <Select name="is_active" defaultValue={equipment.is_active.toString()}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tarif Sewa */}
        <Card>
          <CardHeader>
            <CardTitle>Tarif Sewa per Kategori</CardTitle>
            <CardDescription>Atur harga sewa untuk setiap kategori pengguna (kosongkan jika tidak tersedia)</CardDescription>
          </CardHeader>
          <CardContent>
            <EquipmentRatesForm initialRates={equipmentRates || []} />
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button type="submit">Simpan Perubahan</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/equipment">Batal</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
