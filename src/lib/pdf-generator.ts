import { getInstitutionProfile, InstitutionProfile } from './institution'

interface PDFTemplateOptions {
  title: string
  subtitle?: string
  content: string
  showHeader?: boolean
  showFooter?: boolean
  pageSize?: 'A4' | 'Letter'
}

/**
 * Generate HTML for PDF with institution branding
 * Use this with libraries like Puppeteer, Playwright, or html-pdf
 */
export async function generatePDFHtml(options: PDFTemplateOptions): Promise<string> {
  const institution = await getInstitutionProfile()
  
  const {
    title,
    subtitle,
    content,
    showHeader = true,
    showFooter = true,
    pageSize = 'A4'
  } = options

  const pageDimensions = pageSize === 'A4' 
    ? { width: '210mm', height: '297mm' }
    : { width: '216mm', height: '279mm' }

  const logoHtml = institution?.logo_url
    ? `<img src="${institution.logo_url}" alt="${institution.name}" style="max-height: 50px; max-width: 150px;" />`
    : `<h2 style="color: #1e40af; margin: 0; font-size: 20px;">${institution?.name || 'Tim Admin USC'}</h2>`

  const contactHtml = []
  if (institution?.address) contactHtml.push(institution.address)
  if (institution?.phone) contactHtml.push(`Telp: ${institution.phone}`)
  if (institution?.email) contactHtml.push(`Email: ${institution.email}`)
  if (institution?.website) contactHtml.push(`Web: ${institution.website}`)

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: ${pageSize.toLowerCase()};
      margin: 20mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
    }
    
    .page {
      width: ${pageDimensions.width};
      min-height: ${pageDimensions.height};
      padding: 20mm;
      position: relative;
    }
    
    /* Header */
    .header {
      border-bottom: 3px solid #1e40af;
      padding-bottom: 15px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .header-logo {
      flex: 1;
    }
    
    .header-info {
      text-align: right;
      font-size: 9pt;
      color: #666;
    }
    
    .header-info strong {
      color: #1e40af;
      font-size: 10pt;
    }
    
    /* Document Title */
    .doc-title {
      text-align: center;
      margin: 30px 0;
      padding: 15px;
      background: #f8fafc;
      border-left: 4px solid #1e40af;
    }
    
    .doc-title h1 {
      color: #1e40af;
      font-size: 18pt;
      margin-bottom: 5px;
    }
    
    .doc-title p {
      color: #64748b;
      font-size: 10pt;
    }
    
    /* Content */
    .content {
      margin: 20px 0;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background: #f1f5f9;
      color: #1e40af;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background: #f8fafc;
    }
    
    /* Signatures */
    .signature-section {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }
    
    .signature-box {
      width: 45%;
      text-align: center;
    }
    
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 60px;
      padding-top: 5px;
    }
    
    /* Footer */
    .footer {
      position: fixed;
      bottom: 20mm;
      left: 20mm;
      right: 20mm;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      font-size: 8pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .footer-institution {
      flex: 1;
    }
    
    .footer-institution strong {
      color: #1e40af;
    }
    
    .footer-contact {
      text-align: right;
      font-size: 7pt;
      line-height: 1.4;
    }
    
    .page-number {
      text-align: center;
      margin-top: 5px;
      font-size: 8pt;
      color: #94a3b8;
    }
    
    /* Utility Classes */
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 600; }
    .text-blue { color: #1e40af; }
    .text-gray { color: #64748b; }
    .text-small { font-size: 9pt; }
    .text-xs { font-size: 8pt; }
    .mt-10 { margin-top: 10px; }
    .mt-20 { margin-top: 20px; }
    .mb-10 { margin-bottom: 10px; }
    .mb-20 { margin-bottom: 20px; }
    .p-10 { padding: 10px; }
    .p-20 { padding: 20px; }
    .bg-light { background: #f8fafc; }
    .border { border: 1px solid #e2e8f0; }
    .rounded { border-radius: 4px; }
  </style>
</head>
<body>
  <div class="page">
    ${showHeader ? `
    <header class="header">
      <div class="header-logo">
        ${logoHtml}
        ${institution?.short_name && institution.short_name !== institution.name 
          ? `<p style="color: #64748b; font-size: 10pt; margin: 5px 0 0 0;">${institution.short_name}</p>` 
          : ''}
      </div>
      <div class="header-info">
        <strong>${institution?.name || 'Tim Admin USC'}</strong><br/>
        ${contactHtml.join('<br/>')}
      </div>
    </header>
    ` : ''}
    
    <div class="doc-title">
      <h1>${title}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
    </div>
    
    <div class="content">
      ${content}
    </div>
    
    ${showFooter ? `
    <footer class="footer">
      <div class="footer-institution">
        <strong>${institution?.name || 'Tim Admin USC'}</strong><br/>
        Dokumen ini digenerate secara otomatis oleh sistem
      </div>
      <div class="footer-contact">
        ${contactHtml.join('<br/>')}
      </div>
    </footer>
    
    <div class="page-number">
      Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span>
    </div>
    ` : ''}
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate Invoice HTML
 */
export async function generateInvoiceHtml(data: {
  invoiceNumber: string
  invoiceDate: string
  customerName: string
  customerEmail: string
  items: Array<{
    name: string
    description?: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  discount?: number
  total: number
  notes?: string
}): Promise<string> {
  const institution = await getInstitutionProfile()
  
  const itemsHtml = data.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.description || '-'}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">${formatCurrency(item.unitPrice)}</td>
      <td class="text-right">${formatCurrency(item.total)}</td>
    </tr>
  `).join('')

  const content = `
    <div class="mb-20">
      <table style="width: 100%; border: none; margin: 0;">
        <tr style="border: none;">
          <td style="border: none; width: 50%; vertical-align: top;">
            <h3 style="color: #1e40af; margin-bottom: 10px;">Ditagihkan Kepada:</h3>
            <p class="font-bold">${data.customerName}</p>
            <p class="text-gray">${data.customerEmail}</p>
          </td>
          <td style="border: none; width: 50%; vertical-align: top; text-align: right;">
            <table style="width: auto; margin-left: auto; border: none;">
              <tr style="border: none;">
                <td style="border: none; text-align: right;"><strong>No. Invoice:</strong></td>
                <td style="border: none; text-align: right;">${data.invoiceNumber}</td>
              </tr>
              <tr style="border: none;">
                <td style="border: none; text-align: right;"><strong>Tanggal:</strong></td>
                <td style="border: none; text-align: right;">${data.invoiceDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Deskripsi</th>
          <th class="text-center">Qty</th>
          <th class="text-right">Harga Satuan</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="text-right"><strong>Subtotal:</strong></td>
          <td class="text-right">${formatCurrency(data.subtotal)}</td>
        </tr>
        ${data.discount ? `
        <tr>
          <td colspan="4" class="text-right"><strong>Diskon:</strong></td>
          <td class="text-right">-${formatCurrency(data.discount)}</td>
        </tr>
        ` : ''}
        <tr style="background: #1e40af; color: white;">
          <td colspan="4" class="text-right"><strong>TOTAL:</strong></td>
          <td class="text-right"><strong>${formatCurrency(data.total)}</strong></td>
        </tr>
      </tfoot>
    </table>

    ${data.notes ? `
    <div class="mt-20 p-20 bg-light rounded">
      <h4 style="color: #1e40af; margin-bottom: 10px;">Catatan:</h4>
      <p>${data.notes}</p>
    </div>
    ` : ''}

    <div class="signature-section">
      <div class="signature-box">
        <p class="text-small">Dibuat oleh,</p>
        <div class="signature-line">
          <p class="text-small">${institution?.name || 'Admin'}</p>
        </div>
      </div>
      <div class="signature-box">
        <p class="text-small">Diterima oleh,</p>
        <div class="signature-line">
          <p class="text-small">${data.customerName}</p>
        </div>
      </div>
    </div>
  `

  return generatePDFHtml({
    title: 'INVOICE',
    subtitle: `No. ${data.invoiceNumber}`,
    content,
    showHeader: true,
    showFooter: true
  })
}

/**
 * Generate Agreement HTML
 */
export async function generateAgreementHtml(data: {
  agreementNumber: string
  agreementDate: string
  borrowerName: string
  borrowerDetails: string
  items: Array<{
    name: string
    type: 'room' | 'equipment'
    startDate: string
    endDate: string
  }>
  terms: string
}): Promise<string> {
  const institution = await getInstitutionProfile()

  const itemsHtml = data.items.map((item, index) => `
    <tr>
      <td class="text-center">${index + 1}</td>
      <td>${item.name}</td>
      <td>${item.type === 'room' ? 'Ruangan' : 'Alat'}</td>
      <td>${item.startDate}</td>
      <td>${item.endDate}</td>
    </tr>
  `).join('')

  const content = `
    <div class="mb-20">
      <h3 style="color: #1e40af; margin-bottom: 15px;">PARA PIHAK:</h3>
      <table style="border: none; margin: 0;">
        <tr style="border: none;">
          <td style="border: none; width: 50%; vertical-align: top;">
            <p><strong>Pihak Pertama:</strong></p>
            <p>${institution?.name || 'Tim Admin USC'}</p>
            <p class="text-small text-gray">${institution?.address || ''}</p>
          </td>
          <td style="border: none; width: 50%; vertical-align: top;">
            <p><strong>Pihak Kedua:</strong></p>
            <p>${data.borrowerName}</p>
            <p class="text-small text-gray">${data.borrowerDetails}</p>
          </td>
        </tr>
      </table>
    </div>

    <h3 style="color: #1e40af; margin-bottom: 15px;">ITEM YANG DIPINJAM:</h3>
    <table class="mb-20">
      <thead>
        <tr>
          <th class="text-center" style="width: 50px;">No</th>
          <th>Nama Item</th>
          <th>Tipe</th>
          <th>Tanggal Mulai</th>
          <th>Tanggal Selesai</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <h3 style="color: #1e40af; margin-bottom: 15px;">SYARAT & KETENTUAN:</h3>
    <div class="bg-light p-20 rounded border mb-20">
      ${data.terms.replace(/\n/g, '<br/>')}
    </div>

    <p class="mb-20">Dengan menandatangani perjanjian ini, Pihak Kedua menyatakan telah membaca, memahami, dan menyetujui semua syarat dan ketentuan yang berlaku.</p>

    <div class="signature-section">
      <div class="signature-box">
        <p class="text-small">Pihak Pertama,</p>
        <p class="text-small text-gray">${institution?.name || 'Tim Admin USC'}</p>
        <div class="signature-line">
          <p class="text-small">(____________________)</p>
          <p class="text-small">Nama & Tanda Tangan</p>
        </div>
        <p class="text-small">Tanggal: ${data.agreementDate}</p>
      </div>
      <div class="signature-box">
        <p class="text-small">Pihak Kedua,</p>
        <p class="text-small text-gray">Peminjam</p>
        <div class="signature-line">
          <p class="text-small">(____________________)</p>
          <p class="text-small">${data.borrowerName}</p>
        </div>
        <p class="text-small">Tanggal: ${data.agreementDate}</p>
      </div>
    </div>
  `

  return generatePDFHtml({
    title: 'SURAT PERJANJIAN PEMINJAMAN',
    subtitle: `No. ${data.agreementNumber}`,
    content,
    showHeader: true,
    showFooter: true
  })
}

/**
 * Generate Report HTML
 */
export async function generateReportHtml(data: {
  reportTitle: string
  reportPeriod: string
  generatedAt: string
  summary: Array<{ label: string; value: string | number }>
  tableData: {
    headers: string[]
    rows: Array<(string | number)[]>
  }
  notes?: string
}): Promise<string> {
  const summaryHtml = data.summary.map(s => `
    <div style="background: #f1f5f9; padding: 15px; border-radius: 4px; text-align: center;">
      <p style="color: #64748b; font-size: 10pt; margin-bottom: 5px;">${s.label}</p>
      <p style="color: #1e40af; font-size: 18pt; font-weight: 600;">${s.value}</p>
    </div>
  `).join('')

  const headersHtml = data.tableData.headers.map(h => `<th>${h}</th>`).join('')
  
  const rowsHtml = data.tableData.rows.map(row => `
    <tr>
      ${row.map(cell => `<td>${cell}</td>`).join('')}
    </tr>
  `).join('')

  const content = `
    <div class="mb-20">
      <p class="text-gray text-small mb-10">Periode: ${data.reportPeriod}</p>
      <p class="text-gray text-small">Digenerate pada: ${data.generatedAt}</p>
    </div>

    <h3 style="color: #1e40af; margin-bottom: 15px;">RINGKASAN:</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px;">
      ${summaryHtml}
    </div>

    <h3 style="color: #1e40af; margin-bottom: 15px;">DETAIL:</h3>
    <table class="mb-20">
      <thead>
        <tr>
          ${headersHtml}
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    ${data.notes ? `
    <div class="p-20 bg-light rounded border">
      <h4 style="color: #1e40af; margin-bottom: 10px;">Catatan:</h4>
      <p class="text-small">${data.notes}</p>
    </div>
    ` : ''}
  `

  return generatePDFHtml({
    title: data.reportTitle.toUpperCase(),
    subtitle: `Periode: ${data.reportPeriod}`,
    content,
    showHeader: true,
    showFooter: true
  })
}

/**
 * Generate USC-style Formulir Peminjaman + Invoice document (4 pages)
 * Matches the official Unesa Science Center form layout
 */
export async function generateUSCBookingDocument(data: {
  referenceNo: string
  customerName: string
  nim?: string | null
  institution?: string | null
  phone?: string | null
  membershipType?: string | null
  startDate: string
  endDate: string
  items: Array<{
    code: string
    name: string
    type: 'room' | 'equipment'
    price: number
  }>
  total: number
  roomVA?: {
    bankName: string
    accountNumber: string
    accountName: string
  } | null
  equipmentVA?: {
    bankName: string
    accountNumber: string
    accountName: string
  } | null
  hasRoom: boolean
  hasEquipment: boolean
}): Promise<string> {
  const inst = await getInstitutionProfile()

  const navy    = '#1e3d70'
  const lblBg   = '#d6e4f5'
  const border  = '#9ab5d5'
  const evenRow = '#f0f6ff'

  const logoHtml = inst?.logo_url
    ? `<img src="${inst.logo_url}" style="height:55px;width:auto;" />`
    : `<div style="width:55px;height:55px;background:${navy};border-radius:4px;color:white;font-weight:bold;font-size:8pt;text-align:center;line-height:55px;">UNESA</div>`

  const contactParts = [
    inst?.address || 'Jl. Kampus Unesa Lidah Wetan Surabaya, 60213',
    inst?.email   ? `E. ${inst.email}`   : null,
    inst?.website ? `www. ${inst.website}` : null,
  ].filter(Boolean).join('<br/>')

  const pageHeader = `
    <table style="width:100%;border-collapse:collapse;padding-bottom:8px;">
      <tr>
        <td style="vertical-align:middle;">
          <table style="border-collapse:collapse;">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">${logoHtml}</td>
              <td style="vertical-align:middle;">
                <div style="font-size:12pt;font-weight:bold;color:${navy};line-height:1.3;">${inst?.name || 'UNIVERSITAS NEGERI SURABAYA'}</div>
                <div style="font-size:9pt;font-weight:bold;color:${navy};">${inst?.short_name || 'DIREKTORAT UNESA SCIENCE CENTER'}</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="vertical-align:middle;text-align:right;font-size:7.5pt;line-height:1.7;color:#444;">
          <strong>Kampus Unesa 2</strong><br/>${contactParts}
        </td>
      </tr>
    </table>
    <div style="border-bottom:2.5px solid ${navy};margin-bottom:0;"></div>`

  const lbl = (text: string) =>
    `<td style="border:1px solid ${border};padding:5px 8px;height:26px;background:${lblBg};color:${navy};font-weight:bold;width:38%;font-size:9pt;">${text}</td>`
  const val = (text: string) =>
    `<td style="border:1px solid ${border};padding:5px 8px;height:26px;font-size:9pt;">: ${text}</td>`

  const th = (text: string, w?: string) =>
    `<th style="background:${navy};color:white;padding:7px 8px;font-size:9pt;font-weight:bold;text-align:center;border:1px solid ${navy};${w ? `width:${w};` : ''}">${text}</th>`

  const tdStyle = (i: number, align = 'left', extra = '') =>
    `style="border:1px solid ${border};padding:6px 8px;font-size:9pt;height:28px;vertical-align:middle;text-align:${align};background:${i % 2 === 0 ? '#fff' : evenRow};${extra}"`

  // Formulir rows — padded to at least 5
  const formulirItems = [...data.items]
  while (formulirItems.length < 5) formulirItems.push({ code: '', name: '', type: 'equipment' as const, price: 0 })

  const formulirRows = formulirItems.map((item, i) => `
    <tr>
      <td ${tdStyle(i, 'center')}>${item.name ? i + 1 : ''}</td>
      <td ${tdStyle(i)}>${item.name}</td>
      <td ${tdStyle(i, 'center')}>${item.name ? '1' : ''}</td>
      <td ${tdStyle(i)}></td>
      <td ${tdStyle(i)}></td>
      <td ${tdStyle(i)}></td>
    </tr>`).join('')

  // Invoice rows — padded to at least 5
  const invoiceItems = [...data.items]
  while (invoiceItems.length < 5) invoiceItems.push({ code: '', name: '', type: 'equipment' as const, price: 0 })

  const invoiceRows = invoiceItems.map((item, i) => `
    <tr>
      <td ${tdStyle(i, 'center')}>${item.name ? i + 1 : ''}</td>
      <td ${tdStyle(i, 'left', 'font-family:monospace')}>${item.code}</td>
      <td ${tdStyle(i)}>${item.name}</td>
      <td ${tdStyle(i, 'right')}>${item.name ? formatCurrency(item.price) : ''}</td>
    </tr>`).join('')

  const riskRow = (num: number, text: string, even: boolean) => `
    <tr>
      <td style="background:${navy};color:white;font-weight:bold;width:28px;text-align:center;padding:8px;border:1px solid ${border};vertical-align:middle;">${num}</td>
      <td style="border:1px solid ${border};padding:8px 10px;font-size:9pt;background:${even ? evenRow : '#fff'};">${text}</td>
    </tr>`

  function vaNote(va: { bankName: string; accountNumber: string; accountName: string }, label: string) {
    return `<div style="margin-bottom:8px;">
      <div style="font-weight:bold;color:${navy};font-size:9pt;margin-bottom:4px;">${label}</div>
      <table style="width:100%;border-collapse:collapse;font-size:9pt;">
        <tr>
          <td style="width:130px;padding:2px 0;vertical-align:top;">Bank</td>
          <td style="padding:2px 0;vertical-align:top;font-weight:bold;">: ${va.bankName}</td>
        </tr>
        <tr>
          <td style="padding:2px 0;vertical-align:top;">No. Virtual Akun</td>
          <td style="padding:2px 0;vertical-align:top;font-weight:bold;">: ${va.accountNumber}</td>
        </tr>
        <tr>
          <td style="padding:2px 0;vertical-align:top;">Atas Nama</td>
          <td style="padding:2px 0;vertical-align:top;font-weight:bold;">: ${va.accountName}</td>
        </tr>
      </table>
    </div>`
  }

  const paymentNotes = (() => {
    if (!data.hasRoom && !data.hasEquipment) {
      return `<div style="font-size:9pt;line-height:1.7;">
        Harap hubungi admin untuk informasi pembayaran.<br/>
        No. Referensi: <strong>${data.referenceNo}</strong>
      </div>`
    }

    let notes = `<div style="font-size:9pt;line-height:1.7;">`
    notes += `<div style="margin-bottom:8px;">
      Pembayaran dilakukan dengan <strong>m-banking</strong> melalui menu pembayaran <strong>Virtual Akun</strong> 
      ke bank lain dan pilih <strong>Bank BTN</strong>.
    </div>`

    if (data.hasRoom && data.roomVA) {
      notes += vaNote(data.roomVA, 'Pembayaran Sewa Ruang:')
    }
    if (data.hasEquipment && data.equipmentVA) {
      notes += vaNote(data.equipmentVA, 'Pembayaran Sewa Alat:')
    }

    notes += `<div style="margin-top:8px;border-top:1px solid ${border};padding-top:6px;">
      <strong>Catatan Penting:</strong>
      <ul style="margin:4px 0 0 16px;padding:0;">
        <li>Sertakan nomor referensi <strong>${data.referenceNo}</strong> pada keterangan transfer.</li>
        <li>Bukti Transfer dapat dikirim ke nomor Whatsapp: <strong>+62 896-7704-2940 (Iqbal)</strong></li>
      </ul>
    </div>`

    notes += `</div>`
    return notes
  })()

  const banner = (text: string) =>
    `<div style="background:${navy};color:white;text-align:center;padding:9px 12px;font-size:10.5pt;font-weight:bold;letter-spacing:0.3px;margin:12px 0 10px 0;">${text}</div>`

  const secHdr = (text: string) =>
    `<div style="font-weight:bold;color:${navy};font-size:9.5pt;margin:10px 0 5px 0;">${text}</div>`

  const sigCell = (title: string, border2 = true) =>
    `<td style="border:1px solid ${border};${border2 ? '' : 'border-left:none;'}text-align:center;padding:8px;width:50%;height:110px;vertical-align:top;">
       <div style="font-weight:bold;color:${navy};font-size:9.5pt;">${title}</div>
       <div style="margin-top:65px;font-size:9pt;">(.................................)</div>
     </td>`

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a1a; }
  .p { width: 210mm; min-height: 297mm; padding: 12mm 18mm; page-break-after: always; }
  .p:last-child { page-break-after: auto; }
</style>
</head>
<body>

<!-- PAGE 1: FORMULIR PEMINJAMAN -->
<div class="p">
  ${pageHeader}
  ${banner('FORMULIR PEMINJAMAN DAN PERSETUJUAN')}

  ${secHdr('A. INFORMASI PEMINJAM')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
    <tr>${lbl('Nama Peminjam')}${val(data.customerName)}</tr>
    <tr>${lbl('NIP / NIM')}${val(data.nim || '')}</tr>
    <tr>${lbl('Departemen / Fakultas')}${val(data.institution || '')}</tr>
    <tr>${lbl('Tanggal Peminjaman')}${val(data.startDate)}</tr>
    <tr>${lbl('Tanggal Pengembalian')}${val(data.endDate)}</tr>
    <tr>${lbl('No. Kontak')}${val(data.phone || '')}</tr>
  </table>

  ${secHdr('B. ALAT YANG DIPINJAM')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
    <thead><tr>
      ${th('No', '30px')}
      ${th('Nama Barang')}
      ${th('Jumlah', '65px')}
      ${th('Kondisi Barang', '120px')}
      ${th('TTD Peminjam', '100px')}
      ${th('TTD Laboran', '100px')}
    </tr></thead>
    <tbody>${formulirRows}</tbody>
  </table>
</div>

<!-- PAGE 2: RISIKO DAN PERSETUJUAN -->
<div class="p">
  ${secHdr('C. RISIKO DAN PERSETUJUAN')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
    ${riskRow(1, 'Saya akan bertanggung jawab atas kondisi alat yang dipinjam selama dalam penggunaan saya.', false)}
    ${riskRow(2, 'Saya akan mengembalikan alat dalam kondisi yang sama seperti saat dipinjam, dan akan bertanggung jawab atas kerusakan atau kehilangan.', true)}
    ${riskRow(3, 'Saya memahami bahwa penggunaan alat olahraga dapat berpotensi menyebabkan cedera fisik.', false)}
    ${riskRow(4, 'Saya akan mematuhi semua pedoman keselamatan yang telah ditetapkan oleh pusat olahraga.', true)}
    ${riskRow(5, 'Saya melepaskan pusat olahraga dari segala tanggung jawab atas cedera atau kerusakan yang mungkin timbul selama atau akibat penggunaan alat ini.', false)}
  </table>

  <table style="width:100%;border-collapse:collapse;margin-top:20px;">
    <tr>
      <td style="border:1px solid ${border};text-align:center;padding:8px;width:50%;height:110px;vertical-align:top;">
        <div style="font-weight:bold;color:${navy};font-size:9.5pt;">Laboran</div>
        <div style="margin-top:65px;font-size:9pt;">(.................................)</div>
      </td>
      <td style="border:1px solid ${border};border-left:none;text-align:center;padding:8px;width:50%;height:110px;vertical-align:top;">
        <div style="font-weight:bold;color:${navy};font-size:9.5pt;">Pemohon</div>
        <div style="margin-top:65px;font-size:9pt;">(.................................)</div>
        <div style="margin-top:4px;font-size:9pt;font-weight:bold;">${data.customerName}</div>
      </td>
    </tr>
  </table>
</div>

<!-- PAGE 3: INVOICE + CATATAN PEMBAYARAN -->
<div class="p">
  ${pageHeader}
  ${banner('INVOICE PEMINJAMAN SARANA DAN PRASARANA SPORT CENTER')}

  ${secHdr('A. IDENTITAS PEMINJAM')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
    <tr>${lbl('Nama Peminjam')}${val(data.customerName)}</tr>
    <tr>${lbl('NIP / NIM')}${val(data.nim || '')}</tr>
    <tr>${lbl('Instansi')}${val(data.institution || '')}</tr>
    <tr>${lbl('Tanggal Peminjaman')}${val(data.startDate)}</tr>
    <tr>${lbl('Tanggal Pengembalian')}${val(data.endDate)}</tr>
    <tr>${lbl('No. Kontak')}${val(data.phone || '')}</tr>
    <tr>${lbl('Jenis Keanggotaan')}${val(data.membershipType || '')}</tr>
  </table>

  ${secHdr('B. RINCIAN PEMINJAMAN')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
    <thead><tr>
      ${th('No', '30px')}
      ${th('Kode Barang', '120px')}
      ${th('Nama Barang / Ruang')}
      ${th('Harga', '110px')}
    </tr></thead>
    <tbody>
      ${invoiceRows}
      <tr>
        <td colspan="3" style="text-align:right;font-weight:bold;background:${navy};color:white;padding:7px 10px;border:1px solid ${navy};">TOTAL</td>
        <td style="text-align:right;font-weight:bold;background:${navy};color:white;padding:7px 10px;border:1px solid ${navy};">${formatCurrency(data.total)}</td>
      </tr>
    </tbody>
  </table>

  ${secHdr('C. CATATAN PEMBAYARAN')}
  <div style="border:2px solid #d4aa00;padding:12px 14px;background:#fffef5;font-size:9pt;margin-bottom:12px;line-height:2;">
    ${paymentNotes}
  </div>
</div>

<!-- PAGE 4: TANDA TANGAN & PERSETUJUAN -->
<div class="p">
  ${pageHeader}
  ${banner('PERSETUJUAN DAN TANDA TANGAN')}

  <div style="font-size:9.5pt;line-height:1.7;margin-bottom:15px;color:#333;">
    Dengan menandatangani formulir ini, pemohon menyatakan telah membaca, memahami, dan menyetujui 
    semua syarat dan ketentuan yang berlaku terkait peminjaman sarana dan prasarana di Unesa Science Center, 
    termasuk kewajiban pembayaran sesuai rincian yang tercantum pada invoice di halaman sebelumnya.
  </div>

  <table style="width:100%;border-collapse:collapse;margin-top:10px;">
    <tr>
      <td style="border:1px solid ${border};text-align:center;padding:8px;height:110px;vertical-align:top;width:50%;">
        <div style="font-weight:bold;color:${navy};font-size:9.5pt;">Admin USC</div>
        <div style="margin-top:65px;font-size:9pt;">(.................................)</div>
      </td>
      <td style="border:1px solid ${border};text-align:center;padding:8px;height:110px;vertical-align:top;width:50%;border-left:none;">
        <div style="font-weight:bold;color:${navy};font-size:9.5pt;">Pemohon</div>
        <div style="margin-top:65px;font-size:9pt;">(.................................)</div>
        <div style="margin-top:4px;font-size:9pt;font-weight:bold;">${data.customerName}</div>
      </td>
    </tr>
  </table>

  <div style="font-size:8.5pt;color:#64748b;text-align:center;margin-top:12px;">
    Dokumen ini digenerate secara otomatis oleh sistem. Halaman 4 dari 4.
  </div>
</div>

</body>
</html>`
}

// Helper function
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value)
}
