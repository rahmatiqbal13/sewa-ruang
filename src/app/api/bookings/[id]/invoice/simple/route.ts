import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInvoiceHtml } from '@/lib/pdf-generator'

// Helper function to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id

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

    const isAdmin = ['admin', 'super_admin'].includes((userData as any)?.role)

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        users!user_id(name, email, phone, institution),
        booking_items(
          id,
          item_type,
          room_id,
          equipment_id,
          price,
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
    const items = (booking as any).booking_items?.map((item: any) => {
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
    const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0)
    const total = booking.total_amount || subtotal

    // Generate invoice HTML
    const invoiceHtml = await generateInvoiceHtml({
      invoiceNumber: `INV-${booking.id.substring(0, 8).toUpperCase()}`,
      invoiceDate: new Date(booking.created_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      customerName: (booking as any).users?.name || 'Unknown',
      customerEmail: (booking as any).users?.email || '',
      items,
      subtotal,
      total,
      notes: `Tanggal Peminjaman: ${new Date(booking.start_date).toLocaleDateString('id-ID')} - ${new Date(booking.end_date).toLocaleDateString('id-ID')}\nStatus: ${booking.status.toUpperCase()}`,
    })

    // Return HTML invoice (can be printed to PDF by browser)
    return new NextResponse(invoiceHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="invoice-${bookingId}.html"`,
      },
    })

  } catch (error: any) {
    console.error('Generate invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice', details: error.message },
      { status: 500 }
    )
  }
}
