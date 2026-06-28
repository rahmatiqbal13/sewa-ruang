import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { CancelBookingButton } from '../CancelBookingButton'
import { formatDateTime, formatRupiah, cn } from '@/lib/utils'
import {
  ArrowLeft, Clock, Package, CreditCard, Receipt, Building2, Calendar,
  User, Upload, CheckCircle, MapPin, ClipboardList, ChevronRight
} from 'lucide-react'
import { SafeImage } from '@/components/shared/SafeImage'

interface BookingDetail {
  id: string
  reference_no: string
  status: string
  purpose: string
  start_datetime: string
  end_datetime: string
  total_amount: number
  snapshot_rate: Record<string, string | number | boolean | null>
  admin_notes: string | null
  created_at: string
  booking_items: Array<{
    item_type: 'room' | 'equipment'
    quantity: number
    rooms: {
      id: string
      name: string
      room_code: string | null
      capacity: number | null
      photo_url: string | null
    } | null
    equipment: {
      id: string
      name: string
      equipment_code: string | null
      merk: string | null
      photo_url: string | null
    } | null
  }>
  payments: Array<{
    id: string
    method: string
    amount: number
    status: string
    paid_at: string | null
    created_at: string
  }>
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function BorrowerBookingDetailPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div className="text-center py-8">Silakan login terlebih dahulu</div>
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  let booking: BookingDetail | null = null

  // Try fetch by reference_no (case-insensitive) first, then fallback to id
  const { data: byRef } = await sb
    .from('bookings')
    .select(`
      id,
      reference_no,
      status,
      purpose,
      start_datetime,
      end_datetime,
      total_amount,
      snapshot_rate,
      admin_notes,
      created_at,
      booking_items(
        item_type,
        quantity,
        rooms:room_id(id, name, room_code, capacity, photo_url),
        equipment:equipment_id(id, name, equipment_code, merk, photo_url)
      ),
      payments(id, method, amount, status, paid_at, created_at)
    `)
    .ilike('reference_no', ref)
    .eq('user_id', user.id)
    .maybeSingle() as { data: BookingDetail | null }

  if (byRef) {
    booking = byRef
    // If user accessed via UUID but we found by ref, redirect to slug
    if (UUID_REGEX.test(ref) && byRef.reference_no !== ref) {
      redirect(`/bookings/${byRef.reference_no}`)
    }
  } else if (UUID_REGEX.test(ref)) {
    // Fallback: legacy UUID direct lookup
    const { data: byId } = await sb
      .from('bookings')
      .select(`
        id,
        reference_no,
        status,
        purpose,
        start_datetime,
        end_datetime,
        total_amount,
        snapshot_rate,
        admin_notes,
        created_at,
        booking_items(
          item_type,
          quantity,
          rooms:room_id(id, name, room_code, capacity, photo_url),
          equipment:equipment_id(id, name, equipment_code, merk, photo_url)
        ),
        payments(id, method, amount, status, paid_at, created_at)
      `)
      .eq('id', ref)
      .eq('user_id', user.id)
      .single() as { data: BookingDetail | null }

    if (!byId) notFound()
    redirect(`/bookings/${byId.reference_no}`)
  }

  if (!booking) notFound()

  const methodLabel: Record<string, string> = {
    manual_cash: 'Tunai',
    manual_transfer: 'Transfer Manual',
    online: 'Online',
  }

  const startDate = new Date(booking.start_datetime)
  const endDate = new Date(booking.end_datetime)
  const durationMs = endDate.getTime() - startDate.getTime()
  const durationHours = Math.ceil(durationMs / (1000 * 60 * 60))
  const durationDays = Math.ceil(durationHours / 24)

  const totalPaid = (booking.payments || [])
    .filter((p: { status: string }) => p.status === 'paid')
    .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
  const remainingAmount = booking.total_amount - totalPaid

  const bookingItems = booking.booking_items.map(item => {
    if (item.item_type === 'room' && item.rooms) {
      return {
        type: 'room' as const,
        name: item.rooms.name,
        code: item.rooms.room_code,
        details: item.rooms.capacity ? `${item.rooms.capacity} orang` : null,
        photo_url: item.rooms.photo_url,
      }
    }
    if (item.item_type === 'equipment' && item.equipment) {
      return {
        type: 'equipment' as const,
        name: item.equipment.name,
        code: item.equipment.equipment_code,
        details: item.equipment.merk || null,
        photo_url: item.equipment.photo_url,
      }
    }
    return null
  }).filter(Boolean)

