import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/payments/verify
// Admin verify or reject payment
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: adminUser } = await (supabase
      .from('users') as any)
      .select('role')
      .eq('id', user.id)
      .single()

    if (!adminUser || !['admin', 'super_admin'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { 
      bookingId, 
      status, // 'verified' or 'rejected'
      rejectionReason 
    } = await req.json()

    // Validation
    if (!bookingId || !status) {
      return NextResponse.json({ 
        error: 'Booking ID and status are required' 
      }, { status: 400 })
    }

    if (!['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        error: 'Status must be verified or rejected' 
      }, { status: 400 })
    }

    if (status === 'rejected' && !rejectionReason) {
      return NextResponse.json({ 
        error: 'Rejection reason is required when rejecting payment' 
      }, { status: 400 })
    }

    // Get booking details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: booking, error: bookingError } = await (supabase
      .from('bookings') as any)
      .select('id, status, user_id, reference_no, total_amount')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check if booking is in correct status
    if (!['payment_uploaded', 'pending_payment'].includes(booking.status)) {
      return NextResponse.json({ 
        error: `Cannot verify payment for booking status: ${booking.status}` 
      }, { status: 400 })
    }

    // Use database function to verify payment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: verifyResult, error: verifyError } = await (supabase
      .rpc as any)('verify_booking_payment', {
      p_booking_id: bookingId,
      p_admin_id: user.id,
      p_status: status,
      p_rejection_reason: rejectionReason || null
    })

    if (verifyError) {
      console.error('Verification error:', verifyError)
      return NextResponse.json({ 
        error: 'Failed to verify payment: ' + verifyError.message 
      }, { status: 500 })
    }

    if (!verifyResult) {
      return NextResponse.json({ 
        error: 'Payment verification failed' 
      }, { status: 400 })
    }

    // Send notification to user
    try {
      const eventType = status === 'verified' ? 'payment_verified' : 'payment_rejected'
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          booking_id: bookingId,
          user_id: booking.user_id,
          custom_data: status === 'rejected' ? { rejection_reason: rejectionReason } : undefined
        })
      })
    } catch (notifError) {
      console.error('Notification error:', notifError)
    }

    return NextResponse.json({
      success: true,
      message: status === 'verified' 
        ? 'Payment verified successfully' 
        : 'Payment rejected',
      bookingStatus: status === 'verified' ? 'paid' : 'pending_payment',
      bookingId: bookingId
    })

  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET /api/payments/verify
// Get pending payment verifications
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: adminUser } = await (supabase
      .from('users') as any)
      .select('role')
      .eq('id', user.id)
      .single()

    if (!adminUser || !['admin', 'super_admin'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'

    // Get payment proofs with booking details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: proofs, error } = await (supabase
      .from('payment_proofs') as any)
      .select(`
        *,
        bookings(
          id,
          reference_no,
          total_amount,
          payment_code,
          users:user_id(name, email, phone)
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching proofs:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch payment proofs' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      proofs: proofs || [],
      count: proofs?.length || 0
    })

  } catch (error) {
    console.error('Error fetching verifications:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
