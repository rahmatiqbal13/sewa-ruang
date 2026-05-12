'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Upload, 
  Plus,
  Trash2,
  Home,
  Box,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface PaymentMethod {
  id: string
  bank_name: string
  bank_code: string
  account_number: string
  virtual_account_number: string
  account_name: string
  branch: string
  qr_image_url: string
  category: 'room' | 'equipment' | 'general'
  payment_method_type: 'va' | 'qr' | 'transfer'
  is_active: boolean
  is_primary: boolean
}

export default function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('room')
  
  // Form state for new VA
  const [newVA, setNewVA] = useState({
    bankName: '',
    virtualAccountNumber: '',
    accountName: '',
    category: 'room' as 'room' | 'equipment' | 'general'
  })

  const supabase = createClient()

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from('bank_accounts') as any)
        .select('*')
        .order('category')
        .order('is_primary', { ascending: false })

      if (error) throw error
      setMethods(data || [])
    } catch (error: any) {
      console.error('Error fetching payment methods:', error)
      const errorMessage = error?.message || error?.error?.message || 'Unknown error'
      toast.error(`Gagal memuat data: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (methodId: string, file: File) => {
    try {
      setUploading(methodId)

      // Validate file
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB')
        return
      }

      // Upload to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `va-images/${methodId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('payments')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payments')
        .getPublicUrl(fileName)

      // Update database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase
        .from('bank_accounts') as any)
        .update({ qr_image_url: publicUrl })
        .eq('id', methodId)

      if (updateError) {
        throw updateError
      }

      toast.success('Gambar VA berhasil diupload')
      fetchPaymentMethods()

    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Gagal mengupload gambar')
    } finally {
      setUploading(null)
    }
  }

  const handleCreateVA = async () => {
    try {
      if (!newVA.bankName || !newVA.virtualAccountNumber || !newVA.accountName) {
        toast.error('Semua field wajib diisi')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from('bank_accounts') as any)
        .insert({
          bank_name: newVA.bankName,
          bank_code: '200', // Default BTN
          account_number: `VA-${newVA.category.toUpperCase()}-${Date.now().toString().slice(-6)}`,
          virtual_account_number: newVA.virtualAccountNumber,
          account_name: newVA.accountName,
          category: newVA.category,
          payment_method_type: 'va',
          is_active: true,
          is_primary: false
        })
        .select()

      if (error) throw error

      toast.success('Virtual Account berhasil dibuat')
      setNewVA({ bankName: '', virtualAccountNumber: '', accountName: '', category: 'room' })
      fetchPaymentMethods()

    } catch (error: any) {
      console.error('Error creating VA:', error)
      const errorMessage = error?.message || error?.error?.message || 'Unknown error'
      toast.error(`Gagal membuat Virtual Account: ${errorMessage}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus metode pembayaran ini?')) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase
        .from('bank_accounts') as any)
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Metode pembayaran dihapus')
      fetchPaymentMethods()
    } catch (error: any) {
      console.error('Error deleting:', error)
      const errorMessage = error?.message || error?.error?.message || 'Unknown error'
      toast.error(`Gagal menghapus: ${errorMessage}`)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase
        .from('bank_accounts') as any)
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      toast.success(currentStatus ? 'Dinonaktifkan' : 'Diaktifkan')
      fetchPaymentMethods()
    } catch (error: any) {
      console.error('Error toggling:', error)
      const errorMessage = error?.message || error?.error?.message || 'Unknown error'
      toast.error(`Gagal mengubah status: ${errorMessage}`)
    }
  }

  const roomMethods = methods.filter(m => m.category === 'room')
  const equipmentMethods = methods.filter(m => m.category === 'equipment')
  const generalMethods = methods.filter(m => m.category === 'general')

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Manajemen Metode Pembayaran</h1>
        <p className="text-gray-500">Upload dan kelola Virtual Account untuk pembayaran</p>
      </div>

      {/* Create New VA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Tambah Virtual Account Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nama Bank</Label>
              <Input
                value={newVA.bankName}
                onChange={(e) => setNewVA({ ...newVA, bankName: e.target.value })}
                placeholder="Contoh: BCA Virtual Account"
              />
            </div>
            <div>
              <Label>No. Virtual Account</Label>
              <Input
                value={newVA.virtualAccountNumber}
                onChange={(e) => setNewVA({ ...newVA, virtualAccountNumber: e.target.value })}
                placeholder="Contoh: 8888-1234-5678-90"
              />
            </div>
            <div>
              <Label>Atas Nama</Label>
              <Input
                value={newVA.accountName}
                onChange={(e) => setNewVA({ ...newVA, accountName: e.target.value })}
                placeholder="Contoh: Direktorat Olahraga Unesa"
              />
            </div>
            <div>
              <Label>Kategori</Label>
              <select
                value={newVA.category}
                onChange={(e) => setNewVA({ ...newVA, category: e.target.value as 'room' | 'equipment' | 'general' })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="room">Sewa Ruang</option>
                <option value="equipment">Sewa Alat</option>
                <option value="general">Umum</option>
              </select>
            </div>
          </div>
          <Button 
            onClick={handleCreateVA}
            className="mt-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah VA
          </Button>
        </CardContent>
      </Card>

      {/* VA List with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Virtual Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="room" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Sewa Ruang ({roomMethods.length})
              </TabsTrigger>
              <TabsTrigger value="equipment" className="flex items-center gap-2">
                <Box className="h-4 w-4" />
                Sewa Alat ({equipmentMethods.length})
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Umum ({generalMethods.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="room" className="mt-6">
              {roomMethods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Belum ada VA untuk sewa ruang</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {roomMethods.map(method => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      uploading={uploading}
                      onImageUpload={handleImageUpload}
                      onToggleActive={handleToggleActive}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="equipment" className="mt-6">
              {equipmentMethods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Belum ada VA untuk sewa alat</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {equipmentMethods.map(method => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      uploading={uploading}
                      onImageUpload={handleImageUpload}
                      onToggleActive={handleToggleActive}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="general" className="mt-6">
              {generalMethods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Belum ada metode pembayaran umum</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {generalMethods.map(method => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      uploading={uploading}
                      onImageUpload={handleImageUpload}
                      onToggleActive={handleToggleActive}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// Component for individual payment method card
function PaymentMethodCard({
  method,
  uploading,
  onImageUpload,
  onToggleActive,
  onDelete
}: {
  method: PaymentMethod
  uploading: string | null
  onImageUpload: (id: string, file: File) => void
  onToggleActive: (id: string, currentStatus: boolean) => void
  onDelete: (id: string) => void
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImageUpload(method.id, file)
    }
  }

  return (
    <Card className={`overflow-hidden ${!method.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Image Section */}
          <div className="w-full md:w-64 bg-gray-100 flex-shrink-0">
            {method.qr_image_url ? (
              <img 
                src={method.qr_image_url} 
                alt={method.bank_name}
                className="w-full h-64 object-contain"
              />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center p-4 text-center">
                <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Belum ada gambar VA</p>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{method.bank_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={method.is_active ? 'default' : 'secondary'}>
                    {method.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  <Badge variant="outline">{method.category}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleActive(method.id, method.is_active)}
                >
                  {method.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(method.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">No. VA</span>
                <span className="font-mono font-medium">{method.virtual_account_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Atas Nama</span>
                <span>{method.account_name}</span>
              </div>
              {method.account_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500">No. Rekening</span>
                  <span className="font-mono">{method.account_number}</span>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="mt-6">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id={`upload-${method.id}`}
              />
              <label htmlFor={`upload-${method.id}`}>
                <Button 
                  variant="outline" 
                  disabled={uploading === method.id}
                  asChild
                >
                  <span>
                    {uploading === method.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengupload...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {method.qr_image_url ? 'Ganti Gambar VA' : 'Upload Gambar VA'}
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
