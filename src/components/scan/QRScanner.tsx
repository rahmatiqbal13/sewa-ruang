'use client'

import { useEffect, useRef, useState, useCallback, useId } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Scan, Loader2, CameraOff, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onScan: (text: string) => void
}

export function QRScanner({ onScan }: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const startedRef = useRef(false)
  const reactId = useId()
  const containerId = `qr-scanner-${reactId.replace(/:/g, '')}`

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current || !startedRef.current) return
    try {
      await scannerRef.current.stop()
    } catch (err) {
      const error = err as Error
      if (!error?.message?.includes('not running')) {
        console.error('QR stop error:', err)
      }
    }
    startedRef.current = false
    scannerRef.current = null
  }, [])

  const startScanner = useCallback(async () => {
    setError('')
    setLoading(true)
    setActive(true)

    // Wait for container to be in DOM
    await new Promise((resolve) => requestAnimationFrame(resolve))

    const container = document.getElementById(containerId)
    if (!container) {
      setLoading(false)
      setError('Scanner container tidak ditemukan. Coba refresh halaman.')
      setActive(false)
      return
    }

    const scanner = new Html5Qrcode(containerId, {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    })
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText)
        },
        () => {
          // ignore scan failure
        }
      )
      startedRef.current = true
      setLoading(false)
    } catch (err) {
      const error = err as Error
      setLoading(false)
      setActive(false)
      startedRef.current = false
      scannerRef.current = null

      const msg = error?.message?.toLowerCase() || ''
      if (msg.includes('permission') || msg.includes('not allowed')) {
        setError('Akses kamera ditolak. Pastikan Anda memberikan izin kamera di browser.')
      } else if (msg.includes('not found') || msg.includes('no camera')) {
        setError('Tidak ada kamera yang terdeteksi. Pastikan perangkat memiliki kamera.')
      } else if (msg.includes('insecure')) {
        setError('Kamera tidak tersedia melalui HTTP. Gunakan HTTPS untuk mengakses fitur ini.')
      } else {
        setError('Tidak dapat mengakses kamera. ' + (error?.message || 'Pastikan izin kamera sudah diberikan.'))
      }
      console.error('QR Scanner error:', err)
    }
  }, [containerId, onScan])

  useEffect(() => {
    // Auto-start on mount (with slight delay to ensure DOM is ready)
    const timer = setTimeout(() => {
      startScanner()
    }, 300)

    return () => {
      clearTimeout(timer)
      stopScanner()
    }
  }, [startScanner, stopScanner])

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative aspect-square rounded-[14px] overflow-hidden border border-border bg-muted">
        <div id={containerId} className="w-full h-full" />

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-3 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#0891B2]" />
            <p className="text-sm text-muted-foreground">Memuat kamera...</p>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-4 z-10 p-6 text-center">
            <CameraOff className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground max-w-[260px]">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startScanner}
              className="gap-1.5"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Coba Lagi
            </Button>
          </div>
        )}

        {active && !loading && !error && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
            <div className="w-56 h-56 border-2 border-white/70 rounded-lg shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
      </div>

      {active && !error && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Scan className="h-4 w-4" />
          Arahkan kamera ke QR Code untuk scan
        </div>
      )}
    </div>
  )
}
