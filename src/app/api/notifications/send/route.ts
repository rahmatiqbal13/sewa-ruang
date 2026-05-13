import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { emailService } from '@/lib/services/emailService'
import { whatsappService } from '@/lib/services/whatsappService'
import { telegramService } from '@/lib/services/telegramService'

export async function POST(req: NextRequest) {
  try {
    const { bookingId, channels, customMessage } = await req.json()

    if (!bookingId || !channels || channels.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify admin access
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!['admin', 'super_admin'].includes((userData as any)?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        users!user_id(name, email, phone, institution),
        booking_items(item_type, room:room_id(name), equipment:equipment_id(name))
      `)
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const results: Record<string, any> = {}

    // Send Email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (channels.includes('email') && (booking as any).users?.email) {
      const emailTemplate = emailService.generateBookingConfirmationEmail(booking)
      const result = await emailService.sendEmail({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        to: (booking as any).users.email,
        subject: emailTemplate.subject,
        html: customMessage || emailTemplate.html,
      })
      results.email = result

      // Log notification
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('notifications') as any).insert({
        booking_id: bookingId,
        user_id: user.id,
        channel: 'email',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recipient: (booking as any).users.email,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
      })
    }

    // Send WhatsApp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (channels.includes('whatsapp') && (booking as any).users?.phone) {
      const message = customMessage || whatsappService.generateBookingConfirmationMessage(booking)
      const result = await whatsappService.sendMessage({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        to: (booking as any).users.phone,
        message: message,
      })
      results.whatsapp = result

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('notifications') as any).insert({
        booking_id: bookingId,
        user_id: user.id,
        channel: 'whatsapp',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recipient: (booking as any).users.phone,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
      })
    }

    // Send Telegram
    if (channels.includes('telegram')) {
      const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
      if (chatId) {
        const message = telegramService.generateNotificationMessage(booking, 'new')
        const result = await telegramService.sendMessage({
          chatId,
          message: customMessage || message,
        })
        results.telegram = result

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('notifications') as any).insert({
          booking_id: bookingId,
          user_id: user.id,
          channel: 'telegram',
          recipient: chatId,
          status: result.success ? 'sent' : 'failed',
          error_message: result.error || null,
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: 'Notifications sent successfully' 
    })

  } catch (error: any) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications', details: error.message },
      { status: 500 }
    )
  }
}
