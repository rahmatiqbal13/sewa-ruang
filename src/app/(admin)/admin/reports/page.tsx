import { createAdminDbClient } from '@/lib/supabase/server'
import { formatDateTime, formatRupiah, cn } from '@/lib/utils'
import { Package, Boxes, Calendar, AlertTriangle, Wrench, Building } from 'lucide-react'
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
  current_location: string | null
  description: string | null
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

interface ReportBooking {
  id: string
  reference_no: string
  status: string
  created_at: string
  total_amount: number
  users: { name: string; institution: string } | null
  booking_items: Array<{
    item_type: string
    rooms: { name: string } | null
    equipment: { name: string } | null
  }> | null
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
    lost: 'bg-muted text-foreground border-border'
  }
  return colors[condition] || 'bg-muted text-foreground'
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
  const sb = createAdminDbClient()

  const fromDate = from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const toDate = to ?? new Date().toISOString().split('T')[0]

  // Fetch booking data
  const [{ data: bookingsRaw }, { data: paymentsRaw }] = await Promise.all([
    sb
      .from('bookings')
      .select('*, users!user_id(name, institution), booking_items(item_type, rooms:room_id(name), equipment:equipment_id(name))')
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

  const bookings = bookingsRaw as ReportBooking[] | null
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

  const tabDefs = [
    { value: 'bookings',   label: 'Peminjaman', icon: Calendar },
    { value: 'equipment',  label: 'Alat',       icon: Package },
    { value: 'inventory',  label: 'Inventaris', icon: Boxes },
  ]

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan</h1>
          <p className="page-subtitle">Rekap data peminjaman, alat, dan inventaris</p>
        </div>
      </div>

      {/* Tab pills (server-side routing) */}
      <div className="flex gap-1.5">
        {tabDefs.map(t => (
          <Link
            key={t.value}
            href={`/admin/reports?tab=${t.value}`}
            className={cn('filter-pill', tab === t.value ? 'filter-pill-active' : 'filter-pill-inactive')}
          >
            <t.icon className="h-3 w-3" />
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── Peminjaman tab ── */}
      {tab === 'bookings' && (
        <div className="space-y-5">
          <form method="get" className="flex gap-3 items-end flex-wrap bg-card border border-border rounded-[14px] p-4">
            <input type="hidden" name="tab" value="bookings" />
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Dari</label>
              <input type="date" name="from" defaultValue={fromDate} className="border border-border rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Sampai</label>
              <input type="date" name="to" defaultValue={toDate} className="border border-border rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <button type="submit" className="h-9 px-4 bg-primary text-primary-foreground rounded-[10px] text-sm font-medium hover:bg-primary/90 transition-colors">
              Filter
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="mini-stat border-t-indigo-400">
              <p className="mini-stat-label">Total Pengajuan</p>
              <p className="mini-stat-value">{bookings?.length ?? 0}</p>
            </div>
            <div className="mini-stat border-t-emerald-400">
              <p className="mini-stat-label">Total Pendapatan</p>
              <p className="text-lg font-bold text-emerald-600 font-mono">{formatRupiah(totalRevenue)}</p>
            </div>
            <div className="mini-stat border-t-blue-400">
              <p className="mini-stat-label">Breakdown Metode</p>
              {Object.entries(byMethod).map(([method, amount]) => (
                <p key={method} className="text-xs text-muted-foreground">
                  {method.replace(/_/g, ' ')}: <span className="font-semibold">{formatRupiah(amount)}</span>
                </p>
              ))}
              {Object.keys(byMethod).length === 0 && <p className="text-xs text-muted-foreground/70">-</p>}
            </div>
          </div>

          <div className="bg-card rounded-[14px] border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60">
              <p className="text-sm font-semibold text-foreground">Detail Pengajuan</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
              <thead>
                <tr>
                  <th scope="col">Referensi</th>
                  <th scope="col">Peminjam</th>
                  <th scope="col">Instansi</th>
                  <th scope="col">Ruang/Alat</th>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Total</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
                <tbody>
                  {bookings?.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted-foreground/70 py-10 text-sm">Tidak ada data pada periode ini</td></tr>
                  )}
                  {bookings?.map((b) => {
                    const firstItem = b.booking_items?.[0]
                    const assetName = firstItem?.item_type === 'room' ? firstItem?.rooms?.name : firstItem?.equipment?.name
                    return (
                      <tr key={b.id}>
                        <td className="font-mono text-xs text-indigo-700">{b.reference_no}</td>
                        <td className="text-sm">{b.users?.name}</td>
                        <td className="text-xs text-muted-foreground">{b.users?.institution}</td>
                        <td className="text-sm">{assetName}</td>
                        <td className="text-xs text-muted-foreground">{formatDateTime(b.created_at)}</td>
                        <td className="text-sm font-semibold font-mono">{formatRupiah(b.total_amount)}</td>
                        <td className="capitalize text-xs text-muted-foreground">{b.status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Alat tab ── */}
      {tab === 'equipment' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total Alat',      value: equipmentStats.total,       accent: 'border-t-blue-400' },
              { label: 'Baik',            value: equipmentStats.good,        accent: 'border-t-emerald-400' },
              { label: 'Perlu Perbaikan', value: equipmentStats.needsRepair, accent: 'border-t-yellow-400' },
              { label: 'Rusak',           value: equipmentStats.damaged,     accent: 'border-t-red-400' },
              { label: 'Hilang',          value: equipmentStats.lost,        accent: 'border-t-slate-400' },
            ].map(s => (
              <div key={s.label} className={cn('mini-stat', s.accent)}>
                <p className="mini-stat-label">{s.label}</p>
                <p className="mini-stat-value">{s.value}</p>
              </div>
            ))}
          </div>

          <form method="get" className="flex gap-3 items-end flex-wrap bg-card border border-border rounded-[14px] p-4">
            <input type="hidden" name="tab" value="equipment" />
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Filter Kondisi</label>
              <select name="equipmentCondition" defaultValue={equipmentCondition || ''} className="border border-border rounded-[10px] px-3 py-2 text-sm min-w-[180px] focus:outline-none">
                <option value="">Semua Kondisi</option>
                <option value="good">Baik</option>
                <option value="needs_repair">Perlu Perbaikan</option>
                <option value="damaged">Rusak</option>
                <option value="lost">Hilang</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground self-end pb-0.5">
              <input type="checkbox" name="showInactive" value="true" defaultChecked={showInactiveItems} className="w-4 h-4 rounded border-border" />
              Tampilkan non-aktif
            </label>
            <button type="submit" className="h-9 px-4 bg-primary text-primary-foreground rounded-[10px] text-sm font-medium hover:bg-primary/90 transition-colors self-end">
              Filter
            </button>
            {(equipmentCondition || showInactiveItems) && (
              <Link href="/admin/reports?tab=equipment" className="h-9 px-4 border border-border rounded-[10px] text-sm hover:bg-muted transition-colors flex items-center self-end">
                Reset
              </Link>
            )}
          </form>

          {!equipmentCondition && problematicEquipment.length > 0 && (
            <div className="bg-card rounded-[14px] border border-amber-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-semibold text-amber-800">Alat Perlu Perhatian ({problematicEquipment.length})</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead><tr><th scope="col">Kode</th><th scope="col">Nama Alat</th><th scope="col">Kategori</th><th scope="col">Kondisi</th><th scope="col">Status</th><th scope="col">Lokasi</th><th scope="col">Deskripsi</th></tr></thead>
                  <tbody>
                    {problematicEquipment.map((item) => (
                      <tr key={item.id}>
                        <td className="font-mono text-xs text-indigo-700">{item.equipment_code}</td>
                        <td className="text-sm font-medium">{item.name}</td>
                        <td className="text-xs text-muted-foreground">{item.category}</td>
                        <td><span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', getConditionColor(item.current_condition))}>{getConditionLabel(item.current_condition)}</span></td>
                        <td>
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full block w-fit">{getKetersediaanLabel(item.ketersediaan)}</span>
                            {item.status_tindakan !== 'normal' && (
                              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                <Wrench className="h-2.5 w-2.5" />{getStatusTindakanLabel(item.status_tindakan)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-xs text-muted-foreground">{item.rooms?.name || item.current_location || '-'}</td>
                        <td className="text-xs text-muted-foreground max-w-xs truncate" title={item.description || ''}>{item.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-card rounded-[14px] border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-semibold text-foreground">
                Daftar Semua Alat
                {equipmentCondition && <span className="ml-2 text-xs text-muted-foreground/70">— filter: {getConditionLabel(equipmentCondition)}</span>}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead><tr><th scope="col">Kode</th><th scope="col">Nama Alat</th><th scope="col">Kategori</th><th scope="col">Merk</th><th scope="col">Kondisi</th><th scope="col">Ketersediaan</th><th scope="col">Lokasi</th></tr></thead>
                <tbody>
                  {equipment?.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted-foreground/70 py-10 text-sm">
                      {equipmentCondition ? `Tidak ada alat dengan kondisi "${getConditionLabel(equipmentCondition)}"` : 'Tidak ada data alat'}
                    </td></tr>
                  )}
                  {equipment?.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono text-xs text-indigo-700">{item.equipment_code}</td>
                      <td className="text-sm font-medium">{item.name}</td>
                      <td className="text-xs text-muted-foreground">{item.category}</td>
                      <td className="text-xs text-muted-foreground">{item.merk || '-'}</td>
                      <td><span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', getConditionColor(item.current_condition))}>{getConditionLabel(item.current_condition)}</span></td>
                      <td><span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{getKetersediaanLabel(item.ketersediaan)}</span></td>
                      <td className="text-xs text-muted-foreground">{item.rooms?.name || item.current_location || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Inventaris tab ── */}
      {tab === 'inventory' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Inventaris', value: inventoryStats.total,       accent: 'border-t-amber-400' },
              { label: 'Baik',             value: inventoryStats.good,        accent: 'border-t-emerald-400' },
              { label: 'Perlu Perbaikan',  value: inventoryStats.needsRepair, accent: 'border-t-yellow-400' },
              { label: 'Rusak',            value: inventoryStats.damaged,     accent: 'border-t-red-400' },
            ].map(s => (
              <div key={s.label} className={cn('mini-stat', s.accent)}>
                <p className="mini-stat-label">{s.label}</p>
                <p className="mini-stat-value">{s.value}</p>
              </div>
            ))}
          </div>

          <form method="get" className="flex gap-3 items-end flex-wrap bg-card border border-border rounded-[14px] p-4">
            <input type="hidden" name="tab" value="inventory" />
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Filter Kondisi</label>
              <select name="inventoryCondition" defaultValue={inventoryCondition || ''} className="border border-border rounded-[10px] px-3 py-2 text-sm min-w-[180px] focus:outline-none">
                <option value="">Semua Kondisi</option>
                <option value="good">Baik</option>
                <option value="needs_repair">Perlu Perbaikan</option>
                <option value="damaged">Rusak</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground self-end pb-0.5">
              <input type="checkbox" name="showInactive" value="true" defaultChecked={showInactiveItems} className="w-4 h-4 rounded border-border" />
              Tampilkan non-aktif
            </label>
            <button type="submit" className="h-9 px-4 bg-primary text-primary-foreground rounded-[10px] text-sm font-medium hover:bg-primary/90 transition-colors self-end">
              Filter
            </button>
            {(inventoryCondition || showInactiveItems) && (
              <Link href="/admin/reports?tab=inventory" className="h-9 px-4 border border-border rounded-[10px] text-sm hover:bg-muted transition-colors flex items-center self-end">
                Reset
              </Link>
            )}
          </form>

          {!inventoryCondition && problematicInventory.length > 0 && (
            <div className="bg-card rounded-[14px] border border-amber-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-semibold text-amber-800">Inventaris Perlu Perhatian ({problematicInventory.length})</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead><tr><th scope="col">Kode</th><th scope="col">Nama Barang</th><th scope="col">Kategori</th><th scope="col">Jumlah</th><th scope="col">Kondisi</th><th scope="col">Ruangan</th><th scope="col">Catatan</th></tr></thead>
                  <tbody>
                    {problematicInventory.map((item) => (
                      <tr key={item.id}>
                        <td className="font-mono text-xs text-indigo-700">{item.inventory_code}</td>
                        <td className="text-sm font-medium">{item.name}</td>
                        <td className="text-xs text-muted-foreground">{item.category}</td>
                        <td className="text-sm font-semibold font-mono">{item.quantity}</td>
                        <td><span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', getConditionColor(item.condition))}>{getConditionLabel(item.condition)}</span></td>
                        <td className="text-xs text-muted-foreground flex items-center gap-1"><Building className="h-3 w-3" />{item.rooms?.name || '-'}</td>
                        <td className="text-xs text-muted-foreground max-w-xs truncate" title={item.notes || ''}>{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-card rounded-[14px] border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
              <Boxes className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold text-foreground">
                Daftar Semua Inventaris
                {inventoryCondition && <span className="ml-2 text-xs text-muted-foreground/70">— filter: {getConditionLabel(inventoryCondition)}</span>}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead><tr><th scope="col">Kode</th><th scope="col">Nama Barang</th><th scope="col">Kategori</th><th scope="col">Jumlah</th><th scope="col">Kondisi</th><th scope="col">Ruangan</th><th scope="col">Catatan</th></tr></thead>
                <tbody>
                  {inventory?.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted-foreground/70 py-10 text-sm">
                      {inventoryCondition ? `Tidak ada inventaris dengan kondisi "${getConditionLabel(inventoryCondition)}"` : 'Tidak ada data inventaris'}
                    </td></tr>
                  )}
                  {inventory?.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono text-xs text-indigo-700">{item.inventory_code}</td>
                      <td className="text-sm font-medium">{item.name}</td>
                      <td className="text-xs text-muted-foreground">{item.category}</td>
                      <td className="text-sm font-semibold font-mono">{item.quantity}</td>
                      <td><span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', getConditionColor(item.condition))}>{getConditionLabel(item.condition)}</span></td>
                      <td className="text-xs text-muted-foreground flex items-center gap-1"><Building className="h-3 w-3" />{item.rooms?.name || '-'}</td>
                      <td className="text-xs text-muted-foreground max-w-xs truncate" title={item.notes || ''}>{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
