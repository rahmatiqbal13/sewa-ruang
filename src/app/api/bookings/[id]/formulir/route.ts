import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateUSCBookingDocument } from '@/lib/pdf-generator'
import { emailService } from '@/lib/services/emailService'
import puppeteer from 'puppeteer-core'

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

async function fetchBookingData(bookingId: string) {
  const supabase = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [{ data: booking, error: bookingError }, { data: vaRows }] = await Promise.all([
    sb.from('bookings').select(`
      id, reference_no, total_amount, status,
      start_datetime, end_datetime, created_at,
      users!user_id(name, email, phone, institution, class_division, role, signature_url),
      booking_items(
        id, item_type,
        rooms:room_id(name, room_code, current_condition),
        equipment:equipment_id(name, equipment_code, current_condition)
      )
    `).eq('id', bookingId).single(),

    sb.from('bank_accounts')
      .select('bank_name, virtual_account_number, account_name, category')
      .eq('is_active', true)
      .eq('payment_method_type', 'va'),
  ])

  if (bookingError) {
    console.error('fetchBookingData error:', bookingError)
  }

  const bookingItems = booking?.booking_items || []
  const hasRoom = bookingItems.some((i: { item_type: string }) => i.item_type === 'room')
  const hasEquipment = bookingItems.some((i: { item_type: string }) => i.item_type === 'equipment')

  const roomVA = vaRows?.find((va: { category: string }) => va.category === 'room') ?? null
  const equipmentVA = vaRows?.find((va: { category: string }) => va.category === 'equipment') ?? null

  console.log('[fetchBookingData] booking found:', !!booking, 'ref:', booking?.reference_no, 'items:', bookingItems.length, 'hasRoom:', hasRoom, 'hasEquipment:', hasEquipment)

  return { booking, roomVA, equipmentVA, hasRoom, hasEquipment }
}

async function buildDocHtml(
  booking: {
    reference_no: string;
    start_datetime: string;
    end_datetime: string;
    total_amount: number;
    users?: {
      name?: string;
      class_division?: string;
      institution?: string;
      phone?: string;
      role?: string;
      signature_url?: string | null;
    };
    booking_items?: Array<{
      item_type: 'room' | 'equipment';
      rooms?: { room_code?: string; name?: string; current_condition?: string };
      equipment?: { equipment_code?: string; name?: string; current_condition?: string };
      price?: number;
    }>;
  },
  roomVA: { bank_name: string; virtual_account_number: string; account_name: string } | null,
  equipmentVA: { bank_name: string; virtual_account_number: string; account_name: string } | null,
  hasRoom: boolean,
  hasEquipment: boolean
): Promise<string> {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

  const CONDITION_LABELS: Record<string, string> = {
    good: 'Baik',
    needs_repair: 'Perlu Perbaikan',
    damaged: 'Rusak',
    lost: 'Hilang',
  }

  const items = (booking.booking_items as Array<{
    item_type: 'room' | 'equipment';
    rooms?: { room_code?: string; name?: string; current_condition?: string };
    equipment?: { equipment_code?: string; name?: string; current_condition?: string };
    price?: number;
  }>)?.map((item) => ({
    code: item.item_type === 'room'
      ? (item.rooms?.room_code || '-')
      : (item.equipment?.equipment_code || '-'),
    name: item.item_type === 'room'
      ? (item.rooms?.name || 'Ruangan')
      : (item.equipment?.name || 'Alat'),
    type: item.item_type,
    price: item.price || 0,
    condition: item.item_type === 'room'
      ? CONDITION_LABELS[item.rooms?.current_condition || ''] || (item.rooms?.current_condition || '-')
      : CONDITION_LABELS[item.equipment?.current_condition || ''] || (item.equipment?.current_condition || '-'),
  })) || []

  return generateUSCBookingDocument({
    referenceNo: booking.reference_no,
    customerName: booking.users?.name || '-',
    nim: booking.users?.class_division || null,
    institution: booking.users?.institution || null,
    phone: booking.users?.phone || null,
    membershipType: MEMBERSHIP_LABELS[booking.users?.role || ''] || 'Umum',
    startDate: fmt(booking.start_datetime),
    endDate: fmt(booking.end_datetime),
    items,
    total: booking.total_amount || 0,
    roomVA: roomVA ? {
      bankName: roomVA.bank_name,
      accountNumber: roomVA.virtual_account_number,
      accountName: roomVA.account_name,
    } : null,
    equipmentVA: equipmentVA ? {
      bankName: equipmentVA.bank_name,
      accountNumber: equipmentVA.virtual_account_number,
      accountName: equipmentVA.account_name,
    } : null,
    hasRoom,
    hasEquipment,
    signatureUrl: booking.users?.signature_url || null,
  })
}

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

  const paths = platformPaths[process.platform] || []
  for (const p of paths) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs')
      if (fs.existsSync(p)) return p
    } catch {
      // ignore
    }
  }
  return undefined
}

