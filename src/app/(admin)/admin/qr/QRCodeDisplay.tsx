'use client'

import { useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Printer, ExternalLink, DoorOpen, Package, Boxes } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PRINT_FORMATS, PrintFormat, buildPrintHtml, executePrint } from './printUtils'

interface Props {
  url: string
  name: string
  code: string | null
  type: 'room' | 'equipment' | 'inventory'
  location?: string
  category?: string
}

const typeConfig = {
  room:      { icon: DoorOpen, label: 'Ruangan',    color: 'bg-purple-100 text-purple-800', badgeColor: 'bg-purple-600' },
  equipment: { icon: Package,  label: 'Alat',        color: 'bg-blue-100 text-blue-800',    badgeColor: 'bg-blue-600' },
  inventory: { icon: Boxes,    label: 'Inventaris',  color: 'bg-amber-100 text-amber-800',  badgeColor: 'bg-amber-600' },
}

export function QRCodeDisplay({ url, name, code, type, location, category }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [printFormat, setPrintFormat] = useState<PrintFormat>('a4-3col')
  const config = typeConfig[type]
  const Icon = config.icon

  function downloadSVG() {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `qr-${code || name.replace(/\s/g, '-')}.svg`
    link.click()
  }

  function downloadPNG() {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 600
    canvas.height = 700
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 600, 700)
      ctx.drawImage(img, 100, 80, 400, 400)
      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(config.label.toUpperCase(), 300, 50)
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText(name, 300, 520)
      if (code) {
        ctx.font = '20px monospace'
        ctx.fillStyle = '#64748b'
        ctx.fillText(code, 300, 550)
      }
      if (location || category) {
        ctx.font = '16px sans-serif'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText(location || category || '', 300, 580)
      }
      ctx.font = '12px monospace'
      ctx.fillStyle = '#cbd5e1'
      ctx.fillText(url.slice(0, 50) + (url.length > 50 ? '...' : ''), 300, 630)
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `qr-${code || name.replace(/\s/g, '-')}.png`
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(svg))
  }

  function handlePrint() {
    const svg = containerRef.current?.querySelector('svg')
    const svgBase64 = svg ? btoa(new XMLSerializer().serializeToString(svg)) : undefined

    const html = buildPrintHtml(
      [{ id: '', name, code, type, url, meta: location || category, svgBase64 }],
      printFormat,
    )
    executePrint(html)
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className={`${config.color} px-6 py-4 border-b`}>
        <div className="flex items-center gap-3">
          <div className={`${config.badgeColor} text-white p-2 rounded-lg`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium opacity-80">{config.label}</p>
            <h2 className="text-xl font-bold">{name}</h2>
          </div>
        </div>
      </div>

      <CardContent className="pt-6 flex flex-col items-center gap-6">
        {/* Info */}
        <div className="text-center space-y-2">
          {code && (
            <Badge variant="outline" className="font-mono text-sm px-3 py-1">
              {code}
            </Badge>
          )}
          {(location || category) && (
            <p className="text-muted-foreground text-sm">{location || category}</p>
          )}
        </div>

        {/* QR Code */}
        <div ref={containerRef} className="p-8 bg-white border-2 border-zinc-200 rounded-xl shadow-inner">
          <QRCode value={url} size={280} level="M" style={{ height: '280px', width: '280px' }} />
        </div>

        {/* URL */}
        <div className="text-center text-xs text-muted-foreground max-w-sm break-all bg-slate-50 p-3 rounded-lg">
          {url}
        </div>

        {/* Format selector */}
        <div className="w-full">
          <p className="text-xs font-medium text-muted-foreground mb-2">Format Cetak</p>
          <div className="flex flex-wrap gap-1.5">
            {PRINT_FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setPrintFormat(f.id)}
                title={f.desc}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  printFormat === f.id
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap justify-center">
          <Button onClick={downloadSVG} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> SVG
          </Button>
          <Button onClick={downloadPNG} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> PNG
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
            <ExternalLink className="mr-2 h-4 w-4" /> Buka
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Cetak QR Code ini dan tempel di {type === 'room' ? 'pintu ruangan' : type === 'equipment' ? 'fisik peralatan' : 'barang inventaris'}.
        </p>
      </CardContent>
    </Card>
  )
}
