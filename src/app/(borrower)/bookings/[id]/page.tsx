import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { CancelBookingButton } from '../CancelBookingButton'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { ArrowLeft, Clock, Package, CreditCard, Receipt } from 'lucide-react'

export default async function BorrowerBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (supabase.from('bookings') as any)
    .select('*, booking_assets(assets(name, category, room_code)), payments(*)')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single() as { data: Record<string, any> | null }

  if (!booking) notFound()

  const bookingAssets = booking.booking_assets as Array<{ assets: { name: string; category: string; room_code: string | null } | null }>
  const payments = booking.payments as Array<{ id: string; method: string; amount: number; status: string; paid_at: string | null }> | null

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

  // Calculate price per item
  const itemCount = bookingAssets?.length || 1
  const bookingItemsWithPrice = bookingAssets?.map((ba, index) => ({
    ...ba,
    unitPrice: booking.total_amount / itemCount,
    itemTotal: booking.total_amount / itemCount
  })) || []

  const totalPaid = (payments || [])
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)
  const remainingAmount = booking.total_amount - totalPaid

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bookings" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Link>
        <h1 className="text-2xl font-bold">Detail Pengajuan</h1>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-muted-foreground text-sm">{booking.reference_no}</p>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Invoice & Price Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoice & Rincian Harga
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Duration */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Durasi:</span>{' '}
                {durationDays > 1 
                  ? `${durationDays} hari (${durationHours} jam)` 
                  : `${durationHours} jam`
                }
              </p>
            </div>
          </div>

          {/* Items with Prices */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Item yang Dipinjam</p>
            {bookingItemsWithPrice.map((item, i) => item.assets && (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{item.assets.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.assets.room_code && (
                      <Badge variant="outline" className="font-mono text-xs">{item.assets.room_code}</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {item.assets.category === 'room' ? 'Ruang' : 'Alat'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatRupiah(item.itemTotal)}</p>
                </div>
              </div>
            ))}
          </div>

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
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-medium">Sisa Pembayaran</span>
                  <span className="font-bold text-lg">{formatRupiah(remainingAmount)}</span>
                </div>
              </>
            )}
            
            {totalPaid === 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium">Total Tagihan</span>
                <span className="font-bold text-xl">{formatRupiah(booking.total_amount)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Booking Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Detail Peminjaman
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Tanggal Mulai</p>
              <p className="font-medium">{formatDateTime(booking.start_datetime)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Tanggal Selesai</p>
              <p className="font-medium">{formatDateTime(booking.end_datetime)}</p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-muted-foreground text-xs mb-1">Tujuan Penggunaan</p>
            <p>{booking.purpose}</p>
          </div>
          {booking.admin_notes && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Catatan Admin</p>
              <p className="text-red-800">{booking.admin_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {payments && payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Riwayat Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    p.status === 'paid' ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    <CreditCard className={`h-5 w-5 ${
                      p.status === 'paid' ? 'text-green-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">{formatRupiah(p.amount)}</p>
                    <p className="text-muted-foreground text-xs">{methodLabel[p.method] ?? p.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>
                    {p.status === 'paid' ? 'Lunas' : 'Pending'}
                  </Badge>
                  {p.paid_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(p.paid_at)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {booking.status === 'pending' && (
        <CancelBookingButton id={id} />
      )}
    </div>
  )
}
