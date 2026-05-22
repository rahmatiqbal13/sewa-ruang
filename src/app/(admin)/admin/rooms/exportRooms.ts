'use client'

const ROOM_TYPE_LABELS: Record<string, string> = {
  classroom: 'Kelas',
  meeting_room: 'Ruang Rapat',
  laboratory: 'Laboratorium',
  auditorium: 'Auditorium',
  library: 'Perpustakaan',
  office: 'Kantor',
  other: 'Lainnya',
}

interface Building {
  id: string
  name: string
  code: string
}

interface Room {
  id: string
  name: string
  room_code: string
  building_id: string | null
  floor: number | null
  capacity: number | null
  room_type: string
  description: string | null
  is_active: boolean
  building?: Building
}

/**
 * Export rooms to Excel
 * @param selectedIds - Array of room IDs to export (if empty, exports all)
 * @param allRooms - All rooms data
 */
export async function exportRoomsToExcel(selectedIds: string[], allRooms: Room[]) {
  const XLSX = await import('xlsx')
  const roomsToExport = selectedIds.length > 0
    ? allRooms.filter(room => selectedIds.includes(room.id))
    : allRooms

  if (roomsToExport.length === 0) {
    alert('Tidak ada data yang dipilih untuk diekspor')
    return
  }

  const exportData = roomsToExport.map(room => ({
    'Kode Ruangan': room.room_code,
    'Nama Ruangan': room.name,
    'Gedung': room.building?.name || '-',
    'Kode Gedung': room.building?.code || '-',
    'Lantai': room.floor || '-',
    'Kapasitas': room.capacity || '-',
    'Tipe Ruangan': ROOM_TYPE_LABELS[room.room_type] || room.room_type,
    'Status': room.is_active ? 'Aktif' : 'Nonaktif',
    'Deskripsi': room.description || '-',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  ws['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 20 },
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
    { wch: 40 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Ruangan')

  const timestamp = new Date().toISOString().split('T')[0]
  const selectionInfo = selectedIds.length > 0 ? `-selected-${selectedIds.length}` : '-all'
  const filename = `Data-Ruangan${selectionInfo}-${timestamp}.xlsx`

  XLSX.writeFile(wb, filename)
}

/**
 * Download template Excel for rooms import
 */
export async function downloadRoomsTemplate() {
  const XLSX = await import('xlsx')
  const templateData = [
    {
      'Nama Ruangan': 'Lab Komputer A',
      'Kode Ruangan': 'LAB-A101',
      'Gedung': 'Gedung A',
      'Lantai': 1,
      'Kapasitas': 30,
      'Tipe': 'Laboratorium',
      'Deskripsi': 'Lab komputer dengan 30 unit PC'
    },
    {
      'Nama Ruangan': 'Ruang Rapat Utama',
      'Kode Ruangan': 'RPU-201',
      'Gedung': 'Gedung B',
      'Lantai': 2,
      'Kapasitas': 20,
      'Tipe': 'Meeting',
      'Deskripsi': 'Ruang rapat dengan proyektor'
    },
    {
      'Nama Ruangan': 'Kelas 3A',
      'Kode Ruangan': 'KLS-301',
      'Gedung': 'Gedung C',
      'Lantai': 3,
      'Kapasitas': 40,
      'Tipe': 'Kelas',
      'Deskripsi': 'Ruang kelas standar'
    }
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(templateData)
  
  // Add instruction sheet
  const instructions = [
    { 'Keterangan': 'Petunjuk Pengisian' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Kolom yang wajib diisi:' },
    { 'Keterangan': '- Nama Ruangan' },
    { 'Keterangan': '- Kode Ruangan (harus unik)' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Tipe Ruangan yang tersedia:' },
    { 'Keterangan': '- Kelas / Classroom' },
    { 'Keterangan': '- Rapat / Meeting' },
    { 'Keterangan': '- Lab / Laboratory' },
    { 'Keterangan': '- Auditorium' },
    { 'Keterangan': '- Perpustakaan / Library' },
    { 'Keterangan': '- Kantor / Office' },
    { 'Keterangan': '- Lainnya / Other' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Catatan:' },
    { 'Keterangan': '- Pastikan nama gedung sudah terdaftar di sistem' },
    { 'Keterangan': '- Kode ruangan harus unik' },
    { 'Keterangan': '- Lantai dan kapasitas harus berupa angka' },
  ]
  const wsInstructions = XLSX.utils.json_to_sheet(instructions)
  
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk')
  XLSX.utils.book_append_sheet(wb, ws, 'Data Ruangan')
  
  XLSX.writeFile(wb, 'Template-Import-Ruangan.xlsx')
}
