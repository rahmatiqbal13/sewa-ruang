'use client'

import * as XLSX from 'xlsx'

// Reuse the existing types and labels from exportEquipment.ts
const CATEGORY_LABELS: Record<string, string> = {
  elektronik: 'Elektronik',
  mebel: 'Mebel',
  transportasi: 'Transportasi',
  alat_tes_pengukuran: 'Alat Tes Pengukuran',
  alat_gym: 'Alat Gym/Fitness',
  perlengkapan: 'Perlengkapan',
  lainnya: 'Lainnya',
}

const CONDITION_LABELS: Record<string, string> = {
  good: 'Baik',
  needs_repair: 'Perlu Perbaikan',
  damaged: 'Rusak',
  lost: 'Hilang',
}

const KETERSEDIAAN_LABELS: Record<string, string> = {
  tersedia: 'Tersedia',
  digunakan: 'Digunakan',
  hilang: 'Hilang',
}

const STATUS_TINDAKAN_LABELS: Record<string, string> = {
  normal: 'Normal',
  perawatan: 'Perawatan',
  menunggu_part: 'Menunggu Part',
  afkir: 'Afkir',
}

const USER_CATEGORY_LABELS: Record<string, string> = {
  mahasiswa_s1: 'Mahasiswa S1',
  mahasiswa_s2: 'Mahasiswa S2/Pasca',
  dosen: 'Dosen',
  mou_unesa: 'MoU Unesa',
  umum: 'Umum',
}

interface Equipment {
  id: string
  name: string
  equipment_code: string | null
  description: string | null
  merk: string | null
  category: string | null
  current_condition: string
  ketersediaan: string
  status_tindakan: string
  is_active: boolean
  photo_url: string | null
  current_location: string | null
  equipment_rates: Array<{
    user_category: string
    rate_per_day: number
    rate_per_hour: number | null
    requires_supervision: boolean
  }>
}

/**
 * Export selected equipment to Excel
 * @param selectedIds - Array of equipment IDs to export (if empty, exports all)
 * @param allEquipment - All equipment data from the database
 */
