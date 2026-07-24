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
      const { data: returnData, error: returnError } = await (supabase.from('returns') as any).insert({
        booking_id: bookingId,
        returned_at: new Date(actualEndDate).toISOString(),
        condition: condition,
        notes: notes || null,
        recorded_by: user.id,
      }).select('id').single()

      if (returnError) throw returnError

      // 1b. Save photo to return_images if provided
      if (photoUrl && returnData?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('return_images') as any).insert({
          return_id: returnData.id,
          url: photoUrl,
        })
      }

      // 2. Update booking status to completed
      const adminNotesParts = []
      if (isEarlyReturn) adminNotesParts.push('Pengembalian lebih cepat')
      if (notes) adminNotesParts.push(notes)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: bookingError } = await (supabase.from('bookings') as any)
        .update({
          status: 'completed',
          admin_notes: adminNotesParts.length > 0 ? adminNotesParts.join(' — ') : null,
        })
        .eq('id', bookingId)

      if (bookingError) throw bookingError

      toast.success('Pengembalian berhasil dicatat')
      router.push('/admin/returns')
    } catch (error) {
      toast.error('Gagal mencatat pengembalian: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-green-200 rounded-[14px]">
      <CardHeader>
        <CardTitle className="text-sm text-green-800 flex items-center gap-2">
          <Check className="h-4 w-4" />
          Catat Pengembalian & Selesaikan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Booking Summary */}
        <div className="p-3 bg-muted rounded-[10px] text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">No. Ref:</span>{' '}
            <span className="font-mono font-medium text-foreground">{booking.reference_no}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Jadwal Selesai:</span>{' '}
            <span className="font-medium text-foreground">{formatDateTime(booking.end_datetime)}</span>
          </p>
          {booking.status === 'paid' && (
            <p>
              <span className="text-muted-foreground">Total Dibayar:</span>{' '}
              <span className="font-medium text-green-600">{formatRupiah(totalPaid)}</span>
            </p>
          )}
        </div>

        {/* Actual Return Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            <Clock className="h-4 w-4 inline mr-1" />
            Waktu Pengembalian Aktual
          </Label>
          <Input
            type="datetime-local"
            value={actualEndDate}
            onChange={(e) => setActualEndDate(e.target.value)}
            max={booking.end_datetime.slice(0, 16)}
            className="rounded-[10px] border-border"
          />
          {isEarlyReturn && (
            <p className="text-xs text-amber-600">
              Pengembalian lebih cepat dari jadwal.
            </p>
          )}
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Kondisi Alat</Label>
          <Select value={condition} onValueChange={(v) => setCondition(v || 'good')}>
            <SelectTrigger className="rounded-[10px] border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[10px]">
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


        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
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
            className="rounded-[10px] border-border"
          />
        </div>

        {/* Photo */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Foto Kondisi</Label>
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
          className="w-full bg-green-600 hover:bg-green-700 rounded-[10px]"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Check className="mr-2 h-4 w-4" />
          Selesaikan Peminjaman
        </Button>
      </CardContent>
    </Card>
  )
}
