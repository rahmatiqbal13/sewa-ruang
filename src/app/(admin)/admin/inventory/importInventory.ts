'use server'

import { createClient } from '@/lib/supabase/server'
import type { ImportResult } from '../equipment/importEquipment'

function norm(v: string | null | undefined): string | null {
  const s = v?.toString().trim()
  if (!s || s === '-') return null
  return s
}

// Returns a unique name by appending (2), (3), ... if the base name already exists
function getUniqueName(baseName: string, existingNames: Set<string>): string {
  if (!existingNames.has(baseName.toLowerCase())) return baseName
  let n = 2
  while (existingNames.has(`${baseName.toLowerCase()} (${n})`)) n++
  return `${baseName} (${n})`
}

export async function importInventoryFromExcel(formData: FormData, roomId: string | null): Promise<ImportResult> {
  const XLSX = await import('xlsx')
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, message: 'File tidak ditemukan', totalRows: 0, successCount: 0, errorCount: 1, importedIds: [], errors: [{ row: 0, message: 'File tidak ditemukan' }] }
    }

    const bytes = await file.arrayBuffer()
    const workbook = XLSX.read(bytes, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

    if (data.length < 2) {
      return { success: false, message: 'File Excel kosong atau tidak memiliki data', totalRows: 0, successCount: 0, errorCount: 1, importedIds: [], errors: [{ row: 0, message: 'File Excel kosong' }] }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: 'Unauthorized', totalRows: 0, successCount: 0, errorCount: 1, importedIds: [], errors: [{ row: 0, message: 'Unauthorized' }] }
    }

    if (roomId) {
      const { data: roomData } = await sb.from('rooms').select('id').eq('id', roomId).single()
      if (!roomData) {
        return { success: false, message: 'Ruangan tidak ditemukan', totalRows: 0, successCount: 0, errorCount: 1, importedIds: [], errors: [{ row: 0, message: 'Ruangan tidak ditemukan' }] }
      }
    }

    // Get highest existing inventory code
    const { data: maxCodeData } = await sb
      .from('room_inventories')
      .select('inventory_code')
      .not('inventory_code', 'is', null)
      .ilike('inventory_code', 'INV-%')
      .order('inventory_code', { ascending: false })
      .limit(1)
      .maybeSingle()

    let codeCounter = 0
    if (maxCodeData?.inventory_code) {
      const match = maxCodeData.inventory_code.match(/INV-(\d+)/)
      if (match) codeCounter = parseInt(match[1], 10)
    }

    type ExistingItem = {
      id: string
      name: string
      inventory_code: string | null
      merk: string | null
      quantity: number
      condition: string
      notes: string | null
    }

    // 1. Fetch all items in scope for name uniqueness tracking
    const scopeQuery = sb
      .from('room_inventories')
      .select('id, name, inventory_code, merk, quantity, condition, notes')
      .eq('is_active', true)
      .is('deleted_at', null)

    const { data: scopeItems } = roomId
      ? await scopeQuery.eq('room_id', roomId)
      : await scopeQuery.is('room_id', null)

    // Set of all existing names in scope (lowercased) — for unique name generation
    const existingNames = new Set<string>(
      (scopeItems || []).map((i: ExistingItem) => i.name.toLowerCase())
    )

    // 2. Fetch all non-deleted items with codes globally — for code-based UPDATE matching
    const { data: itemsWithCode } = await sb
      .from('room_inventories')
      .select('id, name, inventory_code, merk, quantity, condition, notes')
      .not('inventory_code', 'is', null)
      .eq('is_active', true)
      .is('deleted_at', null)

    const existingByCode = new Map<string, ExistingItem>(
      (itemsWithCode || []).map((i: ExistingItem) => [i.inventory_code!.toUpperCase(), i])
    )

    const conditionMap: Record<string, string> = {
      'baik': 'good', 'good': 'good',
      'cukup': 'fair', 'fair': 'fair',
      'kurang': 'poor', 'poor': 'poor',
      'rusak': 'damaged', 'damaged': 'damaged',
      'needs_repair': 'needs_repair', 'perlu perbaikan': 'needs_repair',
    }

    const errors: Array<{ row: number; message: string }> = []
    let insertedCount = 0
    let updatedCount = 0
    let skippedCount = 0

    const headerRow = data[0]
    const rows = data.slice(1)

    const getCol = (name: string) => headerRow.findIndex(h =>
      h?.toString().toLowerCase().includes(name.toLowerCase())
    )

    const col = {
      code:      getCol('kode inventaris') !== -1 ? getCol('kode inventaris') : getCol('inventory_code'),
      name:      getCol('nama barang') !== -1 ? getCol('nama barang') : getCol('item name'),
      merk:      getCol('merk') !== -1 ? getCol('merk') : getCol('tipe'),
      quantity:  getCol('jumlah') !== -1 ? getCol('jumlah') : getCol('quantity'),
      condition: getCol('kondisi') !== -1 ? getCol('kondisi') : getCol('condition'),
      notes:     getCol('keterangan') !== -1 ? getCol('keterangan') : getCol('description'),
    }

    const processedCodes = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      try {
        if (!row || row.every(cell => !cell)) continue

        const rawName = row[col.name]?.toString().trim()
        if (!rawName) {
          errors.push({ row: rowNum, message: 'Nama barang wajib diisi' })
          continue
        }

        const fileCode      = col.code >= 0      ? norm(row[col.code])                           : null
        const fileMerk      = col.merk >= 0      ? norm(row[col.merk])                           : null
        const fileQuantity  = col.quantity >= 0  ? (row[col.quantity] ? parseInt(row[col.quantity].toString(), 10) : null) : null
        const fileCondition = col.condition >= 0 ? (row[col.condition] ? (conditionMap[row[col.condition].toString().toLowerCase().trim()] ?? null) : null) : null
        const fileNotes     = col.notes >= 0     ? norm(row[col.notes])                          : null

        if (fileQuantity !== null && (isNaN(fileQuantity) || fileQuantity < 1)) {
          errors.push({ row: rowNum, message: 'Jumlah harus berupa angka positif' })
          continue
        }

        const normalizedCode = fileCode?.toUpperCase() ?? null

        // ── PATH A: Row has inventory code → UPDATE by code ────────────────
        if (normalizedCode) {
          if (processedCodes.has(normalizedCode)) {
            skippedCount++
            continue
          }

          const existing = existingByCode.get(normalizedCode)

          if (existing) {
            const nameChanged      = norm(existing.name)      !== rawName
            const merkChanged      = fileMerk      !== null && norm(existing.merk)      !== fileMerk
            const quantityChanged  = fileQuantity  !== null && existing.quantity        !== fileQuantity
            const conditionChanged = fileCondition !== null && existing.condition       !== fileCondition
            const notesChanged     = fileNotes     !== null && norm(existing.notes)     !== fileNotes

            if (!nameChanged && !merkChanged && !quantityChanged && !conditionChanged && !notesChanged) {
              skippedCount++
              processedCodes.add(normalizedCode)
              continue
            }

            const payload: Record<string, unknown> = { last_updated_by: user.id }
            if (nameChanged)      payload.name      = rawName
            if (merkChanged)      payload.merk      = fileMerk
            if (quantityChanged)  payload.quantity  = fileQuantity
            if (conditionChanged) payload.condition = fileCondition
            if (notesChanged)     payload.notes     = fileNotes

            const { error } = await sb.from('room_inventories').update(payload).eq('id', existing.id)
            if (error) {
              errors.push({ row: rowNum, message: error.message })
            } else {
              updatedCount++
              processedCodes.add(normalizedCode)
            }
          } else {
            // Code not found → INSERT with given code
            const { error } = await sb.from('room_inventories').insert({
              room_id: roomId,
              name: rawName,
              merk: fileMerk,
              quantity: fileQuantity ?? 1,
              condition: fileCondition ?? 'good',
              inventory_code: normalizedCode,
              notes: fileNotes,
              is_active: true,
              last_updated_by: user.id,
            })
            if (error) {
              errors.push({ row: rowNum, message: error.message })
            } else {
              insertedCount++
              processedCodes.add(normalizedCode)
              existingNames.add(rawName.toLowerCase())
            }
          }
        }
        // ── PATH B: No code → auto-number duplicate names then INSERT ───────
        else {
          // Generate unique name: "Kursi", "Kursi (2)", "Kursi (3)", ...
          const uniqueName = getUniqueName(rawName, existingNames)

          codeCounter++
          const inventoryCode = `INV-${String(codeCounter).padStart(4, '0')}`

          const { error } = await sb.from('room_inventories').insert({
            room_id: roomId,
            name: uniqueName,
            merk: fileMerk,
            quantity: fileQuantity ?? 1,
            condition: fileCondition ?? 'good',
            inventory_code: inventoryCode,
            notes: fileNotes,
            is_active: true,
            last_updated_by: user.id,
          })
          if (error) {
            codeCounter--
            errors.push({ row: rowNum, message: error.message })
          } else {
            insertedCount++
            // Register the unique name so the next identical row gets (N+1)
            existingNames.add(uniqueName.toLowerCase())
          }
        }
      } catch (err) {
        errors.push({ row: rowNum, message: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    const parts: string[] = []
    if (insertedCount > 0) parts.push(`${insertedCount} baru ditambahkan`)
    if (updatedCount > 0)  parts.push(`${updatedCount} diperbarui`)
    if (skippedCount > 0)  parts.push(`${skippedCount} dilewati (tidak ada perubahan)`)
    if (errors.length > 0) parts.push(`${errors.length} gagal`)

    return {
      success: errors.length === 0,
      message: parts.join(', ') || 'Tidak ada data yang diproses',
      totalRows: rows.filter(r => r && !r.every(c => !c)).length,
      successCount: insertedCount + updatedCount,
      errorCount: errors.length,
      importedIds: [],
      errors,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, message: `Terjadi kesalahan: ${msg}`, totalRows: 0, successCount: 0, errorCount: 1, importedIds: [], errors: [{ row: 0, message: msg }] }
  }
}
