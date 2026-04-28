'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X, Loader2 } from 'lucide-react'

async function sendNotif(event_type: string, booking_id: string) {
  await fetch('/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type, booking_id }),
  })
}

export function ApprovalButtons({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function approve() {
    setLoading('approve')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('bookings') as any)
      .update({ status: 'approved' })
      .eq('id', bookingId)
    if (error) { toast.error('Gagal menyetujui'); setLoading(null); return }
    toast.success('Pengajuan disetujui')
    sendNotif('booking_approved', bookingId)
    router.refresh()
    setLoading(null)
  }

  async function reject() {
    if (rejectionNotes.trim().length < 10) {
      toast.error('Alasan penolakan minimal 10 karakter')
      return
    }
    setLoading('reject')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('bookings') as any)
      .update({ status: 'rejected', admin_notes: rejectionNotes })
      .eq('id', bookingId)
    if (error) { toast.error('Gagal menolak'); setLoading(null); return }
    toast.success('Pengajuan ditolak')
    sendNotif('booking_rejected', bookingId)
    router.refresh()
    setLoading(null)
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="text-sm text-amber-800">Tindakan Persetujuan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Alasan Penolakan (wajib jika menolak)</label>
          <Textarea
            placeholder="Isi alasan penolakan jika Anda akan menolak pengajuan ini..."
            value={rejectionNotes}
            onChange={(e) => setRejectionNotes(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex gap-3">
          <Button onClick={approve} disabled={loading !== null} className="bg-green-600 hover:bg-green-700">
            {loading === 'approve' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Setujui
          </Button>
          <Button onClick={reject} variant="destructive" disabled={loading !== null}>
            {loading === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
            Tolak
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
