import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { formatDateTime, formatRupiah, cn } from '@/lib/utils'

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('bookings') as any)
    .select('*, users(name, institution, class_division), booking_assets(assets(name, category))')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: bookings } = await query as { data: Array<Record<string, any>> | null }

  const tabs = [
    { label: 'Semua', value: '' },
    { label: 'Menunggu', value: 'pending' },
    { label: 'Disetujui', value: 'approved' },
    { label: 'Lunas', value: 'paid' },
    { label: 'Selesai', value: 'completed' },
    { label: 'Ditolak', value: 'rejected' },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Manajemen Pengajuan</h1>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <Link
            key={tab.value}
            href={tab.value ? `/admin/bookings?status=${tab.value}` : '/admin/bookings'}
            className={cn(
              buttonVariants({ size: 'sm' }),
              (status ?? '') === tab.value ? '' : 'bg-transparent border border-border text-foreground hover:bg-muted'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {bookings?.length ?? 0} pengajuan {status ? `(${tabs.find(t=>t.value===status)?.label})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Referensi</TableHead>
                <TableHead>Peminjam</TableHead>
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Tidak ada data pengajuan
                  </TableCell>
                </TableRow>
              )}
              {bookings?.map((b) => {
                const assetNames = (b.booking_assets as Array<{assets:{name:string}|null}>)
                  ?.map(ba => ba.assets?.name).filter(Boolean).join(', ')
                const borrower = b.users as {name:string;institution:string;class_division:string} | null
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.reference_no}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{borrower?.name}</p>
                        <p className="text-xs text-muted-foreground">{borrower?.institution} — {borrower?.class_division}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">{assetNames}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(b.start_datetime)}</TableCell>
                    <TableCell>{formatRupiah(b.total_amount)}</TableCell>
                    <TableCell><BookingStatusBadge status={b.status} /></TableCell>
                    <TableCell>
                      <Link href={`/admin/bookings/${b.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                        Detail
                      </Link>
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
