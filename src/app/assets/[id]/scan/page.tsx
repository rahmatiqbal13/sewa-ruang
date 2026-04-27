import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { Building2, Clock, Package, LogIn } from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'

export const revalidate = 30

export default async function AssetScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: asset } = await sb
    .from('assets')
    .select('id, name, category, current_condition, current_location, description, buildings(name)')
    .eq('id', id)
    .single() as { data: {id:string;name:string;category:string;current_condition:string;current_location:string|null;description:string|null;buildings:{name:string}|null} | null }

  if (!asset) notFound()

  const { data: activeBooking } = await sb
    .from('booking_assets')
    .select('bookings(status, start_datetime, end_datetime)')
    .eq('asset_id', id)
    .in('bookings.status', ['approved', 'paid'])
    .lte('bookings.start_datetime', new Date().toISOString())
    .gte('bookings.end_datetime', new Date().toISOString())
    .limit(1)
    .maybeSingle() as { data: { bookings: unknown } | null }

  const conditionMap: Record<string, { label: string; variant: 'default'|'outline'|'destructive' }> = {
    good: { label: 'Baik', variant: 'default' },
    needs_repair: { label: 'Perlu Perbaikan', variant: 'outline' },
    damaged: { label: 'Rusak', variant: 'destructive' },
    lost: { label: 'Hilang', variant: 'destructive' },
  }

  const cond = conditionMap[asset.current_condition]
  const isOccupied = !!activeBooking
  const booking = activeBooking?.bookings as {status:string;end_datetime:string}|null

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-bold text-primary">Sewa Ruang & Alat</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-start gap-3">
          <Package className="h-6 w-6 text-muted-foreground mt-1" />
          <div>
            <h1 className="text-2xl font-bold">{asset.name}</h1>
            <p className="text-muted-foreground text-sm">
              {asset.category === 'room' ? 'Ruang' : 'Alat'} — {(asset.buildings as {name:string}|null)?.name ?? 'Tanpa gedung'}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status Ketersediaan</span>
              <Badge variant={isOccupied ? 'destructive' : 'default'}>
                {isOccupied ? 'Sedang Dipinjam' : 'Tersedia'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Kondisi</span>
              <Badge variant={cond?.variant ?? 'secondary'}>{cond?.label ?? asset.current_condition}</Badge>
            </div>
            {asset.current_location && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lokasi</span>
                <span className="text-sm">{asset.current_location}</span>
              </div>
            )}
            {isOccupied && booking && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Clock className="h-3 w-3" />
                Tersedia kembali: {formatDateTime(booking.end_datetime)}
              </div>
            )}
            {asset.description && (
              <p className="text-sm text-muted-foreground pt-2 border-t">{asset.description}</p>
            )}
          </CardContent>
        </Card>

        {!user && (
          <div className="text-center pt-2">
            <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
              <LogIn className="mr-2 h-4 w-4" />
              Login untuk Update Data (Admin/Staff)
            </Link>
          </div>
        )}

        {user && (
          <div className="text-center pt-2">
            <Link href={`/admin/assets/${id}/edit`} className={cn(buttonVariants(), 'w-full')}>
              Update Kondisi Aset
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
