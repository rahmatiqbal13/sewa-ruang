import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { CalendarDays, Package, Plus } from 'lucide-react'

export default async function BorrowerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: bookings }, { data: profile }] = await Promise.all([
    sb.from('bookings')
      .select('id, reference_no, status, start_datetime, total_amount, booking_assets(assets(name))')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(5) as Promise<{data: Array<Record<string, any>> | null}>,
    sb.from('users').select('name, institution, class_division').eq('id', user!.id).single() as Promise<{data: {name:string;institution:string;class_division:string} | null}>,
  ])

  const pending = bookings?.filter(b => b.status === 'pending').length ?? 0
  const approved = bookings?.filter(b => ['approved', 'paid'].includes(b.status)).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Halo, {profile?.name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground text-sm">{profile?.institution} — {profile?.class_division}</p>
        </div>
        <Link href="/booking/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Ajukan Peminjaman
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-sm text-muted-foreground">Menunggu Persetujuan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{approved}</p>
                <p className="text-sm text-muted-foreground">Disetujui / Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pengajuan Terbaru</CardTitle>
          <Link href="/bookings" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Lihat Semua</Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookings?.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">
              Belum ada pengajuan.{' '}
              <Link href="/booking/new" className="text-primary hover:underline">Buat sekarang</Link>
            </p>
          )}
          {bookings?.map((b) => {
            const assetName = (b.booking_assets as Array<{assets:{name:string}|null}>)?.[0]?.assets?.name
            return (
              <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-zinc-50 transition-colors">
                <div>
                  <p className="font-medium text-sm">{assetName}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(b.start_datetime)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <BookingStatusBadge status={b.status} />
                  <span className="text-xs text-muted-foreground">{formatRupiah(b.total_amount)}</span>
                </div>
              </Link>
            )
          })}
        </CardContent>
      </Card>

      <div className="text-center pt-2">
        <Link href="/catalog" className={buttonVariants({ variant: 'outline' })}>Lihat Katalog Lengkap</Link>
      </div>
    </div>
  )
}
