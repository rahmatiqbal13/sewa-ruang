import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer
  }>
}

interface BookingData {
  reference_no: string
  start_datetime: string
  end_datetime: string
  total_amount?: number
  users?: {
    name?: string
  } | null
}

interface PaymentData {
  amount?: number
  method?: string
  paid_at?: string
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const from = `"${process.env.SMTP_FROM_NAME || 'RentSpace'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`
      
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      })

      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error) {
      console.error('Email sending failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('SMTP connection failed:', error)
      return false
    }
  }

  // Template generators
  generateBookingConfirmationEmail(booking: BookingData): { subject: string; html: string } {
    return {
      subject: `Konfirmasi Peminjaman - ${booking.reference_no}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Konfirmasi Peminjaman</h2>
          <p>Halo <strong>${booking.users?.name}</strong>,</p>
          <p>Terima kasih telah mengajukan peminjaman di RentSpace.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detail Peminjaman</h3>
            <table style="width: 100%;">
              <tr><td style="padding: 8px 0; color: #64748b;">No. Referensi</td><td style="font-weight: bold;">${booking.reference_no}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Status</td><td><span style="background: #fef3c7; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Menunggu Konfirmasi</span></td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Tanggal Mulai</td><td>${new Date(booking.start_datetime).toLocaleString('id-ID')}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Tanggal Selesai</td><td>${new Date(booking.end_datetime).toLocaleString('id-ID')}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Total</td><td style="font-weight: bold; font-size: 18px;">Rp ${booking.total_amount?.toLocaleString('id-ID')}</td></tr>
            </table>
          </div>
          
          <p>Kami akan segera memproses pengajuan Anda. Anda akan menerima notifikasi lebih lanjut setelah peminjaman disetujui.</p>
          
          <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
            Email ini dikirim secara otomatis dari sistem RentSpace. Jangan membalas email ini.
          </p>
        </div>
      `,
    }
  }

  generateBookingApprovedEmail(booking: BookingData): { subject: string; html: string } {
    return {
      subject: `Peminjaman Disetujui - ${booking.reference_no}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">Peminjaman Disetujui! 🎉</h2>
          <p>Halo <strong>${booking.users?.name}</strong>,</p>
          <p>Selamat! Pengajuan peminjaman Anda telah <strong>disetujui</strong>.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detail Peminjaman</h3>
            <table style="width: 100%;">
              <tr><td style="padding: 8px 0; color: #64748b;">No. Referensi</td><td style="font-weight: bold;">${booking.reference_no}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Status</td><td><span style="background: #d1fae5; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #065f46;">Disetujui</span></td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Total Tagihan</td><td style="font-weight: bold; font-size: 18px; color: #059669;">Rp ${booking.total_amount?.toLocaleString('id-ID')}</td></tr>
            </table>
          </div>
          
          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <strong>Langkah Selanjutnya:</strong>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Lakukan pembayaran sesuai total tagihan</li>
              <li>Upload bukti pembayaran melalui aplikasi</li>
              <li>Tunggu verifikasi pembayaran dari admin</li>
              <li>Setelah lunas, Anda akan menerima konfirmasi akhir</li>
            </ol>
          </div>
          
          <p style="margin-top: 20px;">Jika ada pertanyaan, silakan hubungi kami melalui WhatsApp atau email.</p>
          
          <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
            Email ini dikirim secara otomatis dari sistem RentSpace.
          </p>
        </div>
      `,
    }
  }

  generatePaymentConfirmationEmail(booking: BookingData, payment: PaymentData): { subject: string; html: string } {
    return {
      subject: `Pembayaran Berhasil - ${booking.reference_no}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">Pembayaran Berhasil! ✅</h2>
          <p>Halo <strong>${booking.users?.name}</strong>,</p>
          <p>Pembayaran Anda telah kami terima dan terverifikasi.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detail Pembayaran</h3>
            <table style="width: 100%;">
              <tr><td style="padding: 8px 0; color: #64748b;">No. Referensi</td><td style="font-weight: bold;">${booking.reference_no}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Jumlah Pembayaran</td><td style="font-weight: bold; color: #059669;">Rp ${payment.amount?.toLocaleString('id-ID')}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Metode</td><td>${payment.method?.toUpperCase()}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Waktu</td><td>${payment.paid_at ? new Date(payment.paid_at).toLocaleString('id-ID') : '-'}</td></tr>
            </table>
          </div>
          
          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; text-align: center;">
            <strong style="color: #065f46;">Status: LUNAS ✅</strong>
            <p style="margin: 5px 0 0; color: #065f46;">Peminjaman Anda sudah aktif</p>
          </div>
          
          <p style="margin-top: 20px;">Simpan email ini sebagai bukti pembayaran.</p>
          
          <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
            Terima kasih telah menggunakan RentSpace.
          </p>
        </div>
      `,
    }
  }
}

export const emailService = new EmailService()
