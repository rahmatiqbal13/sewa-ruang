'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Bell, 
  Clock, 
  Mail, 
  MessageCircle, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Reminder {
  id: string
  reminder_type: string
  scheduled_at: string
  sent_at: string | null
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  channel: string
  message: string
}

interface BookingRemindersProps {
  bookingId: string
}

const REMINDER_TYPE_LABELS: Record<string, string> = {
  before_start: 'Sebelum Mulai',
  after_start: 'Saat Mulai',
  before_end: 'Sebelum Selesai',
  after_end: 'Saat Selesai',
  custom: 'Kustom',
}

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail,
  whatsapp: MessageCircle,
  telegram: MessageCircle,
  sms: MessageCircle,
}

const STATUS_CONFIG = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  sent: { label: 'Terkirim', color: 'bg-green-100 text-green-700 border-green-200' },
  failed: { label: 'Gagal', color: 'bg-red-100 text-red-700 border-red-200' },
  cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

export function BookingReminders({ bookingId }: BookingRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchReminders()
  }, [bookingId])

  async function fetchReminders() {
    try {
      const { data, error } = await supabase
        .rpc('get_booking_reminders', { p_booking_id: bookingId })

      if (error) throw error
      setReminders(data || [])
    } catch (error) {
      console.error('Error fetching reminders:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createCustomReminder() {
    setCreating(true)
    try {
      // Create a custom reminder for tomorrow
      const scheduledAt = new Date()
      scheduledAt.setDate(scheduledAt.getDate() + 1)

      const { error } = await supabase
        .from('booking_reminders')
        .insert({
          booking_id: bookingId,
          reminder_type: 'custom',
          scheduled_at: scheduledAt.toISOString(),
          channel: 'email',
          message: 'Pengingat kustom untuk peminjaman Anda.',
        })

      if (error) throw error

      toast.success('Pengingat berhasil dibuat')
      fetchReminders()
    } catch (error: any) {
      toast.error('Gagal membuat pengingat: ' + error.message)
    } finally {
      setCreating(false)
    }
  }

  async function cancelReminder(reminderId: string) {
    try {
      const { error } = await supabase
        .from('booking_reminders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', reminderId)

      if (error) throw error

      toast.success('Pengingat dibatalkan')
      fetchReminders()
    } catch (error: any) {
      toast.error('Gagal membatalkan: ' + error.message)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const pendingReminders = reminders.filter(r => r.status === 'pending')
  const sentReminders = reminders.filter(r => r.status === 'sent')

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Pengingat
            {pendingReminders.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingReminders.length} menunggu
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={createCustomReminder}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Tambah Pengingat
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>Belum ada pengingat untuk peminjaman ini</p>
            <p className="text-sm mt-1">
              Pengingat akan otomatis dibuat saat booking di-approve
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const ChannelIcon = CHANNEL_ICONS[reminder.channel] || Mail
              const statusConfig = STATUS_CONFIG[reminder.status]
              
              return (
                <div
                  key={reminder.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    reminder.status === 'pending' && "bg-yellow-50/50",
                    reminder.status === 'sent' && "bg-green-50/50",
                    reminder.status === 'failed' && "bg-red-50/50"
                  )}
                >
                  <div className="mt-0.5">
                    <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {REMINDER_TYPE_LABELS[reminder.reminder_type] || reminder.reminder_type}
                      </span>
                      <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {reminder.message}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(reminder.scheduled_at), 'dd MMM yyyy HH:mm', { locale: id })}
                      </span>
                      
                      {reminder.sent_at && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Terkirim {format(new Date(reminder.sent_at), 'dd MMM HH:mm', { locale: id })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {reminder.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => cancelReminder(reminder.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Info */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pengingat otomatis dikirim 1 hari sebelum/sesudah tanggal penting
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
