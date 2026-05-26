'use server'

import { createAdminDbClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addEquipmentCheck(formData: FormData) {
  const equipmentId = formData.get('equipment_id') as string
  const condition = formData.get('condition') as string
  const notes = formData.get('notes') as string
  const checkedByName = formData.get('checked_by_name') as string

  if (!equipmentId || !condition) {
    return { error: 'Equipment ID dan kondisi wajib diisi' }
  }

  const adminDb = createAdminDbClient()

  const { error } = await adminDb
    .from('equipment_checks')
    .insert({
      equipment_id: equipmentId,
      condition,
      notes: notes || null,
      checked_by_name: checkedByName || null,
      checked_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Error inserting equipment check:', error)
    return { error: error.message }
  }

  revalidatePath(`/admin/equipment/${formData.get('slug')}`)
  revalidatePath(`/equipment/${formData.get('slug')}`)
  return { success: true }
}
