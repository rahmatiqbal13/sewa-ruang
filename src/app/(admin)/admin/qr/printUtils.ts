export type PrintFormat =
  | 'a4-3col'
  | 'a4-4col'
  | 'thermal-58-pos'
  | 'thermal-80x50'
  | 'thermal-57x40'
  | 'thermal-40x30'

export const PRINT_FORMATS: { id: PrintFormat; label: string; desc: string }[] = [
  { id: 'a4-3col',        label: 'A4 · 3 kolom',    desc: '~9 label/hal' },
  { id: 'a4-4col',        label: 'A4 · 4 kolom',    desc: '~12 label/hal' },
  { id: 'thermal-58-pos', label: 'POS-58 mm',        desc: 'Roll portrait 58mm' },
  { id: 'thermal-80x50',  label: 'Thermal 80×50 mm', desc: '1 label/hal' },
  { id: 'thermal-57x40',  label: 'Thermal 57×40 mm', desc: '1 label/hal' },
  { id: 'thermal-40x30',  label: 'Thermal 40×30 mm', desc: '1 label/hal' },
]

export interface PrintItem {
  id: string
  name: string
  code: string | null
  type: 'room' | 'equipment' | 'inventory'
  url: string
  meta?: string
  /** Isi dengan base64 SVG saat mencetak dari QRCodeDisplay (tidak perlu API eksternal) */
  svgBase64?: string
}

const typeLabel = (t: string) =>
  t === 'room' ? 'Ruangan' : t === 'equipment' ? 'Alat' : 'Inventaris'

const typeColor = (t: string) =>
  t === 'room' ? '#7c3aed' : t === 'equipment' ? '#2563eb' : '#d97706'

/** Buat tag <img> QR — pakai SVG inline jika tersedia, fallback ke API */
const qrImg = (item: PrintItem, cssSize: string, apiPx: number): string => {
  const style = `width:${cssSize};height:${cssSize};display:block;`
  return item.svgBase64
    ? `<img src="data:image/svg+xml;base64,${item.svgBase64}" style="${style}" alt="QR">`
    : `<img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(item.url)}&size=${apiPx}x${apiPx}" style="${style}" alt="QR">`
}

