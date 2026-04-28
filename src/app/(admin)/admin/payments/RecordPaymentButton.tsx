'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CreditCard, Loader2 } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

const schema = z.object({
  method: z.enum(['manual_cash', 'manual_transfer']),
  amount: z.coerce.number().min(1, 'Nominal wajib diisi'),
  gateway_ref: z.string().optional(),
  paid_at: z.string().min(1, 'Tanggal pembayaran wajib diisi'),
})
type FormData = {
  method: 'manual_cash' | 'manual_transfer'
  amount: number
  gateway_ref?: string
  paid_at: string
}

export function RecordPaymentButton({ bookingId, totalAmount }: { bookingId: string; totalAmount: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { amount: totalAmount, paid_at: new Date().toISOString().slice(0, 16) },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('payments') as any).insert({
      booking_id: bookingId,
      method: data.method,
      amount: data.amount,
      status: 'paid',
      gateway_ref: data.gateway_ref || null,
      paid_at: new Date(data.paid_at).toISOString(),
      recorded_by: user!.id,
    })

    if (error) { toast.error(error.message); setLoading(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('bookings') as any).update({ status: 'paid' }).eq('id', bookingId)

    toast.success('Pembayaran berhasil dicatat')
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'payment_received', booking_id: bookingId }),
    }).then(r => r.json()).then(json => {
      if (json.whatsapp_url) {
        toast('Kirim notifikasi WhatsApp?', {
          action: { label: 'Buka WhatsApp', onClick: () => window.open(json.whatsapp_url, '_blank') },
          duration: 10000,
        })
      }
    })
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full" />}>
        <CreditCard className="mr-2 h-4 w-4" /> Catat Pembayaran Manual
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Pembayaran Manual</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <Select onValueChange={(v) => setValue('method', v as 'manual_cash' | 'manual_transfer')}>
              <SelectTrigger><SelectValue placeholder="Pilih metode..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_cash">Tunai</SelectItem>
                <SelectItem value="manual_transfer">Transfer Bank</SelectItem>
              </SelectContent>
            </Select>
            {errors.method && <p className="text-sm text-destructive">{errors.method.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Nominal (Rp)</Label>
            <Input type="number" min={0} {...register('amount')} />
            <p className="text-xs text-muted-foreground">Tagihan: {formatRupiah(totalAmount)}</p>
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Tanggal & Jam Pembayaran</Label>
            <Input type="datetime-local" {...register('paid_at')} />
          </div>
          <div className="space-y-2">
            <Label>No. Referensi Transfer (opsional)</Label>
            <Input placeholder="Misal: TRF-12345" {...register('gateway_ref')} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pembayaran
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
