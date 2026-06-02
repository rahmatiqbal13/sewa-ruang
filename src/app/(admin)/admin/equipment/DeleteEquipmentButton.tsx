'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Loader2 } from 'lucide-react'

interface DeleteEquipmentButtonProps {
  id: string
  equipmentName: string
}

export function DeleteEquipmentButton({ id, equipmentName }: DeleteEquipmentButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()

    try {
      // Check if equipment has active bookings
      const { data: bookings, error: checkError } = await supabase
        .from('booking_items')
        .select('id')
        .eq('equipment_id', id)
        .limit(1)

      if (checkError) throw checkError

      if (bookings && bookings.length > 0) {
        toast.error('Alat tidak dapat dihapus karena memiliki riwayat peminjaman. Nonaktifkan saja.')
        setOpen(false)
        setLoading(false)
        return
      }

      // Delete equipment rates first
      await supabase.from('equipment_rates').delete().eq('equipment_id', id)

      // Delete equipment images
      await supabase.from('equipment_images').delete().eq('equipment_id', id)

      // Delete equipment
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Alat berhasil dihapus')
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('Gagal menghapus alat: ' + (error as Error).message)
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
          <span className="font-medium">Hapus Alat</span>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Alat?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus alat <strong>&quot;{equipmentName}&quot;</strong>?
            <br /><br />
            Tindakan ini tidak dapat dibatalkan. Alat dengan riwayat peminjaman tidak dapat dihapus.
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
