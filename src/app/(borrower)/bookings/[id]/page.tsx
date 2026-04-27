import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { CancelBookingButton } from '../CancelBookingButton'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

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

      <Card>
        <CardHeader><CardTitle className="text-sm">Aset yang Dipinjam</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {bookingAssets?.map((ba, i) => ba.assets && (
            <div key={i} className="flex items-center justify-between text-sm border rounded p-2">
              <span className="font-medium">{ba.assets.name}</span>
              <div className="flex items-center gap-2">
                {ba.assets.room_code && (
                  <Badge variant="outline" className="font-mono text-xs">{ba.assets.room_code}</Badge>
                )}
                <Badge variant="secondary">{ba.assets.category === 'room' ? 'Ruang' : 'Alat'}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Detail Peminjaman</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground">Mulai</p>
              <p className="font-medium">{formatDateTime(booking.start_datetime)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Selesai</p>
              <p className="font-medium">{formatDateTime(booking.end_datetime)}</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Total Tagihan</p>
            <p className="font-bold text-lg">{formatRupiah(booking.total_amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tujuan Penggunaan</p>
            <p>{booking.purpose}</p>
          </div>
          {booking.admin_notes && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Catatan Admin</p>
              <p className="text-red-800 text-sm">{booking.admin_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {payments && payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Riwayat Pembayaran</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <p className="font-medium">{formatRupiah(p.amount)}</p>
                  <p className="text-muted-foreground">{methodLabel[p.method] ?? p.method}</p>
                </div>
                <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>
                  {p.status === 'paid' ? 'Lunas' : 'Pending'}
                </Badge>
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
