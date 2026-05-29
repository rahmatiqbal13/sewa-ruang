'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, Upload, Plus, Trash2, Home, Box, CreditCard,
  AlertCircle, Image as ImageIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface PaymentMethod {
  id: string
  bank_name: string
  account_number: string
  virtual_account_number: string
  account_name: string
  qr_image_url: string
  category: 'room' | 'equipment' | 'general'
  is_active: boolean
}

export function PaymentMethodsPanel() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('room')
  const [newVA, setNewVA] = useState({ bankName: '', virtualAccountNumber: '', accountName: '', category: 'room' as 'room' | 'equipment' | 'general' })

  const supabase = createClient()

  const fetchMethods = async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('bank_accounts') as any)
      .select('*').order('category').order('is_primary', { ascending: false })
    if (error) toast.error('Gagal memuat data: ' + error.message)
    setMethods(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchMethods() }, [])

  const handleImageUpload = async (id: string, file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('File harus berupa gambar')
    if (file.size > 5 * 1024 * 1024) return toast.error('Ukuran file maksimal 5MB')
    setUploading(id)
    try {
      const ext = file.name.split('.').pop()
      const path = `va-images/${id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('payments').upload(path, file, { contentType: file.type, upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('payments').getPublicUrl(path)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbErr } = await (supabase.from('bank_accounts') as any).update({ qr_image_url: publicUrl }).eq('id', id)
      if (dbErr) throw dbErr
      toast.success('Gambar VA berhasil diupload')
      fetchMethods()
    } catch {
      toast.error('Gagal mengupload gambar')
    } finally {
      setUploading(null)
    }
  }

  const handleCreate = async () => {
    if (!newVA.bankName || !newVA.virtualAccountNumber || !newVA.accountName) return toast.error('Semua field wajib diisi')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('bank_accounts') as any).insert({
      bank_name: newVA.bankName,
      bank_code: '200',
      account_number: `VA-${newVA.category.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      virtual_account_number: newVA.virtualAccountNumber,
      account_name: newVA.accountName,
      category: newVA.category,
      payment_method_type: 'va',
      is_active: true,
      is_primary: false,
    })
    if (error) return toast.error('Gagal membuat VA: ' + error.message)
    toast.success('Virtual Account berhasil dibuat')
    setNewVA({ bankName: '', virtualAccountNumber: '', accountName: '', category: 'room' })
    fetchMethods()
  }

  const handleToggle = async (id: string, current: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('bank_accounts') as any).update({ is_active: !current }).eq('id', id)
    if (error) return toast.error('Gagal mengubah status')
    toast.success(current ? 'Dinonaktifkan' : 'Diaktifkan')
    fetchMethods()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus metode pembayaran ini?')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('bank_accounts') as any).delete().eq('id', id)
    if (error) return toast.error('Gagal menghapus: ' + error.message)
    toast.success('Metode pembayaran dihapus')
    fetchMethods()
  }

  const byCategory = (cat: string) => methods.filter(m => m.category === cat)

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* Add new VA */}
      <Card className="rounded-[14px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Plus className="h-4 w-4" /> Tambah Virtual Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Nama Bank</Label>
              <Input value={newVA.bankName} onChange={e => setNewVA({ ...newVA, bankName: e.target.value })} placeholder="Contoh: BCA Virtual Account" className="rounded-[10px] border-border" />
            </div>
            <div>
              <Label className="text-foreground">No. Virtual Account</Label>
              <Input value={newVA.virtualAccountNumber} onChange={e => setNewVA({ ...newVA, virtualAccountNumber: e.target.value })} placeholder="8888-1234-5678-90" className="rounded-[10px] border-border" />
            </div>
            <div>
              <Label className="text-foreground">Atas Nama</Label>
              <Input value={newVA.accountName} onChange={e => setNewVA({ ...newVA, accountName: e.target.value })} placeholder="Nama Pemilik Rekening" className="rounded-[10px] border-border" />
            </div>
            <div>
              <Label className="text-foreground">Kategori</Label>
              <select value={newVA.category} onChange={e => setNewVA({ ...newVA, category: e.target.value as 'room' | 'equipment' | 'general' })} className="w-full h-10 px-3 rounded-[10px] border border-input bg-background text-foreground">
                <option value="room">Sewa Ruang</option>
                <option value="equipment">Sewa Alat</option>
                <option value="general">Umum</option>
              </select>
            </div>
          </div>
          <Button onClick={handleCreate} className="mt-4 rounded-[10px]"><Plus className="mr-2 h-4 w-4" />Tambah VA</Button>
        </CardContent>
      </Card>

      {/* VA list */}
      <Card className="rounded-[14px]">
        <CardHeader><CardTitle className="text-base text-foreground">Daftar Virtual Account</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 rounded-[10px]">
              <TabsTrigger value="room" className="rounded-[10px]"><Home className="h-4 w-4 mr-1" />Sewa Ruang ({byCategory('room').length})</TabsTrigger>
              <TabsTrigger value="equipment" className="rounded-[10px]"><Box className="h-4 w-4 mr-1" />Sewa Alat ({byCategory('equipment').length})</TabsTrigger>
              <TabsTrigger value="general" className="rounded-[10px]"><CreditCard className="h-4 w-4 mr-1" />Umum ({byCategory('general').length})</TabsTrigger>
            </TabsList>
            {(['room', 'equipment', 'general'] as const).map(cat => (
              <TabsContent key={cat} value={cat} className="mt-6">
                {byCategory(cat).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/70">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Belum ada VA untuk kategori ini</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {byCategory(cat).map(method => (
                      <VACard
                        key={method.id}
                        method={method}
                        uploading={uploading}
                        onUpload={handleImageUpload}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function VACard({ method, uploading, onUpload, onToggle, onDelete }: {
  method: PaymentMethod
  uploading: string | null
  onUpload: (id: string, file: File) => void
  onToggle: (id: string, current: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card className={`rounded-[14px] ${!method.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-56 bg-muted flex-shrink-0 flex items-center justify-center">
            {method.qr_image_url ? (
              <img src={method.qr_image_url} alt={method.bank_name} className="w-full h-56 object-contain" />
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-muted-foreground/70">
                <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-xs">Belum ada gambar</p>
              </div>
            )}
          </div>
          <div className="flex-1 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-foreground">{method.bank_name}</p>
                <Badge variant={method.is_active ? 'default' : 'secondary'} className="mt-1 text-xs">
                  {method.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onToggle(method.id, method.is_active)} className="rounded-[10px]">
                  {method.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(method.id)} className="rounded-[10px]">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5 text-sm mb-5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">No. VA</span>
                <span className="font-mono font-medium text-foreground">{method.virtual_account_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atas Nama</span>
                <span className="text-foreground">{method.account_name}</span>
              </div>
              {method.account_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No. Rekening</span>
                  <span className="font-mono text-foreground">{method.account_number}</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" id={`up-${method.id}`} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(method.id, f) }} />
            <label htmlFor={`up-${method.id}`}>
              <Button variant="outline" size="sm" disabled={uploading === method.id} asChild className="rounded-[10px]">
                <span>
                  {uploading === method.id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengupload...</> : <><Upload className="mr-2 h-4 w-4" />{method.qr_image_url ? 'Ganti Gambar' : 'Upload Gambar'}</>}
                </span>
              </Button>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
