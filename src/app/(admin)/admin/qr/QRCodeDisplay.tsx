'use client'

import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, ExternalLink } from 'lucide-react'

interface Props { url: string; name: string; label: string; type: string }

export function QRCodeDisplay({ url, name, label, type }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  function downloadSVG() {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `qr-${name.replace(/\s/g, '-')}.svg`
    link.click()
  }

  function downloadPNG() {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 500
    canvas.height = 600
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 500, 600)
      ctx.drawImage(img, 50, 50, 400, 400)
      ctx.fillStyle = '#000'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(name, 250, 490)
      ctx.font = '16px sans-serif'
      ctx.fillText(label, 250, 515)
      ctx.font = '12px monospace'
      ctx.fillStyle = '#666'
      ctx.fillText(url.slice(0, 60), 250, 545)
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `qr-${name.replace(/\s/g, '-')}.png`
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  return (
    <Card>
      <CardContent className="pt-6 flex flex-col items-center gap-6">
        <div className="text-center">
          <h2 className="text-xl font-bold">{name}</h2>
          <p className="text-muted-foreground text-sm">{label}</p>
        </div>
        <div ref={containerRef} className="p-6 bg-white border-2 border-zinc-200 rounded-lg">
          <QRCode
            value={url}
            size={300}
            level="M"
            style={{ height: '300px', width: '300px' }}
          />
        </div>
        <div className="text-center text-xs text-muted-foreground max-w-xs break-all">{url}</div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button onClick={downloadSVG} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Unduh SVG
          </Button>
          <Button onClick={downloadPNG} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Unduh PNG
          </Button>
          <Button variant="outline" onClick={() => window.open(url, '_blank')}>
            <ExternalLink className="mr-2 h-4 w-4" /> Buka URL
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Cetak QR Code ini dan tempel di pintu ruangan atau pada fisik peralatan.
        </p>
      </CardContent>
    </Card>
  )
}
