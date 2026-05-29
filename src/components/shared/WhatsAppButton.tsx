'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'

interface BookingData {
  id: string
  reference_no: string
  status: string
  start_datetime: string
  end_datetime: string
  users?: {
    name: string
    email?: string
  } | null
  booking_items?: Array<{
    item_type: string
    room?: { name: string }
    equipment?: { name: string }
  }>
  admin_notes?: string | null
}

interface WhatsAppButtonProps {
  phoneNumber: string
  booking?: BookingData
  message?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  children?: React.ReactNode
  customTemplate?: string
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
  'returned': 'booking_completed'
}

// Default messages untuk tiap status
const DEFAULT_MESSAGES: Record<string, string> = {
  'booking_submitted': 'Halo {{nama}}, pengajuan peminjaman {{ruangan}} ({{no_booking}}) telah kami terima dan sedang diproses. Terima kasih!',
  'booking_approved': 'Halo {{nama}}, selamat! Pengajuan peminjaman {{ruangan}} ({{no_booking}}) telah DISETUJUI. Silakan lakukan pembayaran untuk konfirmasi.',
  'booking_rejected': 'Halo {{nama}}, mohon maaf pengajuan peminjaman {{ruangan}} ({{no_booking}}) tidak dapat disetujui. Silakan hubungi admin untuk info lebih lanjut.',
  'booking_cancelled': 'Halo {{nama}}, peminjaman {{ruangan}} ({{no_booking}}) telah dibatalkan.',
  'payment_received': 'Halo {{nama}}, pembayaran untuk peminjaman {{ruangan}} ({{no_booking}}) telah diterima. Peminjaman dikonfirmasi!',
  'booking_reminder': 'Halo {{nama}}, ini pengingat bahwa peminjaman {{ruangan}} ({{no_booking}}) akan dimulai {{tanggal_mulai}}. Harap datang tepat waktu!'
}

export function WhatsAppButton({ 
  phoneNumber, 
  booking,
  message,
  variant = 'outline',
  size = 'sm',
  className = '',
  children,
  customTemplate
}: WhatsAppButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [template, setTemplate] = useState<string | null>(null)

  // Load template dari database jika ada booking
  useEffect(() => {
    if (!booking || message || customTemplate) return

    async function loadTemplate() {
      if (!booking) return
      
      const supabase = createClient()
      
      if (!booking) return
      
      // Tentukan event_type berdasarkan status booking
      const eventType = STATUS_TO_TEMPLATE[booking.status] || 'booking_submitted'
      
      // Coba ambil template dari database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('notification_templates') as any)
        .select('body')
        .eq('event_type', eventType)
        .eq('channel', 'whatsapp')
        .eq('is_active', true)
        .single()
      
      if (data?.body) {
        setTemplate(data.body)
      } else {
        // Gunakan default message
        setTemplate(DEFAULT_MESSAGES[eventType] || DEFAULT_MESSAGES['booking_submitted'])
      }
    }

    loadTemplate()
  }, [booking, message, customTemplate])

  // Function untuk replace template variables
  const processTemplate = useCallback((templateStr: string): string => {
    if (!booking) return templateStr

    // Ambil nama item (ruangan/alat)
    const itemName = booking.booking_items && booking.booking_items.length > 0
      ? booking.booking_items.map(item => 
          item.item_type === 'room' ? item.room?.name : item.equipment?.name
        ).filter(Boolean).join(', ')
      : 'Ruang/Alat'

    // Status dalam bahasa Indonesia
    const statusLabels: Record<string, string> = {
      'pending': 'Menunggu',
      'approved': 'Disetujui',
      'rejected': 'Ditolak',
      'cancelled': 'Dibatalkan',
      'paid': 'Lunas',
      'completed': 'Selesai'
    }

    const processed = templateStr
      .replace(/{{nama}}/g, booking.users?.name || 'Peminjam')
      .replace(/{{no_booking}}/g, booking.reference_no)
      .replace(/{{ruangan}}/g, itemName)
      .replace(/{{tanggal_mulai}}/g, formatDateTime(booking.start_datetime))
      .replace(/{{tanggal_selesai}}/g, formatDateTime(booking.end_datetime))
      .replace(/{{status}}/g, statusLabels[booking.status] || booking.status)
      .replace(/{{catatan_admin}}/g, booking.admin_notes || '-')

    return processed
  }, [booking])

  const handleClick = async () => {
    setIsLoading(true)
    
    try {
      // Format nomor telepon
      const formattedNumber = phoneNumber.replace(/\D/g, '')
      
      if (!formattedNumber) {
        toast.error('Nomor telepon tidak valid')
        return
      }

      // Tentukan pesan final
      let finalMessage: string
      
      if (message) {
        // Gunakan message yang diberikan langsung
        finalMessage = message
      } else if (customTemplate) {
        // Gunakan custom template
        finalMessage = processTemplate(customTemplate)
      } else if (template && booking) {
        // Gunakan template dari database
        finalMessage = processTemplate(template)
      } else {
        // Fallback ke default
        finalMessage = 'Halo, saya admin. Ada yang bisa saya bantu?'
      }

      // Buka wa.me link
      const waLink = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(finalMessage)}`
      window.open(waLink, '_blank')
      
    } catch {
      toast.error('Gagal membuka WhatsApp')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={`bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4 mr-2" />
      )}
      {children || 'Chat WA'}
    </Button>
  )
}

// Predefined template selector untuk admin
interface TemplateSelectorProps {
  onSelect: (template: string) => void
  selectedStatus?: string
}

export function WhatsAppTemplateSelector({ onSelect, selectedStatus }: TemplateSelectorProps) {
  const templates = [
    { key: 'booking_submitted', label: 'Pengajuan Diterima', status: 'pending' },
    { key: 'booking_approved', label: 'Booking Disetujui', status: 'approved' },
    { key: 'booking_rejected', label: 'Booking Ditolak', status: 'rejected' },
    { key: 'booking_cancelled', label: 'Booking Dibatalkan', status: 'cancelled' },
    { key: 'payment_received', label: 'Pembayaran Diterima', status: 'paid' },
    { key: 'booking_reminder', label: 'Pengingat Jadwal', status: 'reminder' },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Pilih template pesan:</p>
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.key}
            onClick={() => onSelect(DEFAULT_MESSAGES[t.key])}
            className={`text-xs px-2 py-1 rounded-[10px] border transition-colors ${
              selectedStatus === t.status
                ? 'bg-green-100 border-green-300 text-green-800'
                : 'bg-card border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Utility function untuk format nomor telepon
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1)
  }
  
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned
  }
  
  return cleaned
}

// Generate WhatsApp link
export function generateWhatsAppLink(phone: string, message: string = ''): string {
  const formattedNumber = formatPhoneNumber(phone)
  return `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`
}