async function generatePDF(html: string): Promise<Buffer> {
  const executablePath = getChromeExecutablePath()
  console.log('[generatePDF] Chrome path:', executablePath)

  if (!executablePath) {
    throw new Error(
      'Chrome executable not found. Set CHROME_EXECUTABLE_PATH in .env.local'
    )
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath,
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
     
    const buf = Buffer.from(await (page as unknown as { pdf: (opts: Record<string, unknown>) => Promise<Buffer> }).pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    }))
    await browser.close()
    console.log('[generatePDF] PDF buffer size:', buf.length, 'bytes')
    return buf
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generatePDF] Error generating PDF:', msg)
    throw err
  }
}

// GET — download or preview PDF
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params
    const { searchParams } = new URL(req.url)
    const isPreview = searchParams.get('preview') === '1'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!['admin', 'super_admin'].includes((me as { role?: string })?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { booking, roomVA, equipmentVA, hasRoom, hasEquipment } = await fetchBookingData(bookingId)
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const html = await buildDocHtml(booking, roomVA, equipmentVA, hasRoom, hasEquipment)
    console.log('[formulir GET] HTML length:', html.length, 'chars')

    try {
      const pdfBuffer = await generatePDF(html)
      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': isPreview
            ? `inline; filename="formulir-${booking.reference_no}.pdf"`
            : `attachment; filename="formulir-${booking.reference_no}.pdf"`,
        },
      })
  } catch (pdfErr: unknown) {
    console.error('[formulir GET] Fallback to HTML because PDF failed:', pdfErr instanceof Error ? pdfErr.message : String(pdfErr))
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': isPreview
            ? `inline; filename="formulir-${booking.reference_no}.html"`
            : `attachment; filename="formulir-${booking.reference_no}.html"`,
        },
      })
    }
  } catch (error: unknown) {
    console.error('Formulir download error:', error)
    return NextResponse.json({ error: 'Failed to generate document', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

// POST — resend PDF via email
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!['admin', 'super_admin'].includes((me as { role?: string })?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { booking, roomVA, equipmentVA, hasRoom, hasEquipment } = await fetchBookingData(bookingId)
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const userEmail = booking.users?.email
    if (!userEmail) return NextResponse.json({ error: 'Borrower has no email address' }, { status: 400 })

    const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    if (!smtpConfigured) return NextResponse.json({ error: 'SMTP not configured' }, { status: 503 })

    const html = await buildDocHtml(booking, roomVA, equipmentVA, hasRoom, hasEquipment)

    let pdfAttachment: { filename: string; content: Buffer } | null = null
    try {
      const pdfBuffer = await generatePDF(html)
      pdfAttachment = { filename: `formulir-${booking.reference_no}.pdf`, content: pdfBuffer }
    } catch (err) {
      console.error('PDF generation failed:', err)
    }

    const result = await emailService.sendEmail({
      to: userEmail,
      subject: `Formulir & Invoice Peminjaman - ${booking.reference_no}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1e3d70;">Formulir & Invoice Peminjaman</h2>
          <p>Halo <strong>${booking.users?.name}</strong>,</p>
          <p>Terlampir formulir peminjaman dan invoice untuk pengajuan Anda.</p>
          <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:15px 0;">
            <strong>No. Referensi:</strong> ${booking.reference_no}<br/>
            <strong>Status:</strong> ${booking.status.replace(/_/g, ' ').toUpperCase()}
          </div>
          <p style="color:#64748b;font-size:12px;margin-top:20px;">
            Email ini dikirim ulang secara manual oleh admin.
          </p>
        </div>
      `,
      attachments: pdfAttachment ? [pdfAttachment] : undefined,
    })

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to send email', details: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Email sent to ${userEmail}` })
  } catch (error: unknown) {
    console.error('Formulir resend error:', error)
    return NextResponse.json({ error: 'Failed to resend', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
