import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { CancelBookingButton } from '../CancelBookingButton'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { ArrowLeft, Clock, Package, CreditCard, Receipt, Building2, Calendar, MapPin, User } from 'lucide-react'

interface BookingDetail {
  id: string
  reference_no: string
  status: string
  purpose: string
  start_datetime: string
  end_datetime: string
  total_amount: number
  snapshot_rate: Record<string, unknown>
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
      building_name?: string
    } | null
    equipment: { 
      id: string
      name: string 
      equipment_code: string | null
      merk: string | null
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

export default async function BorrowerBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div className="text-center py-8">Silakan login terlebih dahulu</div>
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (supabase.from('bookings') as any)
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
        rooms(id, name, room_code, capacity, buildings(name)),
        equipment(id, name, equipment_code, merk)
      ),
      payments(id, method, amount, status, paid_at, created_at)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single() as { data: BookingDetail | null }

  if (!booking) notFound()

  const methodLabel: Record<string, string> = {
    manual_cash: 'Tunai',
    manual_transfer: 'Transfer Manual',
    online: 'Online',
  }

  // Calculate duration
  const startDate = new Date(booking.start_datetime)
  const endDate = new Date(booking.end_datetime)
  const durationMs = endDate.getTime() - startDate.getTime()
  const durationHours = Math.ceil(durationMs / (1000 * 60 * 60))
  const durationDays = Math.ceil(durationHours / 24)

  const totalPaid = (booking.payments || [])
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)
  const remainingAmount = booking.total_amount - totalPaid

  // Process booking items with proper typing
  const bookingItems = booking.booking_items.map(item => {
    if (item.item_type === 'room' && item.rooms) {
      return {
        type: 'room' as const,
        name: item.rooms.name,
        code: item.rooms.room_code,
        details: item.rooms.capacity ? `Kapasitas: ${item.rooms.capacity} orang` : null,
      }
    }
    if (item.item_type === 'equipment' && item.equipment) {
      return {
        type: 'equipment' as const,
        name: item.equipment.name,
        code: item.equipment.equipment_code,
        details: item.equipment.merk || null,
      }
    }
    return null
  }).filter(Boolean)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/bookings" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Link>
      </div>

      {/* Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground mb-1">{booking.reference_no}</p>
          <h1 className="text-2xl font-bold">Detail Pengajuan</h1>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Invoice & Price Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoice & Rincian Harga
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Duration */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Durasi Peminjaman:</span>{' '}
                {durationDays > 1 
                  ? `${durationDays} hari (${durationHours} jam)` 
                  : `${durationHours} jam`
                }
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                {formatDateTime(booking.start_datetime)} - {formatDateTime(booking.end_datetime)}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Item yang Dipinjam</p>
            <div className="space-y-2">
              {bookingItems.map((item, i) => item && (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${item.type === 'room' ? 'bg-indigo-100' : 'bg-amber-100'}`}>
                      {item.type === 'room' ? (
                        <Building2 className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Package className="h-4 w-4 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.code && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {item.code}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {item.type === 'room' ? 'Ruang' : 'Alat'}
                        </Badge>
                      </div>
                      {item.details && (
                        <p className="text-xs text-muted-foreground mt-1">{item.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          <div className="border-t pt-4 space-y-2">
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
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="font-medium">Sisa Pembayaran</span>
                  <span className="font-bold text-lg text-amber-600">{formatRupiah(remainingAmount)}</span>
                </div>
              </>
            )}
            
            {totalPaid === 0 && booking.total_amount > 0 && (
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="font-medium">Total Tagihan</span>
                <span className="font-bold text-xl text-green-600">{formatRupiah(booking.total_amount)}</span>
              </div>
            )}

            {booking.total_amount === 0 && (
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="font-medium">Total</span>
                <span className="font-bold text-xl text-green-600">Gratis</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Booking Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Detail Peminjaman
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Tanggal Mulai</p>
              </div>
              <p className="font-medium">{formatDateTime(booking.start_datetime)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Tanggal Selesai</p>
              </div>
              <p className="font-medium">{formatDateTime(booking.end_datetime)}</p>
            </div>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-slate-400" />
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
        </CardContent>
      </Card>

      {/* Payment History */}
      {booking.payments && booking.payments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Riwayat Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {booking.payments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    payment.status === 'paid' ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    <CreditCard className={`h-6 w-6 ${
                      payment.status === 'paid' ? 'text-green-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold">{formatRupiah(payment.amount)}</p>
                    <p className="text-sm text-muted-foreground">{methodLabel[payment.method] ?? payment.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                    {payment.status === 'paid' ? 'Lunas' : 'Pending'}
                  </Badge>
                  {payment.paid_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(payment.paid_at)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cancel Button */}
      {booking.status === 'pending' && (
        <div className="pt-2">
          <CancelBookingButton id={id} />
        </div>
      )}
    </div>
  )
}
