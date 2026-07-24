import { createAdminDbClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CompleteReturnForm } from './CompleteReturnForm'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, CreditCard, User, Package } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

interface ReturnBooking {
  id: string
  reference_no: string
  status: string
  start_datetime: string
  end_datetime: string
  actual_end_datetime: string | undefined
  total_amount: number
  users: { name: string; email: string; phone: string | null; institution: string } | null
  booking_items: Array<{
    id: string
    item_type: string
    room_id: string | null
    equipment_id: string | null
    quantity: number
    room: { name: string; buildings?: { name: string } } | null
    equipment: { name: string; equipment_code: string } | null
  }> | null
  payments: Array<{ amount: number; status: string }> | null
}

export default async function RecordReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = createAdminDbClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookingRaw } = await (sb.from('bookings') as any)
    .select(`
      *,
      users!user_id(name, email, phone, institution),
      booking_items(
        id, item_type, quantity,
        room:rooms(id, name, room_code),
        equipment:equipment_id(id, name, equipment_code)
      ),
      payments(id, amount, status, method, paid_at)
    `)
    .eq('id', id)
    .single() as { data: ReturnBooking | null }

  const booking = bookingRaw
  if (!booking) notFound()

  // Check if already returned — cek kedua tabel (normal return & early return)
  const [{ data: existingReturn }, { data: existingEarlyReturn }] = await Promise.all([
    sb.from('returns').select('id').eq('booking_id', id).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any).from('booking_early_returns').select('id').eq('booking_id', id).maybeSingle(),
  ])

  if (existingReturn || existingEarlyReturn) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <div className="bg-green-50 border border-green-200 rounded-[14px] p-8">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-green-800 mb-2">Peminjaman Sudah Selesai</h2>
          <p className="text-green-600 mb-4">Pengembalian untuk booking ini sudah dicatat.</p>
          <Link href="/admin/returns" className={buttonVariants({ variant: 'outline' })}>
            Kembali ke Daftar Pengembalian
          </Link>
        </div>
      </div>
    )
  }

  const isPaid = booking.status === 'paid'

  // Hitung total dari tabel payments (tunai/refund)
  const paymentsTotal = (booking.payments || [])
    .filter((p) => p.status === 'paid')
    .reduce((sum: number, p) => sum + p.amount, 0)

  // Hitung total dari payment_proofs yang sudah diverifikasi (transfer bukti)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: verifiedProofs } = await (sb as any)
    .from('payment_proofs')
    .select('transfer_amount')
    .eq('booking_id', id)
    .eq('status', 'verified')

  const proofsTotal = (verifiedProofs || [])
    .reduce((sum: number, p: { transfer_amount: number }) => sum + Number(p.transfer_amount), 0)

  const totalPaid = paymentsTotal + proofsTotal

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/returns"
          className="inline-flex items-center justify-center h-10 w-10 rounded-[10px] border hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proses Pengembalian</h1>
          <p className="font-mono text-muted-foreground">{booking.reference_no}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Booking Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Borrower Info */}
          <Card className="rounded-[14px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                <User className="h-4 w-4" />
                Data Peminjam
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nama</p>
                <p className="font-medium text-foreground">{booking.users?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Instansi</p>
                <p className="font-medium text-foreground">{booking.users?.institution || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telepon</p>
                <p className="font-medium text-foreground">{booking.users?.phone || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Info */}
          <Card className="rounded-[14px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4" />
                Jadwal Peminjaman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Mulai</p>
                <p className="font-medium text-foreground">{formatDateTime(booking.start_datetime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selesai (Rencana)</p>
                <p className="font-medium text-foreground">{formatDateTime(booking.end_datetime)}</p>
              </div>
              {booking.actual_end_datetime && (
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground">Selesai (Aktual)</p>
                  <p className="font-medium text-green-600">
                    {formatDateTime(booking.actual_end_datetime)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card className="rounded-[14px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                <CreditCard className="h-4 w-4" />
                Informasi Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={isPaid ? 'default' : 'secondary'}>
                  {isPaid ? 'Lunas' : 'Menunggu Pembayaran'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Tagihan</span>
                <span className="font-medium text-foreground">{formatRupiah(booking.total_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sudah Dibayar</span>
                <span className="font-medium text-green-600">{formatRupiah(totalPaid)}</span>
              </div>
              {totalPaid < booking.total_amount && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sisa</span>
                    <span className="font-bold text-amber-600">
                      {formatRupiah(booking.total_amount - totalPaid)}
                    </span>
                  </div>
                  <Link 
                    href={`/admin/payments?booking=${id}`}
                    className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-full mt-2' })}
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Catat Pembayaran
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Items & Return Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card className="rounded-[14px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                <Package className="h-4 w-4" />
                Item yang Dipinjam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(booking.booking_items || []).map((item, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-[10px]">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {item.item_type === 'room' 
                            ? item.room?.name 
                            : item.equipment?.name
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.item_type === 'room' 
                            ? `Ruang - ${item.room?.buildings?.name}`
                            : `Alat - Kode: ${item.equipment?.equipment_code || '-'}`
                          }
                        </p>
                      </div>
                    </div>
                    <Badge variant={item.item_type === 'room' ? 'default' : 'secondary'}>
                      {item.item_type === 'room' ? 'Ruang' : 'Alat'} × {item.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Complete Return Form */}
          <CompleteReturnForm
            bookingId={id}
            booking={{
              reference_no: booking.reference_no,
              start_datetime: booking.start_datetime,
              end_datetime: booking.end_datetime,
              total_amount: booking.total_amount,
              status: booking.status,
              actual_end_datetime: booking.actual_end_datetime,
            }}
            totalPaid={totalPaid}
          />
        </div>
      </div>
    </div>
  )
}

// Import CheckCircle for the already returned state
import { CheckCircle } from 'lucide-react'
