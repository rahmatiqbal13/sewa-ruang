import { createAdminDbClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import {
  ArrowUpRight,
  Plus, FileText, QrCode, ChevronRight, AlertCircle, TrendingUp, Users, Wallet
} from 'lucide-react'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'

interface BookingItem {
  id: string
  reference_no: string
  status: string
  created_at: string
  users: { name: string } | null
  booking_items: Array<{
    rooms: { name: string } | null
    equipment: { name: string } | null
  }> | null
}

export const revalidate = 60

export default async function AdminDashboard() {
  const sb = createAdminDbClient()

  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString()
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString()

  const val = <T,>(r: PromiseSettledResult<unknown>, key: 'count' | 'data', fallback: T): T =>
    r.status === 'fulfilled' ? (((r.value as { count?: unknown; data?: unknown })?.[key]) as T ?? fallback) : fallback

  // Optimized: fetch only actionable data
  const [
    rPending,
    rTodayBookings,
    rMonthPayments,
    rLastMonthPayments,
    rPendingPayments,
    rActionBookings,
    rRecentBookings,
    rAssetStats,
  ] = await Promise.allSettled([
    sb.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay),
    sb.from('payments').select('amount').eq('status', 'paid').gte('paid_at', startOfMonth),
    sb.from('payments').select('amount').eq('status', 'paid').gte('paid_at', lastMonth).lt('paid_at', startOfMonth),
    sb.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('bookings')
      .select('id, reference_no, status, created_at, users!user_id(name), booking_items(item_type, rooms:room_id(name), equipment:equipment_id(name))')
      .in('status', ['pending', 'payment_uploaded'])
      .order('created_at', { ascending: false })
      .limit(3),
    sb.from('bookings')
      .select('id, reference_no, status, created_at, users!user_id(name), booking_items(item_type, rooms:room_id(name), equipment:equipment_id(name))')
      .order('created_at', { ascending: false })
      .limit(3),
    sb.from('equipment').select('ketersediaan, is_active').eq('is_active', true),
  ])

  const pendingCount: number = val(rPending, 'count', 0)
  const todayCount: number = val(rTodayBookings, 'count', 0)
  const pendingPaymentsCount: number = val(rPendingPayments, 'count', 0)

  const monthPaymentsRaw = val(rMonthPayments, 'data', null)
  const lastMonthPaymentsRaw = val(rLastMonthPayments, 'data', null)

  const monthPayments = monthPaymentsRaw as Array<{amount:number}> | null
  const lastMonthPayments = lastMonthPaymentsRaw as Array<{amount:number}> | null

  const monthRevenue = monthPayments?.reduce((s, p) => s + p.amount, 0) ?? 0
  const lastMonthRevenue = lastMonthPayments?.reduce((s, p) => s + p.amount, 0) ?? 0
  const revenueGrowth = lastMonthRevenue > 0
    ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
    : 0

  const actionBookings = val(rActionBookings, 'data', null) as BookingItem[] | null
  const recentBookings = val(rRecentBookings, 'data', null) as BookingItem[] | null

  // Calculate asset stats client-side from raw data
  const assetStatsRaw = val(rAssetStats, 'data', null) as Array<{ketersediaan: string; is_active: boolean}> | null
  const totalAssetsCount = assetStatsRaw?.length ?? 0
  const availableEquipmentCount = assetStatsRaw?.filter(e => e.ketersediaan === 'tersedia').length ?? 0

  const totalActionItems = pendingCount + pendingPaymentsCount

  return (
    <div className="space-y-6 p-6">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ringkasan aktivitas dan tugas hari ini
          </p>
        </div>
        {totalActionItems > 0 && (
          <Link
            href="/admin/bookings"
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-full border border-red-200 hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <AlertCircle className="h-4 w-4" />
            {totalActionItems} butuh tindakan
          </Link>
        )}
      </div>

      {/* ACTION-ORIENTED STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Menunggu Persetujuan"
          value={pendingCount ?? 0}
          iconName="clock"
          color="orange"
        />
        <StatCard
          title="Pembayaran Menunggu"
          value={pendingPaymentsCount ?? 0}
          iconName="credit-card"
          color="red"
        />
        <StatCard
          title="Pengajuan Hari Ini"
          value={todayCount ?? 0}
          iconName="calendar-days"
          color="blue"
        />
        <StatCard
          title="Pendapatan Bulan Ini"
          value={formatRupiah(monthRevenue)}
          subtitle={Number(revenueGrowth) !== 0 ? `${Number(revenueGrowth) > 0 ? '+' : ''}${revenueGrowth}% dari bulan lalu` : undefined}
          iconName="trending-up"
          color="green"
        />
      </div>

      {/* 2-COLUMN BENTO CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-5">
          {/* ACTION REQUIRED: Pending Bookings */}
          <Card className="rounded-[14px] border-border shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold text-foreground">Butuh Tindakan</CardTitle>
                  {pendingCount > 0 && (
                    <span className="h-5 px-1.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full flex items-center">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <Link
                  href="/admin/bookings"
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  Lihat Semua
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {actionBookings && actionBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="text-left py-3 px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Ref</th>
                        <th scope="col" className="text-left py-3 px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Peminjam</th>
                        <th scope="col" className="text-left py-3 px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Item</th>
                        <th scope="col" className="text-left py-3 px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th scope="col" className="text-left py-3 px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionBookings.map((booking) => {
                        const itemName = booking.booking_items?.[0]?.rooms?.name ||
                                         booking.booking_items?.[0]?.equipment?.name || '-'

                        return (
                          <tr
                            key={booking.id}
                            className="border-b border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors"
                          >
                            <td className="py-3 px-2">
                              <span className="font-mono text-xs text-muted-foreground">{booking.reference_no}</span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-sm text-foreground font-medium">
                                {booking.users?.name || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-sm text-foreground/80 truncate max-w-[120px] block">{itemName}</span>
                            </td>
                            <td className="py-3 px-2">
                              <BookingStatusBadge status={booking.status} />
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-xs text-muted-foreground">{formatDateTime(booking.created_at)}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-full mb-3">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">Semua tugas sudah terselesaikan</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RECENT ACTIVITY: Latest Bookings */}
          <Card className="rounded-[14px] border-border shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground">Aktivitas Terbaru</CardTitle>
                <Link
                  href="/admin/bookings"
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  Lihat Semua
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentBookings && recentBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="text-left py-3 px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Ref</th>
                        <th scope="col" className="text-left py-3 px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Peminjam</th>
                        <th scope="col" className="text-left py-3 px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Item</th>
                        <th scope="col" className="text-left py-3 px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th scope="col" className="text-left py-3 px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking) => {
                        const itemName = booking.booking_items?.[0]?.rooms?.name ||
                                         booking.booking_items?.[0]?.equipment?.name || '-'

                        return (
                          <tr
                            key={booking.id}
                            className="border-b border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors"
                          >
                            <td className="py-3 px-2">
                              <span className="font-mono text-xs text-muted-foreground">{booking.reference_no}</span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-sm text-foreground font-medium">
                                {booking.users?.name || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-sm text-foreground/80 truncate max-w-[120px] block">{itemName}</span>
                            </td>
                            <td className="py-3 px-2">
                              <BookingStatusBadge status={booking.status} />
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-xs text-muted-foreground">{formatDateTime(booking.created_at)}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState variant="bookings" minHeight={false} className="py-10" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          {/* Quick Links Card */}
          <Card className="rounded-[14px] border-border shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">Akses Cepat</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Link
                href="/admin/bookings"
                className="flex items-center justify-between p-3 bg-muted hover:bg-muted/80 rounded-[10px] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-orange-500/10 rounded-[8px] flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">Verifikasi Pengajuan</span>
                    {pendingCount > 0 && (
                      <p className="text-xs text-orange-600">{pendingCount} menunggu</p>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
              </Link>

              <Link
                href="/admin/payments"
                className="flex items-center justify-between p-3 bg-muted hover:bg-muted/80 rounded-[10px] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-red-500/10 rounded-[8px] flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">Verifikasi Pembayaran</span>
                    {pendingPaymentsCount > 0 && (
                      <p className="text-xs text-red-600">{pendingPaymentsCount} menunggu</p>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
              </Link>

              <Link
                href="/admin/equipment/new"
                className="flex items-center justify-between p-3 bg-muted hover:bg-muted/80 rounded-[10px] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-[#8B5CF6]/10 rounded-[8px] flex items-center justify-center">
                    <Plus className="h-4 w-4 text-[#8B5CF6]" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Tambah Alat</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
              </Link>

              <Link
                href="/admin/qr"
                className="flex items-center justify-between p-3 bg-muted hover:bg-muted/80 rounded-[10px] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-[#F59E0B]/10 rounded-[8px] flex items-center justify-center">
                    <QrCode className="h-4 w-4 text-[#F59E0B]" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Generate QR</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
              </Link>
            </CardContent>
          </Card>

          {/* Asset Availability Mini Card */}
          <Card className="rounded-[14px] border-border shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">Ketersediaan Aset</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Alat Tersedia</span>
                  <span className="text-sm font-semibold text-foreground">
                    {availableEquipmentCount} / {totalAssetsCount}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#8B5CF6] rounded-full transition-all"
                    style={{
                      width: totalAssetsCount
                        ? `${Math.round((availableEquipmentCount / totalAssetsCount) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalAssetsCount > 0
                    ? `${Math.round((availableEquipmentCount / totalAssetsCount) * 100)}% alat siap dipinjam`
                    : 'Belum ada data alat'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
