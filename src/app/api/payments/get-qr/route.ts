import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function generatePaymentCode(referenceNo: string): string {
  const ts = Date.now().toString(36).slice(-4).toUpperCase()
  return `PAY-${referenceNo}-${ts}`
}

// POST /api/payments/get-qr
// Get QR code image from bank account (not generate)
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
        error: `Cannot get payment QR for status: ${booking.status}` 
      }, { status: 400 })
    }

    // Get all active bank accounts with QR images
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bankAccounts } = await (supabase.from('bank_accounts') as any)
      .select('*')
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('display_order')

    if (!bankAccounts || bankAccounts.length === 0) {
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
    } else if (booking.status !== 'pending_payment') {
      // Update status to pending_payment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('bookings') as any)
        .update({ status: 'pending_payment' })
        .eq('id', bookingId)
    }

    // Generate payment instructions
    const paymentInfo = {
      referenceNo: booking.reference_no,
      amount: booking.total_amount,
      paymentCode: paymentCode,
      userName: booking.users?.name || booking.users?.email
    }

    return NextResponse.json({
      success: true,
      paymentCode: paymentCode,
      bankAccounts: bankAccounts.map((bank: { 
        id: string;
        bank_name: string;
        bank_code: string;
        account_number: string;
        account_name: string;
        branch: string;
        qr_image_url: string;
        is_primary: boolean;
      }) => ({
        id: bank.id,
        bankName: bank.bank_name,
        bankCode: bank.bank_code,
        accountNumber: bank.account_number,
        accountName: bank.account_name,
        branch: bank.branch,
        qrImageUrl: bank.qr_image_url,
        isPrimary: bank.is_primary
      })),
      amount: booking.total_amount,
      referenceNo: booking.reference_no,
      paymentInfo: generatePaymentText(paymentInfo)
    })

  } catch (error) {
    console.error('Error getting payment QR:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET /api/payments/get-qr?bookingId=xxx
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
      .select('payment_code, total_amount, reference_no, status')
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Get bank accounts
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bankAccounts } = await (supabase.from('bank_accounts') as any)
      .select('*')
      .eq('is_active', true)
      .order('is_primary', { ascending: false })

    return NextResponse.json({
      paymentCode: booking.payment_code,
      amount: booking.total_amount,
      referenceNo: booking.reference_no,
      status: booking.status,
      bankAccounts: bankAccounts || []
    })

  } catch (error) {
    console.error('Error fetching payment QR:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate payment text
function generatePaymentText({
  referenceNo,
  amount,
  paymentCode,
  userName
}: {
  referenceNo: string
  amount: number
  paymentCode: string
  userName?: string
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

📌 PENTING:
Transfer tepat sesuai nominal
agar verifikasi lebih cepat

Upload bukti transfer di:
${process.env.NEXT_PUBLIC_APP_URL}/booking/${referenceNo}/upload-proof

================================
`.trim()
}
