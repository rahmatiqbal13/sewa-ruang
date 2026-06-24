import { createAdminDbClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateTime, cn } from '@/lib/utils'
import { Package, DoorOpen, Clock, CheckCircle, CreditCard } from 'lucide-react'
import { DeleteReturnButton } from './DeleteReturnButton'

interface CompletedReturn {
  id: string
  condition: string
  returned_at: string
  is_early_return: boolean
  notes: string | null
  booking: {
    reference_no: string
    users: { name: string } | null
  } | null
}

interface ReturnListBooking {
  id: string
  reference_no: string
  status: string
  start_datetime: string
  end_datetime: string
  total_amount: number
  actual_end_datetime: string | null
  users: { name: string; email: string; phone: string | null } | null
  booking_items: Array<{
    id: string
    item_type: string
    quantity: number
    room: { id: string; name: string; room_code: string } | null
    equipment: { id: string; name: string; equipment_code: string } | null
  }> | null
  payments: Array<{ amount: number; status: string }> | null
}

const RETURNS_PER_PAGE = 30

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>
}) {
  const { type, page } = await searchParams
  const activeType = type === 'room' ? 'room' : 'equipment'
  const currentPage = Math.max(1, parseInt(page ?? '1', 10))
  const from = (currentPage - 1) * RETURNS_PER_PAGE
  const to = from + RETURNS_PER_PAGE - 1

  const sb = createAdminDbClient()

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

  // Fetch completed returns with pagination
  const { data: completedReturns, count: completedCount } = await sb
    .from('returns')
    .select(`
      *,
      booking:bookings(
        id, reference_no, start_datetime, end_datetime,
        users!user_id(name)
      )
    `, { count: 'exact' })
    .order('returned_at', { ascending: false })
    .range(from, to)

  const totalReturnPages = Math.ceil((completedCount ?? 0) / RETURNS_PER_PAGE)

  // Filter by asset type
  const filterByType = (bookings: ReturnListBooking[]) => {
    return (bookings ?? []).filter((b) => {
      const items = b.booking_items || []
      if (activeType === 'equipment') {
        return items.some((item) => item.item_type === 'equipment')
      } else {
        return items.some((item) => item.item_type === 'room')
      }
    })
  }

  const filteredPending = filterByType((pendingReturns || []) as ReturnListBooking[])

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
    <div className="admin-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengembalian Alat</h1>
          <p className="page-subtitle">Kelola pengembalian dan pantau status peminjaman</p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1.5">
        {tabs.map((tab) => {
          const isActive = activeType === tab.value
          return (
            <Link
              key={tab.value}
              href={`/admin/returns?type=${tab.value}`}
              className={cn('filter-pill', isActive ? 'filter-pill-active' : 'filter-pill-inactive')}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="mini-stat border-t-amber-400">
          <p className="mini-stat-label">Menunggu Pengembalian</p>
          <p className="mini-stat-value">{filteredPending.length}</p>
        </div>
        <div className="mini-stat border-t-blue-400">
          <p className="mini-stat-label">Dikembalikan Bulan Ini</p>
          <p className="mini-stat-value">
            {((completedReturns || []) as CompletedReturn[]).filter((r) => {
              const now = new Date()
              const d = new Date(r.returned_at)
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
            }).length}
          </p>
        </div>
        <div className="mini-stat border-t-emerald-400">
          <p className="mini-stat-label">Total Pengembalian</p>
          <p className="mini-stat-value">{(completedReturns || []).length}</p>
        </div>
        <div className="mini-stat border-t-green-400">
          <p className="mini-stat-label">Selesai Hari Ini</p>
          <p className="mini-stat-value">
            {((completedReturns || []) as CompletedReturn[]).filter((r) => {
              const today = new Date().toDateString()
              const returnDate = new Date(r.returned_at).toDateString()
              return today === returnDate
            }).length}
          </p>
        </div>
      </div>

      {/* Pending Returns */}
      <div className="bg-card rounded-[14px] border border-amber-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-100 flex items-center gap-2 bg-amber-50/50">
          <Clock className="h-4 w-4 text-amber-500" />
          <p className="text-sm font-semibold text-amber-800">
            Peminjaman Aktif — Menunggu Pengembalian ({filteredPending.length})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th scope="col">No. Referensi</th>
                <th scope="col">Peminjam</th>
                <th scope="col">Item</th>
                <th scope="col">Jadwal</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPending.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground/70 py-10 text-sm">
                    Tidak ada peminjaman yang menunggu pengembalian
                  </td>
                </tr>
              )}
              {filteredPending.map((booking) => {
                const items = booking.booking_items || []
                const totalPaid = (booking.payments || [])
                  .filter((p) => p.status === 'paid')
                  .reduce((sum: number, p) => sum + p.amount, 0)
                const isOverdue = new Date() > new Date(booking.end_datetime)
                return (
                  <tr key={booking.id} className={isOverdue ? 'bg-red-50/60' : ''}>
                    <td className="font-mono text-xs text-indigo-700">{booking.reference_no}</td>
                    <td>
                      <p className="text-sm font-medium">{booking.users?.name}</p>
                      <p className="text-xs text-muted-foreground/70">{booking.users?.phone}</p>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        {items.slice(0, 2).map((item, idx: number) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            {item.item_type === 'room' ? item.room?.name : item.equipment?.name}
                          </p>
                        ))}
                        {items.length > 2 && <p className="text-[10px] text-muted-foreground/70">+{items.length - 2} lainnya</p>}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs space-y-0.5">
                        <p className="text-muted-foreground/70">Mulai: <span className="text-muted-foreground">{formatDateTime(booking.start_datetime)}</span></p>
                        <p className={cn('', isOverdue && 'text-red-600 font-semibold')}>
                          Selesai: {formatDateTime(booking.end_datetime)}
                          {isOverdue && <span className="ml-1">(Lewat!)</span>}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', statusLabel[booking.status]?.color ?? 'bg-muted text-muted-foreground')}>
                        {statusLabel[booking.status]?.label ?? booking.status}
                      </span>
                      {booking.status === 'paid' && (
                        <p className="text-xs text-emerald-600 mt-1">
                          {totalPaid >= booking.total_amount ? 'Lunas' : `DP: ${(totalPaid / booking.total_amount * 100).toFixed(0)}%`}
                        </p>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {booking.status === 'approved' && (
                          <Link
                            href={`/admin/payments?booking=${booking.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-[10px] border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <CreditCard className="h-3 w-3" /> Bayar
                          </Link>
                        )}
                        <Link
                          href={`/admin/returns/${booking.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <CheckCircle className="h-3 w-3" /> Proses
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completed Returns */}
      {(completedReturns || []).length > 0 && (
        <div className="bg-card rounded-[14px] border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">Riwayat Pengembalian</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th scope="col">No. Referensi</th>
                  <th scope="col">Peminjam</th>
                  <th scope="col">Waktu Kembali</th>
                  <th scope="col">Kondisi</th>
                  <th scope="col">Catatan</th>
                  <th scope="col" className="w-10" />
                </tr>
              </thead>
              <tbody>
                {((completedReturns || []) as CompletedReturn[]).map((r) => {
                  const cond = conditionLabel[r.condition]
                  const condColors: Record<string, string> = {
                    good: 'bg-emerald-100 text-emerald-800',
                    minor_damage: 'bg-amber-100 text-amber-800',
                    major_damage: 'bg-red-100 text-red-800',
                    lost: 'bg-red-100 text-red-800',
                  }
                  return (
                    <tr key={r.id}>
                      <td className="font-mono text-xs text-indigo-700">{r.booking?.reference_no}</td>
                      <td className="text-sm">{r.booking?.users?.name}</td>
                      <td className="text-xs text-muted-foreground">
                        {formatDateTime(r.returned_at)}
                        {r.is_early_return && (
                          <span className="ml-2 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Lebih Cepat</span>
                        )}
                      </td>
                      <td>
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', condColors[r.condition] ?? 'bg-muted text-muted-foreground')}>
                          {cond?.label ?? r.condition}
                        </span>
                      </td>
                      <td className="text-xs text-muted-foreground max-w-[200px] truncate">{r.notes ?? '—'}</td>
                      <td>
                        <DeleteReturnButton returnId={r.id} referenceNo={r.booking?.reference_no ?? '-'} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination riwayat pengembalian */}
          {totalReturnPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
              <p className="text-xs text-muted-foreground">
                Halaman {currentPage} dari {totalReturnPages} ({completedCount} total)
              </p>
              <div className="flex items-center gap-1.5">
                {currentPage > 1 && (
                  <Link
                    href={`/admin/returns?type=${activeType}&page=${currentPage - 1}`}
                    className="px-3 py-1.5 text-xs font-medium rounded-[8px] border border-border bg-card hover:bg-muted transition-colors"
                  >
                    ← Sebelumnya
                  </Link>
                )}
                {currentPage < totalReturnPages && (
                  <Link
                    href={`/admin/returns?type=${activeType}&page=${currentPage + 1}`}
                    className="px-3 py-1.5 text-xs font-medium rounded-[8px] border border-border bg-card hover:bg-muted transition-colors"
                  >
                    Berikutnya →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
