import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

export default async function ReturnsPage() {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: pendingReturns } = await sb
    .from('bookings')
    .select('id, reference_no, end_datetime, users(name), booking_assets(assets(name, category))')
    .in('status', ['paid', 'approved'])
    .lt('end_datetime', new Date().toISOString())
    .order('end_datetime') as { data: Array<Record<string, any>> | null }

  const { data: completedReturns } = await sb
    .from('returns')
    .select('*, bookings(reference_no, users(name))')
    .order('returned_at', { ascending: false })
    .limit(20) as { data: Array<Record<string, any>> | null }

  const conditionLabel: Record<string, { label: string; variant: 'default'|'secondary'|'outline'|'destructive' }> = {
    good: { label: 'Baik', variant: 'default' },
    minor_damage: { label: 'Rusak Ringan', variant: 'outline' },
    major_damage: { label: 'Rusak Berat', variant: 'destructive' },
    lost: { label: 'Hilang', variant: 'destructive' },
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pengembalian Aset</h1>

      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="text-base text-amber-800">
            Menunggu Pengembalian ({pendingReturns?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Referensi</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Aset</TableHead>
                <TableHead>Jadwal Selesai</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingReturns?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Tidak ada pengembalian tertunda
                  </TableCell>
                </TableRow>
              )}
              {pendingReturns?.map((b) => {
                const assetNames = (b.booking_assets as Array<{assets:{name:string}|null}>)
                  ?.map(ba => ba.assets?.name).filter(Boolean).join(', ')
                return (
                  <TableRow key={b.id} className="bg-amber-50/50">
                    <TableCell className="font-mono text-sm">{b.reference_no}</TableCell>
                    <TableCell>{(b.users as {name:string}|null)?.name}</TableCell>
                    <TableCell className="text-sm">{assetNames}</TableCell>
                    <TableCell className="text-sm text-red-600">{formatDateTime(b.end_datetime)}</TableCell>
                    <TableCell>
                      <Link href={`/admin/returns/${b.id}`} className={buttonVariants({ size: 'sm' })}>
                        Catat Pengembalian
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Riwayat Pengembalian</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Referensi</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Waktu Kembali</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedReturns?.map((r) => {
                const cond = conditionLabel[r.condition]
                const booking = r.bookings as {reference_no:string;users:{name:string}|null}|null
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{booking?.reference_no}</TableCell>
                    <TableCell>{(booking?.users as {name:string}|null)?.name}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(r.returned_at)}</TableCell>
                    <TableCell><Badge variant={cond?.variant ?? 'secondary'}>{cond?.label ?? r.condition}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.notes ?? '-'}</TableCell>
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
