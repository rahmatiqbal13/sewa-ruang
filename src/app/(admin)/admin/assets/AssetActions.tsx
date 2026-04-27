'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, ToggleLeft, ToggleRight, QrCode, Boxes } from 'lucide-react'

interface Props { id: string; isActive: boolean }

export function AssetActions({ id, isActive }: Props) {
  const router = useRouter()

  async function toggleActive() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('assets') as any).update({ is_active: !isActive }).eq('id', id)
    if (error) { toast.error('Gagal mengubah status'); return }
    toast.success(isActive ? 'Aset dinonaktifkan' : 'Aset diaktifkan')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/admin/assets/${id}/edit`)} className="flex items-center gap-2 cursor-pointer">
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/admin/inventory/${id}`)} className="flex items-center gap-2 cursor-pointer">
          <Boxes className="h-4 w-4" /> Inventaris
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/admin/qr?id=${id}&type=asset`)} className="flex items-center gap-2 cursor-pointer">
          <QrCode className="h-4 w-4" /> QR Code
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleActive} className="gap-2 cursor-pointer">
          {isActive
            ? <><ToggleLeft className="h-4 w-4" /> Nonaktifkan</>
            : <><ToggleRight className="h-4 w-4" /> Aktifkan</>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
