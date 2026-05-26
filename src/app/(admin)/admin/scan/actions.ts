'use server'

import { createAdminDbClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function processScan(url: string) {
  try {
    const parsed = new URL(url, 'http://localhost')
    const type = parsed.searchParams.get('type')
    const id = parsed.searchParams.get('id')

    if (!type || !id) {
      return { error: 'URL QR tidak valid' }
    }

    return { type, id, url }
  } catch {
    return { error: 'URL QR tidak valid' }
  }
}

export async function updateEntityFromScan(formData: FormData) {
  const type = formData.get('type') as string
  const id = formData.get('id') as string
  const condition = formData.get('condition') as string
  const location = formData.get('location') as string
  const notes = formData.get('notes') as string
  const checkedByName = formData.get('checked_by_name') as string

  if (!type || !id || !condition) {
    return { error: 'Data tidak lengkap' }
  }

  const adminDb = createAdminDbClient()
  const now = new Date().toISOString()

  let entityName = ''
  let entityCode = ''

  if (type === 'equipment') {
    // Fetch equipment by slug
    const { data: allEq } = await adminDb
      .from('equipment')
      .select('id, name, equipment_code')
      .eq('is_active', true)

    const matched = allEq?.find((eq: { id: string; name: string }) => {
      const slug = eq.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      return slug === id
    })

    if (!matched) return { error: 'Alat tidak ditemukan' }

    const { error: updErr } = await adminDb
      .from('equipment')
      .update({
        current_condition: condition,
        current_location: location || null,
        tgl_terakhir_cek: now,
      })
      .eq('id', matched.id)

    if (updErr) return { error: updErr.message }

    entityName = matched.name
    entityCode = matched.equipment_code || matched.id
  } else if (type === 'room') {
    const { data: allRooms } = await adminDb
      .from('rooms')
      .select('id, name, room_code')
      .eq('is_active', true)

    const matched = allRooms?.find((r: { id: string; name: string }) => {
      const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      return slug === id
    })

    if (!matched) return { error: 'Ruangan tidak ditemukan' }

    const { error: updErr } = await adminDb
      .from('rooms')
      .update({
        current_condition: condition,
        updated_at: now,
      })
      .eq('id', matched.id)

    if (updErr) return { error: updErr.message }

    entityName = matched.name
    entityCode = matched.room_code || matched.id
  } else if (type === 'inventory') {
    const { data: inv } = await adminDb
      .from('room_inventories')
      .select('id, name, inventory_code')
      .eq('id', id)
      .single()

    if (!inv) return { error: 'Inventaris tidak ditemukan' }

    const { error: updErr } = await adminDb
      .from('room_inventories')
      .update({
        condition: condition as any,
        last_updated_at: now,
      })
      .eq('id', id)

    if (updErr) return { error: updErr.message }

    entityName = inv.name
    entityCode = inv.inventory_code || inv.id
  }

  // Insert tracking log
  const entityTypeMap: Record<string, 'asset' | 'inventory_item'> = {
    equipment: 'asset',
    room: 'asset',
    inventory: 'inventory_item',
  }
  const { error: logErr } = await adminDb.from('asset_tracking_logs').insert({
    entity_type: entityTypeMap[type] ?? 'asset',
    entity_id: id,
    scanned_by: null,
    action_type: 'update_condition',
    changes: {
      condition,
      location: location || undefined,
      notes: notes || undefined,
    },
    notes: notes || null,
  })

  if (logErr) {
    console.error('Error inserting tracking log:', logErr)
  }

  // Also insert to equipment_checks for equipment type
  if (type === 'equipment') {
    const { data: allEq } = await adminDb
      .from('equipment')
      .select('id, name')
      .eq('is_active', true)

    const matched = allEq?.find((eq) => {
      const slug = eq.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      return slug === id
    })

    if (matched) {
      await adminDb.from('equipment_checks').insert({
        equipment_id: matched.id,
        condition,
        notes: notes || null,
        checked_by_name: checkedByName || null,
        checked_at: now,
      })
    }
  }

  revalidatePath('/admin/equipment')
  revalidatePath('/admin/rooms')
  revalidatePath('/admin/inventory')
  revalidatePath(`/equipment/${id}`)

  return { success: true, entityName, entityCode }
}
