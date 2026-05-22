import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { emailService } from '@/lib/services/emailService'
import { whatsappService } from '@/lib/services/whatsappService'
import { sendTelegram } from '@/lib/notifications/sender'

// This endpoint should be called by a cron job every hour
// In Vercel: Configure in vercel.json or use Vercel Cron Jobs
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret — required, not optional
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('CRON_SECRET is not configured')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Get pending reminders
    const { data: pendingReminders, error } = await sb
      .rpc('process_pending_reminders')

    if (error) {
      console.error('Error fetching pending reminders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reminders' },
        { status: 500 }
      )
    }

    const results: any[] = []

    // Process each reminder
    for (const reminder of pendingReminders || []) {
      try {
        let result: { success: boolean; error?: string }

        // Get booking details
        const { data: booking } = await sb
          .from('bookings')
          .select(`
            *,
            booking_items(
              item_type,
              rooms:room_id(name),
              equipment:equipment_id(name)
            )
          `)
          .eq('id', reminder.booking_id)
          .single()

        if (!booking) {
          throw new Error('Booking not found')
        }

        // Prepare message based on reminder type
        let message = reminder.message
        const items = (booking as any).booking_items?.map((item: any) => 
          item.item_type === 'room' ? item.rooms?.name : item.equipment?.name
        ).join(', ')

        // Customize message based on type
        switch (reminder.reminder_type) {
          case 'before_start':
            message = `Pengingat: Peminjaman Anda akan dimulai besok (${new Date((booking as any).start_datetime).toLocaleDateString('id-ID')}). Item: ${items}`
            break
          case 'after_start':
            message = `Peminjaman Anda telah dimulai hari ini. Item: ${items}. Selamat menggunakan fasilitas!`
            break
          case 'before_end':
            message = `Pengingat: Peminjaman Anda akan berakhir besok (${new Date((booking as any).end_datetime).toLocaleDateString('id-ID')}). Jangan lupa mengembalikan: ${items}`
            break
          case 'after_end':
            message = `Hari ini (${new Date((booking as any).end_datetime).toLocaleDateString('id-ID')}) adalah tanggal pengembalian. Pastikan untuk mengembalikan dalam kondisi baik: ${items}`
            break
        }

        // Send based on channel
        switch (reminder.channel) {
          case 'email':
            if (reminder.user_email) {
              result = await emailService.sendEmail({
                to: reminder.user_email,
                subject: 'Pengingat Peminjaman - Sewa Ruang & Alat',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1e40af;">Pengingat Peminjaman</h2>
                    <p>${message}</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #6b7280;">
                      Ini adalah pesan otomatis dari sistem Sewa Ruang & Alat.
                    </p>
                  </div>
                `,
              })
            } else {
              result = { success: false, error: 'No email address' }
            }
            break

          case 'whatsapp':
            if (reminder.user_phone) {
              result = await whatsappService.sendMessage({
                to: reminder.user_phone,
                message: `*Pengingat Peminjaman*\n\n${message}\n\n_Sistem Sewa Ruang & Alat_`,
              })
            } else {
              result = { success: false, error: 'No phone number' }
            }
            break

          case 'telegram':
            if (tgEnabled && tgCfg.bot_token && tgCfg.admin_chat_id) {
              try {
                await sendTelegram(
                  { bot_token: tgCfg.bot_token, admin_chat_id: tgCfg.admin_chat_id },
                  tgCfg.admin_chat_id,
                  `🔔 <b>Pengingat Peminjaman</b>\n\n${message}\n\n<i>Sistem Sewa Ruang &amp; Alat</i>`,
                )
                result = { success: true }
              } catch (tgErr) {
                result = { success: false, error: tgErr instanceof Error ? tgErr.message : String(tgErr) }
              }
            } else {
              result = { success: false, error: 'Telegram not configured' }
            }
            break

          default:
            result = { success: false, error: 'Unsupported channel' }
        }

        // Mark reminder as sent or failed
        if (result.success) {
          await sb.rpc('mark_reminder_sent', { p_reminder_id: reminder.reminder_id })
        } else {
          await sb
            .from('booking_reminders')
            .update({ 
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', reminder.reminder_id)
        }

        results.push({
          reminder_id: reminder.reminder_id,
          booking_id: reminder.booking_id,
          type: reminder.reminder_type,
          channel: reminder.channel,
          success: result.success,
          error: result.error,
        })

      } catch (reminderError: any) {
        console.error('Error processing reminder:', reminderError)
        results.push({
          reminder_id: reminder.reminder_id,
          booking_id: reminder.booking_id,
          type: reminder.reminder_type,
          success: false,
          error: reminderError.message,
        })
      }
    }

    // ============================================================
    // LOAD NOTIFICATION CHANNEL CONFIGS FROM DB
    // ============================================================
    const { data: channelConfigs } = await sb
      .from('notification_channel_configs')
      .select('channel, is_enabled, config')
      .in('channel', ['telegram'])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tgRow = (channelConfigs ?? []).find((c: any) => c.channel === 'telegram')
    const tgEnabled: boolean = tgRow?.is_enabled === true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tgCfg: { bot_token?: string; admin_chat_id?: string } = tgRow?.config ?? {}

    // ============================================================
    // OVERDUE RETURN DETECTION
    // ============================================================
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const { data: overdueBookings } = await sb
      .from('bookings')
      .select(`
        id, reference_no, end_datetime,
        users!user_id(name, email, phone),
        booking_items(
          item_type,
          rooms:room_id(name),
          equipment:equipment_id(name)
        )
      `)
      .in('status', ['approved', 'paid'])
      .lt('end_datetime', now.toISOString())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdueResults: any[] = []

    for (const booking of (overdueBookings ?? [])) {
      try {
        // Skip if already notified today
        const { data: existing } = await sb
          .from('booking_reminders')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('reminder_type', 'custom')
          .gte('created_at', todayStart.toISOString())
          .limit(1)

        if (existing && existing.length > 0) continue

        const daysLate = Math.floor(
          (now.getTime() - new Date(booking.end_datetime).getTime()) / 86_400_000
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemNames = (booking.booking_items as any[])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ?.map((i: any) => (i.item_type === 'room' ? i.rooms?.name : i.equipment?.name))
          .filter(Boolean)
          .join(', ') || 'aset'

        const userName: string = booking.users?.name ?? 'Peminjam'
        const userEmail: string | undefined = booking.users?.email
        const userPhone: string | undefined = booking.users?.phone
        const endDateStr = new Date(booking.end_datetime).toLocaleDateString('id-ID', {
          day: '2-digit', month: 'long', year: 'numeric',
        })

        // Insert reminder row to deduplicate future runs today
        const { data: inserted } = await sb
          .from('booking_reminders')
          .insert({
            booking_id: booking.id,
            reminder_type: 'custom',
            scheduled_at: now.toISOString(),
            channel: 'email',
            message: `overdue:${daysLate}days`,
            status: 'pending',
          })
          .select('id')
          .single()

        const reminderRowId: string | undefined = inserted?.id

        const subject = `[TELAT KEMBALI] Peminjaman ${booking.reference_no} belum dikembalikan`
        const overdueHtml = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#dc2626;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
              <h2 style="margin:0;font-size:18px;">Aset Belum Dikembalikan</h2>
            </div>
            <div style="border:1px solid #fca5a5;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
              <p>Halo <strong>${userName}</strong>,</p>
              <p>Peminjaman Anda dengan nomor referensi <strong>${booking.reference_no}</strong>
                 sudah melewati batas pengembalian.</p>
              <table style="width:100%;border-collapse:collapse;margin:12px 0;">
                <tr>
                  <td style="padding:6px;color:#6b7280;width:160px;">Batas Pengembalian</td>
                  <td style="padding:6px;font-weight:bold;color:#dc2626;">${endDateStr}</td>
                </tr>
                <tr>
                  <td style="padding:6px;color:#6b7280;">Hari Terlambat</td>
                  <td style="padding:6px;font-weight:bold;color:#dc2626;">${daysLate} hari</td>
                </tr>
                <tr>
                  <td style="padding:6px;color:#6b7280;">Aset</td>
                  <td style="padding:6px;">${itemNames}</td>
                </tr>
              </table>
              <p>Mohon segera mengembalikan aset yang dipinjam. Hubungi admin jika ada kendala.</p>
              <p style="color:#6b7280;font-size:12px;margin-top:20px;">
                Pesan otomatis dari sistem Sewa Ruang &amp; Alat.
              </p>
            </div>
          </div>
        `

        let emailResult: { success: boolean; error?: string } = { success: false, error: 'No email' }
        const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
        if (userEmail && smtpConfigured) {
          emailResult = await emailService.sendEmail({ to: userEmail, subject, html: overdueHtml })
        }

        let waResult: { success: boolean; error?: string } = { success: false, error: 'No phone' }
        if (userPhone) {
          waResult = await whatsappService.sendMessage({
            to: userPhone,
            message: `*TELAT KEMBALI*\n\nHalo ${userName},\nPeminjaman *${booking.reference_no}* sudah *${daysLate} hari* melewati batas pengembalian.\n\nAset: ${itemNames}\nBatas: ${endDateStr}\n\nMohon segera mengembalikan. Hubungi admin jika ada kendala.\n\n_Sewa Ruang & Alat_`,
          })
        }

        // Telegram — kirim ke admin chat ID (bukan ke peminjam individual)
        let tgResult: { success: boolean; error?: string } = { success: false, error: 'Telegram not configured' }
        if (tgEnabled && tgCfg.bot_token && tgCfg.admin_chat_id) {
          try {
            await sendTelegram(
              { bot_token: tgCfg.bot_token, admin_chat_id: tgCfg.admin_chat_id },
              tgCfg.admin_chat_id,
              `⚠️ <b>BELUM DIKEMBALIKAN</b>\n\n👤 <b>${userName}</b>\n📋 <code>${booking.reference_no}</code>\n🗓 Batas: ${endDateStr}\n⏱ Terlambat: ${daysLate} hari\n📦 Aset: ${itemNames}\n\n<i>Notifikasi otomatis · ${new Date().toLocaleString('id-ID')}</i>`,
            )
            tgResult = { success: true }
          } catch (tgErr) {
            tgResult = { success: false, error: tgErr instanceof Error ? tgErr.message : String(tgErr) }
          }
        }

        const overallSuccess = emailResult.success || waResult.success || tgResult.success

        if (reminderRowId) {
          await sb
            .from('booking_reminders')
            .update({
              status: overallSuccess ? 'sent' : 'failed',
              sent_at: overallSuccess ? now.toISOString() : null,
              updated_at: now.toISOString(),
            })
            .eq('id', reminderRowId)
        }

        overdueResults.push({
          booking_id: booking.id,
          reference_no: booking.reference_no,
          days_late: daysLate,
          email: emailResult.success,
          whatsapp: waResult.success,
          telegram: tgResult.success,
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('Overdue notification error for booking', booking.id, msg)
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      overdue_checked: overdueBookings?.length ?? 0,
      overdue_notified: overdueResults.length,
      overdue_results: overdueResults,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('Process reminders error:', error)
    return NextResponse.json(
      { error: 'Failed to process reminders', details: error.message },
      { status: 500 }
    )
  }
}
