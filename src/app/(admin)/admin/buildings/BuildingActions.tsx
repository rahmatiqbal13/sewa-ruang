'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Power, PowerOff } from 'lucide-react'
import { cn } from '@/lib/utils'

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

interface Props { id: string; name: string; isActive: boolean; deleteButton?: React.ReactNode }

export function BuildingActions({ id, name, isActive, deleteButton }: Props) {
  const router = useRouter()

  async function toggleActive() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('buildings') as any).update({ is_active: !isActive }).eq('id', id)
    if (error) { 
      toast.error('Gagal mengubah status') 
      return 
    }
    toast.success(isActive ? 'Gedung dinonaktifkan' : 'Gedung diaktifkan')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl",
        "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
        "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      )}>
        <MoreHorizontal className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => router.push(`/admin/buildings/${createSlug(name)}/edit`)}
          className="flex items-center gap-2 cursor-pointer py-2.5"
        >
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Pencil className="h-4 w-4 text-indigo-600" />
          </div>
          <span className="font-medium">Edit Gedung</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="my-2" />
        
        <DropdownMenuItem 
          onClick={toggleActive} 
          className={cn(
            "flex items-center gap-2 cursor-pointer py-2.5",
            !isActive && "text-emerald-600 focus:text-emerald-600"
          )}
        >
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            isActive ? "bg-red-50" : "bg-emerald-50"
          )}>
            {isActive ? (
              <PowerOff className="h-4 w-4 text-red-600" />
            ) : (
              <Power className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <span className="font-medium">{isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
        </DropdownMenuItem>
        
        {deleteButton && (
          <>
            <DropdownMenuSeparator className="my-2" />
            {deleteButton}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
