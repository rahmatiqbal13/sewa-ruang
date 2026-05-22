import { createAdminClient as createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, cn } from '@/lib/utils'
import { Package, DoorOpen, Clock, CheckCircle, CreditCard } from 'lucide-react'
import { DeleteReturnButton } from './DeleteReturnButton'

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const activeType = type === 'room' ? 'room' : 'equipment'

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Fetch ALL approved/paid bookings (not just overdue)
  // These are bookings that need to be returned
  const { data: pendingReturns } = await sb
    .from('bookings')
    .select(`
      id, reference_no, status, start_datetime, end_datetime, 
      total_amount, actual_end_datetime,
      users!user_id(name, email, phone),
      booking_items(
        id, item_type, quantity,
        room:rooms(id, name, room_code),
        equipment:equipment_id(id, name, equipment_code)
      ),
      payments(id, amount, status, method)
    `)
    .in('status', ['approved', 'paid'])
    .order('end_datetime')

  // Fetch completed returns
  const { data: completedReturns } = await sb
    .from('returns')
    .select(`
      *,
      booking:bookings(
        id, reference_no, start_datetime, end_datetime,
        users!user_id(name)
      )
    `)
    .order('returned_at', { ascending: false })
    .limit(30)

  // Fetch early returns
  const { data: earlyReturns } = await sb
    .from('booking_early_returns')
    .select(`
      *,
      booking:bookings(
        id, reference_no,
        users!user_id(name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  // Filter by asset type
  const filterByType = (bookings: any[]) => {
    return (bookings ?? []).filter((b) => {
      const items = b.booking_items || []
      if (activeType === 'equipment') {
        return items.some((item: any) => item.item_type === 'equipment')
      } else {
        return items.some((item: any) => item.item_type === 'room')
      }
    })
  }

  const filteredPending = filterByType(pendingReturns || [])

  const conditionLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    good: { label: 'Baik', variant: 'default' },
    minor_damage: { label: 'Rusak Ringan', variant: 'outline' },
    major_damage: { label: 'Rusak Berat', variant: 'destructive' },
    lost: { label: 'Hilang', variant: 'destructive' },
  }

  const statusLabel: Record<string, { label: string; color: string }> = {
    approved: { label: 'Disetujui - Menunggu Pembayaran', color: 'text-blue-600 bg-blue-50' },
    paid: { label: 'Lunas - Siap Digunakan', color: 'text-emerald-600 bg-emerald-50' },
  }

  const tabs = [
    { value: 'equipment', label: 'Alat', icon: Package, color: 'bg-green-600 text-white', iconColor: 'text-green-400' },
    { value: 'room', label: 'Ruang', icon: DoorOpen, color: 'bg-purple-600 text-white', iconColor: 'text-purple-400' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengembalian Aset</h1>
        <p className="text-muted-foreground text-sm">
          Kelola pengembalian dan pantau status peminjaman
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const isActive = activeType === tab.value
          return (
            <Link
              key={tab.value}
              href={`/admin/returns?type=${tab.value}`}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                isActive ? tab.color : 'bg-white border text-zinc-600 hover:bg-zinc-50'
              )}
            >
              <tab.icon className={cn('h-4 w-4', isActive ? 'text-white' : tab.iconColor)} />
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-amber-600 text-sm font-medium">Menunggu Pengembalian</p>
          <p className="text-2xl font-bold text-amber-900">{filteredPending.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-blue-600 text-sm font-medium">Dikembalikan Bulan Ini</p>
          <p className="text-2xl font-bold text-blue-900">
            {(completedReturns || []).filter((r: any) => {
              const now = new Date()
              const d = new Date(r.returned_at)
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
            }).length}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-emerald-600 text-sm font-medium">Total Pengembalian</p>
          <p className="text-2xl font-bold text-emerald-900">
            {(completedReturns || []).length}
          </p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-green-600 text-sm font-medium">Selesai Hari Ini</p>
          <p className="text-2xl font-bold text-green-900">
            {(completedReturns || []).filter((r: any) => {
              const today = new Date().toDateString()
              const returnDate = new Date(r.returned_at).toDateString()
              return today === returnDate
            }).length}
          </p>
        </div>
      </div>

      {/* Pending Returns */}
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="text-base text-amber-800 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Peminjaman Aktif - Menunggu Pengembalian ({filteredPending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Referensi</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Jadwal</TableHead>
                <TableHead>Status/Pembayaran</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Tidak ada peminjaman yang menunggu pengembalian
                  </TableCell>
                </TableRow>
              )}
              {filteredPending.map((booking: any) => {
                const items = booking.booking_items || []
                const totalPaid = (booking.payments || [])
                  .filter((p: any) => p.status === 'paid')
                  .reduce((sum: number, p: any) => sum + p.amount, 0)
                
                const isOverdue = new Date() > new Date(booking.end_datetime)
                
                return (
                  <TableRow key={booking.id} className={isOverdue ? 'bg-red-50' : ''}>
                    <TableCell className="font-mono text-sm">
                      {booking.reference_no}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{(booking.users as { name: string } | null)?.name}</p>
                        <p className="text-xs text-slate-400">{(booking.users as { phone: string } | null)?.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {items.slice(0, 2).map((item: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            {item.item_type === 'room' 
                              ? item.room?.name 
                              : item.equipment?.name
                            }
                          </div>
                        ))}
                        {items.length > 2 && (
                          <p className="text-xs text-slate-400">+{items.length - 2} lainnya</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="text-slate-400 text-xs">Mulai:</span>
                          <br />
                          {formatDateTime(booking.start_datetime)}
                        </div>
                        <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          <span className="text-slate-400 text-xs">Selesai:</span>
                          <br />
                          {formatDateTime(booking.end_datetime)}
                          {isOverdue && <span className="ml-2 text-xs">(Lewat)</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={statusLabel[booking.status].color}>
                          {statusLabel[booking.status].label}
                        </Badge>
                        {booking.status === 'paid' && (
                          <p className="text-xs text-emerald-600">
                            {totalPaid >= booking.total_amount 
                              ? 'Lunas' 
                              : `DP: ${(totalPaid / booking.total_amount * 100).toFixed(0)}%`
                            }
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {booking.status === 'approved' && (
                          <Link 
                            href={`/admin/payments?booking=${booking.id}`}
                            className={buttonVariants({ variant: 'outline', size: 'sm' })}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Bayar
                          </Link>
                        )}
                        <Link 
                          href={`/admin/returns/${booking.id}`}
                          className={buttonVariants({ size: 'sm' })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Proses
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Completed Returns */}
      {(completedReturns || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Riwayat Pengembalian
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Referensi</TableHead>
                  <TableHead>Peminjam</TableHead>
                  <TableHead>Waktu Kembali</TableHead>
                  <TableHead>Kondisi</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(completedReturns || []).map((r: any) => {
                  const cond = conditionLabel[r.condition as string]
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">
                        {r.booking?.reference_no}
                      </TableCell>
                      <TableCell>{r.booking?.users?.name}</TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(r.returned_at)}
                        {r.is_early_return && (
                          <Badge variant="outline" className="ml-2 text-amber-600">
                            Lebih Cepat
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cond?.variant ?? 'secondary'}>
                          {cond?.label ?? r.condition}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {r.notes ?? '—'}
                      </TableCell>
                      <TableCell>
                        <DeleteReturnButton
                          returnId={r.id}
                          referenceNo={r.booking?.reference_no ?? '-'}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
