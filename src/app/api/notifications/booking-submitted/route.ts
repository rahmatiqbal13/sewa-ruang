import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { telegramService } from '@/lib/services/telegramService'

export async function POST(req: NextRequest) {
  try {
    const { booking_id } = await req.json()

    if (!booking_id) {
      return NextResponse.json(
        { error: 'Missing booking_id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get booking details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: booking } = await (supabase.from('bookings') as any)
      .select(`
        *,
        users!user_id(name, email, phone, institution),
        booking_items(item_type, rooms:room_id(name), equipment:equipment_id(name))
      `)
      .eq('id', booking_id)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Send Telegram notification to admin (if configured)
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
    if (chatId) {
      try {
        const message = telegramService.generateNotificationMessage(booking, 'new')
        await telegramService.sendMessage({ chatId, message })
      } catch (err) {
        console.error('Telegram notification failed:', err)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Notification sent' 
    })

  } catch (error: any) {
    console.error('Booking submitted notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification', details: error.message },
      { status: 500 }
    )
  }
}
