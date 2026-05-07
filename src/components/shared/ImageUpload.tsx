'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Camera, Link2, Upload, X, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  bucket?: string
  folder?: string
}

// Helper function to validate URL
function isValidUrl(string: string): boolean {
  if (!string || string.trim() === '') return false
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

export function ImageUpload({ value, onChange, bucket = 'equipment-photos', folder = 'equipment' }: ImageUploadProps) {
  const [activeTab, setActiveTab] = useState('url')
  const [preview, setPreview] = useState(isValidUrl(value) ? value : '')
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState(isValidUrl(value) ? value : '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  // Handle URL input
  const handleUrlChange = (url: string) => {
    setUrlInput(url)
    if (isValidUrl(url)) {
      setPreview(url)
      onChange(url)
    }
  }

  // Handle file upload (from gallery or camera)
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar (JPG, PNG, WEBP)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB')
      return
    }

    setUploading(true)

    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      onChange(publicUrl)
      setPreview(publicUrl)
      
      // Clean up object URL
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Gagal mengupload gambar. Silakan coba lagi.')
      setPreview(value) // Revert to original
    } finally {
      setUploading(false)
    }
  }, [bucket, folder, onChange, value])

  // Handle file input change
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // Handle camera capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // Clear image
  const handleClear = () => {
    setPreview('')
    setUrlInput('')
    onChange('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Preview Area */}
      {preview && isValidUrl(preview) && (
        <div className="relative w-full h-56 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
          {/* Use regular img tag for external URLs to avoid Next.js Image validation errors */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="object-contain w-full h-full p-2"
            onError={() => setPreview('')}
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="url" className="flex items-center gap-1">
            <Link2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">URL</span>
          </TabsTrigger>
          <TabsTrigger value="file" className="flex items-center gap-1">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">File</span>
          </TabsTrigger>
          <TabsTrigger value="camera" className="flex items-center gap-1">
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kamera</span>
          </TabsTrigger>
        </TabsList>

        {/* URL Tab */}
        <TabsContent value="url" className="space-y-2">
          <Label htmlFor="photo-url">Link Foto</Label>
          <div className="flex gap-2">
            <Input
              id="photo-url"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="flex-1"
            />
            {urlInput && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleUrlChange(urlInput)}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Masukkan link gambar dari internet (Imgur, Google Drive, dll)
          </p>
        </TabsContent>

        {/* File Upload Tab */}
        <TabsContent value="file" className="space-y-2">
          <Label>Upload dari Galeri</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={cn(
                "cursor-pointer flex flex-col items-center gap-2",
                uploading && "pointer-events-none opacity-50"
              )}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">
                {uploading ? 'Mengupload...' : 'Klik untuk memilih file'}
              </span>
              <span className="text-xs text-gray-400">
                JPG, PNG, WEBP (Maks. 5MB)
              </span>
            </label>
          </div>
        </TabsContent>

        {/* Camera Tab */}
        <TabsContent value="camera" className="space-y-2">
          <Label>Ambil Foto Langsung</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
              id="camera-capture"
            />
            <label
              htmlFor="camera-capture"
              className={cn(
                "cursor-pointer flex flex-col items-center gap-2",
                uploading && "pointer-events-none opacity-50"
              )}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              ) : (
                <Camera className="h-8 w-8 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">
                {uploading ? 'Mengupload...' : 'Klik untuk membuka kamera'}
              </span>
              <span className="text-xs text-gray-400">
                Akses kamera perangkat Anda
              </span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Tips: Pastikan pencahayaan cukup dan fokus pada alat
          </p>
        </TabsContent>
      </Tabs>

      {/* Hidden input for form submission */}
      <input type="hidden" name="photo_url" value={preview} />
    </div>
  )
}
