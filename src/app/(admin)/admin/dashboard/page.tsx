import { createAdminClient as createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CalendarDays, CreditCard, Package, Clock, 
  TrendingUp, ArrowUpRight, ArrowDownRight,
  Activity, Users
} from 'lucide-react'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getInstitutionProfile } from '@/lib/institution'
import { DashboardAnalytics } from '@/components/dashboard/DashboardAnalytics'

export const revalidate = 60

async function getInstitution() {
  return await getInstitutionProfile()
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const institution = await getInstitution()

  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString()
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [
    { count: pendingCount },
    { count: todayCount },
    { data: monthPaymentsRaw },
    { data: lastMonthPaymentsRaw },
    { data: recentBookingsRaw },
    { count: totalAssetsCount },
  ] = await Promise.all([
    sb.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay),
    sb.from('payments').select('amount').eq('status', 'paid').gte('paid_at', startOfMonth),
    sb.from('payments').select('amount').eq('status', 'paid').gte('paid_at', lastMonth).lt('paid_at', startOfMonth),
    sb.from('bookings')
      .select('id, reference_no, status, created_at, users!user_id(name), booking_items(item_type, rooms:room_id(name), equipment:equipment_id(name))')
      .order('created_at', { ascending: false })
      .limit(5),
    sb.from('equipment').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])
  
  const monthPayments = monthPaymentsRaw as Array<{amount:number}> | null
  const lastMonthPayments = lastMonthPaymentsRaw as Array<{amount:number}> | null
  const recentBookings = recentBookingsRaw as Array<Record<string, any>> | null

  const monthRevenue = monthPayments?.reduce((s, p) => s + p.amount, 0) ?? 0
  const lastMonthRevenue = lastMonthPayments?.reduce((s, p) => s + p.amount, 0) ?? 0
  const revenueGrowth = lastMonthRevenue > 0 
    ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
    : 0

  const stats = [
    { 
      label: 'Pending', 
      value: pendingCount ?? 0, 
      icon: Clock, 
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      href: '/admin/bookings?status=pending',
      trend: null
    },
    { 
      label: 'Hari Ini', 
      value: todayCount ?? 0, 
      icon: CalendarDays, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/admin/bookings',
      trend: null
    },
    { 
      label: 'Pendapatan', 
      value: formatRupiah(monthRevenue), 
      icon: CreditCard, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      href: '/admin/payments',
      trend: Number(revenueGrowth) > 0 ? `+${revenueGrowth}%` : `${revenueGrowth}%`
    },
    { 
      label: 'Aset Aktif', 
      value: totalAssetsCount ?? 0, 
      icon: Package, 
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      href: '/admin/equipment',
      trend: null
    },
  ]

  return (
    <div className="p-4 space-y-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Ringkasan aktivitas sistem</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Aktif</span>
          </div>
        </div>
      </div>

      {/* Compact Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                    stat.bgColor
                  )}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">{stat.label}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-slate-900 truncate">{stat.value}</p>
                      {stat.trend && (
                        <span className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded',
                          stat.trend.startsWith('+') 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-red-100 text-red-700'
                        )}>
                          {stat.trend}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Analytics */}
        <div className="lg:col-span-2">
          <DashboardAnalytics />
        </div>

        {/* Right Column - Recent Bookings */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pengajuan Terbaru</CardTitle>
                <Link 
                  href="/admin/bookings" 
                  className="text-xs text-blue-600 hover:underline"
                >
                  Lihat Semua
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {recentBookings?.map((booking) => {
                  const itemName = (booking.booking_items as Array<any>)?.[0]?.rooms?.name || 
                                   (booking.booking_items as Array<any>)?.[0]?.equipment?.name || '-'
                  
                  return (
                    <div 
                      key={booking.id} 
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500">
                            {booking.reference_no}
                          </span>
                          <BookingStatusBadge status={booking.status} />
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate mt-0.5">
                          {(booking.users as {name:string}|null)?.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{itemName}</p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 ml-2">
                        {formatDateTime(booking.created_at)}
                      </span>
                    </div>
                  )
                })}
                
                {(!recentBookings || recentBookings.length === 0) && (
                  <div className="text-center py-8 text-slate-400">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Belum ada pengajuan</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Akses Cepat</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Link 
                href="/admin/equipment/new"
                className="flex items-center justify-between p-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="text-sm font-medium">Tambah Aset</span>
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              
              <Link 
                href="/admin/reports"
                className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Laporan</span>
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              
              <Link 
                href="/admin/qr"
                className="flex items-center justify-between p-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">Generate QR</span>
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
