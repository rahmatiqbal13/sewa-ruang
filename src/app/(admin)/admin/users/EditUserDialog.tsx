'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Loader2 } from 'lucide-react'

interface User {
  id: string; name: string; email: string; phone: string | null
  institution: string | null; class_division: string | null
  identity_number: string | null; telegram_username: string | null
}

export function EditUserDialog({ user }: { user: User }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ?? '',
    institution: user.institution ?? '',
    class_division: user.class_division ?? '',
    identity_number: user.identity_number ?? '',
    telegram_username: user.telegram_username ?? '',
  })

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function save() {
    setLoading(true)
    const res = await fetch(`/api/super-admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        institution: form.institution,
        class_division: form.class_division,
        identity_number: form.identity_number,
        telegram_username: form.telegram_username,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error('Gagal menyimpan: ' + (json.error ?? 'Unknown error'))
    } else {
      toast.success('Data pengguna diperbarui')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Pengguna: {user.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              Email: <span className="font-medium text-foreground">{user.email}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Nama Lengkap</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nomor WhatsApp</Label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08xxx" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telegram</Label>
                <Input value={form.telegram_username} onChange={e => set('telegram_username', e.target.value)} placeholder="@username" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Instansi</Label>
                <Input value={form.institution} onChange={e => set('institution', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kelas / Divisi</Label>
                <Input value={form.class_division} onChange={e => set('class_division', e.target.value)} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">NIM / NIP / KTP</Label>
                <Input value={form.identity_number} onChange={e => set('identity_number', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={save} disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
