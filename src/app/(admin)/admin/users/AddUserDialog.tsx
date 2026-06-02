'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Loader2, AlertCircle, Mail, User } from 'lucide-react'

export function AddUserDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'borrower',
    phone: '', borrower_category: 'mahasiswa', institution: '', class_division: '',
    identity_number: '', telegram_username: '',
  })

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
    setError(null)
  }

  function resetForm() {
    setForm({
      name: '', email: '', password: '', role: 'borrower',
    phone: '', borrower_category: 'mahasiswa_s1', institution: '', class_division: '',
      identity_number: '', telegram_username: '',
    })
    setError(null)
  }

  async function save() {
    setError(null)
    
    if (!form.name || !form.email || !form.password) {
      setError('Nama, email, dan password wajib diisi')
      return
    }
    
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    setLoading(true)
    
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      
      const json = await res.json()
      
      if (!res.ok) {
        console.error('Error response:', json)
        const errorMsg = json.error || 'Gagal membuat pengguna'
        setError(errorMsg)
        toast.error(errorMsg)
      } else {
        toast.success(`Akun ${form.name} berhasil dibuat`)
        resetForm()
        setOpen(false)
        router.refresh()
      }
    } catch (err) {
      console.error('Network error:', err)
      setError('Terjadi kesalahan koneksi. Silakan coba lagi.')
      toast.error('Terjadi kesalahan koneksi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" /> Tambah Pengguna
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Pengguna Baru</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <User className="h-3 w-3" />
                Nama Lengkap <span className="text-destructive">*</span>
              </Label>
              <Input 
                value={form.name} 
                onChange={e => set('name', e.target.value)} 
                placeholder="Nama lengkap"
                disabled={loading}
              />
            </div>

            <div className="space-y-1 col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email <span className="text-destructive">*</span>
              </Label>
              <Input 
                type="email" 
                value={form.email} 
                onChange={e => set('email', e.target.value)} 
                placeholder="email@domain.com (bisa email dummy)"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Bisa menggunakan email dummy seperti: alfina@usc.ac.id, test@example.com, dll
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Password <span className="text-destructive">*</span></Label>
              <Input 
                type="password" 
                value={form.password} 
                onChange={e => set('password', e.target.value)} 
                placeholder="Min. 6 karakter"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role <span className="text-destructive">*</span></Label>
              <Select 
                value={form.role}
                onValueChange={v => v && set('role', v)}
                disabled={loading}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="borrower">Peminjam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kategori Peminjam</Label>
              <Select 
                value={form.borrower_category}
                onValueChange={v => v && set('borrower_category', v)}
                disabled={loading}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mahasiswa_s1">Mahasiswa S1</SelectItem>
                  <SelectItem value="mahasiswa_s2">Mahasiswa S2/S3</SelectItem>
                  <SelectItem value="dosen">Dosen &amp; Karyawan</SelectItem>
                  <SelectItem value="kerjasama">Kerjasama / MoU</SelectItem>
                  <SelectItem value="umum">Umum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">WhatsApp</Label>
              <Input 
                value={form.phone} 
                onChange={e => set('phone', e.target.value)} 
                placeholder="08xxx"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instansi</Label>
              <Input 
                value={form.institution} 
                onChange={e => set('institution', e.target.value)}
                placeholder="Universitas/Instansi"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kelas / Divisi</Label>
              <Input 
                value={form.class_division} 
                onChange={e => set('class_division', e.target.value)}
                placeholder="Kelas/Divisi"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">NIM / NIP / KTP</Label>
              <Input 
                value={form.identity_number} 
                onChange={e => set('identity_number', e.target.value)}
                placeholder="Nomor identitas"
                disabled={loading}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Telegram</Label>
              <Input 
                value={form.telegram_username} 
                onChange={e => set('telegram_username', e.target.value)} 
                placeholder="@username"
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={save} 
              disabled={loading} 
              className="flex-1 bg-blue-950 hover:bg-blue-900"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Membuat...' : 'Buat Akun'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Batal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
