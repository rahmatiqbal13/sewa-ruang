'use server'

import { createClient, createAdminDbClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ChannelConfig {
  channel: 'email' | 'whatsapp' | 'telegram'
  is_enabled: boolean
  config: Record<string, string>
}

export async function saveChannelConfig(data: ChannelConfig) {
  try {
    const supabase = await createClient()
    const adminDb = createAdminDbClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized - Silakan login' }
    }

    // Check user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return { error: 'Gagal verifikasi user' }
    }

    const role = (userData as { role: string }).role
    if (!['admin', 'super_admin'].includes(role)) {
      return { error: 'Forbidden - Hanya admin yang bisa mengubah konfigurasi' }
    }

    // Insert/Update using service role bypass RLS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await adminDb
      .from('notification_channel_configs')
      .upsert(
        {
          channel: data.channel,
          is_enabled: data.is_enabled,
          config: data.config,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        } as any,
        { onConflict: 'channel' }
      )

    if (error) {
      console.error('Error saving config:', error)
      return { error: error.message }
    }

    revalidatePath('/admin/notifications')
    return { success: true }

  } catch (error: unknown) {
    console.error('Server action error:', error)
    const msg = error instanceof Error ? error.message : 'Terjadi kesalahan'
    return { error: msg }
  }
}
