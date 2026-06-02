'use client'

import { useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Camera, Upload, X, Loader2, ImageIcon, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Helper function to validate URL
function isValidUrl(string: string | null | undefined): boolean {
  if (!string || string.trim() === '') return false
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

interface Props {
  value?: string | null
  onChange: (url: string | null) => void
  folder?: string
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto'
}

// Helper function to extract path from Supabase storage URL
function extractStoragePath(url: string): string | null {
  try {
    // Check if it's a Supabase storage URL
    if (url.includes('.supabase.co/storage/v1/object/public/photos/')) {
      const match = url.match(/\/photos\/(.+)$/)
      if (match) return match[1]
    }
    return null
  } catch {
    return null
  }
}

export function PhotoUpload({ value, onChange, folder = 'general', aspectRatio = 'auto' }: Props) {
  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    auto: 'h-52'
  }
  const [uploading, setUploading] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const deleteOldPhoto = useCallback(async (oldUrl: string | null | undefined) => {
    if (!oldUrl) return
    
    const path = extractStoragePath(oldUrl)
    if (!path) return // Not a supabase storage file, skip
    
    const supabase = createClient()
    try {
      await supabase.storage.from('photos').remove([path])
      console.log('Old photo deleted:', path)
    } catch (error) {
      console.error('Failed to delete old photo:', error)
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 5 MB')
      return
    }

    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${folder}/${Date.now()}.${ext}`

    // Store old URL for deletion after successful upload
    const oldUrl = value

    const { data, error } = await supabase.storage
      .from('photos')
      .upload(path, file, { upsert: true })

    if (error) {
      if (error.message.includes('Bucket not found') || error.message.includes('bucket')) {
        toast.error('Storage bucket belum dibuat. Hubungi admin untuk setup Supabase Storage.')
      } else {
        toast.error('Gagal mengunggah foto: ' + error.message)
      }
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(data.path)
    
    // Update with new URL
    onChange(publicUrl)
    
    // Delete old photo from storage
    if (oldUrl && oldUrl !== publicUrl) {
      await deleteOldPhoto(oldUrl)
    }
    
    toast.success('Foto berhasil diunggah')
    setUploading(false)
  }, [folder, value, onChange, deleteOldPhoto])

  async function handleRemove() {
    // Delete from storage if it's a supabase storage file
    await deleteOldPhoto(value)
    
    onChange(null)
    setUrlValue('')
    setShowUrlInput(false)
    toast.success('Foto berhasil dihapus')
  }

  async function handleUrlSubmit() {
    if (urlValue.trim()) {
      const oldUrl = value
      const newUrl = urlValue.trim()
      
      onChange(newUrl)
      setShowUrlInput(false)
      
      // Delete old photo from storage if different from new URL
      if (oldUrl && oldUrl !== newUrl) {
        await deleteOldPhoto(oldUrl)
      }
      
      toast.success('URL foto berhasil ditambahkan')
    }
  }

  // Camera functions
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      toast.error('Tidak dapat mengakses kamera. Pastikan Anda memberikan izin.')
      // Fallback to file input with capture
      cameraRef.current?.click()
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
            await handleFile(file)
            stopCamera()
            setShowCamera(false)
          }
        }, 'image/jpeg', 0.9)
      }
    }
  }, [stopCamera, handleFile])

  const openCamera = () => {
    setShowCamera(true)
    startCamera()
  }

  const closeCamera = () => {
    stopCamera()
    setShowCamera(false)
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value && isValidUrl(value) ? (
        <div className={`relative w-full ${aspectRatioClass[aspectRatio]} rounded-[14px] overflow-hidden border border-border bg-muted flex items-center justify-center`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Foto yang diunggah" className="object-contain w-full h-full p-3" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className={`w-full ${aspectRatio === 'auto' ? 'h-44' : aspectRatioClass[aspectRatio]} rounded-[14px] border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground`}>
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm">Mengunggah foto...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground/70" />
              <p className="text-sm">Belum ada foto</p>
            </>
          )}
        </div>
      )}

      {/* URL Input */}
      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            className="flex-1"
          />
          <Button type="button" size="sm" onClick={handleUrlSubmit}>
            OK
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowUrlInput(false)}>
            Batal
          </Button>
        </div>
      )}

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={(open) => { if (!open) closeCamera() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ambil Foto</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video bg-black rounded-[10px] overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex gap-2 justify-center">
            <Button type="button" variant="outline" onClick={closeCamera}>
              Batal
            </Button>
            <Button type="button" onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700">
              <Camera className="h-4 w-4 mr-2" />
              Ambil Foto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buttons */}
      {!uploading && !showUrlInput && (
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            File
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={openCamera}
          >
            <Camera className="h-4 w-4 mr-1.5" />
            Kamera
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowUrlInput(true)}
          >
            <Link2 className="h-4 w-4 mr-1.5" />
            URL
          </Button>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
      {/* Fallback camera input for mobile */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />

      <p className="text-xs text-muted-foreground">Format: JPG, PNG, WEBP. Maks. 5 MB.</p>
    </div>
  )
}
