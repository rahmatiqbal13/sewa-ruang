'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Camera, Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface Props {
  value?: string | null
  onChange: (url: string | null) => void
  folder?: string
}

export function PhotoUpload({ value, onChange, folder = 'general' }: Props) {
  const [uploading, setUploading] = useState(false)
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
      toast.error('Gagal mengunggah foto: ' + error.message)
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
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value ? (
        <div className="relative w-full h-44 rounded-xl overflow-hidden border bg-zinc-100">
          <Image src={value} alt="Foto" fill className="object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
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

      {/* Buttons */}
      {!uploading && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Pilih File
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-1.5" />
            Ambil Foto
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
