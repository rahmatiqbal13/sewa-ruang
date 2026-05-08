'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Soft delete equipment (set is_active to false)
 */
export async function softDeleteEquipment(equipmentId: string) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { error } = await sb
      .from('equipment')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', equipmentId)

    if (error) {
      return { success: false, message: error.message }
    }

    revalidatePath('/admin/equipment')
    return { success: true, message: 'Alat berhasil dinonaktifkan' }
  } catch (error) {
    console.error('Soft delete error:', error)
    return { success: false, message: 'Terjadi kesalahan saat menonaktifkan alat' }
  }
}

/**
 * Restore equipment (set is_active to true)
 */
export async function restoreEquipment(equipmentId: string) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { error } = await sb
      .from('equipment')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', equipmentId)

    if (error) {
      return { success: false, message: error.message }
    }

    revalidatePath('/admin/equipment')
    return { success: true, message: 'Alat berhasil diaktifkan kembali' }
  } catch (error) {
    console.error('Restore error:', error)
    return { success: false, message: 'Terjadi kesalahan saat mengaktifkan alat' }
  }
}

/**
 * Bulk soft delete equipment
 */
export async function bulkSoftDeleteEquipment(equipmentIds: string[]) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { error } = await sb
      .from('equipment')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .in('id', equipmentIds)

    if (error) {
      return { success: false, message: error.message }
    }

    revalidatePath('/admin/equipment')
    return { success: true, message: `${equipmentIds.length} alat berhasil dinonaktifkan` }
  } catch (error) {
    console.error('Bulk soft delete error:', error)
    return { success: false, message: 'Terjadi kesalahan saat menonaktifkan alat' }
  }
}

/**
 * Bulk restore equipment
 */
export async function bulkRestoreEquipment(equipmentIds: string[]) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { error } = await sb
      .from('equipment')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .in('id', equipmentIds)

    if (error) {
      return { success: false, message: error.message }
    }

    revalidatePath('/admin/equipment')
    return { success: true, message: `${equipmentIds.length} alat berhasil diaktifkan kembali` }
  } catch (error) {
    console.error('Bulk restore error:', error)
    return { success: false, message: 'Terjadi kesalahan saat mengaktifkan alat' }
  }
}
