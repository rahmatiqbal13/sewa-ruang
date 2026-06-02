import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/payments/upload-proof
// Upload proof of payment (bukti transfer)
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await req.formData()
    const bookingId = formData.get('bookingId') as string
    const proofImage = formData.get('proofImage') as File
    const bankName = formData.get('bankName') as string
    const accountName = formData.get('accountName') as string
    const transferAmount = parseFloat(formData.get('transferAmount') as string)
    const transferDate = formData.get('transferDate') as string
    const notes = formData.get('notes') as string

    // Validation
    if (!bookingId || !proofImage) {
      return NextResponse.json({ 
        error: 'Booking ID and proof image are required' 
      }, { status: 400 })
    }

    // Get booking details
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: booking, error: bookingError } = await (supabase.from('bookings') as any)
      .select('id, user_id, total_amount, status, reference_no')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check ownership
    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check status
    if (!['pending_payment', 'payment_rejected'].includes(booking.status)) {
      return NextResponse.json({ 
        error: `Cannot upload proof for status: ${booking.status}` 
      }, { status: 400 })
    }

    // Validate image
    if (!proofImage.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    if (proofImage.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json({ error: 'Image size must be less than 5MB' }, { status: 400 })
    }

    // Upload image to Supabase Storage
    const fileExt = proofImage.name.split('.').pop()
    const fileName = `payment-proofs/${bookingId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('payments')
      .upload(fileName, proofImage, {
        contentType: proofImage.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload image: ' + uploadError.message 
      }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('payments')
      .getPublicUrl(fileName)

    // Insert payment proof record
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: proofData, error: proofError } = await (supabase.from('payment_proofs') as any)
      .insert({
        booking_id: bookingId,
        proof_url: publicUrl,
        bank_name: bankName,
        account_name: accountName,
        transfer_amount: transferAmount,
        transfer_date: transferDate,
        notes: notes,
        status: 'pending'
      })
      .select()
      .single()

    if (proofError) {
      console.error('Proof insert error:', proofError)
      // Try to delete uploaded file
      await supabase.storage.from('payments').remove([fileName])
      return NextResponse.json({ 
        error: 'Failed to save payment proof' 
      }, { status: 500 })
    }

    // Update booking status (with full rollback on failure)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: statusError } = await (supabase.from('bookings') as any)
      .update({
        status: 'payment_uploaded',
        payment_proof_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    if (statusError) {
      console.error('Status update error:', statusError)
      // Rollback: hapus record proof dan file yang sudah diupload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('payment_proofs') as any).delete().eq('id', proofData.id)
      await supabase.storage.from('payments').remove([fileName])
      return NextResponse.json({
        error: 'Gagal memperbarui status booking. Silakan coba lagi.'
      }, { status: 500 })
    }

    // Send notification to admin
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'payment_received',
          booking_id: bookingId,
          user_id: user.id
        })
      })
    } catch (notifError) {
      console.error('Notification error:', notifError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      proof: proofData,
      bookingStatus: 'payment_uploaded'
    })

  } catch (error) {
    console.error('Error uploading payment proof:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
