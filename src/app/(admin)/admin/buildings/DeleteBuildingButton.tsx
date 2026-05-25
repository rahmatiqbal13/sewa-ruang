'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Trash2, Loader2 } from 'lucide-react'

interface DeleteBuildingButtonProps {
  id: string
  buildingName: string
}

export function DeleteBuildingButton({ id, buildingName }: DeleteBuildingButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()

    try {
      // Check if building has rooms
      const { data: rooms, error: checkError } = await supabase
        .from('rooms')
        .select('id')
        .eq('building_id', id)
        .limit(1)

      if (checkError) throw checkError

      if (rooms && rooms.length > 0) {
        toast.error('Gedung tidak dapat dihapus karena masih memiliki ruangan. Hapus ruangan terlebih dahulu.')
        setOpen(false)
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Gedung berhasil dihapus')
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error('Gagal menghapus gedung: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger>
        <div 
          className="flex items-center gap-2 cursor-pointer py-2.5 text-red-600 focus:text-red-600 w-full px-2"
        >
          <div className="h-8 w-8 rounded-[10px] bg-red-50 flex items-center justify-center">
            <Trash2 className="h-4 w-4 text-red-600" />
          </div>
          <span className="font-medium">Hapus Gedung</span>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Gedung?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus gedung <strong>&quot;{buildingName}&quot;</strong>?
            <br /><br />
            Tindakan ini tidak dapat dibatalkan. Gedung yang memiliki ruangan tidak dapat dihapus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
