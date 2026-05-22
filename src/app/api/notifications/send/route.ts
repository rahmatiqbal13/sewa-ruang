import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { emailService } from '@/lib/services/emailService'
import { whatsappService } from '@/lib/services/whatsappService'
import { buildVars, applyVars, categoryKey } from '@/lib/notifications/templateVars'

// Default fallback subjects per event_type (used if template has no subject)
const DEFAULT_SUBJECTS: Record<string, string> = {
  booking_submitted: 'Pengajuan Peminjaman Diterima - {{no_booking}}',
  booking_approved:  'Pengajuan Disetujui - {{no_booking}}',
  booking_rejected:  'Pengajuan Tidak Disetujui - {{no_booking}}',
  booking_cancelled: 'Peminjaman Dibatalkan - {{no_booking}}',
  payment_received:  'Pembayaran Dikonfirmasi - {{no_booking}}',
  booking_reminder:  'Pengingat Peminjaman - {{no_booking}}',
}

// Default fallback bodies — used only if no template in DB for this event+channel+category
const DEFAULT_BODIES: Record<string, Record<string, string>> = {
  booking_submitted: {
    email:    'Halo {{nama}},\n\nPengajuan peminjaman Anda ({{no_booking}}) telah diterima dan sedang diproses.\n\nAset: {{ruangan}}\nTanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n\nTerima kasih,\nTim Admin',
    whatsapp: 'Halo {{nama}}! Pengajuan *{{no_booking}}* untuk {{ruangan}} ({{tanggal_mulai}} s/d {{tanggal_selesai}}) telah diterima. Kami akan segera memprosesnya.',
    telegram: '📋 Halo {{nama}}!\n\nPengajuan <code>{{no_booking}}</code> untuk {{ruangan}} telah diterima.\n\n📅 {{tanggal_mulai}} s/d {{tanggal_selesai}}\n\nKami akan segera memproses.',
  },
  booking_approved: {
    email:    'Halo {{nama}},\n\nSelamat! Pengajuan Anda ({{no_booking}}) telah DISETUJUI.\n\nAset: {{ruangan}}\nTanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\nTotal: {{total_biaya}}\n\nSilakan lakukan pembayaran untuk mengkonfirmasi.\n\nTerima kasih,\nTim Admin',
    whatsapp: '✅ Selamat {{nama}}! Pengajuan *{{no_booking}}* telah *DISETUJUI*.\n\nAset: {{ruangan}}\nTanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\nTotal: {{total_biaya}}\n\nSilakan lakukan pembayaran.',
    telegram: '✅ Selamat {{nama}}!\n\nPengajuan <code>{{no_booking}}</code> telah <b>DISETUJUI</b>.\n\nAset: {{ruangan}}\n📅 {{tanggal_mulai}} s/d {{tanggal_selesai}}\n💰 {{total_biaya}}\n\nSilakan lakukan pembayaran.',
  },
  booking_rejected: {
    email:    'Halo {{nama}},\n\nMohon maaf, pengajuan Anda ({{no_booking}}) tidak dapat disetujui.\n\n{{catatan_admin}}\n\nSilakan hubungi kami untuk informasi lebih lanjut.\n\nTerima kasih,\nTim Admin',
    whatsapp: 'Mohon maaf {{nama}}, pengajuan *{{no_booking}}* tidak dapat disetujui.\n\n{{catatan_admin}}\n\nSilakan hubungi admin.',
    telegram: '❌ Mohon maaf {{nama}},\n\nPengajuan <code>{{no_booking}}</code> tidak dapat disetujui.\n\n{{catatan_admin}}',
  },
  booking_cancelled: {
    email:    'Halo {{nama}},\n\nPeminjaman Anda ({{no_booking}}) telah dibatalkan.\n\n{{catatan_admin}}\n\nTerima kasih,\nTim Admin',
    whatsapp: 'Halo {{nama}}, peminjaman *{{no_booking}}* telah dibatalkan.\n\n{{catatan_admin}}',
    telegram: '🚫 Halo {{nama}},\n\nPeminjaman <code>{{no_booking}}</code> telah dibatalkan.\n\n{{catatan_admin}}',
  },
  payment_received: {
    email:    'Halo {{nama}},\n\nPembayaran untuk peminjaman Anda ({{no_booking}}) telah dikonfirmasi. Peminjaman Anda LUNAS.\n\nAset: {{ruangan}}\nTanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n\nHarap datang tepat waktu.\n\nTerima kasih,\nTim Admin',
    whatsapp: '💳 Halo {{nama}}! Pembayaran *{{no_booking}}* telah dikonfirmasi. Peminjaman Anda LUNAS!\n\nAset: {{ruangan}}\nTanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n\nHarap datang tepat waktu.',
    telegram: '💳 Halo {{nama}}!\n\nPembayaran <code>{{no_booking}}</code> telah dikonfirmasi. Peminjaman LUNAS.\n\nAset: {{ruangan}}\n📅 {{tanggal_mulai}} s/d {{tanggal_selesai}}\n\n✅ Harap datang tepat waktu.',
  },
  booking_reminder: {
    email:    'Halo {{nama}},\n\nIni adalah pengingat bahwa peminjaman Anda ({{no_booking}}) akan segera dimulai.\n\nAset: {{ruangan}}\nMulai: {{tanggal_mulai}}\nSelesai: {{tanggal_selesai}}\n\nHarap datang tepat waktu.\n\nTerima kasih,\nTim Admin',
    whatsapp: '⏰ *Pengingat* Halo {{nama}}! Peminjaman *{{no_booking}}* akan dimulai {{tanggal_mulai}}.\n\nAset: {{ruangan}}\n\nHarap datang tepat waktu!',
    telegram: '⏰ <b>Pengingat Peminjaman</b>\n\nHalo {{nama}}!\n\nPeminjaman <code>{{no_booking}}</code> dimulai {{tanggal_mulai}}.\n\nAset: {{ruangan}}\n\nHarap datang tepat waktu!',
  },
}

