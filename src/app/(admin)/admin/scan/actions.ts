'use server'

import { createAdminDbClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getBuildingsAndRooms() {
  const adminDb = createAdminDbClient()

  const { data: buildings } = await adminDb
    .from('buildings')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')

  const { data: rooms } = await adminDb
    .from('rooms')
    .select('id, name, building_id, buildings(name)')
    .eq('is_active', true)
    .order('name')

  return {
    buildings: (buildings || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      code: b.code,
    })),
    rooms: (rooms || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      buildingId: r.building_id,
      buildingName: r.buildings?.name || '',
      label: r.buildings?.name ? `${r.buildings.name} — ${r.name}` : r.name,
    })),
  }
}

export async function getEntityCurrentLocation(type: string, slug: string) {
  const adminDb = createAdminDbClient()

  if (type === 'equipment') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allEq } = await (adminDb.from('equipment') as any)
      .select('id, name, building_id, storage_room_id, current_location, current_condition')
      .eq('is_active', true)

    const matched = (allEq || []).find((eq: any) => {
      const s = eq.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      return s === slug
    })

    if (!matched) return null

    // Fetch building and room names
    const [{ data: building }, { data: room }] = await Promise.all([
      matched.building_id ? (adminDb.from('buildings') as any).select('name').eq('id', matched.building_id).single() : Promise.resolve({ data: null }),
      matched.storage_room_id ? (adminDb.from('rooms') as any).select('name').eq('id', matched.storage_room_id).single() : Promise.resolve({ data: null }),
    ])

    return {
      name: matched.name,
      condition: matched.current_condition,
      buildingId: matched.building_id,
      buildingName: building?.name || '-',
      roomId: matched.storage_room_id,
      roomName: room?.name || '-',
      locationText: matched.current_location || '-',
    }
  }

  if (type === 'room') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allRooms } = await (adminDb.from('rooms') as any)
      .select('id, name, building_id, room_code, current_condition, buildings(name)')
      .eq('is_active', true)

    const matched = (allRooms || []).find((r: any) => {
      const s = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      return s === slug
    })

    if (!matched) return null

    return {
      name: matched.name,
      condition: matched.current_condition,
      buildingId: matched.building_id,
      buildingName: matched.buildings?.name || '-',
      roomId: matched.id,
      roomName: matched.name,
      locationText: matched.room_code || '-',
    }
  }

  if (type === 'inventory') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inv } = await (adminDb.from('room_inventories') as any)
      .select('id, name, condition, room_id, rooms(name, buildings(name))')
      .eq('id', slug)
      .single()

    if (!inv) return null

    return {
      name: inv.name,
      condition: inv.condition,
      buildingId: inv.rooms?.buildings?.id || null,
      buildingName: inv.rooms?.buildings?.name || '-',
      roomId: inv.room_id,
      roomName: inv.rooms?.name || '-',
      locationText: inv.rooms?.name || '-',
    }
  }

  return null
}

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
  const buildingId = formData.get('building_id') as string
  const roomId = formData.get('room_id') as string
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
    const { data: allEq } = await adminDb
      .from('equipment')
      .select('id, name, equipment_code')
      .eq('is_active', true)

    const matched = allEq?.find((eq: { id: string; name: string }) => {
      const slug = eq.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      return slug === id
    })

    if (!matched) return { error: 'Alat tidak ditemukan' }

    const updateData: any = {
      current_condition: condition,
      tgl_terakhir_cek: now,
    }

    if (buildingId) updateData.building_id = buildingId
    if (roomId) updateData.storage_room_id = roomId

    const { error: updErr } = await adminDb
      .from('equipment')
      .update(updateData)
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

    const updateData: any = {
      current_condition: condition,
      updated_at: now,
    }

    if (buildingId) updateData.building_id = buildingId

    const { error: updErr } = await adminDb
      .from('rooms')
      .update(updateData)
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

    const updateData: any = {
      condition: condition as any,
      last_updated_at: now,
    }

    if (roomId) updateData.room_id = roomId

    const { error: updErr } = await adminDb
      .from('room_inventories')
      .update(updateData)
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

  const locationText = buildingId && roomId
    ? `${buildingId}/${roomId}`
    : buildingId || roomId || undefined

  const { error: logErr } = await adminDb.from('asset_tracking_logs').insert({
    entity_type: entityTypeMap[type] ?? 'asset',
    entity_id: id,
    scanned_by: null,
    action_type: 'update_condition',
    changes: {
      condition,
      location: locationText,
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
