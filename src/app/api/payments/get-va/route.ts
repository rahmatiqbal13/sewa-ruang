import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function generatePaymentCode(referenceNo: string): string {
  const ts = Date.now().toString(36).slice(-4).toUpperCase()
  return `PAY-${referenceNo}-${ts}`
}

// POST /api/payments/get-va
// Get Virtual Account or payment methods based on booking items
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

    // Get booking details with items
    const { data: booking, error: bookingError } = await (supabase
      .from('bookings') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select(`
        id,
        reference_no,
        total_amount,
        status,
        payment_code,
        user_id,
        users!user_id(name, email),
        booking_items(item_type)
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
        error: `Cannot get payment for status: ${booking.status}` 
      }, { status: 400 })
    }

    // Determine what types of items are in the booking
    const hasRoom = booking.booking_items?.some((item: { item_type: string }) => item.item_type === 'room')
    const hasEquipment = booking.booking_items?.some((item: { item_type: string }) => item.item_type === 'equipment')

    // Get payment methods based on booking content
    let query = supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)

    // Filter by category if booking has specific items
    if (hasRoom && !hasEquipment) {
      // Only room - show room VA
      query = query.eq('category', 'room')
    } else if (hasEquipment && !hasRoom) {
      // Only equipment - show equipment VA
      query = query.eq('category', 'equipment')
    } else {
      // Both or neither - show all including general
      query = query.in('category', ['room', 'equipment', 'general'])
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: paymentMethods, error: methodsError } = await (query as any)
      .order('category')
      .order('is_primary', { ascending: false })

    if (methodsError) {
      console.error('Error fetching payment methods:', methodsError)
    }

    // Ensure payment code exists
    let paymentCode = booking.payment_code
    if (!paymentCode) {
      paymentCode = generatePaymentCode(booking.reference_no)
      const { error: updateError } = await (supabase
        .from('bookings') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({ status: 'pending_payment', payment_code: paymentCode })
        .eq('id', bookingId)

      if (updateError) {
        console.error('Error updating booking:', updateError)
        return NextResponse.json({ error: 'Failed to generate payment code' }, { status: 500 })
      }
    } else if (booking.status !== 'pending_payment') {
      // Update status to pending_payment
      await (supabase.from('bookings') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({ status: 'pending_payment' })
        .eq('id', bookingId)
    }

    // Categorize payment methods
    const roomMethods = paymentMethods?.filter((m: { category: string }) => m.category === 'room') || []
    const equipmentMethods = paymentMethods?.filter((m: { category: string }) => m.category === 'equipment') || []
    const generalMethods = paymentMethods?.filter((m: { category: string }) => m.category === 'general') || []

    return NextResponse.json({
      success: true,
      paymentCode: paymentCode,
      bookingType: {
        hasRoom,
        hasEquipment
      },
      paymentMethods: {
        room: roomMethods.map((bank: { 
          id: string;
          bank_name: string;
          bank_code: string;
          account_number: string;
          virtual_account_number: string;
          account_name: string;
          branch: string;
          qr_image_url: string;
          category: string;
          payment_method_type: string;
          is_primary: boolean;
        }) => ({
          id: bank.id,
          bankName: bank.bank_name,
          bankCode: bank.bank_code,
          accountNumber: bank.account_number,
          virtualAccountNumber: bank.virtual_account_number,
          accountName: bank.account_name,
          branch: bank.branch,
          qrImageUrl: bank.qr_image_url,
          category: bank.category,
          paymentMethodType: bank.payment_method_type,
          isPrimary: bank.is_primary
        })),
        equipment: equipmentMethods.map((bank: { 
          id: string;
          bank_name: string;
          bank_code: string;
          account_number: string;
          virtual_account_number: string;
          account_name: string;
          branch: string;
          qr_image_url: string;
          category: string;
          payment_method_type: string;
          is_primary: boolean;
        }) => ({
          id: bank.id,
          bankName: bank.bank_name,
          bankCode: bank.bank_code,
          accountNumber: bank.account_number,
          virtualAccountNumber: bank.virtual_account_number,
          accountName: bank.account_name,
          branch: bank.branch,
          qrImageUrl: bank.qr_image_url,
          category: bank.category,
          paymentMethodType: bank.payment_method_type,
          isPrimary: bank.is_primary
        })),
        general: generalMethods.map((bank: { 
          id: string;
          bank_name: string;
          bank_code: string;
          account_number: string;
          virtual_account_number: string;
          account_name: string;
          branch: string;
          qr_image_url: string;
          category: string;
          payment_method_type: string;
          is_primary: boolean;
        }) => ({
          id: bank.id,
          bankName: bank.bank_name,
          bankCode: bank.bank_code,
          accountNumber: bank.account_number,
          virtualAccountNumber: bank.virtual_account_number,
          accountName: bank.account_name,
          branch: bank.branch,
          qrImageUrl: bank.qr_image_url,
          category: bank.category,
          paymentMethodType: bank.payment_method_type,
          isPrimary: bank.is_primary
        }))
      },
      amount: booking.total_amount,
      referenceNo: booking.reference_no,
      paymentInstructions: generatePaymentInstructions({
        referenceNo: booking.reference_no,
        amount: booking.total_amount,
        paymentCode: paymentCode,
        userName: booking.users?.name || booking.users?.email,
        hasRoom,
        hasEquipment
      })
    })

  } catch (error) {
    console.error('Error getting payment VA:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET /api/payments/get-va?bookingId=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get booking
    const { data: booking, error } = await (supabase
      .from('bookings') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select('payment_code, total_amount, reference_no, status, booking_items(item_type)')
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const hasRoom = booking.booking_items?.some((item: { item_type: string }) => item.item_type === 'room')
    const hasEquipment = booking.booking_items?.some((item: { item_type: string }) => item.item_type === 'equipment')

    // Get appropriate payment methods
    let query = supabase.from('bank_accounts').select('*').eq('is_active', true)
    
    if (hasRoom && !hasEquipment) {
      query = query.eq('category', 'room')
    } else if (hasEquipment && !hasRoom) {
      query = query.eq('category', 'equipment')
    } else {
      query = query.in('category', ['room', 'equipment', 'general'])
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: paymentMethods } = await (query as any).order('category')

    return NextResponse.json({
      paymentCode: booking.payment_code,
      amount: booking.total_amount,
      referenceNo: booking.reference_no,
      status: booking.status,
      bookingType: { hasRoom, hasEquipment },
      paymentMethods: paymentMethods || []
    })

  } catch (error) {
    console.error('Error fetching payment VA:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate payment instructions
function generatePaymentInstructions({
  referenceNo,
  amount,
  paymentCode,
  userName,
  hasRoom,
  hasEquipment
}: {
  referenceNo: string
  amount: number
  paymentCode: string
  userName?: string
  hasRoom: boolean
  hasEquipment: boolean
}) {
  let typeText = ''
  if (hasRoom && hasEquipment) {
    typeText = 'Sewa Ruangan dan Alat'
  } else if (hasRoom) {
    typeText = 'Sewa Ruangan'
  } else if (hasEquipment) {
    typeText = 'Sewa Alat'
  } else {
    typeText = 'Pembayaran'
  }

  return `
================================
SIMPORA - ${typeText}
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
