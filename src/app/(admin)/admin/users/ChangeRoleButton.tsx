'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('users') as any).update({ role: newRole }).eq('id', userId)
    if (error) toast.error('Gagal mengubah role')
    else { toast.success('Role berhasil diubah'); router.refresh() }
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