async function getTemplate(
  sb: ReturnType<typeof Object.create>,
  eventType: string,
  channel: string,
  userCategory: string,
): Promise<{ subject: string | null; body: string } | null> {
  // Try exact category match first, then fall back to 'default'
  const categories = userCategory !== 'default' ? [userCategory, 'default'] : ['default']

  for (const cat of categories) {
    const { data } = await sb
      .from('notification_templates')
      .select('subject, body, is_active')
      .eq('event_type', eventType)
      .eq('channel', channel)
      .eq('user_category', cat)
      .eq('is_active', true)
      .maybeSingle()

    if (data) return { subject: data.subject ?? null, body: data.body }
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      bookingId,
      channels,
      event_type: eventType = 'booking_submitted',
      customMessage,
    } = body

    if (!bookingId || !channels || channels.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify admin access
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!['admin', 'super_admin'].includes((userData as any)?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Rate limit: 60 s per booking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lastNotif } = await (supabase.from('notifications') as any)
      .select('created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastNotif) {
      const secs = (Date.now() - new Date(lastNotif.created_at).getTime()) / 1000
      if (secs < 60) {
        return NextResponse.json(
          { error: 'Terlalu sering. Tunggu 60 detik sebelum kirim notifikasi lagi.' },
          { status: 429 },
        )
      }
    }

    // Fetch booking with user borrower_category
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data: booking } = await sb
      .from('bookings')
      .select(`
        id, reference_no, status, start_datetime, end_datetime,
        total_amount, admin_notes,
        users!user_id(name, email, phone, institution, borrower_category),
        booking_items(
          item_type,
          rooms:room_id(name),
          equipment:equipment_id(name)
        )
      `)
      .eq('id', bookingId)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const vars = buildVars(booking)
    const catKey = categoryKey(booking.users?.borrower_category)

    // Load telegram config from DB
    const adminSb = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tgRow } = await (adminSb.from('notification_channel_configs') as any)
      .select('is_enabled, config')
      .eq('channel', 'telegram')
      .maybeSingle()

    const tgEnabled: boolean = tgRow?.is_enabled === true
    const tgCfg: { bot_token?: string; admin_chat_id?: string } = tgRow?.config ?? {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Record<string, any> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminSbQ = adminSb as any

    for (const channel of channels as string[]) {
      // If admin provided a custom message, use it directly
      if (customMessage) {
        // Just send raw — no template processing
        if (channel === 'email' && booking.users?.email) {
          const subject = applyVars(DEFAULT_SUBJECTS[eventType] ?? 'Notifikasi Peminjaman', vars)
          const result = await emailService.sendEmail({
            to: booking.users.email,
            subject,
            html: customMessage.replace(/\n/g, '<br>'),
          })
          results[channel] = result
        } else if (channel === 'whatsapp' && booking.users?.phone) {
          results[channel] = await whatsappService.sendMessage({ to: booking.users.phone, message: customMessage })
        } else if (channel === 'telegram' && tgEnabled && tgCfg.bot_token && tgCfg.admin_chat_id) {
          const res = await fetch(`https://api.telegram.org/bot${tgCfg.bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: tgCfg.admin_chat_id, text: customMessage, parse_mode: 'HTML' }),
          })
          const d = await res.json()
          results[channel] = { success: d.ok, error: d.description }
        }
        continue
      }

      // Read template from DB
      const tpl = await getTemplate(adminSbQ, eventType, channel, catKey)
      const rawBody = tpl?.body ?? DEFAULT_BODIES[eventType]?.[channel] ?? ''
      const finalBody = applyVars(rawBody, vars)

      let result: { success: boolean; error?: string } = { success: false, error: 'Skipped' }

      if (channel === 'email' && booking.users?.email) {
        const rawSubject = tpl?.subject ?? DEFAULT_SUBJECTS[eventType] ?? 'Notifikasi Peminjaman'
        const subject = applyVars(rawSubject, vars)
        result = await emailService.sendEmail({
          to: booking.users.email,
          subject,
          html: finalBody.replace(/\n/g, '<br>'),
        })
      } else if (channel === 'whatsapp' && booking.users?.phone) {
        result = await whatsappService.sendMessage({ to: booking.users.phone, message: finalBody })
      } else if (channel === 'telegram' && tgEnabled && tgCfg.bot_token && tgCfg.admin_chat_id) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${tgCfg.bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: tgCfg.admin_chat_id,
              text: finalBody,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
            }),
          })
          const d = await res.json()
          result = { success: d.ok, error: d.description }
        } catch (err) {
          result = { success: false, error: err instanceof Error ? err.message : String(err) }
        }
      }

      results[channel] = result

      // Log to notifications table
      const recipient = channel === 'email' ? booking.users?.email
        : channel === 'whatsapp' ? booking.users?.phone
        : tgCfg.admin_chat_id ?? null

      await adminSbQ.from('notifications').insert({
        booking_id: bookingId,
        user_id: booking.users ? null : null, // log against booking, not admin
        channel,
        recipient,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
        title: applyVars(DEFAULT_SUBJECTS[eventType] ?? 'Notifikasi', vars),
        body: finalBody.slice(0, 500),
        type: eventType,
      })
    }

    return NextResponse.json({ success: true, results })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Send notification error:', msg)
    return NextResponse.json({ error: 'Failed to send notifications', details: msg }, { status: 500 })
  }
}
