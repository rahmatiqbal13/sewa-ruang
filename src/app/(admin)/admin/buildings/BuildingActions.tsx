'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'

interface Props { id: string; isActive: boolean }

export function BuildingActions({ id, isActive }: Props) {
  const router = useRouter()

  async function toggleActive() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('buildings') as any).update({ is_active: !isActive }).eq('id', id)
    if (error) { toast.error('Gagal mengubah status'); return }
    toast.success(isActive ? 'Gedung dinonaktifkan' : 'Gedung diaktifkan')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/admin/buildings/${id}/edit`)} className="flex items-center gap-2 cursor-pointer">
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleActive} className="gap-2 cursor-pointer">
          {isActive
            ? <><ToggleLeft className="h-4 w-4" /> Nonaktifkan</>
            : <><ToggleRight className="h-4 w-4" /> Aktifkan</>
          }
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
