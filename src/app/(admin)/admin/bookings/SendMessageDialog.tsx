'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Send, MessageCircle, Mail, Phone, Loader2, Copy, Check } from 'lucide-react'
import { formatRupiah, formatDateTime } from '@/lib/utils'

interface Booking {
  id: string
  reference_no: string
  status: string
  start_datetime: string
  end_datetime: string
  total_amount: number
  users: {
    name: string
    email: string
    phone: string | null
    institution: string
  } | null
}

interface SendMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: Booking | null
}

export function SendMessageDialog({ open, onOpenChange, booking }: SendMessageDialogProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!booking) return null

  const borrower = booking.users
  const phone = borrower?.phone?.replace(/[^0-9]/g, '')
  
  // Generate default message
  const getDefaultMessage = () => {
    return `Halo ${borrower?.name},

Terima kasih telah mengajukan peminjaman di RentSpace.

Detail Pengajuan:
• No. Referensi: ${booking.reference_no}
• Status: ${getStatusLabel(booking.status)}
• Tanggal: ${formatDateTime(booking.start_datetime)}
• Total: ${formatRupiah(booking.total_amount)}

${getStatusMessage(booking.status)}

Terima kasih.`
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending/Menunggu',
      approved: 'Disetujui',
      paid: 'Lunas',
      completed: 'Selesai',
      rejected: 'Ditolak',
      cancelled: 'Dibatalkan'
    }
    return labels[status] || status
  }

  const getStatusMessage = (status: string) => {
    const messages: Record<string, string> = {
      pending: 'Pengajuan Anda sedang kami proses. Kami akan menghubungi Anda untuk konfirmasi.',
      approved: 'Pengajuan Anda telah disetujui. Silakan lakukan pembayaran untuk konfirmasi.',
      paid: 'Pembayaran telah diterima. Peminjaman Anda sudah aktif.',
      completed: 'Terima kasih telah menggunakan layanan RentSpace.',
      rejected: 'Mohon maaf, pengajuan Anda tidak dapat kami proses saat ini.',
      cancelled: 'Pengajuan telah dibatalkan.'
    }
    return messages[status] || ''
  }

  // Reset message when dialog opens
  useState(() => {
    if (open) {
      setMessage(getDefaultMessage())
    }
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Pesan disalin ke clipboard')
  }

  const handleSendWhatsApp = () => {
    if (!phone) {
      toast.error('Nomor WhatsApp peminjam tidak tersedia')
      return
    }
    const encodedMessage = encodeURIComponent(message)
    const waUrl = `https://wa.me/${phone}?text=${encodedMessage}`
    window.open(waUrl, '_blank')
    toast.success('Membuka WhatsApp...')
    onOpenChange(false)
  }

  const handleSendTelegram = () => {
    if (!phone) {
      toast.error('Nomor Telegram peminjam tidak tersedia')
      return
    }
    const encodedMessage = encodeURIComponent(message)
    const tgUrl = `https://t.me/+${phone}?text=${encodedMessage}`
    window.open(tgUrl, '_blank')
    toast.success('Membuka Telegram...')
    onOpenChange(false)
  }

  const handleSendEmail = async () => {
    if (!borrower?.email) {
      toast.error('Email peminjam tidak tersedia')
      return
    }
    
    setSending(true)
    try {
      // Call API to send email
      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: borrower.email,
          subject: `Update Status Pengajuan - ${booking.reference_no}`,
          message: message,
          bookingId: booking.id
        })
      })
      
      if (response.ok) {
        toast.success('Email berhasil dikirim')
        onOpenChange(false)
      } else {
        toast.error('Gagal mengirim email')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengirim email')
    } finally {
      setSending(false)
    }
  }

  const handleSendSMS = () => {
    if (!phone) {
      toast.error('Nomor telepon peminjam tidak tersedia')
      return
    }
    // Open SMS app (works on mobile)
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`
    window.open(smsUrl, '_blank')
    toast.success('Membuka aplikasi SMS...')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Kirim Pesan ke Peminjam
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Recipient Info */}
          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-slate-500">Kepada:</span> <strong>{borrower?.name}</strong></p>
            <p><span className="text-slate-500">No. Ref:</span> {booking.reference_no}</p>
            {borrower?.phone && <p><span className="text-slate-500">WA/Telepon:</span> {borrower.phone}</p>}
            {borrower?.email && <p><span className="text-slate-500">Email:</span> {borrower.email}</p>}
          </div>

          {/* Message Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pesan</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 text-xs"
              >
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? 'Tersalin' : 'Salin'}
              </Button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </div>

          {/* Send Options */}
          <div className="grid grid-cols-2 gap-2">
            {borrower?.phone && (
              <Button
                onClick={handleSendWhatsApp}
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            )}
            
            {borrower?.phone && (
              <Button
                onClick={handleSendTelegram}
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <Send className="h-4 w-4 mr-2" />
                Telegram
              </Button>
            )}
            
            {borrower?.email && (
              <Button
                onClick={handleSendEmail}
                disabled={sending}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Email
              </Button>
            )}
            
            {borrower?.phone && (
              <Button
                onClick={handleSendSMS}
                variant="outline"
              >
                <Phone className="h-4 w-4 mr-2" />
                SMS
              </Button>
            )}
          </div>

          {!borrower?.phone && !borrower?.email && (
            <p className="text-sm text-red-500 text-center">
              Peminjam tidak memiliki nomor telepon atau email
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
