import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  CalendarDays, CreditCard, Package, Clock, 
  TrendingUp, Users, ArrowUpRight, ArrowDownRight,
  Activity, Building2
} from 'lucide-react'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'
import { getInstitutionProfile } from '@/lib/institution'

export const revalidate = 60

// Server-side fetch institution profile
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
      .select('id, reference_no, status, created_at, users(name), booking_assets(assets(name))')
      .order('created_at', { ascending: false })
      .limit(8),
    sb.from('assets').select('*', { count: 'exact', head: true }).eq('is_active', true),
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
      label: 'Pengajuan Menunggu', 
      value: pendingCount ?? 0, 
      icon: Clock, 
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      href: '/admin/bookings?status=pending',
      trend: null
    },
    { 
      label: 'Pengajuan Hari Ini', 
      value: todayCount ?? 0, 
      icon: CalendarDays, 
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      href: '/admin/bookings',
      trend: null
    },
    { 
      label: 'Pendapatan Bulan Ini', 
      value: formatRupiah(monthRevenue), 
      icon: CreditCard, 
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      href: '/admin/payments',
      trend: Number(revenueGrowth) > 0 ? `+${revenueGrowth}%` : `${revenueGrowth}%`
    },
    { 
      label: 'Total Aset Aktif', 
      value: totalAssetsCount ?? 0, 
      icon: Package, 
      color: 'from-violet-500 to-purple-500',
      bgColor: 'bg-violet-50',
      textColor: 'text-violet-600',
      href: '/admin/assets',
      trend: null
    },
  ]

  return (
    <div className="p-6 space-y-8">
      {/* Institution Banner */}
      {institution && (
        <div className="bg-gradient-to-r from-blue-950 to-blue-800 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            {institution.logo_url ? (
              <SafeImage
                src={institution.logo_url}
                alt={institution.name}
                className="h-16 w-auto rounded-lg bg-white/10 p-2"
                fallback={
                  <div className="h-16 w-16 bg-white/20 rounded-lg flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                }
              />
            ) : (
              <div className="h-16 w-16 bg-white/20 rounded-lg flex items-center justify-center">
                <Building2 className="h-8 w-8 text-white" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{institution.name}</h2>
              {institution.short_name && institution.short_name !== institution.name && (
                <p className="text-blue-200">{institution.short_name}</p>
              )}
              {institution.description && (
                <p className="text-sm text-blue-200 mt-1 max-w-2xl">{institution.description}</p>
              )}
            </div>
            <Link 
              href="/admin/settings"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'border-white/30 text-white hover:bg-white/10 bg-transparent'
              )}
            >
              Edit Profil
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Pantau aktivitas dan kinerja sistem secara real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-slate-700">Sistem Aktif</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="stat-card group cursor-pointer overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={cn(
                    'h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br',
                    stat.color
                  )}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  {stat.trend && (
                    <div className={cn(
                      'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                      stat.trend.startsWith('+') 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-red-100 text-red-700'
                    )}>
                      {stat.trend.startsWith('+') ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {stat.trend}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Bookings Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900">Pengajuan Terbaru</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Daftar peminjaman yang baru masuk</p>
          </div>
          <Link href="/admin/bookings" className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'border-slate-200 hover:bg-slate-50'
          )}>
            Lihat Semua <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="modern-table">
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="font-semibold">Referensi</TableHead>
                  <TableHead className="font-semibold">Peminjam</TableHead>
                  <TableHead className="font-semibold">Aset</TableHead>
                  <TableHead className="font-semibold">Waktu Submit</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings?.map((booking) => {
                  const assetName = (booking.booking_assets as Array<{assets:{name:string}|null}>)?.[0]?.assets?.name
                  return (
                    <TableRow key={booking.id} className="group">
                      <TableCell className="font-medium">
                        <Link 
                          href={`/admin/bookings/${booking.id}`} 
                          className="font-mono text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          {booking.reference_no}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-indigo-600" />
                          </div>
                          <span className="font-medium">
                            {(booking.users as {name:string}|null)?.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{assetName || '-'}</TableCell>
                      <TableCell className="text-slate-500">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {formatDateTime(booking.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <BookingStatusBadge status={booking.status} />
                      </TableCell>
                    </TableRow>
                  )
                })}
                {(!recentBookings || recentBookings.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                          <CalendarDays className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500">Belum ada pengajuan peminjaman</p>
                        <Link 
                          href="/admin/bookings" 
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                        >
                          Lihat Semua Pengajuan
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Kelola Aset</h3>
                <p className="text-indigo-100 text-sm mb-4">Tambah atau edit data ruangan dan peralatan</p>
                <Link 
                  href="/admin/assets/new" 
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'bg-white text-indigo-600 hover:bg-indigo-50'
                  )}
                >
                  Tambah Aset
                </Link>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Lihat Laporan</h3>
                <p className="text-emerald-100 text-sm mb-4">Analisis penggunaan dan pendapatan</p>
                <Link 
                  href="/admin/reports" 
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'bg-white text-emerald-600 hover:bg-emerald-50'
                  )}
                >
                  Buka Laporan
                </Link>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Generate QR</h3>
                <p className="text-amber-100 text-sm mb-4">Buat QR code untuk aset baru</p>
                <Link 
                  href="/admin/qr" 
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'bg-white text-amber-600 hover:bg-amber-50'
                  )}
                >
                  Buat QR Code
                </Link>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
