import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { ApprovalButtons } from './ApprovalButtons'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { RecordPaymentButton } from '../../payments/RecordPaymentButton'

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (supabase.from('bookings') as any)
    .select(`
      *,
      users(name, email, phone, institution, class_division),
      booking_assets(assets(id, name, category, room_code, rate_per_hour, rate_per_day)),
      payments(*)
    `)
    .eq('id', id)
    .single() as { data: Record<string, any> | null }

  if (!booking) notFound()

  const borrower = booking.users as {name:string;email:string;phone:string|null;institution:string;class_division:string} | null
  const bookingAssets = (booking.booking_assets as Array<{assets:{id:string;name:string;category:string;room_code:string|null;rate_per_hour:number|null}|null}>)
  const payments = booking.payments as Array<{id:string;method:string;amount:number;status:string;paid_at:string|null}> | null

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Detail Pengajuan</h1>
          <p className="font-mono text-muted-foreground">{booking.reference_no}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Data Peminjam</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Nama:</span> <strong>{borrower?.name}</strong></p>
            <p><span className="text-muted-foreground">Email:</span> {borrower?.email}</p>
            <p><span className="text-muted-foreground">WhatsApp:</span> {borrower?.phone ?? '-'}</p>
            <p><span className="text-muted-foreground">Instansi:</span> {borrower?.institution}</p>
            <p><span className="text-muted-foreground">Kelas/Divisi:</span> {borrower?.class_division}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Detail Peminjaman</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Mulai:</span> {formatDateTime(booking.start_datetime)}</p>
            <p><span className="text-muted-foreground">Selesai:</span> {formatDateTime(booking.end_datetime)}</p>
            <p><span className="text-muted-foreground">Total Tagihan:</span> <strong>{formatRupiah(booking.total_amount)}</strong></p>
            <p><span className="text-muted-foreground">Tujuan:</span> {booking.purpose}</p>
            {booking.admin_notes && (
              <p><span className="text-muted-foreground">Catatan Admin:</span> {booking.admin_notes}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Aset yang Dipinjam</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bookingAssets?.map((ba, i) => ba.assets && (
              <div key={i} className="flex items-center justify-between text-sm border rounded p-2">
                <div>
                  <span className="font-medium">{ba.assets.name}</span>
                  {ba.assets.room_code && (
                    <Badge variant="outline" className="ml-2 font-mono text-xs">{ba.assets.room_code}</Badge>
                  )}
                </div>
                <Badge variant="secondary">{ba.assets.category === 'room' ? 'Ruang' : 'Alat'}</Badge>
              </div>
            ))}
          </div>
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
                  <p className="text-muted-foreground capitalize">{p.method.replace('_', ' ')}</p>
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
        <ApprovalButtons bookingId={id} />
      )}

      {booking.status === 'approved' && (
        <RecordPaymentButton bookingId={id} totalAmount={booking.total_amount} />
      )}
    </div>
  )
}
