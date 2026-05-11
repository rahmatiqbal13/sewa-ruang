'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  Mail, 
  MessageSquare, 
  Send, 
  ChevronDown,
  Loader2,
  CheckCircle,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface BookingData {
  id: string
  reference_no: string
  status: string
  start_datetime: string
  end_datetime: string
  users?: {
    name: string
    email?: string
    phone?: string
    telegram_username?: string
  } | null
  booking_items?: Array<{
    item_type: string
    room?: { name: string }
    equipment?: { name: string }
  }>
  admin_notes?: string | null
}

interface ContactButtonsProps {
  booking: BookingData
  variant?: 'compact' | 'full'
  className?: string
}

// Map booking status to template event_type
const STATUS_TO_TEMPLATE: Record<string, string> = {
  'pending': 'booking_submitted',
  'submitted': 'booking_submitted',
  'approved': 'booking_approved',
  'rejected': 'booking_rejected',
  'cancelled': 'booking_cancelled',
  'paid': 'payment_received',
  'completed': 'payment_received',
}

// Default templates dengan detail lengkap
const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  'booking_submitted': {
    subject: '{{nama}} - {{no_booking}} | Pengajuan Diterima',
    body: `Halo {{nama}},

Pengajuan peminjaman Anda telah kami terima dengan detail:

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}
⏰ Status: Menunggu Persetujuan

Kami akan segera memproses pengajuan Anda.

Terima kasih,
Sport Center UNESA`
  },
  'booking_approved': {
    subject: '{{nama}} - {{no_booking}} | ✅ Pengajuan Disetujui',
    body: `Halo {{nama}},

Selamat! Pengajuan peminjaman Anda telah DISETUJUI.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}
💰 Status: Disetujui - Menunggu Pembayaran

Silakan lakukan pembayaran untuk mengkonfirmasi peminjaman Anda.

Terima kasih,
Sport Center UNESA`
  },
  'booking_rejected': {
    subject: '{{nama}} - {{no_booking}} | Pengajuan Ditolak',
    body: `Halo {{nama}},

Mohon maaf, pengajuan peminjaman Anda tidak dapat disetujui.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Silakan hubungi kami untuk informasi lebih lanjut.

Terima kasih,
Sport Center UNESA`
  },
  'booking_cancelled': {
    subject: '{{nama}} - {{no_booking}} | Peminjaman Dibatalkan',
    body: `Halo {{nama}},

Peminjaman Anda telah dibatalkan.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

Jika Anda memiliki pertanyaan, silakan hubungi kami.

Terima kasih,
Sport Center UNESA`
  },
  'payment_received': {
    subject: '{{nama}} - {{no_booking}} | 💳 Pembayaran Diterima',
    body: `Halo {{nama}},

Pembayaran untuk peminjaman Anda telah kami terima.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}
✅ Status: LUNAS & DIKONFIRMASI

Peminjaman Anda telah dikonfirmasi. Harap datang tepat waktu sesuai jadwal.

Terima kasih,
Sport Center UNESA`
  },
}

