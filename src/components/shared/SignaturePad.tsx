'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Pen, Trash2, Check } from 'lucide-react'

interface SignaturePadProps {
  value: string
  onChange: (signatureDataUrl: string) => void
  label?: string
  helperText?: string
  required?: boolean
  height?: number
}

export function SignaturePad({
  value,
  onChange,
  label = 'Tanda Tangan Digital',
  helperText = 'Gambar tanda tangan Anda di area bawah menggunakan mouse atau jari',
  required = false,
  height = 160,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(!!value)
  const isSetupRef = useRef(false)

  // Get point in CSS pixels (not multiplied by DPR)
  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  // Setup canvas with proper DPR handling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()

    // Set internal canvas size to match CSS size × DPR
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)

    // Scale context so drawing uses CSS coordinates
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#111827'
    }

    isSetupRef.current = true
  }, [])

  // Redraw existing signature
  const redrawSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.drawImage(img, 0, 0, rect.width, rect.height)
    }
    img.src = value
  }, [value])

  // Initialize canvas on mount and when container size changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      setupCanvas()
      // Small delay to ensure canvas is ready before redrawing
      if (value) {
        setTimeout(redrawSignature, 50)
      }
    })

    resizeObserver.observe(container)

    // Initial setup
    setupCanvas()
    if (value) {
      setTimeout(redrawSignature, 50)
    }

    return () => resizeObserver.disconnect()
  }, [setupCanvas, redrawSignature, value])

  // Track value prop changes for hasDrawn state
  useEffect(() => {
    setHasDrawn(!!value)
  }, [value])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCanvasPoint(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineWidth = 2.5
    setIsDrawing(true)
    setHasDrawn(true)
  }, [getCanvasPoint])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCanvasPoint(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing, getCanvasPoint])

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    // Save signature as base64 PNG (CSS pixel dimensions)
    onChange(canvas.toDataURL('image/png'))
  }, [isDrawing, onChange])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onChange('')
  }, [onChange])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <label className="text-[#111827] text-sm font-medium">{label}</label>
        {required && <span className="text-red-600">*</span>}
      </div>
      
      <div
        ref={containerRef}
        className="relative border-2 border-dashed border-[#D1D5DB] rounded-[10px] bg-white overflow-hidden"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-[#9CA3AF]">
              <Pen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Klik dan gambar tanda tangan di sini</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[#9CA3AF]">{helperText}</p>
        <div className="flex gap-2">
          {hasDrawn && (
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3 w-3" />
              Tersimpan
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={clear}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Hapus
          </Button>
        </div>
      </div>
    </div>
  )
}
