import { NextRequest, NextResponse } from 'next/server'
import * as nodemailer from 'nodemailer'

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

    // Send test email
    const info = await transporter.sendMail({
      from: `"${config.fromName || 'Sport Center UNESA'}" <${config.from || config.user}>`,
      to: testTo,
      subject: 'Test Email - Sport Center UNESA',
      text: `Halo,

Ini adalah email test dari sistem Sport Center UNESA.

Jika Anda menerima email ini, berarti konfigurasi email sudah benar!

Detail Konfigurasi:
- SMTP Host: ${config.host}
- SMTP Port: ${config.port || 587}
- Email Pengirim: ${config.from || config.user}

Waktu pengiriman: ${new Date().toLocaleString('id-ID')}

Terima kasih,
Sistem Sewa Ruang & Alat UNESA`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af;">Test Email - Sport Center UNESA</h2>
          
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Halo,</p>
            <p>Ini adalah <strong>email test</strong> dari sistem Sport Center UNESA.</p>
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

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          
          <p style="color: #6b7280; font-size: 12px;">
            Email ini dikirim secara otomatis dari sistem Sport Center UNESA.<br>
            Jangan membalas email ini.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Email test berhasil dikirim',
      messageId: info.messageId 
    })

  } catch (error: any) {
    console.error('Error sending test email:', error)
    
    // Berikan pesan error yang lebih spesifik
    let errorMessage = 'Gagal mengirim email test'
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Autentikasi gagal. Periksa username dan App Password Anda.'
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Tidak dapat terhubung ke SMTP server. Periksa host dan port.'
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Koneksi timeout. Periksa koneksi internet atau firewall.'
    } else if (error.message?.includes('Invalid login')) {
      errorMessage = 'Login gagal. Pastikan menggunakan App Password (bukan password biasa).'
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
