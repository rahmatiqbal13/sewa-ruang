import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminSb } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, sendTelegram, replaceVars } from '@/lib/notifications/sender'

function toWaUrl(phone: string, message: string): string {
  let num = phone.replace(/\D/g, '')
  if (num.startsWith('0')) num = '62' + num.slice(1)
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

function adminClient() {
  return createAdminSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const CHANNELS = ['email', 'telegram'] as const

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_type, booking_id } = await req.json()
  if (!event_type || !booking_id) {
    return NextResponse.json({ error: 'event_type and booking_id are required' }, { status: 400 })
  }

  const admin = adminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any

  const [{ data: booking }, { data: channelConfigs }, { data: templates }] = await Promise.all([
    sb.from('bookings')
      .select(`
        id, status, admin_notes, start_datetime, end_datetime, reference_no, user_id,
        booking_user:user_id (name, email, phone, telegram_username),
        booking_assets (assets (name))
      `)
      .eq('id', booking_id)
      .single() as Promise<{ data: Record<string, unknown> | null }>,

    sb.from('notification_channel_configs')
      .select('channel, is_enabled, config') as Promise<{ data: Array<{ channel: string; is_enabled: boolean; config: Record<string, string> }> | null }>,

    sb.from('notification_templates')
      .select('channel, subject, body, is_active')
      .eq('event_type', event_type)
      .eq('is_active', true) as Promise<{ data: Array<{ channel: string; subject: string | null; body: string; is_active: boolean }> | null }>,
  ])

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const bookingUser = booking.booking_user as { name: string; email: string; phone: string | null; telegram_username: string | null } | null
  const bookingAssets = booking.booking_assets as Array<{ assets: { name: string } | null }> | null
  const assetName = bookingAssets?.[0]?.assets?.name ?? ''

  const vars: Record<string, string> = {
    nama: bookingUser?.name ?? '',
    no_booking: (booking.reference_no as string) || (booking.id as string).slice(0, 8).toUpperCase(),
    ruangan: assetName,
    tanggal_mulai: new Date(booking.start_datetime as string).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    tanggal_selesai: new Date(booking.end_datetime as string).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    status: booking.status as string,
    catatan_admin: (booking.admin_notes as string) ?? '-',
  }

  const results: { channel: string; status: string; error?: string }[] = []

  for (const ch of CHANNELS) {
    const cfg = channelConfigs?.find(c => c.channel === ch)
    if (!cfg?.is_enabled) continue

    const tpl = templates?.find(t => t.channel === ch)
    if (!tpl) continue

    const message = replaceVars(tpl.body, vars)

    try {
      if (ch === 'email' && bookingUser?.email) {
        const subject = replaceVars(tpl.subject ?? event_type, vars)
        await sendEmail(cfg.config as unknown as Parameters<typeof sendEmail>[0], bookingUser.email, subject, message)
        results.push({ channel: 'email', status: 'sent' })
      } else if (ch === 'telegram') {
        // Send to admin_chat_id — notifies admin of all booking events
        const chatId = (cfg.config as Record<string, string>).admin_chat_id
        if (chatId) {
          await sendTelegram(cfg.config as unknown as Parameters<typeof sendTelegram>[0], chatId, message)
          results.push({ channel: 'telegram', status: 'sent' })
        }
      }
    } catch (err) {
      results.push({ channel: ch, status: 'error', error: String(err) })
    }
  }

  // Generate wa.me link using WhatsApp template if available
  let whatsapp_url: string | null = null
  if (bookingUser?.phone) {
    const waTpl = templates?.find(t => t.channel === 'whatsapp')
    const waMessage = waTpl ? replaceVars(waTpl.body, vars) : message_for_event(event_type, vars)
    whatsapp_url = toWaUrl(bookingUser.phone, waMessage)
  }

  // Log in-app notification for the booking user
  if (booking.user_id && bookingUser?.name) {
    await sb.from('notifications').insert({
      user_id: booking.user_id,
      type: event_type,
      title: `Booking ${vars.no_booking}`,
      body: message_for_event(event_type, vars),
      link: `/bookings/${booking_id}`,
    })
  }

  return NextResponse.json({ ok: true, results, whatsapp_url })
}

function message_for_event(event_type: string, vars: Record<string, string>): string {
  switch (event_type) {
    case 'booking_submitted':  return `Pengajuan peminjaman ${vars.ruangan} sedang diproses.`
    case 'booking_approved':   return `Pengajuan ${vars.ruangan} disetujui. Silakan lakukan pembayaran.`
    case 'booking_rejected':   return `Pengajuan ${vars.ruangan} ditolak. Alasan: ${vars.catatan_admin}`
    case 'booking_cancelled':  return `Peminjaman ${vars.ruangan} dibatalkan.`
    case 'payment_received':   return `Pembayaran untuk ${vars.ruangan} berhasil dicatat.`
    default:                   return `Update status booking: ${vars.status}`
  }
}
