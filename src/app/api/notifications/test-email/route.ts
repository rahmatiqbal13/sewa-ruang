import { NextRequest, NextResponse } from 'next/server'
import * as nodemailer from 'nodemailer'
import { getInstitutionProfile } from '@/lib/institution'

export async function POST(req: NextRequest) {
  try {
    const { config, testTo } = await req.json()

    if (!config?.host || !config?.user || !config?.pass) {
      return NextResponse.json(
        { error: 'Konfigurasi email tidak lengkap' },
        { status: 400 }
      )
    }

    if (!testTo) {
      return NextResponse.json(
        { error: 'Email tujuan test tidak valid' },
        { status: 400 }
      )
    }

    // Get institution profile
    const institution = await getInstitutionProfile()
    const institutionName = institution?.name || 'Sewa Ruang & Alat'
    const institutionShortName = institution?.short_name || institutionName

    // Create email transporter dengan konfigurasi dari database
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.port === 465, // true untuk port 465, false untuk port lain
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false // Untuk self-signed certificate
      }
    })

    // Verify connection
    await transporter.verify()

    // Build header with logo if available
    const logoHtml = institution?.logo_url 
      ? `<img src="${institution.logo_url}" alt="${institutionName}" style="max-height: 60px; max-width: 200px; margin-bottom: 15px;" />`
      : `<h2 style="color: #1e40af; margin-bottom: 15px;">${institutionName}</h2>`
    
    // Build footer with contact info
    const contactParts = []
    if (institution?.address) contactParts.push(institution.address)
    if (institution?.phone) contactParts.push(`Telp: ${institution.phone}`)
    if (institution?.email) contactParts.push(`Email: ${institution.email}`)
    
    const footerHtml = contactParts.length > 0 
      ? `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; line-height: 1.6;">
          <strong>${institutionName}</strong><br/>
          ${contactParts.join('<br/>')}
         </div>`
      : ''

    // Send test email
    const info = await transporter.sendMail({
      from: `"${config.fromName || institutionName}" <${config.from || config.user}>`,
      to: testTo,
      subject: `Test Email - ${institutionShortName}`,
      text: `Halo,

Ini adalah email test dari sistem ${institutionName}.

Jika Anda menerima email ini, berarti konfigurasi email sudah benar!

Detail Konfigurasi:
- SMTP Host: ${config.host}
- SMTP Port: ${config.port || 587}
- Email Pengirim: ${config.from || config.user}

Waktu pengiriman: ${new Date().toLocaleString('id-ID')}

Terima kasih,
${institutionName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: #f8fafc; padding: 20px; border-bottom: 3px solid #1e40af; text-align: center;">
            ${logoHtml}
          </div>
          
          <!-- Content -->
          <div style="padding: 25px;">
            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af;">
              <p>Halo,</p>
              <p>Ini adalah <strong>email test</strong> dari sistem ${institutionName}.</p>
              <p style="color: #059669; font-size: 18px;">✅ Jika Anda menerima email ini, berarti konfigurasi email sudah benar!</p>
            </div>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Detail Konfigurasi:</h3>
              <ul style="color: #4b5563;">
                <li><strong>SMTP Host:</strong> ${config.host}</li>
                <li><strong>SMTP Port:</strong> ${config.port || 587}</li>
                <li><strong>Email Pengirim:</strong> ${config.from || config.user}</li>
                <li><strong>Waktu Pengiriman:</strong> ${new Date().toLocaleString('id-ID')}</li>
              </ul>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0;">
            ${footerHtml}
            <p style="color: #94a3b8; font-size: 11px; margin-top: 15px; text-align: center;">
              © ${new Date().getFullYear()} ${institutionName}. All rights reserved.<br/>
              Email ini dikirim secara otomatis. Jangan membalas email ini.
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Email test berhasil dikirim',
      messageId: info.messageId 
    })

  } catch (error: unknown) {
    console.error('Error sending test email:', error)

    // Berikan pesan error yang lebih spesifik
    let errorMessage = 'Gagal mengirim email test'
    const err = error as { code?: string; message?: string }

    if (err.code === 'EAUTH') {
      errorMessage = 'Autentikasi gagal. Periksa username dan App Password Anda.'
    } else if (err.code === 'ECONNECTION') {
      errorMessage = 'Tidak dapat terhubung ke SMTP server. Periksa host dan port.'
    } else if (err.code === 'ETIMEDOUT') {
      errorMessage = 'Koneksi timeout. Periksa koneksi internet atau firewall.'
    } else if (err.message?.includes('Invalid login')) {
      errorMessage = 'Login gagal. Pastikan menggunakan App Password (bukan password biasa).'
    } else if (err.message) {
      errorMessage = err.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
