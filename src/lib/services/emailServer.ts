'use server'

import { createAdminDbClient } from '@/lib/supabase/server'
import { sendEmail, buildBookingSubmittedEmail, buildBookingApprovedEmail, buildBookingRejectedEmail, buildPaymentReceivedEmail, buildBookingCompletedEmail, generateInvoicePDF } from './emailService'
import type { EmailConfig } from './emailService'

let cachedConfig: EmailConfig | null = null
let configFetchedAt = 0
const CONFIG_CACHE_MS = 60_000

export async function getEmailConfig(): Promise<EmailConfig | null> {
  const now = Date.now()
  if (cachedConfig && now - configFetchedAt < CONFIG_CACHE_MS) {
    return cachedConfig
  }

  try {
    const sb = createAdminDbClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb.from('notification_channel_configs') as any)
      .select('config')
      .eq('channel', 'email')
      .eq('is_enabled', true)
      .single()

    if (!data?.config?.smtp_host) return null

    const cfg = data.config
    cachedConfig = {
      smtp_host: cfg.smtp_host,
      smtp_port: parseInt(cfg.smtp_port) || 587,
      smtp_user: cfg.smtp_user,
      smtp_pass: cfg.smtp_pass,
      from_name: cfg.from_name || 'Sewa Ruang & Alat',
      from_email: cfg.from_email || cfg.smtp_user,
    }
    configFetchedAt = now
    return cachedConfig
  } catch {
    return cachedConfig
  }
}

export async function sendEmailWithConfig(
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: Buffer }>
) {
  const cfg = await getEmailConfig()
  if (!cfg) {
    console.error('Email config not found or disabled')
    return { success: false, error: 'Email config not found' }
  }
  return sendEmail({ to, subject, html, attachments }, cfg)
}

export async function sendBookingSubmittedEmailAction(bookingId: string) {
  const sb = createAdminDbClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (sb.from('bookings') as any)
    .select(`
      id, reference_no, purpose, start_datetime, end_datetime, total_amount,
      users!user_id(name, email, institution),
      booking_items(item_type, quantity, rooms:room_id(name), equipment:equipment_id(name))
    `)
    .eq('id', bookingId)
    .single()

  if (!booking?.users?.email) return { success: false, error: 'No user email' }

  const items = (booking.booking_items ?? []).map((item: any) => ({
    name: item.rooms?.name || item.equipment?.name || 'Item',
    type: item.item_type as 'room' | 'equipment',
  }))

  const { subject, html } = buildBookingSubmittedEmail({
    name: booking.users.name || 'Peminjam',
    referenceNo: booking.reference_no,
    purpose: booking.purpose,
    startDate: booking.start_datetime,
    endDate: booking.end_datetime,
    totalAmount: booking.total_amount || 0,
    items,
  })

  return sendEmailWithConfig(booking.users.email, subject, html)
}

