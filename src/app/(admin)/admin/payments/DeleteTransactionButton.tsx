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

interface Props {
  bookingId: string
  referenceNo: string
  borrowerName: string
}

export function DeleteTransactionButton({ bookingId, referenceNo, borrowerName }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok) {
        toast.success(`Transaksi ${referenceNo} berhasil dihapus`)
        router.refresh()
      } else {
        toast.error(json.error || 'Gagal menghapus transaksi')
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
        title="Hapus transaksi"
        disabled={deleting}
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[14px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Hapus Transaksi?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Transaksi <strong>{referenceNo}</strong> atas nama <strong>{borrowerName}</strong>{' '}
            akan dihapus permanen beserta seluruh data pembayaran dan pengembalian terkait.
            Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} className="rounded-[10px]">Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 rounded-[10px]"
          >
            Ya, Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
