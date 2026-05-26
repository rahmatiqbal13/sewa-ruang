'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ChangeRoleButton({
  userId, currentRole, isSuperAdmin,
}: {
  userId: string; currentRole: string; isSuperAdmin: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleChange(newRole: string) {
    if (newRole === currentRole) return
    setLoading(true)
    const res = await fetch(`/api/super-admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error('Gagal mengubah role: ' + (json.error ?? 'Unknown error'))
    } else {
      toast.success('Role berhasil diubah')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Select defaultValue={currentRole} onValueChange={(v) => v && handleChange(v)} disabled={loading}>
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="staff">Staff</SelectItem>
        <SelectItem value="borrower">Peminjam</SelectItem>
      </SelectContent>
    </Select>
  )
}
