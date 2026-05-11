import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const { to, subject, message, bookingId } = await req.json()

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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

    // Send email
    const fromName = cfg.from_name || 'Sport Center UNESA'
    const fromEmail = cfg.from_email || cfg.smtp_user

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">${fromName}</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <pre style="white-space: pre-wrap; font-family: inherit;">${message}</pre>
          </div>
          <p style="color: #64748b; font-size: 12px;">
            Email ini dikirim dari sistem ${fromName}. Jika Anda memiliki pertanyaan, 
            silakan hubungi admin.
          </p>
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
