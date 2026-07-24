import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { telegramService } from '@/lib/services/telegramService'
import { emailService } from '@/lib/services/emailService'
import { generateUSCBookingDocument } from '@/lib/pdf-generator'
import puppeteer from 'puppeteer-core'
import fs from 'fs'

// Consistent with formulir/route.ts (changelog #9)
const MEMBERSHIP_LABELS: Record<string, string> = {
  mahasiswa_s1: 'Mahasiswa S1',
  mahasiswa_s2: 'Mahasiswa Pasca Sarjana',
  dosen: 'Dosen/Karyawan',
  staff: 'Dosen/Karyawan',
  mou_unesa: 'Kerjasama',
  umum: 'Umum',
  borrower: 'Umum',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

// Mirror of getChromeExecutablePath() in formulir/route.ts (changelog #2)
function getChromeExecutablePath(): string | undefined {
  if (process.env.CHROME_EXECUTABLE_PATH) return process.env.CHROME_EXECUTABLE_PATH
  const platformPaths: Record<string, string[]> = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ],
  }
  for (const p of platformPaths[process.platform] ?? []) {
    try { if (fs.existsSync(p)) return p } catch { /* ignore */ }
  }
  return undefined
}

export async function POST(req: NextRequest) {
  try {
    const { booking_id } = await req.json()

    if (!booking_id) {
      return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
    }

    const supabase = await createClient()

    // Auth check — hanya user yang login yang boleh trigger notifikasi
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Fetch booking + VA accounts — no `price` in booking_items (column doesn't exist, changelog #1)
    const [{ data: booking }, { data: vaRows }] = await Promise.all([
      sb.from('bookings').select(`
        id, reference_no, total_amount, status,
        start_datetime, end_datetime, created_at,
        users!user_id(name, email, phone, institution, class_division, role),
        booking_items(
          id, item_type,
          rooms:room_id(name, room_code),
          equipment:equipment_id(name, equipment_code)
        )
      `).eq('id', booking_id).single(),

      // Use payment_method_type='va' filter, same as formulir/route.ts (changelog #6)
      sb.from('bank_accounts')
        .select('bank_name, virtual_account_number, account_name, category')
        .eq('is_active', true)
        .eq('payment_method_type', 'va'),
    ])

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Pastikan user adalah pemilik booking atau admin/super_admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userRow } = await sb.from('users').select('role').eq('id', user.id).single() as { data: any }
    const isAdmin = userRow?.role === 'admin' || userRow?.role === 'super_admin'
    const isOwner = booking.users?.id === user.id || (booking as any).user_id === user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Telegram notification — baca dari DB config
    try {
      const admin = await createAdminClient()
      const { data: tgRow } = await admin.from('notification_channel_configs')
        .select('is_enabled, config')
        .eq('channel', 'telegram')
        .single()

      const tgEnabled: boolean = tgRow?.is_enabled === true
      const tgCfg: { bot_token?: string; admin_chat_id?: string } = tgRow?.config ?? {}

      if (tgEnabled && tgCfg.bot_token && tgCfg.admin_chat_id) {
        const tgService = { sendMessage: telegramService.sendMessage.bind(telegramService) }
        // Override token dynamically using the DB value
        const apiUrl = `https://api.telegram.org/bot${tgCfg.bot_token}`
        const message = telegramService.generateAdminNotification(booking)
        await fetch(`${apiUrl}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgCfg.admin_chat_id,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        })
        void tgService // suppress unused warning
      }
    } catch (err) {
      console.error('Telegram notification failed:', err)
    }

    // PDF formulir email
    const userEmail = booking.users?.email
    const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

    if (smtpConfigured && userEmail) {
      try {
        const items = (booking.booking_items as Array<{
          item_type: 'room' | 'equipment';
          rooms?: { room_code?: string; name?: string };
          equipment?: { equipment_code?: string; name?: string };
        }>)?.map((item) => ({
          code: item.item_type === 'room'
            ? (item.rooms?.room_code || '-')
            : (item.equipment?.equipment_code || '-'),
          name: item.item_type === 'room'
            ? (item.rooms?.name || 'Ruangan')
            : (item.equipment?.name || 'Alat'),
          type: item.item_type as 'room' | 'equipment',
          price: 0, // price not stored in booking_items (changelog #1)
        })) || []

        const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

        const hasRoom      = items.some((i: { type: string }) => i.type === 'room')
        const hasEquipment = items.some((i: { type: string }) => i.type === 'equipment')

        // Find VA by category, same logic as formulir/route.ts (changelog #6)
        const vaByCategory = (cat: string) => {
          const va = (vaRows as Array<{ category: string; bank_name: string; virtual_account_number: string; account_name: string }>)?.find((v) => v.category === cat) ?? null
          if (!va) return null
          return { bankName: va.bank_name, accountNumber: va.virtual_account_number, accountName: va.account_name }
        }

        const docHtml = await generateUSCBookingDocument({
          referenceNo:    booking.reference_no,
          customerName:   booking.users?.name || '-',
          nim:            booking.users?.class_division || null,
          institution:    booking.users?.institution || null,
          phone:          booking.users?.phone || null,
          membershipType: MEMBERSHIP_LABELS[booking.users?.role] ?? 'Umum',
          startDate:      fmt(booking.start_datetime),
          endDate:        fmt(booking.end_datetime),
          items,
          total:          booking.total_amount || 0,
          hasRoom,
          hasEquipment,
          roomVA:         vaByCategory('room'),
          equipmentVA:    vaByCategory('equipment'),
        })

        let pdfAttachment: { filename: string; content: Buffer } | null = null
        const executablePath = getChromeExecutablePath()
        if (executablePath) {
          try {
            const browser = await puppeteer.launch({
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
              executablePath,
            })
            const page = await browser.newPage()
            await page.setContent(docHtml, { waitUntil: 'domcontentloaded' })
            const pdfBuffer = Buffer.from(await (page as unknown as { pdf: (opts: Record<string, unknown>) => Promise<Buffer> }).pdf({
              format: 'A4',
              printBackground: true,
              margin: { top: '0', right: '0', bottom: '0', left: '0' },
            }))
            await browser.close()
            pdfAttachment = { filename: `formulir-${booking.reference_no}.pdf`, content: pdfBuffer }
          } catch (pdfErr) {
            console.error('PDF generation failed, sending without attachment:', pdfErr)
          }
        } else {
          console.warn('Chrome not found — email sent without PDF attachment')
        }

        const { subject, html } = emailService.generateBookingConfirmationEmail(booking)
        await emailService.sendEmail({
          to: userEmail,
          subject,
          html,
          attachments: pdfAttachment ? [pdfAttachment] : undefined,
        })
      } catch (emailErr) {
        console.error('Formulir email failed:', emailErr)
      }
    }

    return NextResponse.json({ success: true, message: 'Notification sent' })

  } catch (error: unknown) {
    console.error('Booking submitted notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
