'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface DeleteReturnButtonProps {
  returnId: string
  referenceNo: string
}

export function DeleteReturnButton({ returnId, referenceNo }: DeleteReturnButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/returns/${returnId}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok) {
        toast.success(`Riwayat pengembalian ${referenceNo} dihapus`)
        router.refresh()
      } else {
        toast.error(json.error || 'Gagal menghapus data pengembalian')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
        title="Hapus riwayat pengembalian"
        disabled={deleting}
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[14px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Hapus Riwayat Pengembalian?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Riwayat pengembalian untuk booking <strong>{referenceNo}</strong> akan dihapus permanen.
            Data booking induknya tidak ikut terhapus.
            Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-[10px]">Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 rounded-[10px]"
          >
            Ya, Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
