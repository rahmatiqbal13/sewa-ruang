'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react'

interface Props {
  userId: string
  userName: string
}

export function ChangePasswordDialog({ userId, userName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showNew, setShowNew] = useState(false)

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) {
      setNewPassword('')
      setShowNew(false)
    }
  }

  async function save() {
    if (!newPassword) { toast.error('Password baru wajib diisi'); return }
    if (newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return }

    setLoading(true)
    const res = await fetch(`/api/super-admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error('Gagal mengubah password: ' + (json.error ?? 'Unknown error'))
    } else {
      toast.success(`Password ${userName} berhasil diubah`)
      handleOpenChange(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        title="Kelola password"
        className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-400 gap-1"
      >
        <KeyRound className="h-3.5 w-3.5" />
        <span className="text-xs">Sandi</span>
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-600" />
              Password: {userName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* New password */}
            <div className="space-y-1.5">
              <Label className="text-xs">Set Password Baru</Label>
              <div className="flex items-center gap-2">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className="flex-1"
                  disabled={loading}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowNew(v => !v)}
                  className="shrink-0"
                  type="button"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={save} disabled={loading || !newPassword} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Password
              </Button>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
