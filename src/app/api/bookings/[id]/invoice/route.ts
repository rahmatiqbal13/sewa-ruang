import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInvoiceHtml } from '@/lib/pdf-generator'
import puppeteer from 'puppeteer-core'
import fs from 'fs'

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
      if (fs.existsSync(p)) return p
    } catch {
      // ignore
    }
  }
  return undefined
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    // Verify user access
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role, name, email')
      .eq('id', user.id)
      .single()

    const isAdmin = ['admin', 'super_admin'].includes((userData as { role?: string })?.role ?? '')

    // Get booking details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data: booking, error: bookingError } = await sb
      .from('bookings')
      .select(`
        *,
        users!user_id(name, email, phone, institution),
        booking_items(
          id,
          item_type,
          room_id,
          equipment_id,
          rooms:room_id(name, room_code),
          equipment:equipment_id(name, equipment_code)
        ),
        payment_proofs(*)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check access - admin can view all, user can only view their own
    if (!isAdmin && booking.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Prepare invoice items
    interface InvoiceItem {
      name: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }
    const items: InvoiceItem[] = (booking as { booking_items?: Array<{
      item_type: string;
      rooms?: { name?: string; room_code?: string };
      equipment?: { name?: string; equipment_code?: string };
      price?: number;
    }> }).booking_items?.map((item) => {
      const name = item.item_type === 'room'
        ? item.rooms?.name || 'Ruangan'
        : item.equipment?.name || 'Alat'

      return {
        name,
        description: item.item_type === 'room'
          ? `Kode: ${item.rooms?.room_code || '-'}`
          : `Kode: ${item.equipment?.equipment_code || '-'}`,
        quantity: 1,
        unitPrice: item.price || 0,
        total: item.price || 0,
      }
    }) || []

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: InvoiceItem) => sum + item.total, 0)
    const total = booking.total_amount || subtotal

    // Generate invoice HTML
    const typedBooking = booking as {
      id: string;
      created_at: string;
      users?: { name?: string; email?: string };
      start_datetime: string;
      end_datetime: string;
      status: string;
    }
    const invoiceHtml = await generateInvoiceHtml({
      invoiceNumber: `INV-${typedBooking.id.substring(0, 8).toUpperCase()}`,
      invoiceDate: new Date(typedBooking.created_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      customerName: typedBooking.users?.name || 'Unknown',
      customerEmail: typedBooking.users?.email || '',
      items,
      subtotal,
      total,
      notes: `Tanggal Peminjaman: ${new Date(typedBooking.start_datetime).toLocaleDateString('id-ID')} - ${new Date(typedBooking.end_datetime).toLocaleDateString('id-ID')}\nStatus: ${typedBooking.status.toUpperCase()}`,
    })

    // Generate PDF using Puppeteer
    let pdfBuffer: Buffer

    try {
      const executablePath = getChromeExecutablePath()
      if (!executablePath) {
        throw new Error(
          'Chrome executable not found. Set CHROME_EXECUTABLE_PATH in .env.local'
        )
      }

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath,
      })

      const page = await browser.newPage()
      await page.setContent(invoiceHtml, { waitUntil: 'domcontentloaded' })

       
      pdfBuffer = Buffer.from(await (page as unknown as { pdf: (opts: Record<string, unknown>) => Promise<Buffer> }).pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      }))

      await browser.close()
    } catch (puppeteerError: unknown) {
      console.error('Puppeteer error:', puppeteerError)

      // Fallback: return HTML if PDF generation fails
      return new NextResponse(invoiceHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="invoice-${bookingId}.html"`,
        },
      })
    }

    // Return PDF
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${bookingId}.pdf"`,
      },
    })

  } catch (error: unknown) {
    console.error('Generate invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
