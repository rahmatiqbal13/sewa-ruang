'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Camera, Upload, X, Loader2, ImageIcon, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Helper function to validate URL
function isValidUrl(string: string | null | undefined): boolean {
  if (!string || string.trim() === '') return false
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

interface Props {
  value?: string | null
  onChange: (url: string | null) => void
  folder?: string
}

export function PhotoUpload({ value, onChange, folder = 'general' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
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
    onChange(publicUrl)
    toast.success('Foto berhasil diunggah')
    setUploading(false)
  }

  async function handleRemove() {
    onChange(null)
    setUrlValue('')
    setShowUrlInput(false)
  }

  function handleUrlSubmit() {
    if (urlValue.trim()) {
      onChange(urlValue.trim())
      setShowUrlInput(false)
      toast.success('URL foto berhasil ditambahkan')
    }
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value && isValidUrl(value) ? (
        <div className="relative w-full h-52 rounded-xl overflow-hidden border bg-zinc-50 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Foto" className="object-contain w-full h-full p-3" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="w-full h-44 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm">Mengunggah foto...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-zinc-300" />
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
            onClick={() => cameraRef.current?.click()}
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
