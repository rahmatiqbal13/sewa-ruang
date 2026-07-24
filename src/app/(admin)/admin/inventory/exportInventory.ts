'use client'

const CONDITION_LABELS: Record<string, string> = {
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Kurang',
  damaged: 'Rusak',
}

interface InventoryItem {
  id: string
  item_name?: string
  name?: string
  merk?: string | null
  quantity: number
  condition: string
  inventory_code?: string | null
  description?: string | null
  notes?: string | null
  is_active?: boolean
  room_name?: string | null
  building_name?: string | null
}

interface Room {
  id: string
  name: string
  room_code: string
}

/**
 * Export inventory to Excel
 * @param selectedIds - Array of inventory IDs to export (if empty, exports all)
 * @param allInventory - All inventory data
 * @param room - Room info (optional)
 */
export async function exportInventoryToExcel(
  selectedIds: string[],
  allInventory: InventoryItem[],
  room?: Room
) {
  const XLSX = await import('xlsx')
  const inventoryToExport = selectedIds.length > 0
    ? allInventory.filter(item => selectedIds.includes(item.id))
    : allInventory

  if (inventoryToExport.length === 0) {
    alert('Tidak ada data yang dipilih untuk diekspor')
    return
  }

  const hasRoom = inventoryToExport.some(i => i.room_name)

  const exportData = inventoryToExport.map(item => {
    const row: Record<string, string | number> = {}
    if (hasRoom) {
      row['Gedung'] = item.building_name || '-'
      row['Ruangan'] = item.room_name || '-'
    }
    row['Kode Inventaris'] = item.inventory_code || '-'
    row['Nama Barang'] = item.item_name || item.name || ''
    row['Merk / Tipe'] = item.merk || '-'
    row['Jumlah'] = item.quantity
    row['Kondisi'] = CONDITION_LABELS[item.condition] || item.condition
    row['Keterangan'] = item.description || item.notes || '-'
    return row
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  const cols = []
  if (hasRoom) {
    cols.push({ wch: 30 }, { wch: 30 })
  }
  cols.push({ wch: 14 }, { wch: 35 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 40 })
  ws['!cols'] = cols

  XLSX.utils.book_append_sheet(wb, ws, 'Inventaris')

  const timestamp = new Date().toISOString().split('T')[0]
  const roomName = room ? `-${room.room_code}` : ''
  const selectionInfo = selectedIds.length > 0 ? `-selected-${selectedIds.length}` : '-all'
  const filename = `Inventaris${roomName}${selectionInfo}-${timestamp}.xlsx`

  XLSX.writeFile(wb, filename)
}

/**
 * Download template Excel for inventory import
 */
export async function downloadInventoryTemplate() {
  const XLSX = await import('xlsx')
  const templateData = [
    {
      'Nama Barang': 'Meja Kerja',
      'Merk': 'Olympic',
      'Jumlah': 10,
      'Kondisi': 'Baik',
      'Keterangan': 'Meja kayu ukuran 120x60cm'
    },
    {
      'Nama Barang': 'Kursi Putar',
      'Merk': 'Ergotec',
      'Jumlah': 10,
      'Kondisi': 'Baik',
      'Keterangan': 'Kursi ergonomis'
    },
    {
      'Nama Barang': 'Proyektor',
      'Merk': 'Epson EB-X51',
      'Jumlah': 2,
      'Kondisi': 'Baik',
      'Keterangan': ''
    }
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(templateData)
  
  const instructions = [
    { 'Keterangan': 'Petunjuk Pengisian' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Kolom yang wajib diisi:' },
    { 'Keterangan': '- Nama Barang' },
    { 'Keterangan': '- Jumlah (angka positif)' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Kolom opsional:' },
    { 'Keterangan': '- Merk (merk/tipe barang, contoh: Samsung, Epson EB-X51)' },
    { 'Keterangan': '- Keterangan (catatan tambahan)' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Kondisi: Baik, Cukup, Kurang, Rusak' },
  ]
  const wsInstructions = XLSX.utils.json_to_sheet(instructions)
  
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk')
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  
  XLSX.writeFile(wb, 'Template-Import-Inventaris.xlsx')
}
