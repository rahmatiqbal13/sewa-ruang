import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CalendarDays, CreditCard, Package, Clock } from 'lucide-react'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export const revalidate = 60

export default async function AdminDashboard() {
  const supabase = await createClient()

  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [
    { count: pendingCount },
    { count: todayCount },
    { data: monthPaymentsRaw },
    { data: recentBookingsRaw },
  ] = await Promise.all([
    sb.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay),
    sb.from('payments').select('amount').eq('status', 'paid').gte('paid_at', startOfMonth),
    sb.from('bookings')
      .select('id, reference_no, status, created_at, users(name), booking_assets(assets(name))')
      .order('created_at', { ascending: false })
      .limit(8),
  ])
  const monthPayments = monthPaymentsRaw as Array<{amount:number}> | null
  const recentBookings = recentBookingsRaw as Array<Record<string, any>> | null

  const monthRevenue = monthPayments?.reduce((s, p) => s + p.amount, 0) ?? 0

  const stats = [
    { label: 'Pengajuan Menunggu', value: pendingCount ?? 0, icon: Clock, color: 'text-amber-600', href: '/admin/bookings?status=pending' },
    { label: 'Pengajuan Hari Ini', value: todayCount ?? 0, icon: CalendarDays, color: 'text-blue-600', href: '/admin/bookings' },
    { label: 'Pendapatan Bulan Ini', value: formatRupiah(monthRevenue), icon: CreditCard, color: 'text-green-600', href: '/admin/payments' },
    { label: 'Total Aset Aktif', value: '—', icon: Package, color: 'text-purple-600', href: '/admin/assets' },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pengajuan Terbaru</CardTitle>
          <Link href="/admin/bookings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Lihat Semua</Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referensi</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Aset</TableHead>
                <TableHead>Waktu Submit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBookings?.map((b) => {
                const assetName = (b.booking_assets as Array<{assets:{name:string}|null}>)?.[0]?.assets?.name
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">
                      <Link href={`/admin/bookings/${b.id}`} className="hover:underline text-primary">
                        {b.reference_no}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{(b.users as {name:string}|null)?.name}</TableCell>
                    <TableCell className="text-sm">{assetName}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(b.created_at)}</TableCell>
                    <TableCell><BookingStatusBadge status={b.status} /></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
