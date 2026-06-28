'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cancelBookingAction } from './actions'

import { cn } from '@/lib/utils'

interface CancelBookingButtonProps {
  id: string
  variant?: 'destructive' | 'outline' | 'ghost'
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function CancelBookingButton({ id, variant = 'destructive', className, size = 'sm' }: CancelBookingButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onConfirm() {
    setLoading(true)
    const result = await cancelBookingAction(id)
    if (!result.success) {
      toast.error(result.error ?? 'Gagal membatalkan')
      setLoading(false)
      return
    }
    toast.success('Pengajuan berhasil dibatalkan')
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'booking_cancelled', booking_id: id }),
    }).catch(() => {})
    router.refresh()
    setLoading(false)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant={variant} size={size} disabled={loading} className={cn(className)} />}>
        Batalkan
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan Pengajuan?</AlertDialogTitle>
          <AlertDialogDescription>Tindakan ini tidak dapat diurungkan.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Tidak</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Ya, Batalkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
