'use server'

import { createAdminDbClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ItemType = 'equipment' | 'room' | 'inventory'

function getTable(type: ItemType) {
  if (type === 'equipment') return 'equipment'
  if (type === 'room') return 'rooms'
  return 'room_inventories'
}

// Restore payload: clear deleted_at and re-activate the item
function getRestorePayload() {
  return { is_active: true, deleted_at: null }
}

export async function restoreItem(id: string, type: ItemType) {
  const sb = createAdminDbClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (sb as any).from(getTable(type)).update(getRestorePayload()).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/super-admin/trash')
  return { success: true }
}

export async function hardDeleteItem(id: string, type: ItemType) {
  const sb = createAdminDbClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (sb as any).from(getTable(type)).delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/super-admin/trash')
  return { success: true }
}

export async function hardDeleteMany(ids: string[], type: ItemType) {
  const sb = createAdminDbClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (sb as any).from(getTable(type)).delete().in('id', ids)
  if (error) return { error: error.message }
  revalidatePath('/super-admin/trash')
  return { success: true }
}

export async function restoreMany(ids: string[], type: ItemType) {
  const sb = createAdminDbClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (sb as any).from(getTable(type)).update(getRestorePayload()).in('id', ids)
  if (error) return { error: error.message }
  revalidatePath('/super-admin/trash')
  return { success: true }
}
