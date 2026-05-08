'use server'

import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export interface ImportResult {
  success: boolean
  message: string
  totalRows: number
  successCount: number
  errorCount: number
  importedIds: string[]  // IDs of successfully imported equipment
  errors: Array<{
    row: number
    message: string
    data?: Record<string, unknown>
  }>
}

/**
 * Import equipment from Excel file
 */
export async function importEquipmentFromExcel(formData: FormData): Promise<ImportResult> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return {
        success: false,
        message: 'File tidak ditemukan',
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
        errors: [{ row: 0, message: 'File tidak ditemukan' }]
      }
    }

    // Read Excel file
    const bytes = await file.arrayBuffer()
    const workbook = XLSX.read(bytes, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

    if (data.length < 2) {
      return {
        success: false,
        message: 'File Excel kosong atau tidak memiliki data',
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
        errors: [{ row: 0, message: 'File Excel kosong' }]
      }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Get current user for created_by
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        success: false,
        message: 'Unauthorized',
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
        errors: [{ row: 0, message: 'Unauthorized' }]
      }
    }

    // Get max equipment code
    const { data: maxCodeData } = await sb
      .from('equipment')
      .select('equipment_code')
      .not('equipment_code', 'is', null)
      .ilike('equipment_code', 'ALT-%')
      .order('equipment_code', { ascending: false })
      .limit(1)
      .single()

    let lastNum = 0
    if (maxCodeData?.equipment_code) {
      const match = maxCodeData.equipment_code.match(/ALT-(\d+)/)
      if (match) {
        lastNum = parseInt(match[1], 10)
      }
    }

    // Get existing names to check duplicates
    const { data: existingNamesData } = await sb
      .from('equipment')
      .select('name')

    const existingNames = existingNamesData?.map((e: { name: string }) => e.name.toLowerCase().trim()) ?? []

    const errors: Array<{ row: number; message: string; data?: Record<string, unknown> }> = []
    const importedIds: string[] = []
    let successCount = 0
    const headerRow = data[0]
    const rows = data.slice(1)

    // Map column indices
    const getColumnIndex = (name: string) => headerRow.findIndex(h => h?.toString().toLowerCase().includes(name.toLowerCase()))

    const colIndices = {
      name: getColumnIndex('nama') !== -1 ? getColumnIndex('nama') : getColumnIndex('name'),
      merk: getColumnIndex('merk') !== -1 ? getColumnIndex('merk') : getColumnIndex('brand'),
      category: getColumnIndex('kategori') !== -1 ? getColumnIndex('kategori') : getColumnIndex('category'),
      description: getColumnIndex('deskripsi') !== -1 ? getColumnIndex('deskripsi') : getColumnIndex('description'),
      current_condition: getColumnIndex('kondisi') !== -1 ? getColumnIndex('kondisi') : getColumnIndex('condition'),
      ketersediaan: getColumnIndex('ketersediaan') !== -1 ? getColumnIndex('ketersediaan') : getColumnIndex('availability'),
      status_tindakan: getColumnIndex('status tindakan') !== -1 ? getColumnIndex('status tindakan') : getColumnIndex('action status'),
      sumber: getColumnIndex('sumber') !== -1 ? getColumnIndex('sumber') : getColumnIndex('source'),
      current_location: getColumnIndex('lokasi') !== -1 ? getColumnIndex('lokasi') : getColumnIndex('location'),
      // Rate columns
      tarif_s1_day: getColumnIndex('tarif s1') !== -1 ? getColumnIndex('tarif s1') : getColumnIndex('s1 day'),
      tarif_s1_hour: getColumnIndex('tarif s1 jam') !== -1 ? getColumnIndex('tarif s1 jam') : getColumnIndex('s1 hour'),
      tarif_s2_day: getColumnIndex('tarif s2') !== -1 ? getColumnIndex('tarif s2') : getColumnIndex('s2 day'),
      tarif_s2_hour: getColumnIndex('tarif s2 jam') !== -1 ? getColumnIndex('tarif s2 jam') : getColumnIndex('s2 hour'),
      tarif_dosen_day: getColumnIndex('tarif dosen') !== -1 ? getColumnIndex('tarif dosen') : getColumnIndex('dosen day'),
      tarif_dosen_hour: getColumnIndex('tarif dosen jam') !== -1 ? getColumnIndex('tarif dosen jam') : getColumnIndex('dosen hour'),
      tarif_mou_day: getColumnIndex('tarif mou') !== -1 ? getColumnIndex('tarif mou') : getColumnIndex('mou day'),
      tarif_mou_hour: getColumnIndex('tarif mou jam') !== -1 ? getColumnIndex('tarif mou jam') : getColumnIndex('mou hour'),
      tarif_umum_day: getColumnIndex('tarif umum') !== -1 ? getColumnIndex('tarif umum') : getColumnIndex('umum day'),
      tarif_umum_hour: getColumnIndex('tarif umum jam') !== -1 ? getColumnIndex('tarif umum jam') : getColumnIndex('umum hour'),
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +2 because of header and 1-based indexing

      try {
        // Skip empty rows
        if (!row || row.every(cell => !cell)) continue

        // Get values
        const name = row[colIndices.name]?.toString().trim()
        if (!name) {
          errors.push({ row: rowNum, message: 'Nama alat wajib diisi', data: { row } })
          continue
        }

        // Check for duplicate names and generate unique name
        let finalName = name
        const normalizedBase = name.toLowerCase().trim()
        const baseExistingNames = existingNames.filter(n => n === normalizedBase || n.startsWith(normalizedBase + ' ('))
        
        if (baseExistingNames.length > 0) {
          let counter = 2
          let newName = `${name} (${counter})`
          while (existingNames.includes(newName.toLowerCase())) {
            counter++
            newName = `${name} (${counter})`
          }
          finalName = newName
        }

        // Generate equipment code
        lastNum++
        const equipmentCode = `ALT-${String(lastNum).padStart(4, '0')}`

        // Map category
        const categoryInput = row[colIndices.category]?.toString().toLowerCase().trim()
        const categoryMap: Record<string, string> = {
          'elektronik': 'elektronik',
          'mebel': 'mebel',
          'furniture': 'mebel',
          'transportasi': 'transportasi',
          'transportation': 'transportasi',
          'alat tes': 'alat_tes_pengukuran',
          'alat tes pengukuran': 'alat_tes_pengukuran',
          'testing tool': 'alat_tes_pengukuran',
          'alat gym': 'alat_gym',
          'gym': 'alat_gym',
          'fitness': 'alat_gym',
          'perlengkapan': 'perlengkapan',
          'equipment': 'perlengkapan',
          'lainnya': 'lainnya',
          'other': 'lainnya',
        }
        const category = categoryMap[categoryInput] || 'lainnya'

        // Map condition
        const conditionInput = row[colIndices.current_condition]?.toString().toLowerCase().trim()
        const conditionMap: Record<string, string> = {
          'baik': 'good',
          'good': 'good',
          'perlu perbaikan': 'needs_repair',
          'needs repair': 'needs_repair',
          'rusak': 'damaged',
          'damaged': 'damaged',
          'hilang': 'lost',
          'lost': 'lost',
        }
        const currentCondition = conditionMap[conditionInput] || 'good'

        // Map ketersediaan
        const ketersediaanInput = row[colIndices.ketersediaan]?.toString().toLowerCase().trim()
        const ketersediaanMap: Record<string, string> = {
          'tersedia': 'tersedia',
          'available': 'tersedia',
          'digunakan': 'digunakan',
          'used': 'digunakan',
          'in use': 'digunakan',
          'hilang': 'hilang',
          'lost': 'hilang',
        }
        const ketersediaan = ketersediaanMap[ketersediaanInput] || 'tersedia'

        // Map status tindakan
        const statusInput = row[colIndices.status_tindakan]?.toString().toLowerCase().trim()
        const statusMap: Record<string, string> = {
          'normal': 'normal',
          'perawatan': 'perawatan',
          'maintenance': 'perawatan',
          'menunggu part': 'menunggu_part',
          'waiting part': 'menunggu_part',
          'afkir': 'afkir',
          'retired': 'afkir',
        }
        const statusTindakan = statusMap[statusInput] || 'normal'

        // Insert equipment and get the ID
        const { data: insertedData, error } = await sb
          .from('equipment')
          .insert({
            name: finalName,
            equipment_code: equipmentCode,
            merk: row[colIndices.merk]?.toString().trim() || null,
            category: category,
            description: row[colIndices.description]?.toString().trim() || null,
            current_condition: currentCondition,
            ketersediaan: ketersediaan,
            status_tindakan: statusTindakan,
            sumber: row[colIndices.sumber]?.toString().trim() || null,
            current_location: row[colIndices.current_location]?.toString().trim() || null,
            is_active: true,
            created_by: user.id,
          })
          .select('id')
          .single()

        if (error) {
          errors.push({ row: rowNum, message: error.message, data: { row } })
        } else {
          successCount++
          importedIds.push(insertedData.id)
          // Add to existing names to prevent duplicates within the same import
          existingNames.push(finalName.toLowerCase())
          
          // Insert rates for each category
          const rateCategories = [
            { 
              category: 'mahasiswa_s1', 
              day: colIndices.tarif_s1_day, 
              hour: colIndices.tarif_s1_hour 
            },
            { 
              category: 'mahasiswa_s2', 
              day: colIndices.tarif_s2_day, 
              hour: colIndices.tarif_s2_hour 
            },
            { 
              category: 'dosen', 
              day: colIndices.tarif_dosen_day, 
              hour: colIndices.tarif_dosen_hour 
            },
            { 
              category: 'mou_unesa', 
              day: colIndices.tarif_mou_day, 
              hour: colIndices.tarif_mou_hour 
            },
            { 
              category: 'umum', 
              day: colIndices.tarif_umum_day, 
              hour: colIndices.tarif_umum_hour 
            },
          ]
          
          for (const rateCat of rateCategories) {
            const dayValue = row[rateCat.day]?.toString().trim()
            const hourValue = row[rateCat.hour]?.toString().trim()
            
            if (dayValue) {
              const ratePerDay = parseFloat(dayValue.replace(/[^0-9.]/g, ''))
              if (!isNaN(ratePerDay) && ratePerDay > 0) {
                const ratePerHour = hourValue ? parseFloat(hourValue.replace(/[^0-9.]/g, '')) : null
                
                await sb.from('equipment_rates').insert({
                  equipment_id: insertedData.id,
                  user_category: rateCat.category,
                  rate_per_day: ratePerDay,
                  rate_per_hour: (!isNaN(ratePerHour!) && ratePerHour! > 0) ? ratePerHour : null,
                  requires_supervision: false,
                })
              }
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({ row: rowNum, message: errorMessage, data: { row } })
      }
    }

    return {
      success: errors.length === 0,
      message: errors.length === 0 
        ? `Berhasil mengimport ${successCount} alat` 
        : `Berhasil mengimport ${successCount} alat, ${errors.length} gagal`,
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
      importedIds,
      errors
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Terjadi kesalahan: ${errorMessage}`,
      totalRows: 0,
      successCount: 0,
      errorCount: 1,
      importedIds: [],
      errors: [{ row: 0, message: errorMessage }]
    }
  }
}

/**
 * Undo import by deleting equipment by IDs
 */
export async function undoImportEquipment(equipmentIds: string[]) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Delete equipment_rates first (foreign key constraint)
    await sb.from('equipment_rates').delete().in('equipment_id', equipmentIds)

    // Delete equipment
    const { error } = await sb.from('equipment').delete().in('id', equipmentIds)

    if (error) {
      return { success: false, message: error.message }
    }

    return { 
      success: true, 
      message: `Berhasil menghapus ${equipmentIds.length} alat yang di-import` 
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, message: `Terjadi kesalahan: ${errorMessage}` }
  }
}

/**
 * Delete ALL equipment (hard delete)
 * WARNING: This will permanently delete all equipment data!
 */
export async function deleteAllEquipment() {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Get count first for confirmation message
    const { count } = await sb
      .from('equipment')
      .select('*', { count: 'exact', head: true })

    // Delete all equipment_rates first (foreign key constraint)
    await sb.from('equipment_rates').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Delete all equipment
    const { error } = await sb.from('equipment').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      return { 
        success: false, 
        message: `Gagal menghapus data: ${error.message}`,
        deletedCount: 0 
      }
    }

    return { 
      success: true, 
      message: `Berhasil menghapus ${count || 0} alat dari database`,
      deletedCount: count || 0 
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { 
      success: false, 
      message: `Terjadi kesalahan: ${errorMessage}`,
      deletedCount: 0 
    }
  }
}
