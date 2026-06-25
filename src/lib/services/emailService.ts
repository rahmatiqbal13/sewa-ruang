import nodemailer from 'nodemailer'
import puppeteer from 'puppeteer-core'
import { getInstitutionProfile, type InstitutionProfile } from '@/lib/institution'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { getChromePath } from '@/lib/chromePath'

export interface EmailConfig {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  from_name: string
  from_email: string
}

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html: string
  attachments?: Array<{
    filename: string
    content?: Buffer
    path?: string
  }>
}

export async function sendEmail(
  options: EmailOptions,
  cfg: EmailConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: cfg.smtp_port,
      secure: cfg.smtp_port === 465,
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
      tls: { rejectUnauthorized: false },
    })

    const institution = await getInstitutionProfile()
    const from = `"${cfg.from_name}" <${cfg.from_email}>`

    // Wrap HTML with institution branding
    const wrappedHtml = wrapEmailHtml(options.html, institution)

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: wrappedHtml,
      attachments: options.attachments,
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email sending failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function wrapEmailHtml(content: string, institution: InstitutionProfile | null) {
  const logoHtml = institution?.logo_url
    ? '<img src="' + institution.logo_url + '" alt="' + institution.name + '" style="max-height:60px;max-width:200px;" />'
    : '<h1 style="color:#0891B2;margin:0;font-size:22px;">' + (institution?.name || 'Sewa Ruang & Alat') + '</h1>'

  const contactParts: string[] = []
  if (institution?.address) contactParts.push(institution.address)
  if (institution?.phone) contactParts.push('Telp: ' + institution.phone)
  if (institution?.email) contactParts.push('Email: ' + institution.email)

  const footerHtml = contactParts.length
    ? '<div style="margin-top:20px;padding-top:15px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">'
        + '<strong>' + (institution?.name || 'Sewa Ruang & Alat') + '</strong><br/>' + contactParts.join('<br/>')
       + '</div>'
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:20px 10px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <tr><td style="background:#f8fafc;padding:24px 32px;border-bottom:3px solid #0891B2;text-align:center;">
          ${logoHtml}
          ${institution?.short_name ? `<p style="margin:6px 0 0;color:#64748b;font-size:13px;">${institution.short_name}</p>` : ''}
        </td></tr>
        <tr><td style="padding:32px;">${content}</td></tr>
        <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
          ${footerHtml}
          <p style="color:#94a3b8;font-size:11px;margin-top:15px;text-align:center;">
            © ${new Date().getFullYear()} ${institution?.name || 'Sewa Ruang & Alat'}. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Email Templates ─────────────────────────────────────────────────────────

export function buildBookingSubmittedEmail(data: {
  name: string
  referenceNo: string
  purpose: string
  startDate: string
  endDate: string
  totalAmount: number
  items: Array<{ name: string; type: string }>
}) {
  const itemList = data.items.map(i => `• ${i.name} (${i.type === 'room' ? 'Ruangan' : 'Alat'})`).join('<br/>')
  const totalText = data.totalAmount > 0 ? formatRupiah(data.totalAmount) : 'Gratis'

  const html = `
    <h2 style="color:#0891B2;margin-top:0;">Pengajuan Peminjaman Diterima</h2>
    <p>Halo <strong>${data.name}</strong>,</p>
    <p>Terima kasih telah mengajukan peminjaman. Pengajuan Anda telah kami terima dan sedang dalam proses review.</p>

    <div style="background:#f8fafc;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #0891B2;">
      <h3 style="margin-top:0;color:#1e293b;">Detail Pengajuan</h3>
      <table style="width:100%;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:140px;">No. Referensi</td><td style="font-weight:600;">${data.referenceNo}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Status</td><td><span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;">Menunggu Persetujuan</span></td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Tujuan</td><td>${data.purpose}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Tanggal Mulai</td><td>${formatDateTime(data.startDate)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Tanggal Selesai</td><td>${formatDateTime(data.endDate)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Total Estimasi</td><td style="font-weight:700;color:#0891B2;font-size:16px;">${totalText}</td></tr>
      </table>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;">Item yang dipinjam:</p>
        <p style="margin:0;font-size:13px;line-height:1.6;">${itemList}</p>
      </div>
    </div>

    <p>Anda akan menerima email notifikasi setelah pengajuan Anda disetujui atau ditolak oleh admin.</p>
    <p style="margin-top:16px;font-size:13px;color:#64748b;">Jika ada pertanyaan, silakan hubungi admin melalui kontak yang tersedia di website.</p>
  `

  return {
    subject: `Pengajuan Peminjaman Diterima - ${data.referenceNo}`,
    html,
  }
}

export function buildBookingApprovedEmail(data: {
  name: string
  referenceNo: string
  purpose: string
  startDate: string
  endDate: string
  totalAmount: number
  items: Array<{ name: string; type: string }>
  isFree: boolean
}) {
  const itemList = data.items.map(i => `• ${i.name} (${i.type === 'room' ? 'Ruangan' : 'Alat'})`).join('<br/>')
  const totalText = data.totalAmount > 0 ? formatRupiah(data.totalAmount) : 'Gratis'
  const statusColor = data.isFree ? '#059669' : '#0891B2'
  const statusBg = data.isFree ? '#d1fae5' : '#dbeafe'
  const statusText = data.isFree ? '#065f46' : '#1e40af'

  let paymentSection = ''
  if (!data.isFree && data.totalAmount > 0) {
    paymentSection = `
      <div style="background:#eff6ff;padding:16px;border-radius:10px;border-left:4px solid #0891B2;margin-top:16px;">
        <h4 style="margin:0 0 8px;color:#1e40af;">Langkah Selanjutnya</h4>
        <ol style="margin:0;padding-left:18px;color:#334155;font-size:13px;line-height:1.7;">
          <li>Lakukan pembayaran sejumlah <strong>${formatRupiah(data.totalAmount)}</strong></li>
          <li>Upload bukti pembayaran melalui halaman detail peminjaman</li>
          <li>Tunggu verifikasi pembayaran dari admin</li>
          <li>Setelah terverifikasi, peminjaman Anda aktif</li>
        </ol>
      </div>
    `
  } else if (data.isFree) {
    paymentSection = `
      <div style="background:#d1fae5;padding:16px;border-radius:10px;border-left:4px solid #059669;margin-top:16px;">
        <h4 style="margin:0 0 8px;color:#065f46;">Peminjaman Gratis</h4>
        <p style="margin:0;color:#065f46;font-size:13px;line-height:1.6;">
          Sebagai Mahasiswa S1 untuk keperluan perkuliahan/penelitian tugas akhir, peminjaman ini <strong>GRATIS</strong>. 
          Tidak perlu melakukan pembayaran. Peminjaman Anda sudah aktif setelah disetujui.
        </p>
      </div>
    `
  }

  const html = `
    <h2 style="color:${statusColor};margin-top:0;">Peminjaman Disetujui! 🎉</h2>
    <p>Halo <strong>${data.name}</strong>,</p>
    <p>Selamat! Pengajuan peminjaman Anda telah <strong>disetujui</strong> oleh admin.</p>

    <div style="background:#f8fafc;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid ${statusColor};">
      <h3 style="margin-top:0;color:#1e293b;">Detail Peminjaman</h3>
      <table style="width:100%;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:140px;">No. Referensi</td><td style="font-weight:600;">${data.referenceNo}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Status</td><td><span style="background:${statusBg};color:${statusText};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;">${data.isFree ? 'Disetujui & Gratis' : 'Disetujui - Menunggu Pembayaran'}</span></td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Tujuan</td><td>${data.purpose}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Tanggal Mulai</td><td>${formatDateTime(data.startDate)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Tanggal Selesai</td><td>${formatDateTime(data.endDate)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Total</td><td style="font-weight:700;color:${statusColor};font-size:16px;">${totalText}</td></tr>
      </table>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;">Item yang dipinjam:</p>
        <p style="margin:0;font-size:13px;line-height:1.6;">${itemList}</p>
      </div>
    </div>

    ${paymentSection}

    <p style="margin-top:16px;font-size:13px;color:#64748b;">Harap datang tepat waktu sesuai jadwal yang telah ditentukan.</p>
  `

  return {
    subject: `Peminjaman Disetujui - ${data.referenceNo}`,
    html,
  }
}

export function buildBookingRejectedEmail(data: {
  name: string
  referenceNo: string
  purpose: string
  adminNotes?: string | null
}) {
  const html = `
    <h2 style="color:#dc2626;margin-top:0;">Peminjaman Tidak Disetujui</h2>
    <p>Halo <strong>${data.name}</strong>,</p>
    <p>Mohon maaf, pengajuan peminjaman Anda tidak dapat disetujui.</p>

    <div style="background:#fef2f2;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #dc2626;">
      <h3 style="margin-top:0;color:#7f1d1d;">Detail Pengajuan</h3>
      <table style="width:100%;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:140px;">No. Referensi</td><td style="font-weight:600;">${data.referenceNo}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Tujuan</td><td>${data.purpose}</td></tr>
      </table>
      ${data.adminNotes ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #fecaca;">
          <p style="margin:0 0 4px;color:#7f1d1d;font-size:12px;font-weight:600;">Alasan penolakan:</p>
          <p style="margin:0;color:#991b1b;font-size:13px;">${data.adminNotes}</p>
        </div>
      ` : ''}
    </div>

    <p>Silakan hubungi admin jika Anda memerlukan informasi lebih lanjut atau ingin mengajukan peminjaman dengan detail yang berbeda.</p>
  `

  return {
    subject: `Peminjaman Tidak Disetujui - ${data.referenceNo}`,
    html,
  }
}

export function buildPaymentReceivedEmail(data: {
  name: string
  referenceNo: string
  purpose: string
  startDate: string
  endDate: string
  totalAmount: number
  paidAmount: number
  method: string
  paidAt: string
  items: Array<{ name: string; type: string }>
}) {
  const itemList = data.items.map(i => `• ${i.name} (${i.type === 'room' ? 'Ruangan' : 'Alat'})`).join('<br/>')

  const html = `
    <h2 style="color:#059669;margin-top:0;">Pembayaran Berhasil! ✅</h2>
    <p>Halo <strong>${data.name}</strong>,</p>
    <p>Pembayaran Anda telah kami terima dan terverifikasi. Peminjaman Anda sudah <strong>LUNAS</strong>.</p>

    <div style="background:#f8fafc;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #059669;">
      <h3 style="margin-top:0;color:#1e293b;">Detail Pembayaran</h3>
      <table style="width:100%;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:140px;">No. Referensi</td><td style="font-weight:600;">${data.referenceNo}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Status</td><td><span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;">LUNAS</span></td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Total Tagihan</td><td style="font-weight:600;">${formatRupiah(data.totalAmount)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Jumlah Dibayar</td><td style="font-weight:700;color:#059669;">${formatRupiah(data.paidAmount)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Metode</td><td>${data.method.toUpperCase()}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Waktu Bayar</td><td>${formatDateTime(data.paidAt)}</td></tr>
      </table>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;">Item yang dipinjam:</p>
        <p style="margin:0;font-size:13px;line-height:1.6;">${itemList}</p>
      </div>
    </div>

    <div style="background:#d1fae5;padding:16px;border-radius:10px;text-align:center;margin-top:16px;">
      <p style="margin:0;color:#065f46;font-size:14px;">
        <strong>✅ Peminjaman Anda sudah aktif!</strong><br/>
        Harap datang tepat waktu sesuai jadwal.
      </p>
    </div>

    <p style="margin-top:16px;font-size:13px;color:#64748b;">Simpan email ini sebagai bukti pembayaran resmi.</p>
  `

  return {
    subject: `Pembayaran Lunas - ${data.referenceNo}`,
    html,
  }
}

export function buildBookingCompletedEmail(data: {
  name: string
  referenceNo: string
  purpose: string
  startDate: string
  endDate: string
  totalAmount: number
  items: Array<{ name: string; type: string }>
  returnedAt?: string
  condition?: string
}) {
  const itemList = data.items.map(i => `• ${i.name} (${i.type === 'room' ? 'Ruangan' : 'Alat'})`).join('<br/>')
  const totalText = data.totalAmount > 0 ? formatRupiah(data.totalAmount) : 'Gratis'

  const html = `
    <h2 style="color:#059669;margin-top:0;">Peminjaman Selesai ✅</h2>
    <p>Halo <strong>${data.name}</strong>,</p>
    <p>Peminjaman Anda telah <strong>selesai</strong>. Terima kasih telah menggunakan layanan kami.</p>

    <div style="background:#f8fafc;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #059669;">
      <h3 style="margin-top:0;color:#1e293b;">Ringkasan Peminjaman</h3>
      <table style="width:100%;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:140px;">No. Referensi</td><td style="font-weight:600;">${data.referenceNo}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Status</td><td><span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;">Selesai</span></td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Tujuan</td><td>${data.purpose}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Tanggal Mulai</td><td>${formatDateTime(data.startDate)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Tanggal Selesai</td><td>${formatDateTime(data.endDate)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Total Biaya</td><td style="font-weight:700;color:#059669;font-size:16px;">${totalText}</td></tr>
        ${data.returnedAt ? `<tr><td style="padding:6px 0;color:#64748b;">Dikembalikan</td><td>${formatDateTime(data.returnedAt)}</td></tr>` : ''}
        ${data.condition ? `<tr><td style="padding:6px 0;color:#64748b;">Kondisi</td><td>${data.condition}</td></tr>` : ''}
      </table>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;">Item yang dipinjam:</p>
        <p style="margin:0;font-size:13px;line-height:1.6;">${itemList}</p>
      </div>
    </div>

    <p style="margin-top:16px;">Terima kasih atas kerjasamanya. Kami harap layanan kami dapat membantu kegiatan Anda.</p>
    <p style="margin-top:12px;font-size:13px;color:#64748b;">Jika ada pertanyaan atau feedback, silakan hubungi kami.</p>
  `

  return {
    subject: `Peminjaman Selesai - ${data.referenceNo}`,
    html,
  }
}

// ── PDF Invoice Generator ───────────────────────────────────────────────────

export async function generateInvoicePDF(data: {
  referenceNo: string
  customerName: string
  customerEmail: string
  customerInstitution?: string
  customerPhone?: string
  purpose: string
  startDate: string
  endDate: string
  totalAmount: number
  items: Array<{ name: string; type: 'room' | 'equipment'; quantity: number; price: number }>
  payment?: {
    method: string
    amount: number
    paidAt: string
  } | null
}): Promise<Buffer> {
  const institution = await getInstitutionProfile()
  const isFree = data.totalAmount === 0

  const itemsHtml = data.items.map((item, i) => `
    <tr>
      <td style="border:1px solid #e2e8f0;padding:8px 12px;text-align:center;">${i + 1}</td>
      <td style="border:1px solid #e2e8f0;padding:8px 12px;">${item.name}</td>
      <td style="border:1px solid #e2e8f0;padding:8px 12px;text-align:center;">${item.type === 'room' ? 'Ruangan' : 'Alat'}</td>
      <td style="border:1px solid #e2e8f0;padding:8px 12px;text-align:center;">${item.quantity}</td>
      <td style="border:1px solid #e2e8f0;padding:8px 12px;text-align:right;">${isFree ? 'Gratis' : formatRupiah(item.price)}</td>
      <td style="border:1px solid #e2e8f0;padding:8px 12px;text-align:right;">${isFree ? 'Gratis' : formatRupiah(item.price * item.quantity)}</td>
    </tr>
  `).join('')

  const paymentHtml = data.payment ? `
    <div style="margin-top:20px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
      <h3 style="margin:0 0 10px;color:#166534;font-size:14px;">Detail Pembayaran</h3>
      <table style="width:100%;font-size:13px;">
        <tr><td style="padding:4px 0;color:#64748b;width:140px;">Metode</td><td style="font-weight:600;">${data.payment.method.toUpperCase()}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Jumlah Dibayar</td><td style="font-weight:600;color:#059669;">${formatRupiah(data.payment.amount)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Waktu Pembayaran</td><td>${formatDateTime(data.payment.paidAt)}</td></tr>
      </table>
    </div>
  ` : ''

  const freeBanner = isFree ? `
    <div style="background:#dcfce7;color:#166534;padding:12px 16px;border-radius:8px;text-align:center;margin-bottom:20px;border:2px dashed #86efac;">
      <h2 style="margin:0;font-size:18px;">PEMINJAMAN GRATIS</h2>
      <p style="margin:4px 0 0;font-size:12px;">Mahasiswa S1 untuk keperluan perkuliahan / penelitian tugas akhir</p>
    </div>
  ` : ''

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #333; }
    .page { width: 210mm; min-height: 297mm; padding: 15mm; }
  </style>
</head>
<body>
  <div class="page">
    <div style="border-bottom:3px solid #0891B2;padding-bottom:15px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        ${institution?.logo_url ? `<img src="${institution.logo_url}" style="max-height:50px;max-width:150px;" />` : `<h2 style="color:#0891B2;margin:0;font-size:20px;">${institution?.name || 'Sewa Ruang & Alat'}</h2>`}
        ${institution?.short_name ? `<p style="color:#64748b;font-size:10pt;margin:4px 0 0;">${institution.short_name}</p>` : ''}
      </div>
      <div style="text-align:right;font-size:9pt;color:#64748b;">
        <strong style="color:#0891B2;font-size:11pt;">INVOICE</strong><br/>
        No: ${data.referenceNo}<br/>
        Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>

    ${freeBanner}

    <div style="margin-bottom:20px;">
      <h3 style="color:#0891B2;font-size:13px;margin-bottom:8px;">Ditagihkan Kepada:</h3>
      <table style="width:100%;font-size:12px;">
        <tr><td style="color:#64748b;width:120px;padding:3px 0;">Nama</td><td style="font-weight:600;">${data.customerName}</td></tr>
        <tr><td style="color:#64748b;padding:3px 0;">Email</td><td>${data.customerEmail}</td></tr>
        ${data.customerInstitution ? `<tr><td style="color:#64748b;padding:3px 0;">Instansi</td><td>${data.customerInstitution}</td></tr>` : ''}
        ${data.customerPhone ? `<tr><td style="color:#64748b;padding:3px 0;">Telepon</td><td>${data.customerPhone}</td></tr>` : ''}
      </table>
    </div>

    <div style="margin-bottom:20px;">
      <h3 style="color:#0891B2;font-size:13px;margin-bottom:8px;">Detail Peminjaman:</h3>
      <table style="width:100%;font-size:12px;">
        <tr><td style="color:#64748b;width:120px;padding:3px 0;">Tujuan</td><td>${data.purpose}</td></tr>
        <tr><td style="color:#64748b;padding:3px 0;">Tanggal Mulai</td><td>${formatDateTime(data.startDate)}</td></tr>
        <tr><td style="color:#64748b;padding:3px 0;">Tanggal Selesai</td><td>${formatDateTime(data.endDate)}</td></tr>
      </table>
    </div>

    <table style="width:100%;border-collapse:collapse;margin:15px 0;font-size:11px;">
      <thead>
        <tr style="background:#0891B2;color:white;">
          <th style="padding:8px 12px;text-align:center;border:1px solid #0891B2;">No</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid #0891B2;">Nama Item</th>
          <th style="padding:8px 12px;text-align:center;border:1px solid #0891B2;">Tipe</th>
          <th style="padding:8px 12px;text-align:center;border:1px solid #0891B2;">Qty</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #0891B2;">Harga Satuan</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #0891B2;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr style="background:#f8fafc;">
          <td colspan="5" style="padding:10px 12px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;">TOTAL</td>
          <td style="padding:10px 12px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;color:${isFree ? '#059669' : '#0891B2'};font-size:14px;">
            ${isFree ? 'GRATIS' : formatRupiah(data.totalAmount)}
          </td>
        </tr>
      </tfoot>
    </table>

    ${paymentHtml}

    <div style="margin-top:40px;padding-top:15px;border-top:1px solid #e2e8f0;font-size:10pt;color:#64748b;text-align:center;">
      <p><strong>${institution?.name || 'Sewa Ruang & Alat'}</strong></p>
      ${institution?.address ? `<p>${institution.address}</p>` : ''}
      <p style="margin-top:10px;font-size:9pt;">Dokumen ini digenerate secara otomatis oleh sistem.</p>
      <p style="font-size:9pt;">© ${new Date().getFullYear()} ${institution?.name || 'Sewa Ruang & Alat'}</p>
    </div>
  </div>
</body>
</html>`

  try {
    const executablePath = await getChromePath()
    if (!executablePath) {
      throw new Error('Chrome/Chromium executable not found. Please install Google Chrome or set PUPPETEER_EXECUTABLE_PATH environment variable.')
    }
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true })
    await browser.close()
    return Buffer.from(pdfBuffer)
  } catch (err) {
    console.error('PDF generation failed:', err)
    throw err
  }
}

// ── Backward-compatible class wrapper ───────────────────────────────────────

class EmailServiceCompat {
  async sendEmail(options: {
    to: string
    subject: string
    text?: string
    html?: string
    attachments?: Array<{ filename: string; path?: string; content?: Buffer }>
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // This method requires config to be provided externally in new architecture
    // For backward compat, return error - callers should use sendEmailWithConfig
    return { success: false, error: 'Use sendEmailWithConfig from emailServer instead' }
  }

  async verifyConnection(): Promise<boolean> {
    return false
  }

  generateBookingConfirmationEmail(booking: {
    reference_no: string
    start_datetime: string
    end_datetime: string
    total_amount?: number
    users?: { name?: string } | null
  }): { subject: string; html: string } {
    return buildBookingSubmittedEmail({
      name: booking.users?.name || 'Peminjam',
      referenceNo: booking.reference_no,
      purpose: '',
      startDate: booking.start_datetime,
      endDate: booking.end_datetime,
      totalAmount: booking.total_amount || 0,
      items: [],
    })
  }
}

export const emailService = new EmailServiceCompat()
