'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Scan, Loader2 } from 'lucide-react'

interface Props {
  onScan: (text: string) => void
}

export function QRScanner({ onScan }: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerId = 'qr-scanner-container'

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId, {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    })
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText)
        },
        () => {
          // ignore scan failure
        }
      )
      .then(() => setLoading(false))
      .catch((err) => {
        setLoading(false)
        setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.')
        console.error('QR Scanner error:', err)
      })

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [onScan])

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative aspect-square rounded-[14px] overflow-hidden border border-border bg-muted">
        <div id={containerId} className="w-full h-full" />

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#2E4DA7]" />
            <p className="text-sm text-muted-foreground">Memuat kamera...</p>
          </div>
        )}

        {!loading && !error && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-56 border-2 border-white/70 rounded-lg shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-[10px] bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Scan className="h-4 w-4" />
        Arahkan kamera ke QR Code untuk scan
      </div>
    </div>
  )
}
