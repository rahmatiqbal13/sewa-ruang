import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime, formatRupiah } from '@/lib/utils'

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from, to } = await searchParams
  const supabase = await createClient()

  const fromDate = from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const toDate = to ?? new Date().toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: bookingsRaw }, { data: paymentsRaw }] = await Promise.all([
    sb
      .from('bookings')
      .select('*, users(name, institution), booking_assets(assets(name, category))')
      .gte('created_at', `${fromDate}T00:00:00`)
      .lte('created_at', `${toDate}T23:59:59`)
      .order('created_at', { ascending: false }),
    sb
      .from('payments')
      .select('amount, method, status')
      .eq('status', 'paid')
      .gte('paid_at', `${fromDate}T00:00:00`)
      .lte('paid_at', `${toDate}T23:59:59`),
  ])
  const bookings = bookingsRaw as Array<Record<string, any>> | null
  const payments = paymentsRaw as Array<{amount:number;method:string;status:string}> | null

  const totalRevenue = payments?.reduce((s, p) => s + p.amount, 0) ?? 0
  const byMethod: Record<string, number> = {}
  payments?.forEach(p => { byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount })

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Laporan</h1>

      <form method="get" className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-sm font-medium block mb-1">Dari</label>
          <input type="date" name="from" defaultValue={fromDate} className="border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Sampai</label>
          <input type="date" name="to" defaultValue={toDate} className="border rounded px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">
          Filter
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Pengajuan</p>
            <p className="text-3xl font-bold">{bookings?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Pendapatan</p>
            <p className="text-3xl font-bold">{formatRupiah(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Breakdown Metode</p>
            {Object.entries(byMethod).map(([method, amount]) => (
              <p key={method} className="text-sm">
                {method.replace('_', ' ')}: {formatRupiah(amount)}
              </p>
            ))}
            {Object.keys(byMethod).length === 0 && <p className="text-sm text-muted-foreground">-</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Detail Pengajuan</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referensi</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Instansi</TableHead>
                <TableHead>Aset</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Tidak ada data pada periode ini
                  </TableCell>
                </TableRow>
              )}
              {bookings?.map((b) => {
                const assetName = (b.booking_assets as Array<{assets:{name:string}|null}>)?.[0]?.assets?.name
                const user = b.users as {name:string;institution:string}|null
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.reference_no}</TableCell>
                    <TableCell className="text-sm">{user?.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user?.institution}</TableCell>
                    <TableCell className="text-sm">{assetName}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(b.created_at)}</TableCell>
                    <TableCell>{formatRupiah(b.total_amount)}</TableCell>
                    <TableCell className="capitalize text-sm">{b.status}</TableCell>
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
