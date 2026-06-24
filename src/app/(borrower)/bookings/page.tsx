import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Package, Calendar, ArrowLeft, CreditCard } from 'lucide-react'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { CancelBookingButton } from './CancelBookingButton'
import { EmptyState } from '@/components/ui/empty-state'

interface BookingWithItems {
  id: string
  reference_no: string
  status: string
  start_datetime: string
  end_datetime: string
  total_amount: number
  purpose: string
  created_at: string
  booking_items: Array<{
    item_type: 'room' | 'equipment'
    rooms: { name: string; room_code: string | null } | null
    equipment: { name: string; equipment_code: string | null } | null
  }>
}

export default async function MyBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div className="text-center py-8">Silakan login terlebih dahulu</div>
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookings } = await (supabase.from('bookings') as any)
    .select(`
      id,
      reference_no,
      status,
      start_datetime,
      end_datetime,
      total_amount,
      purpose,
      created_at,
      booking_items(
        item_type,
        rooms:room_id(name, room_code),
        equipment:equipment_id(name, equipment_code)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100) as { data: BookingWithItems[] | null }

  // Get all item names from a booking
  function getItemNames(booking: BookingWithItems): string {
    const items = booking.booking_items
    if (!items || items.length === 0) return 'Tidak ada item'
    
    const names = items.map(item => {
      if (item.item_type === 'room' && item.rooms) {
        return item.rooms.name
      }
      if (item.item_type === 'equipment' && item.equipment) {
        return item.equipment.name
      }
      return null
    }).filter(Boolean)
    
    if (names.length === 0) return 'Item tidak diketahui'
    if (names.length === 1) return names[0]!
    return `${names[0]} +${names.length - 1}`
  }

  // Get item types for badge
  function getItemTypeLabel(booking: BookingWithItems): string {
    const items = booking.booking_items
    if (!items || items.length === 0) return '-'
    
    const hasRoom = items.some(i => i.item_type === 'room')
    const hasEquipment = items.some(i => i.item_type === 'equipment')
    
    if (hasRoom && hasEquipment) return 'Campuran'
    if (hasRoom) return 'Ruang'
    return 'Alat'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Pengajuan Saya</h1>
            <p className="text-sm text-muted-foreground">
              {bookings?.length ?? 0} pengajuan ditemukan
            </p>
          </div>
        </div>
        <Link href="/booking/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> 
          <span className="hidden sm:inline">Ajukan Peminjaman</span>
          <span className="sm:hidden">Pinjam</span>
        </Link>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Riwayat Pengajuan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Referensi</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Jadwal</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-0">
                      <EmptyState variant="bookings" actionHref="/booking/new" minHeight={false} className="py-12" />
                    </TableCell>
                  </TableRow>
                )}
                {bookings?.map((booking) => (
                  <TableRow key={booking.id} className="group">
                    <TableCell className="font-mono text-sm">
                      {booking.reference_no}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="font-medium text-sm truncate">{getItemNames(booking)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getItemTypeLabel(booking)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span>{formatDateTime(booking.start_datetime).split(',')[0]}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(booking.start_datetime).split(',')[1]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {booking.total_amount > 0 ? (
                        <span className="font-medium text-green-600">
                          {formatRupiah(booking.total_amount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/bookings/${booking.id}`} 
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          Detail
                        </Link>
                        {['approved', 'pending_payment', 'payment_rejected'].includes(booking.status) && (
                          <Link
                            href={`/booking/${booking.id}/payment`}
                            className={buttonVariants({ size: 'sm' })}
                          >
                            <CreditCard className="mr-1 h-3 w-3" />
                            Bayar
                          </Link>
                        )}
                        {booking.status === 'pending' && (
                          <CancelBookingButton id={booking.id} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y">
            {bookings?.length === 0 && (
              <EmptyState variant="bookings" actionHref="/booking/new" minHeight={false} className="py-12 px-4" />
            )}
            {bookings?.map((booking) => (
              <div key={booking.id} className="p-4 hover:bg-muted transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground mb-1">
                      {booking.reference_no}
                    </p>
                    <h4 className="font-medium text-sm">{getItemNames(booking)}</h4>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateTime(booking.start_datetime).split(',')[0]}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getItemTypeLabel(booking)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-green-600">
                    {booking.total_amount > 0 ? formatRupiah(booking.total_amount) : 'Gratis'}
                  </span>
                  <div className="flex gap-2">
                    <Link 
                      href={`/bookings/${booking.id}`} 
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Detail
                    </Link>
                    {['approved', 'pending_payment', 'payment_rejected'].includes(booking.status) && (
                      <Link
                        href={`/booking/${booking.id}/payment`}
                        className={buttonVariants({ size: 'sm' })}
                      >
                        <CreditCard className="mr-1 h-3 w-3" />
                        Bayar
                      </Link>
                    )}
                    {booking.status === 'pending' && (
                      <CancelBookingButton id={booking.id} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
