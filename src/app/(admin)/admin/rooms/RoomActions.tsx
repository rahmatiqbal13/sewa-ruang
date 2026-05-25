'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Tag, EyeOff, Eye, Package } from 'lucide-react'

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

interface Props { id: string; name: string; isActive: boolean; isForRent: boolean }

export function RoomActions({ id, name, isActive, isForRent }: Props) {
  const router = useRouter()

  async function toggleActive() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('rooms') as any).update({ is_active: !isActive }).eq('id', id)
    if (error) { toast.error('Gagal mengubah status'); return }
    toast.success(isActive ? 'Ruangan dinonaktifkan' : 'Ruangan diaktifkan')
    router.refresh()
  }

  async function toggleForRent() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('rooms') as any).update({ is_for_rent: !isForRent }).eq('id', id)
    if (error) { toast.error('Gagal mengubah pengaturan sewa'); return }
    toast.success(isForRent ? 'Ruangan dihapus dari katalog' : 'Ruangan ditampilkan di katalog')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted transition-colors">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-[10px]">
        <DropdownMenuItem onClick={() => router.push(`/admin/rooms/${createSlug(name)}`)} className="flex items-center gap-2 cursor-pointer">
          <Eye className="h-4 w-4" /> Lihat Detail
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/admin/inventory/${createSlug(name)}`)} className="flex items-center gap-2 cursor-pointer">
          <Package className="h-4 w-4" /> Kelola Inventaris
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/admin/rooms/${createSlug(name)}/edit`)} className="flex items-center gap-2 cursor-pointer">
          <Pencil className="h-4 w-4" /> Edit Ruangan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleForRent} className="gap-2 cursor-pointer">
          {isForRent
            ? <><EyeOff className="h-4 w-4 text-amber-500" /> Sembunyikan dari Katalog</>
            : <><Tag className="h-4 w-4 text-green-500" /> Tampilkan di Katalog</>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleActive} className="gap-2 cursor-pointer">
          {isActive
            ? <><ToggleLeft className="h-4 w-4" /> Nonaktifkan</>
            : <><ToggleRight className="h-4 w-4" /> Aktifkan</>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
