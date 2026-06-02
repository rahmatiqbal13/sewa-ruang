'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

interface DeleteRoomButtonProps {
  id: string
  roomName: string
}

export function DeleteRoomButton({ id, roomName }: DeleteRoomButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()

    try {
      // Check if room has active bookings
      const { data: bookings, error: checkError } = await supabase
        .from('booking_items')
        .select('id')
        .eq('room_id', id)
        .limit(1)

      if (checkError) throw checkError

      if (bookings && bookings.length > 0) {
        toast.error('Ruangan tidak dapat dihapus karena memiliki riwayat peminjaman. Nonaktifkan saja.')
        setOpen(false)
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Ruangan berhasil dihapus')
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('Gagal menghapus ruangan: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger>
        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 rounded-[10px]">
          <Trash2 className="h-4 w-4 mr-1" />
          Hapus
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[14px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Hapus Ruangan?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Apakah Anda yakin ingin menghapus ruangan <strong>&quot;{roomName}&quot;</strong>?
            <br /><br />
            Tindakan ini tidak dapat dibatalkan. Ruangan dengan riwayat peminjaman tidak dapat dihapus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} className="rounded-[10px]">Batal</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 rounded-[10px]"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
