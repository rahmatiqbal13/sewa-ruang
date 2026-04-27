import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { CancelBookingButton } from './CancelBookingButton'

export default async function MyBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookings } = await (supabase.from('bookings') as any)
    .select('*, booking_assets(assets(name, category))')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false }) as { data: Array<Record<string, any>> | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pengajuan Saya</h1>
        <Link href="/booking/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Ajukan Peminjaman
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Riwayat Pengajuan</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Referensi</TableHead>
                <TableHead>Aset</TableHead>
                <TableHead>Tanggal Penggunaan</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Belum ada pengajuan.{' '}
                    <Link href="/booking/new" className="text-primary hover:underline">Ajukan sekarang</Link>
                  </TableCell>
                </TableRow>
              )}
              {bookings?.map((b) => {
                const assetNames = (b.booking_assets as Array<{assets: {name:string;category:string}|null}>)
                  ?.map(ba => ba.assets?.name)
                  .filter(Boolean)
                  .join(', ')
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.reference_no}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{assetNames}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(b.start_datetime)}</TableCell>
                    <TableCell>{formatRupiah(b.total_amount)}</TableCell>
                    <TableCell><BookingStatusBadge status={b.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/bookings/${b.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Detail</Link>
                        {b.status === 'pending' && <CancelBookingButton id={b.id} />}
                      </div>
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
