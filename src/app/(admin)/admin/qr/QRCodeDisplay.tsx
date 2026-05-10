'use client'

import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Printer, ExternalLink, DoorOpen, Package, Boxes } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Props { 
  url: string
  name: string
  code: string | null
  type: 'room' | 'equipment' | 'inventory'
  location?: string
  category?: string
}

const typeConfig = {
  room: { icon: DoorOpen, label: 'Ruangan', color: 'bg-purple-100 text-purple-800', badgeColor: 'bg-purple-600' },
  equipment: { icon: Package, label: 'Alat', color: 'bg-blue-100 text-blue-800', badgeColor: 'bg-blue-600' },
  inventory: { icon: Boxes, label: 'Inventaris', color: 'bg-amber-100 text-amber-800', badgeColor: 'bg-amber-600' },
}

export function QRCodeDisplay({ url, name, code, type, location, category }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
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
      
      // Header
      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(config.label.toUpperCase(), 300, 50)
      
      // Name
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText(name, 300, 520)
      
      // Code
      if (code) {
        ctx.font = '20px monospace'
        ctx.fillStyle = '#64748b'
        ctx.fillText(code, 300, 550)
      }
      
      // Location/Category
      if (location || category) {
        ctx.font = '16px sans-serif'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText(location || category || '', 300, 580)
      }
      
      // URL
      ctx.font = '12px monospace'
      ctx.fillStyle = '#cbd5e1'
      ctx.fillText(url.slice(0, 50) + (url.length > 50 ? '...' : ''), 300, 630)
      
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `qr-${code || name.replace(/\s/g, '-')}.png`
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const svg = containerRef.current?.querySelector('svg')
    const svgData = svg ? new XMLSerializer().serializeToString(svg) : ''
    const svgBase64 = btoa(svgData)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              background: white;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            .label {
              width: 400px;
              border: 3px solid #e2e8f0;
              border-radius: 16px;
              padding: 32px;
              text-align: center;
              background: white;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: ${type === 'room' ? '#9333ea' : type === 'equipment' ? '#2563eb' : '#d97706'};
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 24px;
              display: inline-block;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .qr-container {
              background: white;
              padding: 20px;
              border-radius: 12px;
              border: 2px solid #e2e8f0;
              margin-bottom: 24px;
              display: inline-block;
            }
            .qr-container img {
              width: 280px;
              height: 280px;
            }
            .name {
              font-size: 28px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 8px;
              line-height: 1.3;
            }
            .code {
              font-family: monospace;
              font-size: 20px;
              color: #64748b;
              margin-bottom: 8px;
              background: #f1f5f9;
              padding: 6px 16px;
              border-radius: 6px;
              display: inline-block;
            }
            .meta {
              font-size: 16px;
              color: #94a3b8;
              margin-top: 8px;
            }
            .footer {
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #cbd5e1;
              word-break: break-all;
            }
            @media print {
              body { padding: 0; }
              .label { 
                box-shadow: none; 
                border: 3px solid #000;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">${config.label}</div>
            <div class="qr-container">
              <img src="data:image/svg+xml;base64,${svgBase64}" alt="QR Code" />
            </div>
            <div class="name">${name}</div>
            ${code ? `<div class="code">${code}</div>` : ''}
            ${location || category ? `<div class="meta">${location || category}</div>` : ''}
            <div class="footer">${url}</div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
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
            <p className="text-muted-foreground text-sm">
              {location || category}
            </p>
          )}
        </div>

        {/* QR Code */}
        <div 
          ref={containerRef} 
          className="p-8 bg-white border-2 border-zinc-200 rounded-xl shadow-inner"
        >
          <QRCode
            value={url}
            size={280}
            level="M"
            style={{ height: '280px', width: '280px' }}
          />
        </div>

        {/* URL */}
        <div className="text-center text-xs text-muted-foreground max-w-sm break-all bg-slate-50 p-3 rounded-lg">
          {url}
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
