import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { 
  Package, 
  Boxes, 
  Calendar, 
  AlertTriangle, 
  Wrench, 
  Search,
  Building
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Types
interface Equipment {
  id: string
  name: string
  equipment_code: string
  category: string
  merk: string | null
  current_condition: string
  ketersediaan: string
  status_tindakan: string
  description: string | null
  current_location: string | null
  is_active: boolean
  rooms?: { name: string } | null
}

interface Inventory {
  id: string
  name: string
  inventory_code: string
  category: string
  quantity: number
  condition: string
  notes: string | null
  is_active: boolean
  rooms?: { name: string } | null
}

// Helper functions for labels
const getConditionLabel = (condition: string) => {
  const labels: Record<string, string> = {
    good: 'Baik',
    needs_repair: 'Perlu Perbaikan',
    damaged: 'Rusak',
    lost: 'Hilang'
  }
  return labels[condition] || condition
}

const getConditionColor = (condition: string) => {
  const colors: Record<string, string> = {
    good: 'bg-green-100 text-green-800 border-green-200',
    needs_repair: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    damaged: 'bg-red-100 text-red-800 border-red-200',
    lost: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  return colors[condition] || 'bg-gray-100 text-gray-800'
}

const getKetersediaanLabel = (status: string) => {
  const labels: Record<string, string> = {
    tersedia: 'Tersedia',
    digunakan: 'Digunakan',
    hilang: 'Hilang'
  }
  return labels[status] || status
}

const getStatusTindakanLabel = (status: string) => {
  const labels: Record<string, string> = {
    normal: 'Normal',
    perawatan: 'Perawatan',
    menunggu_part: 'Menunggu Part',
    afkir: 'Afkir'
  }
  return labels[status] || status
}

export default async function ReportsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ 
    from?: string; 
    to?: string;
    tab?: string;
    equipmentCondition?: string;
    inventoryCondition?: string;
    showInactive?: string;
  }> 
}) {
  const { from, to, tab = 'bookings', equipmentCondition, inventoryCondition, showInactive } = await searchParams
  const showInactiveItems = showInactive === 'true'
  const supabase = await createClient()

  const fromDate = from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const toDate = to ?? new Date().toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Fetch booking data
  const [{ data: bookingsRaw }, { data: paymentsRaw }] = await Promise.all([
    sb
      .from('bookings')
      .select('*, users(name, institution), booking_assets(assets(name, category))')
      .gte('created_at', `${fromDate}T00:00:00`)
      .lte('created_at', `${toDate}T23:59:59`)
      .order('created_at', { ascending: false }),
    sb
      .from('payments')
      .select('amount, method, status')
      .eq('status', 'paid')
      .gte('paid_at', `${fromDate}T00:00:00`)
      .lte('paid_at', `${toDate}T23:59:59`),
  ])

  // Fetch equipment data with room info
  let equipmentQuery = sb
    .from('equipment')
    .select('*, rooms(name)')
    .order('name')

  // Only show active items by default, unless showInactive=true
  if (!showInactiveItems) {
    equipmentQuery = equipmentQuery.eq('is_active', true)
  }

  if (equipmentCondition) {
    equipmentQuery = equipmentQuery.eq('current_condition', equipmentCondition)
  }

  const { data: equipmentData } = await equipmentQuery

  // Fetch inventory data with room info
  let inventoryQuery = sb
    .from('room_inventories')
    .select('*, rooms(name)')
    .order('name')

  // Only show active items by default, unless showInactive=true
  if (!showInactiveItems) {
    inventoryQuery = inventoryQuery.eq('is_active', true)
  }

  if (inventoryCondition) {
    inventoryQuery = inventoryQuery.eq('condition', inventoryCondition)
  }

  const { data: inventoryData } = await inventoryQuery

  const bookings = bookingsRaw as Array<Record<string, any>> | null
  const payments = paymentsRaw as Array<{amount:number;method:string;status:string}> | null
  const equipment = equipmentData as Equipment[] | null
  const inventory = inventoryData as Inventory[] | null

  // Calculate stats
  const totalRevenue = payments?.reduce((s, p) => s + p.amount, 0) ?? 0
  const byMethod: Record<string, number> = {}
  payments?.forEach(p => { byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount })

  // Equipment stats by condition
  const equipmentStats = {
    total: equipment?.length ?? 0,
    good: equipment?.filter(e => e.current_condition === 'good').length ?? 0,
    needsRepair: equipment?.filter(e => e.current_condition === 'needs_repair').length ?? 0,
    damaged: equipment?.filter(e => e.current_condition === 'damaged').length ?? 0,
    lost: equipment?.filter(e => e.current_condition === 'lost').length ?? 0,
  }

  // Inventory stats by condition
  const inventoryStats = {
    total: inventory?.length ?? 0,
    good: inventory?.filter(i => i.condition === 'good').length ?? 0,
    needsRepair: inventory?.filter(i => i.condition === 'needs_repair').length ?? 0,
    damaged: inventory?.filter(i => i.condition === 'damaged').length ?? 0,
  }

  // Filter equipment by problematic conditions
  const problematicEquipment = equipment?.filter(e => 
    e.current_condition === 'needs_repair' || 
    e.current_condition === 'damaged' || 
    e.current_condition === 'lost'
  ) || []

  // Filter inventory by problematic conditions
  const problematicInventory = inventory?.filter(i => 
    i.condition === 'needs_repair' || 
    i.condition === 'damaged'
  ) || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Laporan</h1>
      </div>

      <Tabs defaultValue={tab || 'bookings'} key={tab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Peminjaman
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Alat
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Inventaris
          </TabsTrigger>
        </TabsList>

        {/* Tab Peminjaman */}
        <TabsContent value="bookings" className="mt-6 space-y-6">
          <form method="get" className="flex gap-3 items-end flex-wrap">
            <input type="hidden" name="tab" value="bookings" />
            <div>
              <label className="text-sm font-medium block mb-1">Dari</label>
              <input type="date" name="from" defaultValue={fromDate} className="border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Sampai</label>
              <input type="date" name="to" defaultValue={toDate} className="border rounded px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">
              Filter
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Pengajuan</p>
                <p className="text-3xl font-bold">{bookings?.length ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                <p className="text-3xl font-bold">{formatRupiah(totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Breakdown Metode</p>
                {Object.entries(byMethod).map(([method, amount]) => (
                  <p key={method} className="text-sm">
                    {method.replace('_', ' ')}: {formatRupiah(amount)}
                  </p>
                ))}
                {Object.keys(byMethod).length === 0 && <p className="text-sm text-muted-foreground">-</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Detail Pengajuan</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referensi</TableHead>
                    <TableHead>Peminjam</TableHead>
                    <TableHead>Instansi</TableHead>
                    <TableHead>Aset</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Tidak ada data pada periode ini
                      </TableCell>
                    </TableRow>
                  )}
                  {bookings?.map((b) => {
                    const assetName = (b.booking_assets as Array<{assets:{name:string}|null}>)?.[0]?.assets?.name
                    const user = b.users as {name:string;institution:string}|null
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.reference_no}</TableCell>
                        <TableCell className="text-sm">{user?.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user?.institution}</TableCell>
                        <TableCell className="text-sm">{assetName}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(b.created_at)}</TableCell>
                        <TableCell>{formatRupiah(b.total_amount)}</TableCell>
                        <TableCell className="capitalize text-sm">{b.status}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Equipment */}
        <TabsContent value="equipment" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-600 font-medium">Total Alat</p>
                <p className="text-3xl font-bold text-blue-900">{equipmentStats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-100">
              <CardContent className="pt-4">
                <p className="text-sm text-green-600 font-medium">Kondisi Baik</p>
                <p className="text-3xl font-bold text-green-900">{equipmentStats.good}</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-100">
              <CardContent className="pt-4">
                <p className="text-sm text-yellow-600 font-medium">Perlu Perbaikan</p>
                <p className="text-3xl font-bold text-yellow-900">{equipmentStats.needsRepair}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-100">
              <CardContent className="pt-4">
                <p className="text-sm text-red-600 font-medium">Rusak</p>
                <p className="text-3xl font-bold text-red-900">{equipmentStats.damaged}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-gray-100">
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 font-medium">Hilang</p>
                <p className="text-3xl font-bold text-gray-900">{equipmentStats.lost}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <form method="get" className="flex gap-3 items-end flex-wrap">
            <input type="hidden" name="tab" value="equipment" />
            <div>
              <label className="text-sm font-medium block mb-1">Filter Kondisi</label>
              <select name="equipmentCondition" defaultValue={equipmentCondition || ''} className="border rounded px-3 py-2 text-sm min-w-[200px]">
                <option value="">Semua Kondisi</option>
                <option value="good">Baik</option>
                <option value="needs_repair">Perlu Perbaikan</option>
                <option value="damaged">Rusak</option>
                <option value="lost">Hilang</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="showInactive"
                value="true"
                defaultChecked={showInactiveItems}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Tampilkan alat non-aktif</span>
            </label>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">
              Filter
            </button>
            {(equipmentCondition || showInactiveItems) && (
              <Link href="/admin/reports?tab=equipment" className="px-4 py-2 border rounded text-sm hover:bg-gray-50">
                Reset
              </Link>
            )}
          </form>

          {/* Daftar Alat Bermasalah - Hanya tampil jika tidak ada filter aktif */}
          {!equipmentCondition && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Alat Perlu Perhatian
                </CardTitle>
                <CardDescription>
                  Daftar alat dengan kondisi perlu perbaikan, rusak, atau hilang
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama Alat</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Kondisi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Deskripsi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problematicEquipment.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Tidak ada alat dengan kondisi bermasalah
                        </TableCell>
                      </TableRow>
                    ) : (
                      problematicEquipment.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.equipment_code}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.category}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getConditionColor(item.current_condition)}>
                              {getConditionLabel(item.current_condition)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {getKetersediaanLabel(item.ketersediaan)}
                              </Badge>
                              {item.status_tindakan !== 'normal' && (
                                <Badge variant="outline" className="text-xs">
                                  <Wrench className="h-3 w-3 mr-1" />
                                  {getStatusTindakanLabel(item.status_tindakan)}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.rooms?.name || item.current_location || '-'}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs truncate" title={item.description || ''}>
                            {item.description || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Semua Equipment (filtered) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Daftar Semua Alat
                {equipmentCondition && (
                  <Badge variant="outline" className="ml-2">
                    Filter: {getConditionLabel(equipmentCondition)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Alat</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Merk</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead>Ketersediaan</TableHead>
                    <TableHead>Lokasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {equipmentCondition 
                          ? `Tidak ada alat dengan kondisi "${getConditionLabel(equipmentCondition)}"`
                          : 'Tidak ada data alat'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    equipment?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.equipment_code}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.category}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.merk || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getConditionColor(item.current_condition)}>
                            {getConditionLabel(item.current_condition)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {getKetersediaanLabel(item.ketersediaan)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.rooms?.name || item.current_location || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Inventaris */}
        <TabsContent value="inventory" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-amber-50 border-amber-100">
              <CardContent className="pt-4">
                <p className="text-sm text-amber-600 font-medium">Total Inventaris</p>
                <p className="text-3xl font-bold text-amber-900">{inventoryStats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-100">
              <CardContent className="pt-4">
                <p className="text-sm text-green-600 font-medium">Kondisi Baik</p>
                <p className="text-3xl font-bold text-green-900">{inventoryStats.good}</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-100">
              <CardContent className="pt-4">
                <p className="text-sm text-yellow-600 font-medium">Perlu Perbaikan</p>
                <p className="text-3xl font-bold text-yellow-900">{inventoryStats.needsRepair}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-100">
              <CardContent className="pt-4">
                <p className="text-sm text-red-600 font-medium">Rusak</p>
                <p className="text-3xl font-bold text-red-900">{inventoryStats.damaged}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <form method="get" className="flex gap-3 items-end flex-wrap">
            <input type="hidden" name="tab" value="inventory" />
            <div>
              <label className="text-sm font-medium block mb-1">Filter Kondisi</label>
              <select name="inventoryCondition" defaultValue={inventoryCondition || ''} className="border rounded px-3 py-2 text-sm min-w-[200px]">
                <option value="">Semua Kondisi</option>
                <option value="good">Baik</option>
                <option value="needs_repair">Perlu Perbaikan</option>
                <option value="damaged">Rusak</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="showInactive"
                value="true"
                defaultChecked={showInactiveItems}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Tampilkan inventaris non-aktif</span>
            </label>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">
              Filter
            </button>
            {(inventoryCondition || showInactiveItems) && (
              <Link href="/admin/reports?tab=inventory" className="px-4 py-2 border rounded text-sm hover:bg-gray-50">
                Reset
              </Link>
            )}
          </form>

          {/* Daftar Inventaris Bermasalah - Hanya tampil jika tidak ada filter aktif */}
          {!inventoryCondition && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Inventaris Perlu Perhatian
                </CardTitle>
                <CardDescription>
                  Daftar inventaris dengan kondisi perlu perbaikan atau rusak
                </CardDescription>
              </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead>Ruangan</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {problematicInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Tidak ada inventaris dengan kondisi bermasalah
                      </TableCell>
                    </TableRow>
                  ) : (
                    problematicInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.inventory_code}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.category}</TableCell>
                        <TableCell className="text-sm font-medium">{item.quantity}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getConditionColor(item.condition)}>
                            {getConditionLabel(item.condition)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {item.rooms?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate" title={item.notes || ''}>
                          {item.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          )}

          {/* Semua Inventaris (filtered) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Boxes className="h-5 w-5 text-amber-600" />
                Daftar Semua Inventaris
                {inventoryCondition && (
                  <Badge variant="outline" className="ml-2">
                    Filter: {getConditionLabel(inventoryCondition)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead>Ruangan</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {inventoryCondition 
                          ? `Tidak ada inventaris dengan kondisi "${getConditionLabel(inventoryCondition)}"`
                          : 'Tidak ada data inventaris'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventory?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.inventory_code}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.category}</TableCell>
                        <TableCell className="text-sm font-medium">{item.quantity}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getConditionColor(item.condition)}>
                            {getConditionLabel(item.condition)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {item.rooms?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate" title={item.notes || ''}>
                          {item.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
