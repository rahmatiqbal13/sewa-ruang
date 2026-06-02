'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminDbClient } from '@/lib/supabase/server'

export async function cancelBookingAction(bookingId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesi habis, silakan login kembali' }

  // Use admin client to bypass RLS, but verify ownership first
  const adminDb = createAdminDbClient()

  const { data: booking, error: fetchError } = await adminDb
    .from('bookings')
    .select('id, status, user_id')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) return { success: false, error: 'Pengajuan tidak ditemukan' }
  if (booking.user_id !== user.id) return { success: false, error: 'Tidak diizinkan membatalkan pengajuan ini' }
  if (booking.status !== 'pending') return { success: false, error: 'Hanya pengajuan berstatus pending yang dapat dibatalkan' }

  const { error: updateError } = await adminDb
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (updateError) return { success: false, error: 'Gagal membatalkan pengajuan' }

  return { success: true }
}
