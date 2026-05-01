import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { formatDateTime, formatRupiah, cn } from '@/lib/utils'
import { BookingQuickActions } from './BookingQuickActions'

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('bookings') as any)
    .select('*, users(name, phone, institution, class_division), booking_assets(assets(name, category))')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: bookings } = await query as { data: Array<Record<string, unknown>> | null }

  const tabs = [
    { label: 'Semua',    value: '',          color: 'bg-zinc-800 text-white' },
    { label: 'Pending',  value: 'pending',   color: 'bg-amber-500 text-white' },
    { label: 'Disetujui',value: 'approved',  color: 'bg-blue-600 text-white' },
    { label: 'Lunas',    value: 'paid',      color: 'bg-emerald-600 text-white' },
    { label: 'Selesai',  value: 'completed', color: 'bg-green-700 text-white' },
    { label: 'Ditolak',  value: 'rejected',  color: 'bg-red-600 text-white' },
    { label: 'Dibatalkan', value: 'cancelled', color: 'bg-zinc-500 text-white' },
  ]

  const counts: Record<string, number> = {}
  for (const b of bookings ?? []) {
    const s = b.status as string
    counts[s] = (counts[s] ?? 0) + 1
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Manajemen Pengajuan</h1>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => {
          const isActive = (status ?? '') === tab.value
          const count = tab.value ? counts[tab.value] : bookings?.length
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/bookings?status=${tab.value}` : '/admin/bookings'}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                isActive ? tab.color : 'bg-white border text-zinc-600 hover:bg-zinc-50'
              )}
            >
              {tab.label}
              {count != null && count > 0 && (
                <span className={cn('text-xs rounded-full px-1.5 py-0.5 font-bold', isActive ? 'bg-white/20' : 'bg-zinc-100')}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {bookings?.length ?? 0} pengajuan {status ? `· ${tabs.find(t => t.value === status)?.label}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Referensi</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Aset</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
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
                const assetNames = (b.booking_assets as Array<{ assets: { name: string } | null }>)
                  ?.map(ba => ba.assets?.name).filter(Boolean).join(', ')
                const borrower = b.users as { name: string; phone: string | null; institution: string; class_division: string } | null
                return (
                  <TableRow key={b.id as string}>
                    <TableCell className="font-mono text-sm">{b.reference_no as string}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{borrower?.name}</p>
                        <p className="text-xs text-muted-foreground">{borrower?.institution}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm">{assetNames}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(b.start_datetime as string)}</TableCell>
                    <TableCell className="font-medium">{formatRupiah(b.total_amount as number)}</TableCell>
                    <TableCell><BookingStatusBadge status={b.status as string} /></TableCell>
                    <TableCell className="text-right">
                      <BookingQuickActions
                        bookingId={b.id as string}
                        status={b.status as string}
                        borrowerPhone={borrower?.phone ?? null}
                        bookingRef={b.reference_no as string}
                      />
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
