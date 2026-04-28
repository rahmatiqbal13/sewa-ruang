'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'

export function AddUserDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'borrower',
    phone: '', institution: '', class_division: '',
    identity_number: '', telegram_username: '',
  })

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function save() {
    if (!form.name || !form.email || !form.password) {
      toast.error('Nama, email, dan password wajib diisi')
      return
    }
    if (form.password.length < 8) {
      toast.error('Password minimal 8 karakter')
      return
    }
    setLoading(true)
    const res = await fetch('/api/super-admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? 'Gagal membuat pengguna')
    } else {
      toast.success(`Akun ${form.name} berhasil dibuat`)
      setForm({ name: '', email: '', password: '', role: 'borrower', phone: '', institution: '', class_division: '', identity_number: '', telegram_username: '' })
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" /> Tambah Pengguna
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Tambah Pengguna Baru</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@domain.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password <span className="text-destructive">*</span></Label>
              <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 karakter" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select defaultValue="borrower" onValueChange={v => v && set('role', v)}>
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
              <Label className="text-xs">WhatsApp</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08xxx" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instansi</Label>
              <Input value={form.institution} onChange={e => set('institution', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kelas / Divisi</Label>
              <Input value={form.class_division} onChange={e => set('class_division', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">NIM / NIP / KTP</Label>
              <Input value={form.identity_number} onChange={e => set('identity_number', e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Telegram</Label>
              <Input value={form.telegram_username} onChange={e => set('telegram_username', e.target.value)} placeholder="@username" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={loading} className="flex-1 bg-blue-950 hover:bg-blue-900">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Akun
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
