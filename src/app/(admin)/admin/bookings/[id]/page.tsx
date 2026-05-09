import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { ApprovalButtons } from './ApprovalButtons'
import { RecordPaymentButton } from '../../payments/RecordPaymentButton'
import { SendMessageButton } from './SendMessageButton'
import { EarlyReturnButton } from './EarlyReturnButton'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { 
  ArrowLeft, User, Mail, Phone, Building2, 
  Calendar, Package, CreditCard, FileText, Receipt, Clock
} from 'lucide-react'

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch booking with user data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (supabase.from('bookings') as any)
    .select(`
      id, reference_no, status, start_datetime, end_datetime,
      total_amount, purpose, created_at, admin_notes,
      users(id, name, email, phone, institution, class_division, role)
    `)
    .eq('id', id)
    .single()

  if (!booking) notFound()

  // Fetch booking items separately
  const { data: bookingItemsData } = await (supabase.from('booking_items') as any)
    .select(`
      id, item_type, quantity, room_id, equipment_id
    `)
    .eq('booking_id', id)

  // Fetch rooms data for items
  const roomIds = (bookingItemsData || [])
    .filter((item: any) => item.room_id)
    .map((item: any) => item.room_id)
  
  let roomsData: any[] = []
  if (roomIds.length > 0) {
    const { data: rooms } = await (supabase.from('rooms') as any)
      .select('id, name, room_code, building_id, buildings(name)')
      .in('id', roomIds)
    roomsData = rooms || []
  }

  // Fetch equipment data for items
  const equipmentIds = (bookingItemsData || [])
    .filter((item: any) => item.equipment_id)
    .map((item: any) => item.equipment_id)
  
  let equipmentData: any[] = []
  if (equipmentIds.length > 0) {
    const { data: equipment } = await (supabase.from('equipment') as any)
      .select('id, name, equipment_code')
      .in('id', equipmentIds)
    equipmentData = equipment || []
  }

  // Merge items with room/equipment data
  const bookingItems = (bookingItemsData || []).map((item: any) => {
    if (item.item_type === 'room' && item.room_id) {
      return {
        ...item,
        room: roomsData.find((r: any) => r.id === item.room_id)
      }
    } else if (item.item_type === 'equipment' && item.equipment_id) {
      return {
        ...item,
        equipment: equipmentData.find((e: any) => e.id === item.equipment_id)
      }
    }
    return item
  })

  // Fetch payments
  const { data: payments } = await (supabase.from('payments') as any)
    .select('id, method, amount, status, paid_at, proof_url')
    .eq('booking_id', id)
    .order('created_at', { ascending: false })

  const borrower = booking.users
  
  // Calculate duration
  const startDate = new Date(booking.start_datetime)
  const endDate = new Date(booking.end_datetime)
  const durationMs = endDate.getTime() - startDate.getTime()
  const durationHours = Math.ceil(durationMs / (1000 * 60 * 60))
  const durationDays = Math.ceil(durationHours / 24)
  
  // Calculate price per item
  const bookingItemsWithPrice = bookingItems.map((item: any) => {
    const itemTotal = booking.total_amount / bookingItems.length
    return {
      ...item,
      unitPrice: itemTotal / item.quantity,
      itemTotal: itemTotal
    }
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/bookings"
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg border hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Detail Pengajuan</h1>
            <p className="font-mono text-muted-foreground">{booking.reference_no}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          <SendMessageButton 
            booking={{
              id: booking.id,
              reference_no: booking.reference_no,
              status: booking.status,
              users: borrower
            }} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Borrower Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Data Peminjam
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center pb-4 border-b">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-blue-600">
                    {borrower?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="font-semibold">{borrower?.name}</h3>
                <p className="text-sm text-slate-500">{borrower?.role || 'Peminjam'}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-slate-500">Instansi</p>
                    <p className="font-medium">{borrower?.institution || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-slate-500">Kelas/Divisi</p>
                    <p className="font-medium">{borrower?.class_division || '-'}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="font-medium">{borrower?.email || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-slate-500">WhatsApp/Telepon</p>
                    <p className="font-medium">{borrower?.phone || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {booking.status === 'pending' && (
            <ApprovalButtons bookingId={id} />
          )}

          {booking.status === 'approved' && (
            <RecordPaymentButton 
              bookingId={id} 
              totalAmount={booking.total_amount} 
              paidAmount={(payments || [])
                .filter((p: any) => p.status === 'paid')
                .reduce((sum: number, p: any) => sum + p.amount, 0)}
            />
          )}

          {/* Early Return Button - Show for paid bookings that haven't ended */}
          {booking.status === 'paid' && new Date() < new Date(booking.end_datetime) && (
            <EarlyReturnButton 
              bookingId={id}
              booking={booking}
              items={bookingItems}
              totalPaid={(payments || [])
                .filter((p: any) => p.status === 'paid')
                .reduce((sum: number, p: any) => sum + p.amount, 0)}
            />
          )}
        </div>

        {/* Right Column - Booking Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Detail Peminjaman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Tanggal Mulai</p>
                  <p className="font-medium">{formatDateTime(booking.start_datetime)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Tanggal Selesai</p>
                  <p className="font-medium">{formatDateTime(booking.end_datetime)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Tujuan Peminjaman</p>
                <p className="text-sm bg-slate-50 p-3 rounded-lg">{booking.purpose}</p>
              </div>

              {booking.admin_notes && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Catatan Admin</p>
                  <p className="text-sm bg-amber-50 p-3 rounded-lg text-amber-800">{booking.admin_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice / Price Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Invoice & Rincian Harga
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Duration Info */}
              <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg mb-4">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Durasi:</span>{' '}
                    {durationDays > 1 
                      ? `${durationDays} hari (${durationHours} jam)` 
                      : `${durationHours} jam`
                    }
                  </p>
                  <p className="text-xs text-blue-600">
                    {formatDateTime(booking.start_datetime)} - {formatDateTime(booking.end_datetime)}
                  </p>
                </div>
              </div>

              {/* Items with Price */}
              <div className="space-y-3">
                {bookingItemsWithPrice.map((item: any, index: number) => (
                  <div 
                    key={index} 
                    className="p-4 border rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 flex-shrink-0">
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
                            {item.item_type === 'room' ? (
                              <>
                                Ruang {item.room?.room_code && `(${item.room.room_code})`} - {item.room?.buildings?.name}
                              </>
                            ) : (
                              <>
                                Alat {item.equipment?.equipment_code && `(${item.equipment.equipment_code})`}
                              </>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={item.item_type === 'room' ? 'default' : 'secondary'} className="text-xs">
                              {item.item_type === 'room' ? 'Ruang' : 'Alat'}
                            </Badge>
                            <span className="text-xs text-slate-400">× {item.quantity} unit</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          {formatRupiah(item.itemTotal)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatRupiah(item.unitPrice)} / unit
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Total Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium">{formatRupiah(booking.total_amount)}</span>
                </div>
                
                {payments && payments.length > 0 && (
                  <>
                    {payments.filter((p: any) => p.status === 'paid').map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between text-sm">
                        <span className="text-green-600">
                          {payment.method === 'manual_cash' ? 'Bayar Tunai' : 
                           payment.method === 'manual_transfer' ? 'Transfer' : 'Pembayaran'}
                        </span>
                        <span className="font-medium text-green-600">-{formatRupiah(payment.amount)}</span>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Sisa Pembayaran</span>
                      <span className="text-xl font-bold">
                        {formatRupiah(booking.total_amount - (payments || [])
                          .filter((p: any) => p.status === 'paid')
                          .reduce((sum: number, p: any) => sum + p.amount, 0))}
                      </span>
                    </div>
                  </>
                )}
                
                {(!payments || payments.filter((p: any) => p.status === 'paid').length === 0) && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Total Tagihan</span>
                    <span className="text-2xl font-bold">{formatRupiah(booking.total_amount)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {payments && payments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Riwayat Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.map((payment: any) => (
                    <div 
                      key={payment.id} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          payment.status === 'paid' ? 'bg-green-100' : 'bg-amber-100'
                        }`}>
                          <CreditCard className={`h-5 w-5 ${
                            payment.status === 'paid' ? 'text-green-600' : 'text-amber-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{formatRupiah(payment.amount)}</p>
                          <p className="text-xs text-slate-500 capitalize">
                            {payment.method.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                          {payment.status === 'paid' ? 'Lunas' : 'Pending'}
                        </Badge>
                        {payment.paid_at && (
                          <p className="text-xs text-slate-500 mt-1">
                            {formatDateTime(payment.paid_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
