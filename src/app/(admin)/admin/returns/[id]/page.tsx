import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RecordReturnForm } from './RecordReturnForm'
import { formatDateTime } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function RecordReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (supabase.from('bookings') as any)
    .select('*, users(name), booking_assets(assets(name, category))')
    .eq('id', id)
    .single() as { data: Record<string, any> | null }

  if (!booking) notFound()

  const assetNames = (booking.booking_assets as Array<{assets:{name:string}|null}>)
    ?.map(ba => ba.assets?.name).filter(Boolean).join(', ')

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Catat Pengembalian</h1>

      <Card>
        <CardHeader><CardTitle className="text-sm">Informasi Peminjaman</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Referensi:</span> {booking.reference_no}</p>
          <p><span className="text-muted-foreground">Peminjam:</span> {(booking.users as {name:string}|null)?.name}</p>
          <p><span className="text-muted-foreground">Aset:</span> {assetNames}</p>
          <p><span className="text-muted-foreground">Jadwal Selesai:</span> {formatDateTime(booking.end_datetime)}</p>
        </CardContent>
      </Card>

      <RecordReturnForm bookingId={id} />
    </div>
  )
}
