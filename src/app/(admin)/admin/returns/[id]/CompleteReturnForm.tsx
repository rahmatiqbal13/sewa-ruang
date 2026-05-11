'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Check, Loader2, Clock } from 'lucide-react'
import { PhotoUpload } from '@/components/shared/PhotoUpload'
import { formatRupiah, formatDateTime } from '@/lib/utils'

interface CompleteReturnFormProps {
  bookingId: string
  booking: {
    reference_no: string
    start_datetime: string
    end_datetime: string
    total_amount: number
    status: string
    actual_end_datetime?: string
  }
  totalPaid: number
  onComplete?: () => void
}

const conditionLabel: Record<string, { label: string; color: string }> = {
  good: { label: 'Baik', color: 'text-green-600' },
  minor_damage: { label: 'Rusak Ringan', color: 'text-amber-600' },
  major_damage: { label: 'Rusak Berat', color: 'text-red-600' },
  lost: { label: 'Hilang', color: 'text-red-800' },
}

export function CompleteReturnForm({ bookingId, booking, totalPaid, onComplete }: CompleteReturnFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [condition, setCondition] = useState('good')
  const [notes, setNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [actualEndDate, setActualEndDate] = useState(
    booking.actual_end_datetime 
      ? booking.actual_end_datetime.slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  )

  // Calculate if this is early return
  const plannedEnd = new Date(booking.end_datetime)
  const actualEnd = new Date(actualEndDate)
  const isEarlyReturn = actualEnd < plannedEnd
  
  // Calculate refund if early return
  let refundAmount = 0
  if (isEarlyReturn && totalPaid > 0) {
    const plannedDuration = plannedEnd.getTime() - new Date(booking.start_datetime).getTime()
    const actualDuration = actualEnd.getTime() - new Date(booking.start_datetime).getTime()
    if (actualDuration > 0 && plannedDuration > 0) {
      const unusedRatio = (plannedDuration - actualDuration) / plannedDuration
      refundAmount = Math.floor(booking.total_amount * unusedRatio)
    }
  }

  async function handleSubmit() {
    if (condition !== 'good' && notes.trim().length < 10) {
      toast.error('Catatan wajib diisi minimal 10 karakter untuk kondisi tidak baik')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Anda harus login untuk mencatat pengembalian')
        setLoading(false)
        return
      }

      // 1. Record the return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: returnError } = await (supabase.from('returns') as any).insert({
        booking_id: bookingId,
        returned_at: new Date(actualEndDate).toISOString(),
        condition: condition,
        notes: notes || null,
        photo_url: photoUrl || null,
        recorded_by: user.id,
        is_early_return: isEarlyReturn,
        refund_amount: refundAmount > 0 ? refundAmount : null,
      })

      if (returnError) throw returnError

      // 2. Update booking status to completed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: bookingError } = await (supabase.from('bookings') as any)
        .update({
          status: 'completed',
          actual_end_datetime: actualEndDate,
          admin_notes: notes 
            ? `Pengembalian: ${notes}${isEarlyReturn ? ' (Pengembalian lebih cepat)' : ''}`
            : isEarlyReturn ? 'Pengembalian lebih cepat' : null
        })
        .eq('id', bookingId)

      if (bookingError) throw bookingError

      // 3. Create refund record if applicable
      if (refundAmount > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: refundError } = await (supabase.from('payments') as any).insert({
          booking_id: bookingId,
          amount: -refundAmount,
          method: 'refund',
          status: 'pending',
          notes: `Refund pengembalian lebih cepat - Kondisi: ${conditionLabel[condition].label}`,
        })

        if (refundError) throw refundError
      }

      toast.success('Pengembalian berhasil dicatat')
      if (refundAmount > 0) {
        toast.info(`Refund ${formatRupiah(refundAmount)} perlu diproses`)
      }
      
      router.refresh()
      onComplete?.()
    } catch (error: any) {
      toast.error('Gagal mencatat pengembalian: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="text-sm text-green-800 flex items-center gap-2">
          <Check className="h-4 w-4" />
          Catat Pengembalian & Selesaikan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Booking Summary */}
        <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
          <p>
            <span className="text-slate-500">No. Ref:</span>{' '}
            <span className="font-mono font-medium">{booking.reference_no}</span>
          </p>
          <p>
            <span className="text-slate-500">Jadwal Selesai:</span>{' '}
            <span className="font-medium">{formatDateTime(booking.end_datetime)}</span>
          </p>
          {booking.status === 'paid' && (
            <p>
              <span className="text-slate-500">Total Dibayar:</span>{' '}
              <span className="font-medium text-green-600">{formatRupiah(totalPaid)}</span>
            </p>
          )}
        </div>

        {/* Actual Return Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            <Clock className="h-4 w-4 inline mr-1" />
            Waktu Pengembalian Aktual
          </Label>
          <Input
            type="datetime-local"
            value={actualEndDate}
            onChange={(e) => setActualEndDate(e.target.value)}
            max={booking.end_datetime.slice(0, 16)}
          />
          {isEarlyReturn && (
            <p className="text-xs text-amber-600">
              Pengembalian lebih cepat! Refund akan dihitung otomatis.
            </p>
          )}
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Kondisi Aset</Label>
          <Select value={condition} onValueChange={(v) => setCondition(v || 'good')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="good">
                <span className="text-green-600">● Baik</span>
              </SelectItem>
              <SelectItem value="minor_damage">
                <span className="text-amber-600">● Rusak Ringan</span>
              </SelectItem>
              <SelectItem value="major_damage">
                <span className="text-red-600">● Rusak Berat</span>
              </SelectItem>
              <SelectItem value="lost">
                <span className="text-red-800">● Hilang</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Refund Info */}
        {isEarlyReturn && refundAmount > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              Refund Dihitung: {formatRupiah(refundAmount)}
            </p>
            <p className="text-xs text-green-600">
              Berdasarkan waktu tidak terpakai
            </p>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Catatan {condition !== 'good' && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            placeholder={condition !== 'good' 
              ? 'Wajib diisi - jelaskan kondisi kerusakan/kehilangan...' 
              : 'Catatan tambahan (opsional)...'
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Photo */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Foto Kondisi</Label>
          <PhotoUpload
            value={photoUrl}
            onChange={(url) => setPhotoUrl(url || '')}
            folder="returns"
          />
        </div>

        {/* Submit */}
        <Button 
          onClick={handleSubmit} 
          disabled={loading || (condition !== 'good' && notes.trim().length < 10)}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Check className="mr-2 h-4 w-4" />
          Selesaikan Peminjaman
        </Button>
      </CardContent>
    </Card>
  )
}
