/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createAdminDbClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
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

export async function getUserRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { role: null, error: 'Unauthorized' }
  
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  return { role: profile?.role || null, error: null }
}

export async function getEntityDetails(type: string, slug: string) {
  const adminDb = createAdminDbClient()
  
  if (type === 'room') {
    // Fetch room by slug
    const { data: allRooms, error: roomsError } = await (adminDb.from('rooms') as any)
      .select('id, name, room_code, building_id, capacity, floor_number, current_condition, is_for_rent, photo_url, description, buildings(name, code)')
      .eq('is_active', true)

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError)
      return null
    }

    const matched = (allRooms || []).find((r: any) => {
      const s = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      return s === slug
    })

    if (!matched) {
      console.error('Room not found for slug:', slug, 'Available rooms:', (allRooms || []).map((r: any) => r.name))
      return null
    }

    // Fetch inventory items in this room
    const { data: inventoryItems } = await (adminDb.from('room_inventory_items') as any)
      .select('id, name, inventory_code, quantity, condition, notes, photo_url')
      .eq('room_asset_id', matched.id)
      .eq('is_active', true)
      .order('name')

    // Fetch active bookings for this room via booking_items
    const now = new Date().toISOString()
    const { data: roomBookingItems } = await (adminDb.from('booking_items') as any)
      .select('booking_id')
      .eq('room_id', matched.id)

    const bookingIds = roomBookingItems?.map((b: any) => b.booking_id) || []
    let activeBookings: any[] = []
    let pastBookings: any[] = []

    if (bookingIds.length > 0) {
      const { data: active } = await (adminDb.from('bookings') as any)
        .select('id, reference_no, status, start_datetime, end_datetime, purpose, users!user_id(name, email)')
        .in('id', bookingIds)
        .in('status', ['approved', 'paid'])
        .gte('end_datetime', now)
        .order('start_datetime', { ascending: true })
        .limit(5)

      const { data: past } = await (adminDb.from('bookings') as any)
        .select('id, reference_no, status, start_datetime, end_datetime, purpose, users!user_id(name, email)')
        .in('id', bookingIds)
        .lt('end_datetime', now)
        .order('end_datetime', { ascending: false })
        .limit(5)

      activeBookings = active || []
      pastBookings = past || []
    }

    return {
      type: 'room',
      name: matched.name,
      roomCode: matched.room_code,
      buildingName: matched.buildings?.name || '-',
      buildingCode: matched.buildings?.code || '-',
      capacity: matched.capacity,
      floorNumber: matched.floor_number,
      condition: matched.current_condition,
      isForRent: matched.is_for_rent,
      photoUrl: matched.photo_url,
      description: matched.description,
      inventoryItems: inventoryItems || [],
      activeBookings,
      pastBookings,
    }
  }
  
  if (type === 'equipment') {
    // Fetch equipment by slug
    const { data: allEq } = await (adminDb.from('equipment') as any)
      .select('id, name, equipment_code, category, merk, description, current_condition, ketersediaan, status_tindakan, photo_url, current_location, building_id, storage_room_id, updated_at')
      .eq('is_active', true)

    const matched = (allEq || []).find((eq: any) => {
      const s = eq.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      return s === slug
    })

    if (!matched) return null

    const now = new Date().toISOString()

    // Fetch active and past bookings for this equipment via booking_items
    const { data: eqBookingItems } = await (adminDb.from('booking_items') as any)
      .select('booking_id')
      .eq('equipment_id', matched.id)

    const bookingIds = eqBookingItems?.map((b: any) => b.booking_id) || []
    let activeBookings: any[] = []
    let pastBookings: any[] = []

    if (bookingIds.length > 0) {
      const { data: active } = await (adminDb.from('bookings') as any)
        .select('id, reference_no, status, start_datetime, end_datetime, purpose, users!user_id(name, email, phone)')
        .in('id', bookingIds)
        .in('status', ['approved', 'paid'])
        .gte('end_datetime', now)
        .order('start_datetime', { ascending: true })
        .limit(5)

      const { data: past } = await (adminDb.from('bookings') as any)
        .select('id, reference_no, status, start_datetime, end_datetime, purpose, users!user_id(name, email, phone)')
        .in('id', bookingIds)
        .lt('end_datetime', now)
        .order('end_datetime', { ascending: false })
        .limit(5)

      activeBookings = active || []
      pastBookings = past || []
    }

    // Fetch equipment rates
    const { data: rates } = await (adminDb.from('equipment_rates') as any)
      .select('user_category, rate_per_day, rate_per_hour')
      .eq('equipment_id', matched.id)
      .order('user_category')

    // Fetch building and room names (with floor)
    const [{ data: building }, { data: room }] = await Promise.all([
      matched.building_id ? (adminDb.from('buildings') as any).select('name, code').eq('id', matched.building_id).single() : Promise.resolve({ data: null }),
      matched.storage_room_id ? (adminDb.from('rooms') as any).select('name, room_code, floor').eq('id', matched.storage_room_id).single() : Promise.resolve({ data: null }),
    ])

    return {
      type: 'equipment',
      id: matched.id,
      name: matched.name,
      equipmentCode: matched.equipment_code,
      category: matched.category,
      merk: matched.merk,
      description: matched.description,
      condition: matched.current_condition,
      ketersediaan: matched.ketersediaan,
      statusTindakan: matched.status_tindakan,
      photoUrl: matched.photo_url,
      currentLocation: matched.current_location,
      buildingName: building?.name || '-',
      roomName: room?.name || '-',
      roomCode: room?.room_code || '-',
      roomFloor: room?.floor || null,
      updatedAt: matched.updated_at,
      activeBookings,
      pastBookings,
      rates: rates || [],
    }
  }
  
  if (type === 'inventory') {
    const { data: inv } = await (adminDb.from('room_inventories') as any)
      .select('id, name, inventory_code, quantity, condition, notes, photo_url, room_id, rooms(name, room_code, buildings(name))')
      .eq('id', slug)
      .single()
    
    if (!inv) return null
    
    return {
      type: 'inventory',
      name: inv.name,
      inventoryCode: inv.inventory_code,
      quantity: inv.quantity,
      condition: inv.condition,
      notes: inv.notes,
      photoUrl: inv.photo_url,
      roomName: inv.rooms?.name || '-',
      roomCode: inv.rooms?.room_code || '-',
      buildingName: inv.rooms?.buildings?.name || '-',
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
  // Auth check: only admin and super_admin can update
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Anda harus login untuk melakukan update' }
  }
  
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Anda tidak memiliki izin untuk melakukan update. Hanya Admin dan Super Admin yang dapat mengubah status.' }
  }

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
