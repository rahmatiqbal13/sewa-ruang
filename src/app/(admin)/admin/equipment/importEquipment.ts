'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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
        importedIds: [],
        errors: [{ row: 0, message: 'File tidak ditemukan' }]
      }
    }

    // Read Excel file
    const bytes = await file.arrayBuffer()
    const workbook = XLSX.read(bytes, { type: 'array' })
    
    // Try to find the correct sheet - look for "Data Alat" first, then auto-detect
    let worksheet = null
    let sheetName = ''
    let data: string[][] = []
    
    // First, try to find sheet named "Data Alat"
    const dataAlatSheet = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('data') || name.toLowerCase().includes('alat')
    )
    
    if (dataAlatSheet) {
      sheetName = dataAlatSheet
      worksheet = workbook.Sheets[dataAlatSheet]
      data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
      console.log(`Import Equipment - Using sheet: ${sheetName}`)
    }
    
    // If not found or empty, try auto-detect by looking for "nama alat" header
    if (!data.length || data.length < 2) {
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name]
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]
        
        if (sheetData.length > 0) {
          const firstRow = sheetData[0].map(h => h?.toString().toLowerCase().trim() || '')
          // Check if this sheet has "nama" or "nama alat" in header
          if (firstRow.some(h => h.includes('nama') || h.includes('alat'))) {
            sheetName = name
            worksheet = sheet
            data = sheetData
            console.log(`Import Equipment - Auto-detected sheet: ${sheetName}`)
            break
          }
        }
      }
    }
    
    // Fallback to first sheet if nothing found
    if (!data.length && workbook.SheetNames.length > 0) {
      sheetName = workbook.SheetNames[0]
      worksheet = workbook.Sheets[sheetName]
      data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
      console.log(`Import Equipment - Fallback to first sheet: ${sheetName}`)
    }

    if (!data.length || data.length < 2) {
      return {
        success: false,
        message: 'File Excel kosong atau tidak memiliki data. Pastikan ada sheet dengan header "Nama Alat"',
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
        importedIds: [],
        errors: [{ row: 0, message: `Sheet yang tersedia: ${workbook.SheetNames.join(', ')}` }]
      }
    }

    // Find the actual header row (skip empty rows or rows without "nama")
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i]
      if (row && row.length > 0) {
        const rowText = row.map(h => h?.toString().toLowerCase().trim() || '').join(' ')
        if (rowText.includes('nama') || rowText.includes('alat')) {
          headerRowIndex = i
          console.log(`Import Equipment - Header row found at index: ${headerRowIndex}`)
          break
        }
      }
    }
    
    // Slice data from header row onwards
    const actualData = data.slice(headerRowIndex)
    
    const supabase = await createClient()
    // Create direct service role client to bypass RLS
    const serviceRoleClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceSb = serviceRoleClient as any
    
    // Debug: Check if service role client is created
    console.log('Service role client created:', !!serviceRoleClient)
    console.log('Service role key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Get current user for created_by
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        success: false,
        message: 'Unauthorized',
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
        importedIds: [],
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
    const headerRow = actualData[0]
    const rows = actualData.slice(1)

    // Debug: Log header row
    console.log('Import Equipment - Header detected:', headerRow)

    // Map column indices - trim whitespace and handle various formats
    const getColumnIndex = (name: string) => {
      const cleanName = name.toLowerCase().trim()
      return headerRow.findIndex(h => {
        const headerText = h?.toString().toLowerCase().trim()
        // For rate columns, be more specific to avoid matching "tarif s1 jam" when looking for "tarif s1"
        if (cleanName.includes('tarif')) {
          // Exact match or match with parentheses (with or without space)
          return headerText === cleanName || 
                 headerText === `${cleanName} (hari)` ||
                 headerText === `${cleanName}(hari)` ||
                 headerText === `${cleanName} (jam)` ||
                 headerText === `${cleanName}(jam)` ||
                 headerText.startsWith(cleanName + ' ') ||
                 headerText.startsWith(cleanName + '(')
        }
        // Check if header contains the search term
        return headerText.includes(cleanName) || 
               // Handle "Rusak / Damaged" format - check both parts
               (cleanName.includes('/') && headerText.includes(cleanName.split('/')[0].trim()))
      })
    }

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
      // Rate columns - support format "Tarif S1 (Hari)" with "Perlu Supervisi" columns
      // Handle export format: Tarif S1 (Hari) | Tarif S1 (Jam) | S1 Perlu Supervisi | Tarif S2 (Hari) | ...
      tarif_s1_day: getColumnIndex('tarif s1 (hari)') !== -1 ? getColumnIndex('tarif s1 (hari)') : 
                    getColumnIndex('tarif s1') !== -1 ? getColumnIndex('tarif s1') : 
                    getColumnIndex('s1 day'),
      tarif_s1_hour: getColumnIndex('tarif s1 (jam)') !== -1 ? getColumnIndex('tarif s1 (jam)') :
                     getColumnIndex('tarif s1 jam') !== -1 ? getColumnIndex('tarif s1 jam') :
                     getColumnIndex('s1 hour'),
      tarif_s1_supervision: getColumnIndex('s1 perlu supervisi') !== -1 ? getColumnIndex('s1 perlu supervisi') : -1,
      tarif_s2_day: getColumnIndex('tarif s2 (hari)') !== -1 ? getColumnIndex('tarif s2 (hari)') :
                    getColumnIndex('tarif s2') !== -1 ? getColumnIndex('tarif s2') :
                    getColumnIndex('s2 day'),
      tarif_s2_hour: getColumnIndex('tarif s2 (jam)') !== -1 ? getColumnIndex('tarif s2 (jam)') :
                     getColumnIndex('tarif s2 jam') !== -1 ? getColumnIndex('tarif s2 jam') :
                     getColumnIndex('s2 hour'),
      tarif_s2_supervision: getColumnIndex('s2 perlu supervisi') !== -1 ? getColumnIndex('s2 perlu supervisi') : -1,
      tarif_dosen_day: getColumnIndex('tarif dosen (hari)') !== -1 ? getColumnIndex('tarif dosen (hari)') :
                       getColumnIndex('tarif dosen') !== -1 ? getColumnIndex('tarif dosen') :
                       getColumnIndex('dosen day'),
      tarif_dosen_hour: getColumnIndex('tarif dosen (jam)') !== -1 ? getColumnIndex('tarif dosen (jam)') :
                        getColumnIndex('tarif dosen jam') !== -1 ? getColumnIndex('tarif dosen jam') :
                        getColumnIndex('dosen hour'),
      tarif_dosen_supervision: getColumnIndex('dosen perlu supervisi') !== -1 ? getColumnIndex('dosen perlu supervisi') : -1,
      tarif_mou_day: getColumnIndex('tarif mou (hari)') !== -1 ? getColumnIndex('tarif mou (hari)') :
                     getColumnIndex('tarif mou') !== -1 ? getColumnIndex('tarif mou') :
                     getColumnIndex('mou day'),
      tarif_mou_hour: getColumnIndex('tarif mou (jam)') !== -1 ? getColumnIndex('tarif mou (jam)') :
                      getColumnIndex('tarif mou jam') !== -1 ? getColumnIndex('tarif mou jam') :
                      getColumnIndex('mou hour'),
      tarif_mou_supervision: getColumnIndex('mou perlu supervisi') !== -1 ? getColumnIndex('mou perlu supervisi') : -1,
      tarif_umum_day: getColumnIndex('tarif umum (hari)') !== -1 ? getColumnIndex('tarif umum (hari)') :
                      getColumnIndex('tarif umum') !== -1 ? getColumnIndex('tarif umum') :
                      getColumnIndex('umum day'),
      tarif_umum_hour: getColumnIndex('tarif umum (jam)') !== -1 ? getColumnIndex('tarif umum (jam)') :
                       getColumnIndex('tarif umum jam') !== -1 ? getColumnIndex('tarif umum jam') :
                       getColumnIndex('umum hour'),
      tarif_umum_supervision: getColumnIndex('umum perlu supervisi') !== -1 ? getColumnIndex('umum perlu supervisi') : -1,
    }

    // Debug: Log column indices
    console.log('Import Equipment - Column indices:', colIndices)
    
    // Validate required columns
    if (colIndices.name === -1) {
      return {
        success: false,
        message: 'Kolom "Nama Alat" tidak ditemukan. Pastikan header Excel sesuai template.',
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
        importedIds: [],
        errors: [{ 
          row: 1, 
          message: `Header yang terdeteksi: ${headerRow.join(', ')}`,
          data: { headers: headerRow }
        }]
      }
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
        const baseExistingNames = existingNames.filter((n: string) => n === normalizedBase || n.startsWith(normalizedBase + ' ('))
        
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

        // Map condition - handle "Rusak / Damaged" format
        const conditionInputRaw = row[colIndices.current_condition]?.toString().toLowerCase().trim() || ''
        // Extract first part before "/" if exists (e.g., "rusak" from "rusak / damaged")
        const conditionInput = conditionInputRaw.split('/')[0].trim()
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

        // Map ketersediaan - handle "Tersedia / Available" format
        const ketersediaanInputRaw = row[colIndices.ketersediaan]?.toString().toLowerCase().trim() || ''
        // Extract first part before "/" if exists
        const ketersediaanInput = ketersediaanInputRaw.split('/')[0].trim()
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

        // Map status tindakan - handle format with "/"
        const statusInputRaw = row[colIndices.status_tindakan]?.toString().toLowerCase().trim() || ''
        const statusInput = statusInputRaw.split('/')[0].trim()
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
        console.log(`Importing row ${rowNum}:`, { name: finalName, equipmentCode, category, currentCondition })
        
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
          console.error(`Error importing row ${rowNum}:`, error)
          errors.push({ row: rowNum, message: `Database error: ${error.message}`, data: { row, error: error.message } })
        } else {
          console.log(`Successfully imported row ${rowNum}:`, insertedData)
          successCount++
          importedIds.push(insertedData.id)
          // Add to existing names to prevent duplicates within the same import
          existingNames.push(finalName.toLowerCase())
          
          // Insert rates for each category
          const rateCategories = [
            { 
              category: 'mahasiswa_s1', 
              day: colIndices.tarif_s1_day, 
              hour: colIndices.tarif_s1_hour,
              supervision: colIndices.tarif_s1_supervision
            },
            { 
              category: 'mahasiswa_s2', 
              day: colIndices.tarif_s2_day, 
              hour: colIndices.tarif_s2_hour,
              supervision: colIndices.tarif_s2_supervision
            },
            { 
              category: 'dosen', 
              day: colIndices.tarif_dosen_day, 
              hour: colIndices.tarif_dosen_hour,
              supervision: colIndices.tarif_dosen_supervision
            },
            { 
              category: 'mou_unesa', 
              day: colIndices.tarif_mou_day, 
              hour: colIndices.tarif_mou_hour,
              supervision: colIndices.tarif_mou_supervision
            },
            { 
              category: 'umum', 
              day: colIndices.tarif_umum_day, 
              hour: colIndices.tarif_umum_hour,
              supervision: colIndices.tarif_umum_supervision
            },
          ]
          
          console.log(`Row ${rowNum} - Processing rates for: ${insertedData.id} (${finalName})`)
        console.log(`  Full row data:`, row)
        console.log(`  Column indices:`, colIndices)
          
          for (const rateCat of rateCategories) {
            const dayValue = row[rateCat.day]?.toString().trim()
            const hourValue = row[rateCat.hour]?.toString().trim()
            
            console.log(`  ${rateCat.category}:`)
            console.log(`    - dayIndex=${rateCat.day}, hourIndex=${rateCat.hour}`)
            console.log(`    - dayValue="${dayValue}" (type: ${typeof row[rateCat.day]})`)
            console.log(`    - hourValue="${hourValue}"`)
            
            if (dayValue && dayValue !== '') {
              // Remove any non-numeric characters except decimal point
              const cleanValue = dayValue.replace(/[^0-9.]/g, '')
              console.log(`    - Clean value: "${cleanValue}"`)
              
              const ratePerDay = parseFloat(cleanValue)
              console.log(`    - Parsed day rate: ${ratePerDay} (isNaN: ${isNaN(ratePerDay)})`)
              
              if (!isNaN(ratePerDay) && ratePerDay > 0) {
                let ratePerHour: number | null = null
                if (hourValue && hourValue !== '') {
                  const cleanHourValue = hourValue.replace(/[^0-9.]/g, '')
                  const parsedHour = parseFloat(cleanHourValue)
                  if (!isNaN(parsedHour) && parsedHour > 0) {
                    ratePerHour = parsedHour
                  }
                }
                
                // Check supervision flag from Excel
                let requiresSupervision = false
                if (rateCat.supervision !== -1) {
                  const supervisionValue = row[rateCat.supervision]?.toString().toLowerCase().trim()
                  requiresSupervision = supervisionValue === 'ya' || supervisionValue === 'yes' || supervisionValue === 'true'
                }
                
                console.log(`    - Inserting rate: day=${ratePerDay}, hour=${ratePerHour}, supervision=${requiresSupervision}`)
                
                try {
                  // Use service role client to bypass RLS for rate insertion
                  console.log(`    - Using serviceSb for rate insertion:`, !!serviceSb)
                  const rateInsertData = {
                    equipment_id: insertedData.id,
                    user_category: rateCat.category,
                    rate_per_day: ratePerDay,
                    rate_per_hour: ratePerHour,
                    requires_supervision: requiresSupervision,
                  }
                  console.log(`    - Rate insert data:`, rateInsertData)
                  const { error: rateError } = await serviceSb.from('equipment_rates').insert(rateInsertData)
                  
                  if (rateError) {
                    console.error(`    - Error inserting rate:`, rateError)
                    // Log the error but don't fail the whole import
                    errors.push({ 
                      row: rowNum, 
                      message: `Gagal insert tarif ${rateCat.category}: ${rateError.message}`, 
                      data: { category: rateCat.category, error: rateError.message } 
                    })
                  } else {
                    console.log(`    - Rate inserted successfully!`)
                  }
                } catch (rateInsertError) {
                  console.error(`    - Exception inserting rate:`, rateInsertError)
                  errors.push({ 
                    row: rowNum, 
                    message: `Exception insert tarif ${rateCat.category}`, 
                    data: { category: rateCat.category, error: String(rateInsertError) } 
                  })
                }
              } else {
                console.log(`    - Skipping: parsed value is NaN or <= 0`)
              }
            } else {
              console.log(`    - Skipping: no day value (empty or undefined)`)
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
      totalRows: rows.filter(row => row && row.some(cell => cell)).length,
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
