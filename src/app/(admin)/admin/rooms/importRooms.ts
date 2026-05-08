'use server'

import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import type { ImportResult } from '../equipment/importEquipment'

/**
 * Import rooms from Excel file
 */
export async function importRoomsFromExcel(formData: FormData): Promise<ImportResult> {
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

    // Get current user
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

    // Get all buildings for reference
    const { data: buildings } = await sb
      .from('buildings')
      .select('id, name, code')

    const buildingMap = new Map<string, string>()
    buildings?.forEach((b: { id: string; name: string; code: string }) => {
      buildingMap.set(b.name.toLowerCase(), b.id)
      buildingMap.set(b.code.toLowerCase(), b.id)
    })

    // Get existing room codes
    const { data: existingRooms } = await sb
      .from('rooms')
      .select('room_code')

    const existingCodes = new Set(existingRooms?.map((r: { room_code: string }) => r.room_code.toLowerCase()) ?? [])

    const errors: Array<{ row: number; message: string; data?: Record<string, unknown> }> = []
    let successCount = 0
    const headerRow = data[0]
    const rows = data.slice(1)

    // Map column indices
    const getColumnIndex = (name: string) => headerRow.findIndex(h => h?.toString().toLowerCase().includes(name.toLowerCase()))

    const colIndices = {
      name: getColumnIndex('nama') !== -1 ? getColumnIndex('nama') : getColumnIndex('name'),
      room_code: getColumnIndex('kode') !== -1 ? getColumnIndex('kode') : getColumnIndex('code'),
      building: getColumnIndex('gedung') !== -1 ? getColumnIndex('gedung') : getColumnIndex('building'),
      floor: getColumnIndex('lantai') !== -1 ? getColumnIndex('lantai') : getColumnIndex('floor'),
      capacity: getColumnIndex('kapasitas') !== -1 ? getColumnIndex('kapasitas') : getColumnIndex('capacity'),
      room_type: getColumnIndex('tipe') !== -1 ? getColumnIndex('tipe') : getColumnIndex('type'),
      description: getColumnIndex('deskripsi') !== -1 ? getColumnIndex('deskripsi') : getColumnIndex('description'),
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      try {
        // Skip empty rows
        if (!row || row.every(cell => !cell)) continue

        // Get values
        const name = row[colIndices.name]?.toString().trim()
        if (!name) {
          errors.push({ row: rowNum, message: 'Nama ruangan wajib diisi', data: { row } })
          continue
        }

        const roomCode = row[colIndices.room_code]?.toString().trim()
        if (!roomCode) {
          errors.push({ row: rowNum, message: 'Kode ruangan wajib diisi', data: { row } })
          continue
        }

        // Check for duplicate room code
        if (existingCodes.has(roomCode.toLowerCase())) {
          errors.push({ row: rowNum, message: `Kode ruangan ${roomCode} sudah ada`, data: { row } })
          continue
        }

        // Find building
        const buildingInput = row[colIndices.building]?.toString().trim()
        let buildingId = null
        if (buildingInput) {
          buildingId = buildingMap.get(buildingInput.toLowerCase())
          if (!buildingId) {
            errors.push({ row: rowNum, message: `Gedung "${buildingInput}" tidak ditemukan`, data: { row } })
            continue
          }
        }

        // Parse floor
        const floorStr = row[colIndices.floor]?.toString().trim()
        const floor = floorStr ? parseInt(floorStr, 10) : null
        if (floorStr && (isNaN(floor!) || floor! < 1)) {
          errors.push({ row: rowNum, message: 'Lantai harus berupa angka positif', data: { row } })
          continue
        }

        // Parse capacity
        const capacityStr = row[colIndices.capacity]?.toString().trim()
        const capacity = capacityStr ? parseInt(capacityStr, 10) : null
        if (capacityStr && (isNaN(capacity!) || capacity! < 1)) {
          errors.push({ row: rowNum, message: 'Kapasitas harus berupa angka positif', data: { row } })
          continue
        }

        // Map room type
        const roomTypeInput = row[colIndices.room_type]?.toString().toLowerCase().trim()
        const roomTypeMap: Record<string, string> = {
          'kelas': 'classroom',
          'classroom': 'classroom',
          'rapat': 'meeting_room',
          'meeting': 'meeting_room',
          'lab': 'laboratory',
          'laboratorium': 'laboratory',
          'auditorium': 'auditorium',
          'perpustakaan': 'library',
          'library': 'library',
          'kantor': 'office',
          'office': 'office',
          'lainnya': 'other',
          'other': 'other',
        }
        const roomType = roomTypeMap[roomTypeInput] || 'other'

        // Insert room
        const { error } = await sb.from('rooms').insert({
          name: name,
          room_code: roomCode,
          building_id: buildingId,
          floor: floor,
          capacity: capacity,
          room_type: roomType,
          description: row[colIndices.description]?.toString().trim() || null,
          is_active: true,
          created_by: user.id,
        })

        if (error) {
          errors.push({ row: rowNum, message: error.message, data: { row } })
        } else {
          successCount++
          existingCodes.add(roomCode.toLowerCase())
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({ row: rowNum, message: errorMessage, data: { row } })
      }
    }

    return {
      success: errors.length === 0,
      message: errors.length === 0 
        ? `Berhasil mengimport ${successCount} ruangan` 
        : `Berhasil mengimport ${successCount} ruangan, ${errors.length} gagal`,
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
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
      errors: [{ row: 0, message: errorMessage }]
    }
  }
}


