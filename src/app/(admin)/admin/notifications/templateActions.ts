'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface TemplateData {
  event_type: string
  channel: 'email' | 'whatsapp' | 'telegram'
  subject?: string | null
  body: string
}

export async function saveTemplate(data: TemplateData) {
  try {
    const supabase = await createClient()

    // Insert/Update template (RLS sudah disabled, jadi bisa langsung)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase
      .from('notification_templates') as any)
      .upsert(
        {
          event_type: data.event_type,
          channel: data.channel,
          subject: data.channel === 'email' ? data.subject : null,
          body: data.body,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_type,channel' }
      )

    if (error) {
      console.error('Error saving template:', error)
      return { error: error.message }
    }

    revalidatePath('/admin/notifications')
    return { success: true }

  } catch (error: any) {
    console.error('Server action error:', error)
    return { error: error.message || 'Terjadi kesalahan' }
  }
}
