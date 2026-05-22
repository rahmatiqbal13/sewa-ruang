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
  quantity: number
  condition: string
  description?: string | null
  notes?: string | null
  is_active?: boolean
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

  const exportData = inventoryToExport.map(item => ({
    'Nama Barang': item.item_name || item.name || '',
    'Jumlah': item.quantity,
    'Kondisi': CONDITION_LABELS[item.condition] || item.condition,
    'Status': item.is_active !== false ? 'Aktif' : 'Nonaktif',
    'Keterangan': item.description || item.notes || '-',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  ws['!cols'] = [
    { wch: 30 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 40 },
  ]

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
      'Jumlah': 10,
      'Kondisi': 'Baik',
      'Keterangan': 'Meja kayu ukuran 120x60cm'
    },
    {
      'Nama Barang': 'Kursi Putar',
      'Jumlah': 10,
      'Kondisi': 'Baik',
      'Keterangan': 'Kursi ergonomis'
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
    { 'Keterangan': 'Kondisi: Baik, Cukup, Kurang, Rusak' },
  ]
  const wsInstructions = XLSX.utils.json_to_sheet(instructions)
  
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk')
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  
  XLSX.writeFile(wb, 'Template-Import-Inventaris.xlsx')
}
