'use server'

import { createClient } from '@/lib/supabase/server'
import type { ImportResult } from '../equipment/importEquipment'

/**
 * Import inventory from Excel file
 */
export async function importInventoryFromExcel(formData: FormData, roomId: string): Promise<ImportResult> {
  const XLSX = await import('xlsx')
  try {
    const file = formData.get('file') as File
    if (!file) {
      return {
        success: false,
        message: 'File tidak ditemukan',
        totalRows: 0,
        successCount: 0,
        skippedCount: 0,
        errorCount: 1,
        importedIds: [],
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
        skippedCount: 0,
        errorCount: 1,
        importedIds: [],
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
        skippedCount: 0,
        errorCount: 1,
        importedIds: [],
        errors: [{ row: 0, message: 'Unauthorized' }]
      }
    }

    // Verify room exists
    const { data: roomData } = await sb
      .from('rooms')
      .select('id, name')
      .eq('id', roomId)
      .single()

    if (!roomData) {
      return {
        success: false,
        message: 'Ruangan tidak ditemukan',
        totalRows: 0,
        successCount: 0,
        skippedCount: 0,
        errorCount: 1,
        importedIds: [],
        errors: [{ row: 0, message: 'Ruangan tidak ditemukan' }]
      }
    }

    const errors: Array<{ row: number; message: string; data?: Record<string, unknown> }> = []
    let successCount = 0
    const headerRow = data[0]
    const rows = data.slice(1)

    // Map column indices
    const getColumnIndex = (name: string) => headerRow.findIndex(h => h?.toString().toLowerCase().includes(name.toLowerCase()))

    const colIndices = {
      item_name: getColumnIndex('nama barang') !== -1 ? getColumnIndex('nama barang') : getColumnIndex('item name'),
      quantity: getColumnIndex('jumlah') !== -1 ? getColumnIndex('jumlah') : getColumnIndex('quantity'),
      condition: getColumnIndex('kondisi') !== -1 ? getColumnIndex('kondisi') : getColumnIndex('condition'),
      description: getColumnIndex('keterangan') !== -1 ? getColumnIndex('keterangan') : getColumnIndex('description'),
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      try {
        // Skip empty rows
        if (!row || row.every(cell => !cell)) continue

        // Get values
        const itemName = row[colIndices.item_name]?.toString().trim()
        if (!itemName) {
          errors.push({ row: rowNum, message: 'Nama barang wajib diisi', data: { row } })
          continue
        }

        // Parse quantity
        const quantityStr = row[colIndices.quantity]?.toString().trim()
        const quantity = quantityStr ? parseInt(quantityStr, 10) : 1
        if (isNaN(quantity) || quantity < 1) {
          errors.push({ row: rowNum, message: 'Jumlah harus berupa angka positif', data: { row } })
          continue
        }

        // Map condition
        const conditionInput = row[colIndices.condition]?.toString().toLowerCase().trim()
        const conditionMap: Record<string, string> = {
          'baik': 'good',
          'good': 'good',
          'cukup': 'fair',
          'fair': 'fair',
          'kurang': 'poor',
          'poor': 'poor',
          'rusak': 'damaged',
          'damaged': 'damaged',
        }
        const condition = conditionMap[conditionInput] || 'good'

        // Insert inventory item
        const { error } = await sb.from('room_inventories').insert({
          room_id: roomId,
          name: itemName,
          quantity: quantity,
          condition: condition,
          notes: row[colIndices.description]?.toString().trim() || null,
          is_active: true,
          last_updated_by: user.id,
        })

        if (error) {
          errors.push({ row: rowNum, message: error.message, data: { row } })
        } else {
          successCount++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({ row: rowNum, message: errorMessage, data: { row } })
      }
    }

    return {
      success: errors.length === 0,
      message: errors.length === 0 
        ? `Berhasil mengimport ${successCount} barang inventaris` 
        : `Berhasil mengimport ${successCount} barang, ${errors.length} gagal`,
      totalRows: rows.length,
      successCount,
      skippedCount: 0,
      errorCount: errors.length,
      importedIds: [],
      errors
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Terjadi kesalahan: ${errorMessage}`,
      totalRows: 0,
      successCount: 0,
      skippedCount: 0,
      errorCount: 1,
      importedIds: [],
      errors: [{ row: 0, message: errorMessage }]
    }
  }
}
