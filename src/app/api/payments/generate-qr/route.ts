import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

function generatePaymentCode(referenceNo: string): string {
  const ts = Date.now().toString(36).slice(-4).toUpperCase()
  return `PAY-${referenceNo}-${ts}`
}

// POST /api/payments/generate-qr
// Generate QR code for booking payment
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId } = await req.json()

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Get booking details
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: booking, error: bookingError } = await (supabase.from('bookings') as any)
      .select(`
        id,
        reference_no,
        total_amount,
        status,
        payment_code,
        user_id,
        users!user_id(name, email)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check if user owns this booking
    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if booking is in correct status
    if (!['pending', 'approved', 'pending_payment'].includes(booking.status)) {
      return NextResponse.json({ 
        error: `Cannot generate payment QR for status: ${booking.status}` 
      }, { status: 400 })
    }

    // Get primary bank account
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bankAccount } = await (supabase.from('bank_accounts') as any)
      .select('*')
      .eq('is_active', true)
      .eq('is_primary', true)
      .single()

    if (!bankAccount) {
      return NextResponse.json({ error: 'No active bank account found' }, { status: 500 })
    }

    // Ensure payment code exists
    let paymentCode = booking.payment_code
    if (!paymentCode) {
      paymentCode = generatePaymentCode(booking.reference_no)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('bookings') as any)
        .update({ status: 'pending_payment', payment_code: paymentCode })
        .eq('id', bookingId)

      if (updateError) {
        console.error('Error updating booking:', updateError)
        return NextResponse.json({ error: 'Failed to generate payment code' }, { status: 500 })
      }
    }

    // Get base URL from request origin
    const { origin } = new URL(req.url)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin

    // Generate QR content
    const qrContent = generateQRContent({
      bookingId,
      referenceNo: booking.reference_no,
      amount: booking.total_amount,
      paymentCode: paymentCode,
      bankName: bankAccount.bank_name,
      accountNumber: bankAccount.account_number,
      accountName: bankAccount.account_name,
      userName: booking.users?.name ?? booking.users?.email ?? 'Peminjam',
      baseUrl
    })

    // Generate QR code data URL
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })

    // Update booking with QR URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('bookings') as any)
      .update({ 
        payment_qr_url: qrDataUrl,
        status: 'pending_payment'
      })
      .eq('id', bookingId)

    return NextResponse.json({
      success: true,
      qrCode: qrDataUrl,
      qrContent: qrContent,
      paymentCode: paymentCode,
      bankAccount: {
        bankName: bankAccount.bank_name,
        accountNumber: bankAccount.account_number,
        accountName: bankAccount.account_name
      },
      amount: booking.total_amount,
      referenceNo: booking.reference_no
    })

  } catch (error) {
    console.error('Error generating payment QR:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Helper function to generate QR content
function generateQRContent({
  bookingId,
  referenceNo,
  amount,
  paymentCode,
  bankName,
  accountNumber,
  accountName,
  userName,
  baseUrl
}: {
  bookingId: string
  referenceNo: string
  amount: number
  paymentCode: string
  bankName: string
  accountNumber: string
  accountName: string
  userName?: string
  baseUrl: string
}) {
  return `
================================
SIMPORA - PEMBAYARAN SEWA
================================

No. Ref: ${referenceNo}
Kode Bayar: ${paymentCode}
Atas Nama: ${userName || '-'}

--------------------------------
TOTAL PEMBAYARAN:
Rp ${amount.toLocaleString('id-ID')}
--------------------------------

Transfer ke:
Bank: ${bankName}
No. Rek: ${accountNumber}
Atas Nama: ${accountName}

📌 PENTING:
Transfer tepat Rp ${amount.toLocaleString('id-ID')}
atau 3 digit terakhir unik
untuk verifikasi otomatis

Upload bukti transfer di:
${baseUrl}/booking/${bookingId}/payment

================================
`.trim()
}

// GET /api/payments/generate-qr?bookingId=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get booking
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: booking, error } = await (supabase.from('bookings') as any)
      .select('payment_qr_url, payment_code, total_amount, reference_no, status')
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({
      qrCode: booking.payment_qr_url,
      paymentCode: booking.payment_code,
      amount: booking.total_amount,
      referenceNo: booking.reference_no,
      status: booking.status
    })

  } catch (error) {
    console.error('Error fetching payment QR:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
