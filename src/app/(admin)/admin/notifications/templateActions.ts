'use server'

import { createClient, createAdminDbClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface TemplateData {
  event_type: string
  channel: 'email' | 'whatsapp' | 'telegram'
  user_category: string
  subject?: string | null
  body: string
}

export async function saveTemplate(data: TemplateData) {
  try {
    const supabase = await createClient()
    const adminDb = createAdminDbClient()

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Unauthorized - Silakan login' }
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!['admin', 'super_admin'].includes((userData as { role: string } | null)?.role ?? '')) {
      return { error: 'Forbidden - Hanya admin yang bisa menyimpan template' }
    }

    // Insert/Update template using service role bypass RLS
     
    const { error } = await adminDb
      .from('notification_templates')
      .upsert(
        {
          event_type: data.event_type,
          channel: data.channel,
          user_category: data.user_category,
          subject: data.channel === 'email' ? data.subject : null,
          body: data.body,
          is_active: true,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        { onConflict: 'event_type,channel,user_category' }
      )

    if (error) {
      console.error('Error saving template:', error)
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