export function exportEquipmentToExcel(selectedIds: string[], allEquipment: Equipment[]) {
  // Filter equipment to export
  const equipmentToExport = selectedIds.length > 0
    ? allEquipment.filter(item => selectedIds.includes(item.id))
    : allEquipment

  if (equipmentToExport.length === 0) {
    alert('Tidak ada data yang dipilih untuk diekspor')
    return
  }

  // Format data for export
  const exportData = equipmentToExport.map(item => {
    const rates = item.equipment_rates || []
    const rateMap: Record<string, { day: number; hour: number | null; supervision: boolean }> = {}
    
    rates.forEach(rate => {
      rateMap[rate.user_category] = {
        day: rate.rate_per_day,
        hour: rate.rate_per_hour,
        supervision: rate.requires_supervision
      }
    })

    return {
      'Kode Alat': item.equipment_code || '-',
      'Nama Alat': item.name,
      'Merk/Brand': item.merk || '-',
      'Kategori': CATEGORY_LABELS[item.category || ''] || item.category || '-',
      'Deskripsi': item.description || '-',
      'Kondisi': CONDITION_LABELS[item.current_condition] || item.current_condition,
      'Ketersediaan': KETERSEDIAAN_LABELS[item.ketersediaan] || item.ketersediaan,
      'Status Tindakan': STATUS_TINDAKAN_LABELS[item.status_tindakan] || item.status_tindakan,
      'Status Aktif': item.is_active ? 'Aktif' : 'Nonaktif',
      'Lokasi': item.current_location || '-',
      
      // Rates per category
      'Tarif S1 (Hari)': rateMap['mahasiswa_s1']?.day || '-',
      'Tarif S1 (Jam)': rateMap['mahasiswa_s1']?.hour || '-',
      'S1 Perlu Supervisi': rateMap['mahasiswa_s1']?.supervision ? 'Ya' : 'Tidak',
      
      'Tarif S2 (Hari)': rateMap['mahasiswa_s2']?.day || '-',
      'Tarif S2 (Jam)': rateMap['mahasiswa_s2']?.hour || '-',
      'S2 Perlu Supervisi': rateMap['mahasiswa_s2']?.supervision ? 'Ya' : 'Tidak',
      
      'Tarif Dosen (Hari)': rateMap['dosen']?.day || '-',
      'Tarif Dosen (Jam)': rateMap['dosen']?.hour || '-',
      'Dosen Perlu Supervisi': rateMap['dosen']?.supervision ? 'Ya' : 'Tidak',
      
      'Tarif MoU (Hari)': rateMap['mou_unesa']?.day || '-',
      'Tarif MoU (Jam)': rateMap['mou_unesa']?.hour || '-',
      'MoU Perlu Supervisi': rateMap['mou_unesa']?.supervision ? 'Ya' : 'Tidak',
      
      'Tarif Umum (Hari)': rateMap['umum']?.day || '-',
      'Tarif Umum (Jam)': rateMap['umum']?.hour || '-',
      'Umum Perlu Supervisi': rateMap['umum']?.supervision ? 'Ya' : 'Tidak',
    }
  })

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  // Set column widths
  const colWidths = [
    { wch: 12 },  // Kode Alat
    { wch: 30 },  // Nama Alat
    { wch: 15 },  // Merk
    { wch: 15 },  // Kategori
    { wch: 40 },  // Deskripsi
    { wch: 15 },  // Kondisi
    { wch: 12 },  // Ketersediaan
    { wch: 15 },  // Status Tindakan
    { wch: 12 },  // Status Aktif
    { wch: 25 },  // Lokasi
    { wch: 12 },  // Tarif S1
    { wch: 12 },  // Tarif S1 Jam
    { wch: 12 },  // S1 Supervisi
    { wch: 12 },  // Tarif S2
    { wch: 12 },  // Tarif S2 Jam
    { wch: 12 },  // S2 Supervisi
    { wch: 12 },  // Tarif Dosen
    { wch: 12 },  // Tarif Dosen Jam
    { wch: 12 },  // Dosen Supervisi
    { wch: 12 },  // Tarif MoU
    { wch: 12 },  // Tarif MoU Jam
    { wch: 12 },  // MoU Supervisi
    { wch: 12 },  // Tarif Umum
    { wch: 12 },  // Tarif Umum Jam
    { wch: 12 },  // Umum Supervisi
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Data Alat')

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0]
  const selectionInfo = selectedIds.length > 0 ? `-selected-${selectedIds.length}` : '-all'
  const filename = `Data-Alat${selectionInfo}-${timestamp}.xlsx`

  // Save file
  XLSX.writeFile(wb, filename)
}

/**
 * Download template Excel for equipment import
 */
