'use client'

import { useState, useRef } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Printer, Building2, Package } from 'lucide-react'

interface Asset {
  id: string; name: string; category: string; room_code: string | null
  buildings: { name: string } | null
}

export function BatchQRClient({ assets, baseUrl }: { assets: Asset[]; baseUrl: string }) {
  const [filter, setFilter] = useState<'all' | 'room' | 'equipment'>('all')
  const printRef = useRef<HTMLDivElement>(null)

  const filtered = assets.filter(a => filter === 'all' || a.category === filter)

  function getUrl(a: Asset) {
    return a.category === 'room'
      ? `${baseUrl}/rooms/${a.id}/inventory`
      : `${baseUrl}/assets/${a.id}/scan`
  }

  function handlePrint() {
    const printContent = printRef.current
    if (!printContent) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Label QR Code</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; background: white; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 12px; }
            .label { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; page-break-inside: avoid; }
            .label svg { width: 100px; height: 100px; }
            .label-id { font-family: monospace; font-size: 10px; color: #6b7280; margin-top: 6px; }
            .label-name { font-size: 11px; font-weight: 600; margin-top: 2px; line-height: 1.3; }
            .label-sub { font-size: 10px; color: #6b7280; margin-top: 2px; }
            @media print {
              @page { size: A4; margin: 10mm; }
              .grid { grid-template-columns: repeat(4, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${filtered.map(a => `
              <div class="label">
                <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(getUrl(a))}&size=100x100" width="100" height="100" alt="QR" />
                <div class="label-id">${a.room_code ?? a.id.slice(0, 8)}</div>
                <div class="label-name">${a.name}</div>
                <div class="label-sub">${(a.buildings as { name: string } | null)?.name ?? (a.category === 'equipment' ? 'Alat' : '')}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `)
    win.document.close()
    win.onload = () => { win.print() }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cetak Label QR Massal</h1>
          <p className="text-muted-foreground text-sm">Generate dan cetak QR Code untuk semua aset sekaligus</p>
        </div>
        <Button onClick={handlePrint} disabled={filtered.length === 0}>
          <Printer className="mr-2 h-4 w-4" /> Cetak {filtered.length} Label
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Semua Aset', icon: null },
          { key: 'room', label: 'Ruangan', icon: Building2 },
          { key: 'equipment', label: 'Alat', icon: Package },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${filter === f.key ? 'bg-blue-950 text-white border-blue-950' : 'bg-white text-zinc-600 border-zinc-300 hover:border-blue-400'}`}
          >
            {f.icon && <f.icon className="h-4 w-4" />}
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground self-center">{filtered.length} item</span>
      </div>

      {/* Preview grid */}
      <div ref={printRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map(a => (
          <div key={a.id} className="border rounded-xl p-3 text-center bg-white hover:shadow-sm transition-shadow">
            <div className="flex justify-center">
              <QRCode value={getUrl(a)} size={80} level="M" />
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-2">{a.room_code ?? a.id.slice(0, 8)}</p>
            <p className="text-xs font-semibold mt-1 leading-tight line-clamp-2">{a.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {(a.buildings as { name: string } | null)?.name ?? (a.category === 'equipment' ? 'Alat' : '')}
            </p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Tidak ada aset untuk ditampilkan</p>
      )}
    </div>
  )
}
