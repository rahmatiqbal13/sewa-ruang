import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Package, Building2, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EquipmentImageUpload } from '../EquipmentImageUpload'

// Kategori dengan tarif standar
const EQUIPMENT_CATEGORIES = [
  { value: 'elektronik', label: 'Elektronik' },
  { value: 'mebel', label: 'Mebel' },
  { value: 'transportasi', label: 'Transportasi' },
  { value: 'alat_tes_pengukuran', label: 'Alat Tes Pengukuran' },
  { value: 'alat_gym', label: 'Alat Gym/Fitness' },
  { value: 'perlengkapan', label: 'Perlengkapan' },
  { value: 'lainnya', label: 'Lainnya' },
]

// Daftar alat tes pengukuran dengan tarif
const ALAT_TES_PENGUKURAN_LIST = [
  'BACK & Leg Strength',
  'Balance Beam',
  'Ball Medicine',
  'Expanding Dynamometer',
  'Flexiometer',
  'Force Plate',
  'Grip Strength',
  'Jump DF',
  'Jump MD',
  'Mirror Drawing',
  'Side Step',
  'Skinfold Caliper',
  'Speed Anticipation action',
  'Spiro Meter',
  'Whole Body Reaction',
]

export default async function NewEquipmentPage() {
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

  // Get buildings for location dropdown
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')

  // Get rooms for storage dropdown
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, room_code')
    .eq('is_active', true)
    .order('name')

  // Generate next equipment code
  const { data: lastEquipment } = await supabase
    .from('equipment')
    .select('equipment_code')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let nextCode = 'ALT-0001'
  if (lastEquipment?.equipment_code) {
    const match = lastEquipment.equipment_code.match(/ALT-(\d+)/)
    if (match) {
      const lastNum = parseInt(match[1])
      nextCode = `ALT-${String(lastNum + 1).padStart(4, '0')}`
    }
  }

  // Get all existing equipment names untuk cek duplikat
  const { data: existingNames } = await supabase
    .from('equipment')
    .select('name')
    .order('name')

  // Helper function untuk generate unique name
  function generateUniqueName(baseName: string): string {
    if (!existingNames || existingNames.length === 0) return baseName
    
    const normalizedBase = baseName.toLowerCase().trim()
    const existingBaseNames = existingNames.map(e => e.name.toLowerCase().trim())
    
    // Cek apakah nama dasar sudah ada
    if (!existingBaseNames.includes(normalizedBase)) return baseName
    
    // Cari nomor yang tersedia
    let counter = 2
    let newName = `${baseName} (${counter})`
    
    while (existingBaseNames.includes(newName.toLowerCase())) {
      counter++
      newName = `${baseName} (${counter})`
    }
    
    return newName
  }

  async function createEquipment(formData: FormData) {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    let name = formData.get('name') as string
    const equipment_code = formData.get('equipment_code') as string
    
    // Generate unique name if duplicate exists
    name = generateUniqueName(name)
    const description = formData.get('description') as string
    const merk = formData.get('merk') as string
    const category = formData.get('category') as string
    const current_condition = formData.get('current_condition') as string
    const ketersediaan = formData.get('ketersediaan') as string
    const status_tindakan = formData.get('status_tindakan') as string
    const sumber = formData.get('sumber') as string
    const building_id = formData.get('building_id') as string
    const location_manual = formData.get('location_manual') as string
    const storage_room_id = formData.get('storage_room_id') as string || null
    const photo_url = formData.get('photo_url') as string || null

    // Combine building and manual location
    let current_location = location_manual
    if (building_id) {
      const { data: building } = await supabase
        .from('buildings')
        .select('name')
        .eq('id', building_id)
        .single()
      if (building) {
        current_location = location_manual 
          ? `${building.name} - ${location_manual}`
          : building.name
      }
    }

    // Insert equipment
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .insert({
        name,
        equipment_code,
        description,
        merk,
        category,
        current_condition,
        ketersediaan,
        status_tindakan,
        sumber,
        current_location,
        storage_room_id,
        photo_url,
        created_by: user.id,
      })
      .select()
      .single()

    if (equipmentError || !equipment) {
      throw new Error(equipmentError?.message || 'Failed to create equipment')
    }

    // Insert rates per user category
    const userCategories = [
      { key: 'mahasiswa_s1', field: 'rate_mahasiswa_s1' },
      { key: 'mahasiswa_s2', field: 'rate_mahasiswa_s2' },
      { key: 'dosen', field: 'rate_dosen' },
      { key: 'mou_unesa', field: 'rate_mou' },
      { key: 'umum', field: 'rate_umum' },
    ]

    for (const { key, field } of userCategories) {
      const rateDay = parseFloat(formData.get(`${field}_day`) as string)
      const rateHour = parseFloat(formData.get(`${field}_hour`) as string) || null
      const requiresSupervision = formData.get(`${field}_supervision`) === 'true'

      if (!isNaN(rateDay) && rateDay > 0) {
        await supabase.from('equipment_rates').insert({
          equipment_id: equipment.id,
          user_category: key,
          rate_per_day: rateDay,
          rate_per_hour: rateHour,
          requires_supervision: requiresSupervision,
        })
      }
    }

    redirect('/admin/equipment')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/equipment" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Alat
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" /> Tambah Alat Baru (Asset)
        </h1>
        <p className="text-muted-foreground">Alat adalah barang yang dapat disewakan. Untuk barang inventaris ruangan, gunakan menu Inventaris.</p>
      </div>

      {/* Warning tentang duplikat */}
      {existingNames && existingNames.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
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
        <div className="bg-gray-50 border rounded-lg p-4">
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

      <form action={createEquipment} className="space-y-6">
        {/* Informasi Dasar */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
            <CardDescription>Data identitas alat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Alat *</Label>
                <Input id="name" name="name" required placeholder="Contoh: Grip Strength Dynamometer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipment_code">Kode Alat (Otomatis)</Label>
                <Input 
                  id="equipment_code" 
                  name="equipment_code" 
                  defaultValue={nextCode}
                  readOnly
                  className="bg-gray-50 font-mono"
                />
                <p className="text-xs text-muted-foreground">Kode dibuat otomatis oleh sistem</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="merk">Merk/Brand</Label>
                <Input id="merk" name="merk" placeholder="Contoh: Takei" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori *</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori alat" />
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
              <Textarea id="description" name="description" placeholder="Deskripsi lengkap alat..." />
            </div>

            {/* Foto Alat */}
            <div className="space-y-2 pt-4 border-t">
              <Label>Foto Alat</Label>
              <EquipmentImageUpload />
            </div>
          </CardContent>
        </Card>

        {/* Status & Kondisi */}
        <Card>
          <CardHeader>
            <CardTitle>Status & Kondisi</CardTitle>
            <CardDescription>Status operasional alat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_condition">Kondisi Fisik *</Label>
                <Select name="current_condition" defaultValue="good">
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
                <Select name="ketersediaan" defaultValue="tersedia">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tersedia">Tersedia</SelectItem>
                    <SelectItem value="digunakan">Sedang Digunakan</SelectItem>
                    <SelectItem value="hilang">Hilang</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status_tindakan">Status Tindakan *</Label>
                <Select name="status_tindakan" defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue />
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
              <Label htmlFor="sumber">Sumber Perolehan</Label>
              <Input id="sumber" name="sumber" placeholder="Contoh: Hibah Dikti 2023 / Pembelian APBN" />
            </div>
          </CardContent>
        </Card>

        {/* Lokasi */}
        <Card>
          <CardHeader>
            <CardTitle>Lokasi</CardTitle>
            <CardDescription>Tempat penyimpanan alat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="building_id">Gedung</Label>
                <Select name="building_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih gedung" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings?.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {building.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_manual">Detail Lokasi (Manual)</Label>
                <Input id="location_manual" name="location_manual" placeholder="Contoh: Lantai 2, Lab Fisiologi" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage_room_id">Ruangan Penyimpanan (Opsional)</Label>
              <Select name="storage_room_id">
                <SelectTrigger>
                  <SelectValue placeholder="Pilih ruangan jika ada" />
                </SelectTrigger>
                <SelectContent>
                  {rooms?.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name} ({room.room_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tarif per Kategori User */}
        <Card>
          <CardHeader>
            <CardTitle>Tarif Sewa per Kategori</CardTitle>
            <CardDescription>Atur harga sewa untuk setiap kategori pengguna (kosongkan jika tidak tersedia)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mahasiswa S1 */}
            <div className="border rounded-lg p-4 bg-blue-50/50">
              <h4 className="font-semibold text-blue-800 mb-3">Mahasiswa Unesa S1</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_mahasiswa_s1_day">Tarif per Hari (Rp)</Label>
                  <Input id="rate_mahasiswa_s1_day" name="rate_mahasiswa_s1_day" type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate_mahasiswa_s1_hour">Tarif per Jam (Rp)</Label>
                  <Input id="rate_mahasiswa_s1_hour" name="rate_mahasiswa_s1_hour" type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Supervisi Laboran</Label>
                  <Select name="rate_mahasiswa_s1_supervision" defaultValue="true">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ya, Perlu</SelectItem>
                      <SelectItem value="false">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Mahasiswa S2/Pasca */}
            <div className="border rounded-lg p-4 bg-purple-50/50">
              <h4 className="font-semibold text-purple-800 mb-3">Mahasiswa Unesa S2/Pasca Sarjana</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_mahasiswa_s2_day">Tarif per Hari (Rp)</Label>
                  <Input id="rate_mahasiswa_s2_day" name="rate_mahasiswa_s2_day" type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate_mahasiswa_s2_hour">Tarif per Jam (Rp)</Label>
                  <Input id="rate_mahasiswa_s2_hour" name="rate_mahasiswa_s2_hour" type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Supervisi Laboran</Label>
                  <Select name="rate_mahasiswa_s2_supervision" defaultValue="true">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ya, Perlu</SelectItem>
                      <SelectItem value="false">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Dosen */}
            <div className="border rounded-lg p-4 bg-green-50/50">
              <h4 className="font-semibold text-green-800 mb-3">Dosen Unesa</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_dosen_day">Tarif per Hari (Rp)</Label>
                  <Input id="rate_dosen_day" name="rate_dosen_day" type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate_dosen_hour">Tarif per Jam (Rp)</Label>
                  <Input id="rate_dosen_hour" name="rate_dosen_hour" type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Supervisi Laboran</Label>
                  <Select name="rate_dosen_supervision" defaultValue="true">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ya, Perlu</SelectItem>
                      <SelectItem value="false">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* MoU */}
            <div className="border rounded-lg p-4 bg-orange-50/50">
              <h4 className="font-semibold text-orange-800 mb-3">MoU dengan Unesa</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_mou_day">Tarif per Hari (Rp)</Label>
                  <Input id="rate_mou_day" name="rate_mou_day" type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate_mou_hour">Tarif per Jam (Rp)</Label>
                  <Input id="rate_mou_hour" name="rate_mou_hour" type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Supervisi Laboran</Label>
                  <Select name="rate_mou_supervision" defaultValue="false">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ya, Perlu</SelectItem>
                      <SelectItem value="false">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Umum */}
            <div className="border rounded-lg p-4 bg-gray-50/50">
              <h4 className="font-semibold text-gray-800 mb-3">Umum (Non-Unesa)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_umum_day">Tarif per Hari (Rp)</Label>
                  <Input id="rate_umum_day" name="rate_umum_day" type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate_umum_hour">Tarif per Jam (Rp)</Label>
                  <Input id="rate_umum_hour" name="rate_umum_hour" type="number" min="0" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Supervisi Laboran</Label>
                  <Select name="rate_umum_supervision" defaultValue="false">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ya, Perlu</SelectItem>
                      <SelectItem value="false">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" size="lg">Simpan Alat</Button>
          <Button type="button" variant="outline" size="lg" asChild>
            <Link href="/admin/equipment">Batal</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