export async function sendBookingApprovedEmailAction(bookingId: string, isFree: boolean) {
  const sb = createAdminDbClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (sb.from('bookings') as any)
    .select(`
      id, reference_no, purpose, start_datetime, end_datetime, total_amount,
      users!user_id(name, email, institution, phone),
      booking_items(item_type, quantity, rooms:room_id(name), equipment:equipment_id(name))
    `)
    .eq('id', bookingId)
    .single()

  if (!booking?.users?.email) return { success: false, error: 'No user email' }

  const items = (booking.booking_items ?? []).map((item: any) => ({
    name: item.rooms?.name || item.equipment?.name || 'Item',
    type: item.item_type as 'room' | 'equipment',
    quantity: item.quantity || 1,
    price: 0,
  }))

  const { subject, html } = buildBookingApprovedEmail({
    name: booking.users.name || 'Peminjam',
    referenceNo: booking.reference_no,
    purpose: booking.purpose,
    startDate: booking.start_datetime,
    endDate: booking.end_datetime,
    totalAmount: booking.total_amount || 0,
    items,
    isFree,
  })

  let attachments
  if (isFree) {
    try {
      const pdfBuffer = await generateInvoicePDF({
        referenceNo: booking.reference_no,
        customerName: booking.users.name || 'Peminjam',
        customerEmail: booking.users.email,
        customerInstitution: booking.users.institution || undefined,
        customerPhone: booking.users.phone || undefined,
        purpose: booking.purpose,
        startDate: booking.start_datetime,
        endDate: booking.end_datetime,
        totalAmount: 0,
        items,
        payment: null,
      })
      attachments = [{ filename: `invoice-${booking.reference_no}.pdf`, content: pdfBuffer }]
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
  }

  return sendEmailWithConfig(booking.users.email, subject, html, attachments)
}

export async function sendPaymentReceivedEmailAction(bookingId: string, paymentData: {
  method: string
  amount: number
  paidAt: string
}) {
  const sb = createAdminDbClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (sb.from('bookings') as any)
    .select(`
      id, reference_no, purpose, start_datetime, end_datetime, total_amount,
      users!user_id(name, email, institution, phone),
      booking_items(item_type, quantity, rooms:room_id(name), equipment:equipment_id(name))
    `)
    .eq('id', bookingId)
    .single()

  if (!booking?.users?.email) return { success: false, error: 'No user email' }

  const items = (booking.booking_items ?? []).map((item: any) => ({
    name: item.rooms?.name || item.equipment?.name || 'Item',
    type: item.item_type as 'room' | 'equipment',
    quantity: item.quantity || 1,
    price: 0,
  }))

  const { subject, html } = buildPaymentReceivedEmail({
    name: booking.users.name || 'Peminjam',
    referenceNo: booking.reference_no,
    purpose: booking.purpose,
    startDate: booking.start_datetime,
    endDate: booking.end_datetime,
    totalAmount: booking.total_amount || paymentData.amount,
    paidAmount: paymentData.amount,
    method: paymentData.method,
    paidAt: paymentData.paidAt,
    items,
  })

  let attachments
  try {
    const pdfBuffer = await generateInvoicePDF({
      referenceNo: booking.reference_no,
      customerName: booking.users.name || 'Peminjam',
      customerEmail: booking.users.email,
      customerInstitution: booking.users.institution || undefined,
      customerPhone: booking.users.phone || undefined,
      purpose: booking.purpose,
      startDate: booking.start_datetime,
      endDate: booking.end_datetime,
      totalAmount: booking.total_amount || paymentData.amount,
      items,
      payment: paymentData,
    })
    attachments = [{ filename: `invoice-${booking.reference_no}.pdf`, content: pdfBuffer }]
  } catch (err) {
    console.error('PDF generation failed:', err)
  }

  return sendEmailWithConfig(booking.users.email, subject, html, attachments)
}

export async function sendBookingRejectedEmailAction(bookingId: string, adminNotes: string) {
  const sb = createAdminDbClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (sb.from('bookings') as any)
    .select(`
      id, reference_no, purpose,
      users!user_id(name, email)
    `)
    .eq('id', bookingId)
    .single()

  if (!booking?.users?.email) return { success: false, error: 'No user email' }

  const { subject, html } = buildBookingRejectedEmail({
    name: booking.users.name || 'Peminjam',
    referenceNo: booking.reference_no,
    purpose: booking.purpose,
    adminNotes,
  })

  return sendEmailWithConfig(booking.users.email, subject, html)
}

export async function sendBookingCompletedEmailAction(bookingId: string) {
  const sb = createAdminDbClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (sb.from('bookings') as any)
    .select(`
      id, reference_no, purpose, start_datetime, end_datetime, total_amount,
      users!user_id(name, email),
      booking_items(item_type, quantity, rooms:room_id(name), equipment:equipment_id(name)),
      returns(returned_at, condition)
    `)
    .eq('id', bookingId)
    .single()

  if (!booking?.users?.email) return { success: false, error: 'No user email' }

  const items = (booking.booking_items ?? []).map((item: any) => ({
    name: item.rooms?.name || item.equipment?.name || 'Item',
    type: item.item_type as 'room' | 'equipment',
    quantity: item.quantity || 1,
    price: 0,
  }))

  const returnData = booking.returns?.[0]

  const { subject, html } = buildBookingCompletedEmail({
    name: booking.users.name || 'Peminjam',
    referenceNo: booking.reference_no,
    purpose: booking.purpose,
    startDate: booking.start_datetime,
    endDate: booking.end_datetime,
    totalAmount: booking.total_amount || 0,
    items,
    returnedAt: returnData?.returned_at,
    condition: returnData?.condition,
  })

  return sendEmailWithConfig(booking.users.email, subject, html)
}
