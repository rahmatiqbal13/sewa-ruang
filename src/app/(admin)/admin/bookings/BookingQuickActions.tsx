'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Eye, MessageCircle, Send, Loader2 } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Pending',    color: 'text-amber-600' },
  { value: 'approved',  label: 'Disetujui',  color: 'text-blue-600' },
  { value: 'rejected',  label: 'Ditolak',    color: 'text-red-600' },
  { value: 'paid',      label: 'Lunas',      color: 'text-emerald-600' },
  { value: 'completed', label: 'Selesai',    color: 'text-green-700' },
  { value: 'cancelled', label: 'Dibatalkan', color: 'text-muted-foreground' },
]

export function BookingQuickActions({
  bookingId,
  status,
  borrowerPhone,
  bookingRef,
}: {
  bookingId: string
  status: string
  borrowerPhone: string | null
  bookingRef: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function changeStatus(newStatus: string) {
    if (newStatus === status) return
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('bookings') as any)
      .update({ status: newStatus })
      .eq('id', bookingId)
    if (error) {
      toast.error('Gagal ubah status: ' + error.message)
    } else {
      toast.success(`Status diubah ke ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}`)
      // Send notification
      const eventTypeMap: Record<string, string> = {
        approved: 'booking_approved', rejected: 'booking_rejected',
        cancelled: 'booking_cancelled', paid: 'payment_received',
      }
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          event_type: eventTypeMap[newStatus] ?? `booking_${newStatus}`,
          channels: ['email', 'whatsapp', 'telegram'],
        }),
      }).catch(() => { /* non-blocking */ })
      router.refresh()
    }
    setLoading(false)
  }

  function openWhatsApp() {
    if (!borrowerPhone) { toast.error('Nomor WA peminjam tidak tersedia'); return }
    let num = borrowerPhone.replace(/\D/g, '')
    if (num.startsWith('0')) num = '62' + num.slice(1)
    const msg = `Halo, kami ingin menginformasikan status peminjaman Anda dengan nomor ${bookingRef}. Silakan cek sistem untuk informasi lengkap.`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  async function sendNotification() {
    const eventMap: Record<string, string> = {
      pending: 'booking_submitted', approved: 'booking_approved',
      rejected: 'booking_rejected', paid: 'payment_received',
      completed: 'booking_completed', cancelled: 'booking_cancelled',
    }
    const event = eventMap[status] ?? 'booking_submitted'
    setLoading(true)
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId,
        event_type: event,
        channels: ['email', 'whatsapp', 'telegram'],
      }),
    })
    if (res.ok) {
      toast.success('Notifikasi terkirim')
    } else {
      const json = await res.json()
      toast.error(json.error ?? 'Gagal kirim notifikasi')
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {/* Status dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger disabled={loading} className="inline-flex items-center h-7 px-2 text-xs gap-1 rounded-md border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Ubah Status
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {STATUS_OPTIONS.map(opt => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => changeStatus(opt.value)}
              className={opt.value === status ? 'font-bold bg-muted' : ''}
            >
              <span className={opt.color}>{opt.label}</span>
              {opt.value === status && <span className="ml-auto text-xs text-muted-foreground/70">aktif</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={sendNotification}>
            <Send className="h-3.5 w-3.5 mr-2 text-blue-500" />
            Kirim Notifikasi
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openWhatsApp}>
            <MessageCircle className="h-3.5 w-3.5 mr-2 text-green-500" />
            Pesan WA Manual
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Detail */}
      <Link href={`/admin/bookings/${bookingId}`} className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-background hover:bg-accent transition-colors">
        <Eye className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
