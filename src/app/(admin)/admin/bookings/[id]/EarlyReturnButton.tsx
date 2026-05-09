'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Clock, ArrowLeft, CheckCircle } from 'lucide-react'
import { formatRupiah, formatDateTime } from '@/lib/utils'

interface EarlyReturnButtonProps {
  bookingId: string
  booking: {
    id: string
    reference_no: string
    start_datetime: string
    end_datetime: string
    total_amount: number
    status: string
  }
  items: Array<{
    id: string
    item_type: string
    quantity: number
    room?: { name: string; room_code?: string }
    equipment?: { name: string; equipment_code?: string }
  }>
  totalPaid: number
}

export function EarlyReturnButton({ bookingId, booking, items, totalPaid }: EarlyReturnButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [actualEndDate, setActualEndDate] = useState(new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')
  const [refundAmount, setRefundAmount] = useState(0)

  // Calculate unused time and potential refund
  const calculateRefund = (actualEnd: string) => {
    const plannedEnd = new Date(booking.end_datetime)
    const actualEndDateTime = new Date(actualEnd)
    const start = new Date(booking.start_datetime)
    
    if (actualEndDateTime >= plannedEnd) {
      setRefundAmount(0)
      return
    }

    // Calculate total planned duration in hours
    const plannedDuration = (plannedEnd.getTime() - start.getTime()) / (1000 * 60 * 60)
    
    // Calculate actual used duration in hours
    const actualDuration = (actualEndDateTime.getTime() - start.getTime()) / (1000 * 60 * 60)
    
    if (actualDuration <= 0 || plannedDuration <= 0) {
      setRefundAmount(0)
      return
    }

    // Calculate refund proportion
    const unusedRatio = (plannedDuration - actualDuration) / plannedDuration
    const calculatedRefund = Math.floor(booking.total_amount * unusedRatio)
    
    // Cap refund at total paid amount
    setRefundAmount(Math.min(calculatedRefund, totalPaid))
  }

  const handleDateChange = (value: string) => {
    setActualEndDate(value)
    calculateRefund(value)
  }

  const handleSubmit = async () => {
    if (!actualEndDate) {
      toast.error('Tanggal pengembalian wajib diisi')
      return
    }

    const actualEnd = new Date(actualEndDate)
    const plannedEnd = new Date(booking.end_datetime)
    
    if (actualEnd >= plannedEnd) {
      toast.error('Tanggal pengembalian harus lebih cepat dari jadwal')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Create early return record
      const { error: returnError } = await supabase
        .from('booking_early_returns')
        .insert({
          booking_id: bookingId,
          planned_end_datetime: booking.end_datetime,
          actual_end_datetime: actualEndDate,
          refund_amount: refundAmount,
          notes: notes || null,
          status: refundAmount > 0 ? 'refund_pending' : 'completed',
        })

      if (returnError) throw returnError

      // Update booking status to completed
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          actual_end_datetime: actualEndDate,
          admin_notes: notes ? `Pengembalian lebih cepat: ${notes}` : 'Pengembalian lebih cepat dari peminjam'
        })
        .eq('id', bookingId)

      if (bookingError) throw bookingError

      // If there's a refund, create refund record
      if (refundAmount > 0) {
        const { error: refundError } = await supabase
          .from('payments')
          .insert({
            booking_id: bookingId,
            amount: -refundAmount,
            method: 'refund',
            status: 'pending',
            notes: `Refund pengembalian lebih cepat - ${notes || 'Tidak ada catatan'}`,
          })

        if (refundError) throw refundError
      }

      toast.success('Pengembalian lebih cepat berhasil dicatat')
      if (refundAmount > 0) {
        toast.info(`Refund sebesar ${formatRupiah(refundAmount)} perlu diproses`)
      }
      
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error('Gagal mencatat pengembalian: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Only show for paid/completed bookings that haven't ended yet
  const now = new Date()
  const plannedEnd = new Date(booking.end_datetime)
  
  if (booking.status !== 'paid' && booking.status !== 'completed') {
    return null
  }

  if (now >= plannedEnd) {
    return null
  }

  const hoursRemaining = Math.ceil((plannedEnd.getTime() - now.getTime()) / (1000 * 60 * 60))

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setOpen(true)}
        className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50"
      >
        <Clock className="h-4 w-4" />
        Pengembalian Lebih Cepat
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5 text-amber-600" />
              Pengembalian Lebih Cepat
            </DialogTitle>
            <DialogDescription>
              Catat pengembalian alat/ruangan sebelum jadwal selesai
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Booking Info */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <p className="text-sm">
                <span className="text-slate-500">No. Ref:</span>{' '}
                <span className="font-mono font-medium">{booking.reference_no}</span>
              </p>
              <p className="text-sm">
                <span className="text-slate-500">Jadwal Selesai:</span>{' '}
                <span className="font-medium">{formatDateTime(booking.end_datetime)}</span>
              </p>
              <p className="text-sm">
                <span className="text-slate-500">Sisa Waktu:</span>{' '}
                <span className="font-medium text-amber-600">
                  {hoursRemaining > 24 
                    ? `${Math.ceil(hoursRemaining / 24)} hari` 
                    : `${hoursRemaining} jam`
                  }
                </span>
              </p>
            </div>

            {/* Items List */}
            <div>
              <Label className="text-sm text-slate-500 mb-2 block">Item yang Dipinjam</Label>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border rounded text-sm">
                    <span>
                      {item.item_type === 'room' 
                        ? item.room?.name 
                        : item.equipment?.name
                      }
                    </span>
                    <span className="text-slate-500">× {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actual Return Date */}
            <div>
              <Label htmlFor="actual-end-date" className="text-sm font-medium">
                Tanggal & Waktu Pengembalian Aktual <span className="text-red-500">*</span>
              </Label>
              <Input
                id="actual-end-date"
                type="datetime-local"
                value={actualEndDate}
                onChange={(e) => handleDateChange(e.target.value)}
                max={booking.end_datetime.slice(0, 16)}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Waktu sekarang: {formatDateTime(new Date().toISOString())}
              </p>
            </div>

            {/* Refund Calculation */}
            {refundAmount > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Perhitungan Refund</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Tagihan:</span>
                    <span className="font-medium">{formatRupiah(booking.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sudah Dibayar:</span>
                    <span className="font-medium">{formatRupiah(totalPaid)}</span>
                  </div>
                  <div className="border-t pt-1 mt-1">
                    <div className="flex justify-between text-green-700">
                      <span className="font-semibold">Refund Dihitung:</span>
                      <span className="font-bold">{formatRupiah(refundAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {refundAmount === 0 && actualEndDate && (
              <div className="p-3 bg-slate-100 rounded-lg text-sm text-slate-600">
                Tidak ada refund yang dihitung untuk waktu pengembalian ini.
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Catatan
              </Label>
              <Textarea
                id="notes"
                placeholder="Alasan pengembalian lebih cepat, kondisi barang, dll..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !actualEndDate || refundAmount < 0}
                className="flex-1 gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle className="h-4 w-4" />
                Konfirmasi Pengembalian
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