  // Status tracker steps
  const statusSteps = [
    { key: 'created', label: 'Dibuat', statusList: ['pending', 'approved', 'payment_uploaded', 'paid', 'active', 'completed', 'rejected', 'cancelled'] },
    { key: 'approved', label: 'Disetujui', statusList: ['approved', 'payment_uploaded', 'paid', 'active', 'completed'] },
    { key: 'paid', label: 'Dibayar', statusList: ['paid', 'active', 'completed'] },
    { key: 'completed', label: 'Selesai', statusList: ['completed'] },
  ]

  const isRejected = booking.status === 'rejected'
  const isCancelled = booking.status === 'cancelled'

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28 lg:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/bookings" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Link>
      </div>

      {/* Title + Status */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">Detail Pengajuan</h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="font-mono text-sm text-muted-foreground">{booking.reference_no}</p>
        </div>
      </div>

      {/* Status Tracker */}
      {!isRejected && !isCancelled && (
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
          {statusSteps.map((step, idx) => {
            const isActive = step.statusList.includes(booking.status)
            const isPast = statusSteps.slice(0, idx).some(s => s.statusList.includes(booking.status))
            const isCurrent = isActive && !isPast

            return (
              <div key={step.key} className="flex items-center gap-1 sm:gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : isActive
                          ? 'bg-green-600 text-white'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isActive ? (
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs sm:text-sm whitespace-nowrap',
                      isCurrent ? 'font-medium text-foreground' : isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < statusSteps.length - 1 && (
                  <ChevronRight className={cn('w-4 h-4 shrink-0 hidden sm:block', isActive ? 'text-green-600' : 'text-muted-foreground')} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {isRejected && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <User className="h-5 w-5 shrink-0" />
          <span className="font-medium">Pengajuan ditolak oleh admin</span>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
          <ClipboardList className="h-5 w-5 shrink-0" />
          <span className="font-medium">Pengajuan dibatalkan</span>
        </div>
      )}

      {/* Invoice & Items */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Invoice & Rincian</h2>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-3 p-4 bg-blue-50/60 border border-blue-100 rounded-lg">
          <div className="bg-blue-100 p-2 rounded-lg shrink-0">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm">
              <span className="font-semibold">Durasi Peminjaman:</span>{' '}
              {durationDays > 1 ? `${durationDays} hari (${durationHours} jam)` : `${durationHours} jam`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDateTime(booking.start_datetime)} — {formatDateTime(booking.end_datetime)}
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {bookingItems.map((item, i) => item && (
            <div
              key={i}
              className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
            >
              <SafeImage
                src={item.photo_url}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-contain bg-muted shrink-0"
                fallbackClassName="w-12 h-12 rounded-lg shrink-0"
                fallback={
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                    item.type === 'room' ? 'bg-blue-50' : 'bg-amber-50'
                  )}>
                    {item.type === 'room' ? (
                      <Building2 className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Package className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                }
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{item.name}</span>
                  {item.code && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {item.code}
                    </Badge>
                  )}
                  <Badge className={cn('text-[10px]', item.type === 'room' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                    {item.type === 'room' ? 'Ruang' : 'Alat'}
                  </Badge>
                </div>
                {item.details && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Price Summary */}
        <div className="border rounded-lg p-4 space-y-2 bg-card">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatRupiah(booking.total_amount)}</span>
          </div>

          {totalPaid > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">Total Dibayar</span>
                <span className="font-medium text-green-600">-{formatRupiah(totalPaid)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium">Sisa Pembayaran</span>
                <span className="font-bold text-lg text-amber-600">{formatRupiah(remainingAmount)}</span>
              </div>
            </>
          )}

          {totalPaid === 0 && booking.total_amount > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Tagihan</span>
                <span className="font-bold text-xl text-green-600">{formatRupiah(booking.total_amount)}</span>
              </div>
            </>
          )}

          {booking.total_amount === 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold text-xl text-green-600">Gratis</span>
              </div>
            </>
          )}
        </div>
      </section>

      <Separator />

      {/* Booking Details Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Detail Peminjaman</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Tanggal Mulai</p>
            </div>
            <p className="font-medium text-sm">{formatDateTime(booking.start_datetime)}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Tanggal Selesai</p>
            </div>
            <p className="font-medium text-sm">{formatDateTime(booking.end_datetime)}</p>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tujuan Penggunaan</p>
          </div>
          <p className="text-sm leading-relaxed">{booking.purpose}</p>
        </div>

        {booking.admin_notes && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-red-500" />
              <p className="text-xs text-red-600 uppercase tracking-wide font-medium">Catatan Admin</p>
            </div>
            <p className="text-red-800 text-sm">{booking.admin_notes}</p>
          </div>
        )}
      </section>

      <Separator />

      {/* Payment History */}
      {booking.payments && booking.payments.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold">Riwayat Pembayaran</h2>
          </div>

          <div className="space-y-3">
            {booking.payments.map(payment => (
              <div
                key={payment.id}
                className={cn(
                  'flex items-center gap-3 p-4 border rounded-lg',
                  payment.status === 'paid' ? 'bg-green-50/40 border-green-100' : 'bg-amber-50/40 border-amber-100'
                )}
              >
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                  payment.status === 'paid' ? 'bg-green-100' : 'bg-amber-100'
                )}>
                  <CreditCard className={cn('h-5 w-5', payment.status === 'paid' ? 'text-green-600' : 'text-amber-600')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{formatRupiah(payment.amount)}</span>
                    <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'} className="text-[10px]">
                      {payment.status === 'paid' ? 'Lunas' : 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {methodLabel[payment.method] ?? payment.method}
                    {payment.paid_at && ` · ${formatDateTime(payment.paid_at)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sticky Mobile Actions */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 safe-area-pb">
        <div className="space-y-3">
          {/* Payment Action */}
          {booking.total_amount > 0 && ['approved', 'pending_payment', 'payment_rejected'].includes(booking.status) && (
            <Link
              href={`/booking/${booking.id}/payment`}
              className={buttonVariants({ size: 'lg', className: 'w-full h-12 text-base' })}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              {booking.status === 'payment_rejected' ? 'Upload Ulang Bukti Pembayaran' : 'Bayar Sekarang'}
            </Link>
          )}

          {/* Info gratis */}
          {booking.total_amount === 0 && booking.status === 'pending' && (
            <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Peminjaman Gratis — Menunggu Persetujuan</span>
            </div>
          )}

          {/* Payment uploaded */}
          {booking.status === 'payment_uploaded' && (
            <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <Upload className="h-5 w-5" />
              <span className="font-medium">Bukti pembayaran sedang diverifikasi</span>
            </div>
          )}

          {/* Cancel */}
          {booking.status === 'pending' && (
            <CancelBookingButton id={booking.id} variant="outline" className="w-full" />
          )}
        </div>
      </div>

      {/* Desktop Actions */}
      <div className="hidden lg:block space-y-3">
        {booking.total_amount > 0 && ['approved', 'pending_payment', 'payment_rejected'].includes(booking.status) && (
          <Link
            href={`/booking/${booking.id}/payment`}
            className={buttonVariants({ size: 'lg', className: 'w-full h-12 text-base' })}
          >
            <CreditCard className="mr-2 h-5 w-5" />
            {booking.status === 'payment_rejected' ? 'Upload Ulang Bukti Pembayaran' : 'Bayar Sekarang'}
          </Link>
        )}

        {booking.total_amount === 0 && booking.status === 'pending' && (
          <div className="flex items-center justify-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Peminjaman Gratis — Menunggu Persetujuan Admin</span>
          </div>
        )}

        {booking.status === 'payment_uploaded' && (
          <div className="flex items-center justify-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <Upload className="h-5 w-5" />
            <span className="font-medium">Bukti pembayaran sedang diverifikasi admin</span>
          </div>
        )}

        {booking.status === 'pending' && (
          <CancelBookingButton id={booking.id} variant="outline" className="w-full" />
        )}
      </div>
    </div>
  )
}