export function buildPrintHtml(items: PrintItem[], format: PrintFormat): string {
  /* ── A4 grid ──────────────────────────────────────────────── */
  if (format === 'a4-3col' || format === 'a4-4col') {
    const cols    = format === 'a4-3col' ? 3 : 4
    const qrCss   = format === 'a4-3col' ? '90px' : '70px'
    const apiPx   = format === 'a4-3col' ? 100 : 75
    const gap     = format === 'a4-3col' ? '10px' : '6px'
    const pad     = format === 'a4-3col' ? '12px' : '8px'
    const margin  = format === 'a4-3col' ? '10mm' : '8mm'
    return `<!DOCTYPE html><html><head><title>Label QR</title><style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:Arial,sans-serif;}
      .grid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap};}
      .label{border:1.5px solid #333;border-radius:6px;padding:${pad};text-align:center;break-inside:avoid;overflow:hidden;}
      .label-type{font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;}
      .label-qr{display:flex;justify-content:center;margin-bottom:6px;}
      .label-code{font-family:monospace;font-size:10px;display:block;margin-bottom:4px;color:#555;}
      .label-name{font-size:11px;font-weight:700;line-height:1.3;margin-bottom:2px;}
      .label-meta{font-size:9px;color:#888;}
      @media print{@page{size:A4;margin:${margin};}body{padding:0;}.label{border-color:#000;}}
    </style></head><body>
      <div class="grid">
        ${items.map(item => `
          <div class="label">
            <span class="label-type" style="color:${typeColor(item.type)}">${typeLabel(item.type)}</span>
            <div class="label-qr">${qrImg(item, qrCss, apiPx)}</div>
            ${item.code ? `<span class="label-code">${item.code}</span>` : ''}
            <div class="label-name">${item.name}</div>
            ${item.meta ? `<div class="label-meta">${item.meta}</div>` : ''}
          </div>`).join('')}
      </div>
    </body></html>`
  }

  /* ── POS-58 receipt (roll kontinyu, konten dari atas) ─────── */
  if (format === 'thermal-58-pos') {
    // Untuk printer thermal roll dengan paper size panjang
    // Label ditampilkan sequential dengan fixed height, printer akan menggulung otomatis
    const labelHeight = 70 // mm - tinggi per label
    const totalHeight = items.length * labelHeight
    
    return `<!DOCTYPE html><html><head><title>Label POS-58</title><style>
      *{margin:0;padding:0;box-sizing:border-box;}
      html,body{font-family:Arial,sans-serif;margin:0;padding:0;width:58mm;}
      body{height:auto;}
      .label{
        width:58mm;
        height:${labelHeight}mm;
        padding:2mm;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        text-align:center;
        box-sizing:border-box;
        border-bottom:1px dashed #999;
        page-break-inside:avoid;
        break-inside:avoid;
      }
      .label:last-child{border-bottom:none;}
      .label-type{font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2mm;}
      .label-qr{display:flex;justify-content:center;margin-bottom:2mm;}
      .label-qr img{width:38mm;height:38mm;}
      .label-code{font-family:monospace;font-size:9pt;margin-bottom:1mm;letter-spacing:.5px;}
      .label-name{font-size:10pt;font-weight:700;line-height:1.2;margin-bottom:1mm;word-break:break-word;max-width:54mm;}
      .label-meta{font-size:8pt;color:#555;}
      @media print{
        @page{margin:0 !important;padding:0 !important;size:58mm ${totalHeight}mm;}
        html,body{width:58mm;margin:0 !important;padding:0 !important;}
        .label{
          width:58mm;
          height:${labelHeight}mm;
          border-bottom:1px dashed #000;
          page-break-inside:avoid;
          break-inside:avoid;
        }
        .label:last-child{border-bottom:none;}
      }
    </style></head><body>
      ${items.map(item => `
        <div class="label">
          <span class="label-type" style="color:${typeColor(item.type)}">${typeLabel(item.type)}</span>
          <div class="label-qr">${qrImg(item, '38mm', 150)}</div>
          ${item.code ? `<div class="label-code">${item.code}</div>` : ''}
          <div class="label-name">${item.name}</div>
          ${item.meta ? `<div class="label-meta">${item.meta}</div>` : ''}
        </div>`).join('')}
    </body></html>`
  }

  /* ── Thermal 80×50 mm (landscape, QR kiri + teks kanan) ───── */
  if (format === 'thermal-80x50') {
    return `<!DOCTYPE html><html><head><title>Label Thermal 80×50</title><style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:Arial,sans-serif;}
      .label{width:78mm;height:48mm;display:flex;flex-direction:row;align-items:center;padding:2mm;break-after:page;overflow:hidden;}
      .label-qr{flex-shrink:0;margin-right:3mm;}
      .label-info{flex:1;overflow:hidden;text-align:left;}
      .label-type{font-size:8pt;font-weight:bold;text-transform:uppercase;display:block;margin-bottom:1.5mm;}
      .label-code{font-family:monospace;font-size:8pt;display:block;margin-bottom:1.5mm;color:#555;}
      .label-name{font-size:10pt;font-weight:700;line-height:1.3;margin-bottom:1.5mm;word-break:break-word;}
      .label-meta{font-size:7.5pt;color:#777;}
      @media print{@page{size:80mm 50mm;margin:0;}.label{break-after:page;}}
    </style></head><body>
      ${items.map(item => `
        <div class="label">
          <div class="label-qr">${qrImg(item, '38mm', 150)}</div>
          <div class="label-info">
            <span class="label-type" style="color:${typeColor(item.type)}">${typeLabel(item.type)}</span>
            ${item.code ? `<span class="label-code">${item.code}</span>` : ''}
            <div class="label-name">${item.name}</div>
            ${item.meta ? `<div class="label-meta">${item.meta}</div>` : ''}
          </div>
        </div>`).join('')}
    </body></html>`
  }

  /* ── Thermal 57×40 mm (landscape, QR kiri + teks kanan) ───── */
  if (format === 'thermal-57x40') {
    return `<!DOCTYPE html><html><head><title>Label Thermal 57×40</title><style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:Arial,sans-serif;}
      .label{width:55mm;height:38mm;display:flex;flex-direction:row;align-items:center;padding:1.5mm;break-after:page;overflow:hidden;}
      .label-qr{flex-shrink:0;margin-right:2mm;}
      .label-info{flex:1;overflow:hidden;text-align:left;}
      .label-type{font-size:7pt;font-weight:bold;text-transform:uppercase;display:block;margin-bottom:1mm;}
      .label-code{font-family:monospace;font-size:7pt;display:block;margin-bottom:1mm;color:#555;}
      .label-name{font-size:8.5pt;font-weight:700;line-height:1.2;margin-bottom:1mm;word-break:break-word;}
      .label-meta{font-size:6.5pt;color:#777;}
      @media print{@page{size:57mm 40mm;margin:0;}.label{break-after:page;}}
    </style></head><body>
      ${items.map(item => `
        <div class="label">
          <div class="label-qr">${qrImg(item, '28mm', 110)}</div>
          <div class="label-info">
            <span class="label-type" style="color:${typeColor(item.type)}">${typeLabel(item.type)}</span>
            ${item.code ? `<span class="label-code">${item.code}</span>` : ''}
            <div class="label-name">${item.name}</div>
            ${item.meta ? `<div class="label-meta">${item.meta}</div>` : ''}
          </div>
        </div>`).join('')}
    </body></html>`
  }

  /* ── Thermal 40×30 mm (portrait, QR atas + teks bawah) ────── */
  return `<!DOCTYPE html><html><head><title>Label Thermal 40×30</title><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;}
    .label{width:38mm;height:28mm;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1mm;break-after:page;overflow:hidden;text-align:center;}
    .label-qr{display:flex;justify-content:center;margin-bottom:1mm;}
    .label-code{font-family:monospace;font-size:6pt;display:block;color:#555;margin-bottom:0.5mm;}
    .label-name{font-size:7pt;font-weight:700;line-height:1.2;word-break:break-word;}
    .label-meta{font-size:5.5pt;color:#888;margin-top:0.5mm;}
    @media print{@page{size:40mm 30mm;margin:0;}.label{break-after:page;}}
  </style></head><body>
    ${items.map(item => `
      <div class="label">
        <div class="label-qr">${qrImg(item, '20mm', 80)}</div>
        ${item.code ? `<span class="label-code">${item.code}</span>` : ''}
        <div class="label-name">${item.name}</div>
        ${item.meta ? `<div class="label-meta">${item.meta}</div>` : ''}
      </div>`).join('')}
  </body></html>`
}

/** Jalankan print via hidden iframe — tidak perlu izin popup */
export function executePrint(htmlContent: string): void {
  const iframe = document.createElement('iframe')
  // Gunakan ukuran yang cukup besar agar layout bisa dihitung dengan benar
  // tapi tetap di luar viewport. Tinggi 5000px cukup untuk banyak label.
  iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:100mm;height:5000px;border:none;overflow:hidden;'
  document.body.appendChild(iframe)

  let called = false
  const printAndCleanup = () => {
    if (called) return
    called = true
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe)
    }, 2000)
  }

  iframe.srcdoc = htmlContent
  iframe.onload = () => {
    // Tunggu gambar dimuat dan pastikan layout sudah stabil
    const images = Array.from(iframe.contentDocument?.querySelectorAll('img') ?? [])
    if (images.length === 0) {
      // Beri waktu untuk layout stabil
      setTimeout(printAndCleanup, 300)
    } else {
      let loaded = 0
      const onDone = () => { if (++loaded === images.length) setTimeout(printAndCleanup, 300) }
      images.forEach(img => {
        if (img.complete) onDone()
        else { img.onload = onDone; img.onerror = onDone }
      })
      setTimeout(printAndCleanup, 8000)
    }
  }
}