export function ContactButtons({ 
  booking, 
  variant = 'compact',
  className = ''
}: ContactButtonsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [templates, setTemplates] = useState<{
    email?: { subject: string; body: string };
    whatsapp?: string;
    telegram?: string;
  }>({})

  const user = booking.users
  const hasEmail = user?.email && user.email.includes('@')
  const hasPhone = user?.phone && user.phone.length > 0
  const hasTelegram = user?.telegram_username || hasPhone
  const hasAnyContact = hasEmail || hasPhone || hasTelegram

  // Load templates dari database
  useEffect(() => {
    async function loadTemplates() {
      const supabase = createClient()
      const eventType = STATUS_TO_TEMPLATE[booking.status] || 'booking_submitted'
      
      const { data } = await (supabase.from('notification_templates') as any)
        .select('channel, subject, body')
        .eq('event_type', eventType)
        .eq('is_active', true)
        .in('channel', ['email', 'whatsapp', 'telegram'])
      
      const loadedTemplates: any = {}
      
      if (data && data.length > 0) {
        data.forEach((t: any) => {
          if (t.channel === 'email') {
            loadedTemplates.email = {
              subject: t.subject || DEFAULT_TEMPLATES[eventType]?.subject || 'Info Peminjaman',
              body: t.body
            }
          } else if (t.channel === 'whatsapp') {
            loadedTemplates.whatsapp = t.body
          } else if (t.channel === 'telegram') {
            loadedTemplates.telegram = t.body
          }
        })
      }
      
      // Fallback ke default jika tidak ada
      if (!loadedTemplates.email) {
        loadedTemplates.email = DEFAULT_TEMPLATES[eventType] || DEFAULT_TEMPLATES['booking_submitted']
      }
      if (!loadedTemplates.whatsapp) {
        loadedTemplates.whatsapp = DEFAULT_TEMPLATES[eventType]?.body || DEFAULT_TEMPLATES['booking_submitted']?.body
      }
      if (!loadedTemplates.telegram) {
        loadedTemplates.telegram = DEFAULT_TEMPLATES[eventType]?.body || DEFAULT_TEMPLATES['booking_submitted']?.body
      }
      
      setTemplates(loadedTemplates)
    }

    if (hasAnyContact) {
      loadTemplates()
    }
  }, [booking.status, hasAnyContact])

  // Process template dengan data lengkap
  const processTemplate = (template: string): string => {
    if (!booking) return template

    // Pisahkan ruangan dan alat
    const rooms: string[] = []
    const equipments: string[] = []

    if (booking.booking_items && booking.booking_items.length > 0) {
      booking.booking_items.forEach(item => {
        if (item.item_type === 'room' && item.room?.name) {
          rooms.push(item.room.name)
        } else if (item.item_type === 'equipment' && item.equipment?.name) {
          equipments.push(item.equipment.name)
        }
      })
    }

    // Format daftar ruangan
    let daftarRuangan = ''
    if (rooms.length > 0) {
      if (rooms.length === 1) {
        daftarRuangan = `Ruangan: ${rooms[0]}`
      } else {
        daftarRuangan = `Ruangan:\n${rooms.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}`
      }
    }

    // Format daftar alat
    let daftarAlat = ''
    if (equipments.length > 0) {
      if (equipments.length === 1) {
        daftarAlat = `Alat: ${equipments[0]}`
      } else {
        daftarAlat = `Alat:\n${equipments.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}`
      }
    }

    // Format gabungan untuk variabel lama (backward compatibility)
    const allItems = [...rooms, ...equipments]
    const itemName = allItems.length > 0 
      ? allItems.join(', ')
      : 'Ruang/Alat'

    // Status label
    const statusLabels: Record<string, string> = {
      'pending': 'Menunggu',
      'approved': 'Disetujui',
      'rejected': 'Ditolak',
      'cancelled': 'Dibatalkan',
      'paid': 'Lunas',
      'completed': 'Selesai'
    }

    return template
      .replace(/{{nama}}/g, user?.name || 'Peminjam')
      .replace(/{{no_booking}}/g, booking.reference_no)
      .replace(/{{ruangan}}/g, itemName)
      .replace(/{{daftar_ruangan}}/g, daftarRuangan)
      .replace(/{{daftar_alat}}/g, daftarAlat)
      .replace(/{{jumlah_ruangan}}/g, rooms.length.toString())
      .replace(/{{jumlah_alat}}/g, equipments.length.toString())
      .replace(/{{tanggal_mulai}}/g, formatDateTime(booking.start_datetime))
      .replace(/{{tanggal_selesai}}/g, formatDateTime(booking.end_datetime))
      .replace(/{{status}}/g, statusLabels[booking.status] || booking.status)
      .replace(/{{catatan_admin}}/g, booking.admin_notes || '')
  }

  // Send Email
  const handleSendEmail = async () => {
    if (!hasEmail) {
      toast.error('Email tidak tersedia')
      return
    }

    setIsLoading(true)
    
    try {
      const emailTemplate = templates.email || DEFAULT_TEMPLATES['booking_submitted']
      const subject = processTemplate(emailTemplate.subject)
      const body = processTemplate(emailTemplate.body)

      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user?.email,
          subject,
          message: body,
          bookingId: booking.id
        })
      })

      if (response.ok) {
        setSent(true)
        toast.success('Email berhasil dikirim!')
        setTimeout(() => setSent(false), 3000)
      } else {
        const error = await response.json()
        toast.error('Gagal kirim email: ' + (error.error || 'Unknown error'))
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Open WhatsApp
  const handleWhatsApp = () => {
    if (!hasPhone) {
      toast.error('Nomor telepon tidak tersedia')
      return
    }

    const message = templates.whatsapp 
      ? processTemplate(templates.whatsapp)
      : `Halo ${user?.name}, saya admin Sport Center UNESA.`

    const formattedNumber = user?.phone?.replace(/\D/g, '') || ''
    const waLink = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`
    window.open(waLink, '_blank')
  }

  // Open Telegram
  const handleTelegram = () => {
    const message = templates.telegram 
      ? processTemplate(templates.telegram)
      : `Halo ${user?.name}, saya admin Sport Center UNESA.`

    let tgLink = ''
    
    if (user?.telegram_username) {
      const cleanUsername = user.telegram_username.replace(/^@/, '')
      tgLink = `https://t.me/${cleanUsername}?text=${encodeURIComponent(message)}`
    } else if (hasPhone) {
      const formattedNumber = user?.phone?.replace(/\D/g, '')
      tgLink = `https://t.me/+${formattedNumber}?text=${encodeURIComponent(message)}`
    } else {
      toast.error('Kontak Telegram tidak tersedia')
      return
    }
    
    window.open(tgLink, '_blank')
  }

  if (!hasAnyContact) return null

  // Compact version (single dropdown)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-2 text-xs ${className}`}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : sent ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <>
            <span className="mr-1">Hubungi</span>
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {hasEmail && (
          <DropdownMenuItem 
            onClick={handleSendEmail}
            className="cursor-pointer"
            disabled={isLoading}
          >
            <Mail className="h-4 w-4 mr-2 text-blue-600" />
            <span className="flex-1">Kirim Email</span>
            {sent && <CheckCircle className="h-3 w-3 text-green-600" />}
          </DropdownMenuItem>
        )}
        
        {hasPhone && (
          <DropdownMenuItem 
            onClick={handleWhatsApp}
            className="cursor-pointer"
          >
            <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
            WhatsApp
            <ExternalLink className="h-3 w-3 ml-auto text-slate-400" />
          </DropdownMenuItem>
        )}
        
        {hasTelegram && (
          <DropdownMenuItem 
            onClick={handleTelegram}
            className="cursor-pointer"
          >
            <Send className="h-4 w-4 mr-2 text-sky-600" />
            Telegram
            <ExternalLink className="h-3 w-3 ml-auto text-slate-400" />
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
