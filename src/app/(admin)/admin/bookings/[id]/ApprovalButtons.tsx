'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X, Loader2, GraduationCap } from 'lucide-react'

async function sendNotif(_event_type: string, booking_id: string) {
  await fetch('/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: booking_id, channels: ['email', 'whatsapp'] }),
  }).catch(() => {
    // Notifikasi gagal tidak memblokir alur approval
  })
}

// Helper function to check if booking qualifies for free (auto-paid)
function isFreeBooking(borrowerCategory: string, purpose: string): boolean {
  const isMahasiswaS1 = borrowerCategory === 'mahasiswa_s1'
  const isForKuliah = purpose.toLowerCase().includes('kuliah') || 
                      purpose.toLowerCase().includes('perkuliahan') ||
                      purpose.toLowerCase().includes('mata kuliah') ||
                      purpose.toLowerCase().includes('kuliah semester') ||
                      purpose.toLowerCase().includes('kuliah online')
  return isMahasiswaS1 && isForKuliah
}

interface ApprovalButtonsProps {
  bookingId: string
  borrowerCategory: string
  purpose: string
}

export function ApprovalButtons({ bookingId, borrowerCategory, purpose }: ApprovalButtonsProps) {
  const router = useRouter()
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  const isFree = isFreeBooking(borrowerCategory, purpose)

  async function approve() {
    setLoading('approve')
    const supabase = createClient()
    
    // Determine target status: if free booking, go directly to 'paid', otherwise 'approved'
    const targetStatus = isFree ? 'paid' : 'approved'
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('bookings') as any)
      .update({ 
        status: targetStatus,
        admin_notes: isFree ? 'Peminjaman gratis untuk Mahasiswa S1 (Perkuliahan)' : null 
      })
      .eq('id', bookingId)
    
    if (error) {
      console.error('Approval error detail:', error)
      toast.error('Gagal menyetujui: ' + error.message);
      setLoading(null);
      return
    }
    
    if (isFree) {
      toast.success('Pengajuan langsung lunas! (Mahasiswa S1 - Perkuliahan)', {
        icon: <GraduationCap className="h-4 w-4" />,
        duration: 5000,
      })
      sendNotif('booking_approved', bookingId)
      // Also send payment notification since it's auto-paid
      setTimeout(() => {
        sendNotif('payment_received', bookingId)
      }, 1000)
    } else {
      toast.success('Pengajuan disetujui')
      sendNotif('booking_approved', bookingId)
    }
    
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
    if (error) { console.error('Rejection error detail:', error); toast.error('Gagal menolak: ' + error.message); setLoading(null); return }
    toast.success('Pengajuan ditolak')
    sendNotif('booking_rejected', bookingId)
    router.refresh()
    setLoading(null)
  }

  return (
    <Card className={isFree ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
      <CardHeader>
        <CardTitle className={isFree ? "text-sm text-green-800" : "text-sm text-amber-800"}>
          Tindakan Persetujuan
          {isFree && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              <GraduationCap className="h-3 w-3" />
              Gratis - Mahasiswa S1
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isFree && (
          <div className="p-3 bg-white/60 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Peminjaman Gratis</strong>
            </p>
            <p className="text-xs text-green-700 mt-1">
              Pengajuan ini dari Mahasiswa S1 untuk keperluan perkuliahan. 
              Status akan langsung menjadi <strong>LUNAS</strong> tanpa perlu pembayaran.
            </p>
          </div>
        )}
        
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
          <Button 
            onClick={approve} 
            disabled={loading !== null} 
            className={isFree ? "bg-green-600 hover:bg-green-700" : "bg-green-600 hover:bg-green-700"}
          >
            {loading === 'approve' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isFree ? (
              <GraduationCap className="mr-2 h-4 w-4" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {isFree ? 'Setujui & Lunas' : 'Setujui'}
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
