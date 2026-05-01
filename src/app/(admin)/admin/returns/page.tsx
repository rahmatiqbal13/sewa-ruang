import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, cn } from '@/lib/utils'
import { Package, DoorOpen } from 'lucide-react'

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const activeType = type === 'room' ? 'room' : 'equipment'

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: pendingReturns } = await sb
    .from('bookings')
    .select('id, reference_no, end_datetime, users(name), booking_assets(assets(name, category))')
    .in('status', ['paid', 'approved'])
    .lt('end_datetime', new Date().toISOString())
    .order('end_datetime') as { data: Array<Record<string, unknown>> | null }

  // Filter by asset type
  const filtered = (pendingReturns ?? []).filter((b) => {
    const assets = b.booking_assets as Array<{ assets: { name: string; category: string } | null }> | null
    if (!assets) return false
    const hasEquipment = assets.some(ba => ba.assets?.category === 'equipment')
    const hasRoom = assets.some(ba => ba.assets?.category === 'room')
    return activeType === 'equipment' ? hasEquipment : hasRoom
  })

  const { data: completedReturns } = await sb
    .from('returns')
    .select('*, bookings(reference_no, users(name), booking_assets(assets(category)))')
    .order('returned_at', { ascending: false })
    .limit(30) as { data: Array<Record<string, unknown>> | null }

  const filteredHistory = (completedReturns ?? []).filter((r) => {
    const booking = r.bookings as { booking_assets: Array<{ assets: { category: string } | null }> | null } | null
    const assets = booking?.booking_assets
    if (!assets) return true
    const hasEquipment = assets.some(ba => ba.assets?.category === 'equipment')
    const hasRoom = assets.some(ba => ba.assets?.category === 'room')
    return activeType === 'equipment' ? hasEquipment : hasRoom
  })

  const conditionLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    good: { label: 'Baik', variant: 'default' },
    minor_damage: { label: 'Rusak Ringan', variant: 'outline' },
    major_damage: { label: 'Rusak Berat', variant: 'destructive' },
    lost: { label: 'Hilang', variant: 'destructive' },
  }

  const tabs = [
    { value: 'equipment', label: 'Pengembalian Alat', icon: Package, color: 'bg-green-600 text-white', iconColor: 'text-green-400' },
    { value: 'room', label: 'Pengembalian Ruangan', icon: DoorOpen, color: 'bg-purple-600 text-white', iconColor: 'text-purple-400' },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pengembalian Aset</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const isActive = activeType === tab.value
          return (
            <Link
              key={tab.value}
              href={`/admin/returns?type=${tab.value}`}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                isActive ? tab.color : 'bg-white border text-zinc-600 hover:bg-zinc-50'
              )}
            >
              <tab.icon className={cn('h-4 w-4', isActive ? 'text-white' : tab.iconColor)} />
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Pending returns */}
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="text-base text-amber-800 flex items-center gap-2">
            {activeType === 'equipment'
              ? <Package className="h-4 w-4 text-green-500" />
              : <DoorOpen className="h-4 w-4 text-purple-500" />}
            Menunggu Pengembalian ({filtered.length})
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
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Tidak ada pengembalian tertunda
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((b) => {
                const assetNames = (b.booking_assets as Array<{ assets: { name: string } | null }>)
                  ?.map(ba => ba.assets?.name).filter(Boolean).join(', ')
                return (
                  <TableRow key={b.id as string} className="bg-amber-50/50">
                    <TableCell className="font-mono text-sm">{b.reference_no as string}</TableCell>
                    <TableCell>{(b.users as { name: string } | null)?.name}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{assetNames}</TableCell>
                    <TableCell className="text-sm text-red-600">{formatDateTime(b.end_datetime as string)}</TableCell>
                    <TableCell>
                      <Link href={`/admin/returns/${b.id as string}`} className={buttonVariants({ size: 'sm' })}>
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

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Pengembalian</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Referensi</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Waktu Kembali</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Belum ada riwayat pengembalian
                  </TableCell>
                </TableRow>
              )}
              {filteredHistory.map((r) => {
                const cond = conditionLabel[r.condition as string]
                const booking = r.bookings as { reference_no: string; users: { name: string } | null } | null
                return (
                  <TableRow key={r.id as string}>
                    <TableCell className="font-mono text-sm">{booking?.reference_no}</TableCell>
                    <TableCell>{(booking?.users as { name: string } | null)?.name}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(r.returned_at as string)}</TableCell>
                    <TableCell>
                      <Badge variant={cond?.variant ?? 'secondary'}>{cond?.label ?? r.condition as string}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.photo_url ? (
                        <a href={r.photo_url as string} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline">
                          Lihat Foto
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {r.notes as string ?? '—'}
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
