import { createAdminDbClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import {
  ArrowUpRight,
  Plus, FileText, QrCode, ChevronRight
} from 'lucide-react'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import Link from 'next/link'
import { DashboardAnalyticsLoader } from '@/components/dashboard/DashboardAnalyticsLoader'
import { EmptyState } from '@/components/ui/empty-state'

export const revalidate = 60

export default async function AdminDashboard() {
  const sb = createAdminDbClient()

  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString()
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString()

  const val = <T,>(r: PromiseSettledResult<any>, key: 'count' | 'data', fallback: T): T =>
    r.status === 'fulfilled' ? (r.value?.[key] ?? fallback) : fallback

  const [r0, r1, r2, r3, r4, r5, r6, r7] = await Promise.allSettled([
    sb.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay),
    sb.from('payments').select('amount').eq('status', 'paid').gte('paid_at', startOfMonth),
    sb.from('payments').select('amount').eq('status', 'paid').gte('paid_at', lastMonth).lt('paid_at', startOfMonth),
    sb.from('bookings')
      .select('id, reference_no, status, created_at, users!user_id(name), booking_items(item_type, rooms:room_id(name), equipment:equipment_id(name))')
      .order('created_at', { ascending: false })
      .limit(5),
    sb.from('equipment').select('*', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('rooms').select('*', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('equipment').select('*', { count: 'exact', head: true }).eq('ketersediaan', 'tersedia').eq('is_active', true),
  ])

  const pendingCount: number = val(r0, 'count', 0)
  const todayCount: number = val(r1, 'count', 0)
  const monthPaymentsRaw = val(r2, 'data', null)
  const lastMonthPaymentsRaw = val(r3, 'data', null)
  const recentBookingsRaw = val(r4, 'data', null)
  const totalAssetsCount: number = val(r5, 'count', 0)
  const roomCount: number = val(r6, 'count', 0)
  const availableEquipmentCount: number = val(r7, 'count', 0)
  
  const monthPayments = monthPaymentsRaw as Array<{amount:number}> | null
  const lastMonthPayments = lastMonthPaymentsRaw as Array<{amount:number}> | null
  const recentBookings = recentBookingsRaw as Array<Record<string, any>> | null

  const monthRevenue = monthPayments?.reduce((s, p) => s + p.amount, 0) ?? 0
  const lastMonthRevenue = lastMonthPayments?.reduce((s, p) => s + p.amount, 0) ?? 0
  const revenueGrowth = lastMonthRevenue > 0 
    ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6 p-6">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Dashboard</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Ringkasan aktivitas sistem
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#10B981]/10 rounded-full border border-[#10B981]/20">
          <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-xs font-medium text-[#047857]">Sistem Aktif</span>
        </div>
      </div>

      {/* BENTO STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Peminjaman"
          value={todayCount ?? 0}
          iconName="calendar-days"
          color="blue"
        />
        <StatCard
          title="Menunggu Persetujuan"
          value={pendingCount ?? 0}
          iconName="clock"
          color="orange"
        />
        <StatCard
          title="Pendapatan Bulan Ini"
          value={formatRupiah(monthRevenue)}
          subtitle={Number(revenueGrowth) !== 0 ? `${Number(revenueGrowth) > 0 ? '+' : ''}${revenueGrowth}% dari bulan lalu` : undefined}
          iconName="credit-card"
          color="green"
        />
        <StatCard
          title="Alat Aktif"
          value={totalAssetsCount ?? 0}
          iconName="package"
          color="purple"
        />
      </div>

      {/* 2-COLUMN BENTO CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-5">
          {/* Analytics Card */}
          <Card className="rounded-[14px] border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[#111827]">Analitik</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardAnalyticsLoader />
            </CardContent>
          </Card>

          {/* Recent Bookings Table Card */}
          <Card className="rounded-[14px] border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-[#111827]">Pengajuan Terbaru</CardTitle>
                <Link 
                  href="/admin/bookings" 
                  className="text-xs font-medium text-[#2E4DA7] hover:underline flex items-center gap-1"
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
                      <tr className="border-b border-[#E5E7EB]">
                        <th className="text-left py-3 px-2 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Ref</th>
                        <th className="text-left py-3 px-2 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Peminjam</th>
                        <th className="text-left py-3 px-2 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Ruang/Alat</th>
                        <th className="text-left py-3 px-2 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Status</th>
                        <th className="text-left py-3 px-2 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking) => {
                        const itemName = (booking.booking_items as Array<any>)?.[0]?.rooms?.name ||
                                         (booking.booking_items as Array<any>)?.[0]?.equipment?.name || '-'
                        
                        return (
                          <tr 
                            key={booking.id} 
                            className="border-b border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors"
                          >
                            <td className="py-3 px-2">
                              <span className="font-mono text-xs text-[#6B7280]">{booking.reference_no}</span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-sm text-[#111827] font-medium">
                                {(booking.users as {name:string}|null)?.name || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-sm text-[#374151] truncate max-w-[120px] block">{itemName}</span>
                            </td>
                            <td className="py-3 px-2">
                              <BookingStatusBadge status={booking.status} />
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-xs text-[#6B7280]">{formatDateTime(booking.created_at)}</span>
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
          <Card className="rounded-[14px] border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#111827]">Akses Cepat</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Link 
                href="/admin/equipment/new"
                className="flex items-center justify-between p-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] rounded-[10px] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-[#8B5CF6]/10 rounded-[8px] flex items-center justify-center">
                    <Plus className="h-4 w-4 text-[#8B5CF6]" />
                  </div>
                  <span className="text-sm font-medium text-[#111827]">Tambah Alat</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors" />
              </Link>
              
              <Link 
                href="/admin/reports"
                className="flex items-center justify-between p-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] rounded-[10px] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-[#10B981]/10 rounded-[8px] flex items-center justify-center">
                    <FileText className="h-4 w-4 text-[#10B981]" />
                  </div>
                  <span className="text-sm font-medium text-[#111827]">Laporan</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors" />
              </Link>
              
              <Link 
                href="/admin/qr"
                className="flex items-center justify-between p-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] rounded-[10px] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-[#F59E0B]/10 rounded-[8px] flex items-center justify-center">
                    <QrCode className="h-4 w-4 text-[#F59E0B]" />
                  </div>
                  <span className="text-sm font-medium text-[#111827]">Generate QR</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors" />
              </Link>
            </CardContent>
          </Card>

          {/* Asset Availability Mini Card */}
          <Card className="rounded-[14px] border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#111827]">Ketersediaan Alat</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#6B7280]">Ruangan Aktif</span>
                  <span className="text-sm font-semibold text-[#111827]">{roomCount ?? 0} ruang</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#6B7280]">Alat Tersedia</span>
                  <span className="text-sm font-semibold text-[#111827]">
                    {availableEquipmentCount ?? 0} / {totalAssetsCount ?? 0}
                  </span>
                </div>
                <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#8B5CF6] rounded-full transition-all"
                    style={{
                      width: totalAssetsCount
                        ? `${Math.round(((availableEquipmentCount ?? 0) / totalAssetsCount) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
