import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { telegramService } from '@/lib/services/telegramService'
import { emailService } from '@/lib/services/emailService'
import { generateUSCBookingDocument } from '@/lib/pdf-generator'
import puppeteer from 'puppeteer-core'

const MEMBERSHIP_LABELS: Record<string, string> = {
  mahasiswa_s1: 'Mahasiswa S1',
  mahasiswa_s2: 'Mahasiswa S2/S3',
  dosen: 'Dosen / Tenaga Pendidik',
  mou_unesa: 'MoU Unesa',
  umum: 'Umum',
  staff: 'Staff',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

export async function POST(req: NextRequest) {
  try {
    const { booking_id } = await req.json()

    if (!booking_id) {
      return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch booking + primary active VA in parallel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [{ data: booking }, { data: vaRows }] = await Promise.all([
      sb.from('bookings').select(`
        id, reference_no, total_amount, status,
        start_datetime, end_datetime, created_at,
        users!user_id(name, email, phone, institution, class_division, role),
        booking_items(
          id, item_type, price,
          rooms:room_id(name, room_code),
          equipment:equipment_id(name, equipment_code)
        )
      `).eq('id', booking_id).single(),

      sb.from('bank_accounts')
        .select('bank_name, virtual_account_number, account_name')
        .eq('is_active', true)
        .eq('is_primary', true)
        .limit(1),
    ])

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Telegram notification
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
    if (chatId) {
      try {
        const message = telegramService.generateNotificationMessage(booking, 'new')
        await telegramService.sendMessage({ chatId, message })
      } catch (err) {
        console.error('Telegram notification failed:', err)
      }
    }

    // PDF invoice email
    const userEmail = booking.users?.email
    const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

    if (smtpConfigured && userEmail) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = (booking.booking_items as any[])?.map((item: any) => ({
          code: item.item_type === 'room'
            ? (item.rooms?.room_code || '-')
            : (item.equipment?.equipment_code || '-'),
          name: item.item_type === 'room'
            ? (item.rooms?.name || 'Ruangan')
            : (item.equipment?.name || 'Alat'),
          type: item.item_type as 'room' | 'equipment',
          price: item.price || 0,
        })) || []

        const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        const primaryVA = vaRows?.[0] ?? null

        const docHtml = await generateUSCBookingDocument({
          referenceNo: booking.reference_no,
          customerName: booking.users?.name || '-',
          nim: booking.users?.class_division || null,
          institution: booking.users?.institution || null,
          phone: booking.users?.phone || null,
          membershipType: MEMBERSHIP_LABELS[booking.users?.role] || booking.users?.role || null,
          startDate: fmt(booking.start_datetime),
          endDate: fmt(booking.end_datetime),
          items,
          total: booking.total_amount || 0,
          paymentVA: primaryVA ? {
            bankName: primaryVA.bank_name,
            accountNumber: primaryVA.virtual_account_number,
            accountName: primaryVA.account_name,
          } : null,
        })

        let pdfAttachment: { filename: string; content: Buffer } | null = null
        try {
          const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
          })
          const page = await browser.newPage()
          await page.setContent(docHtml, { waitUntil: 'domcontentloaded' })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfBuffer = Buffer.from(await (page as any).pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
          }))
          await browser.close()
          pdfAttachment = { filename: `formulir-${booking.reference_no}.pdf`, content: pdfBuffer }
        } catch (pdfErr) {
          console.error('PDF generation failed, sending without attachment:', pdfErr)
        }

        const { subject, html } = emailService.generateBookingConfirmationEmail(booking)
        await emailService.sendEmail({
          to: userEmail,
          subject,
          html,
          attachments: pdfAttachment ? [pdfAttachment] : undefined,
        })
      } catch (emailErr) {
        console.error('Invoice email failed:', emailErr)
      }
    }

    return NextResponse.json({ success: true, message: 'Notification sent' })

  } catch (error: any) {
    console.error('Booking submitted notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification', details: error.message },
      { status: 500 }
    )
  }
}
