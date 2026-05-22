import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { emailService } from '@/lib/services/emailService'
import { whatsappService } from '@/lib/services/whatsappService'

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

    const supabase = await createClient()
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

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
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
