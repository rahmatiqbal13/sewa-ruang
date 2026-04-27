import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatRupiah } from '@/lib/utils'

export default async function PaymentsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payments } = await (supabase.from('payments') as any)
    .select('*, bookings(reference_no, users(name))')
    .order('created_at', { ascending: false }) as { data: Array<{id:string;status:string;amount:number;method:string;paid_at:string|null;bookings:{reference_no:string;users:{name:string}|null}|null}> | null }

  const totalPaid = payments?.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0) ?? 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pembayaran</h1>
        <p className="text-muted-foreground text-sm">Total terkumpul: <strong>{formatRupiah(totalPaid)}</strong></p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Riwayat Pembayaran</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Referensi</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Belum ada data pembayaran
                  </TableCell>
                </TableRow>
              )}
              {payments?.map((p) => {
                const booking = p.bookings as {reference_no:string;users:{name:string}|null}|null
                const methodLabel: Record<string, string> = { online: 'Online', manual_cash: 'Tunai', manual_transfer: 'Transfer' }
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{booking?.reference_no}</TableCell>
                    <TableCell>{(booking?.users as {name:string}|null)?.name}</TableCell>
                    <TableCell>{methodLabel[p.method] ?? p.method}</TableCell>
                    <TableCell className="font-medium">{formatRupiah(p.amount)}</TableCell>
                    <TableCell className="text-sm">{p.paid_at ? formatDateTime(p.paid_at) : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>
                        {p.status === 'paid' ? 'Lunas' : p.status}
                      </Badge>
                    </TableCell>
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
