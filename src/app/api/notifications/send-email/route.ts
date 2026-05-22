import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as nodemailer from 'nodemailer'
import { getInstitutionProfile } from '@/lib/institution'
import { z } from 'zod'

const sendEmailSchema = z.object({
  to: z.string().email('Alamat email tujuan tidak valid'),
  subject: z.string().min(1).max(200, 'Subjek terlalu panjang'),
  message: z.string().min(1).max(10000, 'Pesan terlalu panjang'),
  bookingId: z.string().uuid().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = sendEmailSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { to, subject, message, bookingId } = parsed.data

    // Verify admin access
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!['admin', 'super_admin'].includes((userData as any)?.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get email config from database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: emailConfig } = await (supabase.from('notification_channel_configs') as any)
      .select('config')
      .eq('channel', 'email')
      .eq('is_enabled', true)
      .single()

    if (!emailConfig?.config?.smtp_host) {
      return NextResponse.json(
        { error: 'Konfigurasi email belum diatur. Silakan setup di halaman Notifikasi.' },
        { status: 400 }
      )
    }

    const cfg = emailConfig.config

    // Get institution profile
    const institution = await getInstitutionProfile()

    // Create email transporter dengan config dari database
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: parseInt(cfg.smtp_port) || 587,
      secure: parseInt(cfg.smtp_port) === 465,
      auth: {
        user: cfg.smtp_user,
        pass: cfg.smtp_pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    // Build email header with institution info
    const fromName = cfg.from_name || institution?.name || 'Tim Admin USC'
    const fromEmail = cfg.from_email || cfg.smtp_user
    
    // Build institution header HTML
    const logoHtml = institution?.logo_url 
      ? `<img src="${institution.logo_url}" alt="${institution.name}" style="max-height: 60px; max-width: 200px;" />`
      : `<h1 style="color: #1e40af; margin: 0; font-size: 24px;">${institution?.name || 'Tim Admin USC'}</h1>`
    
    // Build footer with contact info
    const contactParts = []
    if (institution?.address) contactParts.push(institution.address)
    if (institution?.phone) contactParts.push(`Telp: ${institution.phone}`)
    if (institution?.email) contactParts.push(`Email: ${institution.email}`)
    if (institution?.website) contactParts.push(`Web: ${institution.website}`)
    
    const footerHtml = contactParts.length > 0 
      ? `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; line-height: 1.6;">
          <strong>${institution?.name || 'Tim Admin USC'}</strong><br/>
          ${contactParts.join('<br/>')}
         </div>`
      : `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
          Email ini dikirim dari sistem ${fromName}. Jika Anda memiliki pertanyaan, silakan hubungi admin.
         </div>`

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: #f8fafc; padding: 20px; border-bottom: 3px solid #1e40af; text-align: center;">
            ${logoHtml}
            ${institution?.short_name ? `<p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">${institution.short_name}</p>` : ''}
          </div>
          
          <!-- Content -->
          <div style="padding: 25px; background: #ffffff;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af;">
              <pre style="white-space: pre-wrap; font-family: inherit; margin: 0; color: #334155;">${message}</pre>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0;">
            ${footerHtml}
            <p style="color: #94a3b8; font-size: 11px; margin-top: 15px; text-align: center;">
              © ${new Date().getFullYear()} ${institution?.name || 'Tim Admin USC'}. All rights reserved.
            </p>
          </div>
        </div>
      `,
    })

    // Log notification in database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notifications') as any).insert({
      user_id: user.id,
      type: 'email_sent',
      title: 'Email Terkirim',
      body: `Email dikirim ke ${to} untuk booking ${bookingId}`,
      booking_id: bookingId,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    )
  }
}