export function downloadEquipmentTemplate() {
  const templateData = [
    {
      'Nama Alat': 'Proyektor Epson',
      'Merk/Brand': 'Epson',
      'Kategori': 'Elektronik',
      'Deskripsi': 'Proyektor LCD 3000 lumens',
      'Kondisi': 'Baik',
      'Ketersediaan': 'Tersedia',
      'Status Tindakan': 'Normal',
      'Sumber': 'Hibah',
      'Lokasi': 'Lab Multimedia',
      'Tarif S1 (Hari)': 50000,
      'Tarif S1 (Jam)': 10000,
      'Tarif S2 (Hari)': 75000,
      'Tarif S2 (Jam)': 15000,
      'Tarif Dosen (Hari)': 40000,
      'Tarif Dosen (Jam)': 8000,
      'Tarif MoU (Hari)': 60000,
      'Tarif MoU (Jam)': 12000,
      'Tarif Umum (Hari)': 100000,
      'Tarif Umum (Jam)': 20000,
    },
    {
      'Nama Alat': 'Grip Strength Tester',
      'Merk/Brand': 'Takei',
      'Kategori': 'Alat Tes Pengukuran',
      'Deskripsi': 'Alat ukur kekuatan genggaman',
      'Kondisi': 'Baik',
      'Ketersediaan': 'Tersedia',
      'Status Tindakan': 'Normal',
      'Sumber': 'Pembelian',
      'Lokasi': 'Lab Fisiologi',
      'Tarif S1 (Hari)': 25000,
      'Tarif S1 (Jam)': 5000,
      'Tarif S2 (Hari)': 35000,
      'Tarif S2 (Jam)': 7000,
      'Tarif Dosen (Hari)': 20000,
      'Tarif Dosen (Jam)': 4000,
      'Tarif MoU (Hari)': 30000,
      'Tarif MoU (Jam)': 6000,
      'Tarif Umum (Hari)': 50000,
      'Tarif Umum (Jam)': 10000,
    }
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(templateData)
  
  // Add instruction sheet
  const instructions = [
    { 'Keterangan': 'Petunjuk Pengisian' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Kolom yang wajib diisi:' },
    { 'Keterangan': '- Nama Alat' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Kolom TARIF (Harga Sewa):' },
    { 'Keterangan': '- Tarif S1 (Hari): Harga per hari untuk Mahasiswa S1' },
    { 'Keterangan': '- Tarif S1 (Jam): Harga per jam untuk Mahasiswa S1 (opsional)' },
    { 'Keterangan': '- Tarif S2 (Hari): Harga per hari untuk Mahasiswa S2/Pasca' },
    { 'Keterangan': '- Tarif S2 (Jam): Harga per jam untuk Mahasiswa S2 (opsional)' },
    { 'Keterangan': '- Tarif Dosen (Hari): Harga per hari untuk Dosen' },
    { 'Keterangan': '- Tarif Dosen (Jam): Harga per jam untuk Dosen (opsional)' },
    { 'Keterangan': '- Tarif MoU (Hari): Harga per hari untuk MoU Unesa' },
    { 'Keterangan': '- Tarif MoU (Jam): Harga per jam untuk MoU (opsional)' },
    { 'Keterangan': '- Tarif Umum (Hari): Harga per hari untuk Umum' },
    { 'Keterangan': '- Tarif Umum (Jam): Harga per jam untuk Umum (opsional)' },
    { 'Keterangan': '' },
    { 'Keterangan': 'CATATAN TARIF:' },
    { 'Keterangan': '- Isi dengan angka saja (tanpa Rp atau titik)' },
    { 'Keterangan': '- Contoh: 50000 (bukan Rp 50.000)' },
    { 'Keterangan': '- Kolom tarif jam bersifat opsional (boleh kosong)' },
    { 'Keterangan': '- Jika tarif 0 atau kosong, kategori tidak akan disimpan' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Kategori yang tersedia:' },
    { 'Keterangan': '- Elektronik' },
    { 'Keterangan': '- Mebel / Furniture' },
    { 'Keterangan': '- Transportasi' },
    { 'Keterangan': '- Alat Tes Pengukuran / Testing Tool' },
    { 'Keterangan': '- Alat Gym / Fitness' },
    { 'Keterangan': '- Perlengkapan / Equipment' },
    { 'Keterangan': '- Lainnya / Other' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Kondisi yang tersedia:' },
    { 'Keterangan': '- Baik / Good' },
    { 'Keterangan': '- Perlu Perbaikan / Needs Repair' },
    { 'Keterangan': '- Rusak / Damaged' },
    { 'Keterangan': '- Hilang / Lost' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Ketersediaan yang tersedia:' },
    { 'Keterangan': '- Tersedia / Available' },
    { 'Keterangan': '- Digunakan / In Use' },
    { 'Keterangan': '- Hilang / Lost' },
    { 'Keterangan': '' },
    { 'Keterangan': 'Status Tindakan yang tersedia:' },
    { 'Keterangan': '- Normal' },
    { 'Keterangan': '- Perawatan / Maintenance' },
    { 'Keterangan': '- Menunggu Part / Waiting Part' },
    { 'Keterangan': '- Afkir / Retired' },
  ]
  const wsInstructions = XLSX.utils.json_to_sheet(instructions)
  
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk')
  XLSX.utils.book_append_sheet(wb, ws, 'Data Alat')
  
  XLSX.writeFile(wb, 'Template-Import-Alat.xlsx')
}
