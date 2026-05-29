'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Loader2, 
  Upload, 
  ArrowLeft, 
  CheckCircle,
  Image as ImageIcon,
  X
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function UploadProofPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string
  
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  
  // Form data
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDate, setTransferDate] = useState('')
  const [notes, setNotes] = useState('')

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG)')
      return
    }

    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB')
      return
    }

    setFile(selectedFile)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }, [])

  const clearFile = () => {
    setFile(null)
    setPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      toast.error('Pilih file bukti transfer terlebih dahulu')
      return
    }

    if (!bankName || !transferAmount) {
      toast.error('Nama bank dan jumlah transfer wajib diisi')
      return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('bookingId', bookingId)
      formData.append('proofImage', file)
      formData.append('bankName', bankName)
      formData.append('accountName', accountName)
      formData.append('transferAmount', transferAmount)
      formData.append('transferDate', transferDate)
      formData.append('notes', notes)

      const response = await fetch('/api/payments/upload-proof', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengupload bukti')
      }

      setUploaded(true)
      toast.success('Bukti pembayaran berhasil diupload!')
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Gagal mengupload bukti')
    } finally {
      setUploading(false)
    }
  }

  if (uploaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-green-50">
        <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold text-green-900">Bukti Berhasil Diupload!</h1>
        <p className="text-green-700 mt-2 text-center max-w-md">
          Admin akan memverifikasi pembayaran Anda dalam waktu 1x24 jam. 
          Anda akan menerima notifikasi setelah verifikasi selesai.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href={`/bookings/${bookingId}`}>
            <Button variant="outline">Lihat Booking</Button>
          </Link>
          <Link href="/bookings">
            <Button>Ke Daftar Booking</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href={`/booking/${bookingId}/payment`} 
            className="inline-flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali ke Pembayaran
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Bukti Transfer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Bukti Transfer (Screenshot/Foto)</Label>
                {!file ? (
                  <div className="border-2 border-dashed border-border rounded-[10px] p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="proof-upload"
                    />
                    <label htmlFor="proof-upload" className="cursor-pointer">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                      <p className="text-muted-foreground">Klik untuk upload bukti transfer</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">JPG, PNG (Max 5MB)</p>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img 
                      src={preview || ''} 
                      alt="Pratinjau bukti pembayaran" 
                      className="w-full h-64 object-contain bg-muted rounded-[10px]"
                    />
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Bank Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Nama Bank *</Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Contoh: BCA"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountName">Nama Pemilik Rekening</Label>
                  <Input
                    id="accountName"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Nama pemilik rekening"
                  />
                </div>
              </div>

              {/* Transfer Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transferAmount">Jumlah Transfer (Rp) *</Label>
                  <Input
                    id="transferAmount"
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="150000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferDate">Tanggal Transfer</Label>
                  <Input
                    id="transferDate"
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tambahkan catatan jika perlu..."
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={uploading || !file}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengupload...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Bukti Pembayaran
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-900 mb-2">Tips Upload</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Pastikan screenshot jelas dan terbaca</li>
              <li>• Sertakan nomor rekening tujuan</li>
              <li>• Pastikan nominal transfer terlihat</li>
              <li>• Screenshot dari aplikasi banking lebih baik</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
