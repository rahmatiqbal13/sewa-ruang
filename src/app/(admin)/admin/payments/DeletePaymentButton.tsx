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

interface DeletePaymentButtonProps {
  id: string
  referenceNo: string
  type?: 'proof' // omit for payments table
  label?: string
}

export function DeletePaymentButton({ id, referenceNo, type, label }: DeletePaymentButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const url = type === 'proof'
        ? `/api/payments/${id}?type=proof`
        : `/api/payments/${id}`
      const res = await fetch(url, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok) {
        toast.success(`Data pembayaran ${referenceNo} dihapus`)
        router.refresh()
      } else {
        toast.error(json.error || 'Gagal menghapus data pembayaran')
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
        title={`Hapus ${label ?? 'data pembayaran'}`}
        disabled={deleting}
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[14px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Hapus Data Pembayaran?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {label ?? 'Data pembayaran'} untuk booking <strong>{referenceNo}</strong> akan dihapus permanen.
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
