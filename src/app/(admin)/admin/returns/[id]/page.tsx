import { createAdminClient as createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CompleteReturnForm } from './CompleteReturnForm'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, CreditCard, User, Package } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default async function RecordReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (supabase.from('bookings') as any)
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
    .single() as { data: Record<string, any> | null }

  if (!booking) notFound()

  // Check if already returned
  const { data: existingReturn } = await supabase
    .from('returns')
    .select('id')
    .eq('booking_id', id)
    .single()

  if (existingReturn) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8">
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

  const totalPaid = (booking.payments || [])
    .filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => sum + p.amount, 0)

  const isPaid = booking.status === 'paid'
  const isApproved = booking.status === 'approved'
  
  // Calculate if early return is possible
  const now = new Date()
  const endDate = new Date(booking.end_datetime)
  const canEarlyReturn = isPaid && now < endDate

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/returns"
          className="inline-flex items-center justify-center h-10 w-10 rounded-lg border hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Proses Pengembalian</h1>
          <p className="font-mono text-muted-foreground">{booking.reference_no}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Booking Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Borrower Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Data Peminjam
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">Nama</p>
                <p className="font-medium">{booking.users?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Instansi</p>
                <p className="font-medium">{booking.users?.institution || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Telepon</p>
                <p className="font-medium">{booking.users?.phone || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Jadwal Peminjaman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">Mulai</p>
                <p className="font-medium">{formatDateTime(booking.start_datetime)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Selesai (Rencana)</p>
                <p className="font-medium">{formatDateTime(booking.end_datetime)}</p>
              </div>
              {booking.actual_end_datetime && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-slate-500">Selesai (Aktual)</p>
                  <p className="font-medium text-green-600">
                    {formatDateTime(booking.actual_end_datetime)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Informasi Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <Badge variant={isPaid ? 'default' : 'secondary'}>
                  {isPaid ? 'Lunas' : 'Menunggu Pembayaran'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total Tagihan</span>
                <span className="font-medium">{formatRupiah(booking.total_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Sudah Dibayar</span>
                <span className="font-medium text-green-600">{formatRupiah(totalPaid)}</span>
              </div>
              {totalPaid < booking.total_amount && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Sisa</span>
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Item yang Dipinjam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(booking.booking_items || []).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">
                          {item.item_type === 'room' 
                            ? item.room?.name 
                            : item.equipment?.name
                          }
                        </p>
                        <p className="text-xs text-slate-500">
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
