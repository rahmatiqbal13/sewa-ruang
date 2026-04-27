import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { Building2, Clock, Package, LogIn, CalendarCheck, ImageOff, Info } from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { AvailabilityBadge } from '@/components/shared/AvailabilityBadge'
import { ActionStatusBadge } from '@/components/shared/ActionStatusBadge'
import Image from 'next/image'

export const revalidate = 30

export default async function AssetScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: asset } = await sb
    .from('assets')
    .select('id, name, category, current_condition, current_location, description, photo_url, buildings(name), merk, ketersediaan, status_tindakan, sumber, tgl_terakhir_cek')
    .eq('id', id)
    .single() as { data: {
      id: string; name: string; category: string; current_condition: string
      current_location: string | null; description: string | null; photo_url: string | null
      buildings: {name: string} | null; merk: string | null; ketersediaan: string | null
      status_tindakan: string | null; sumber: string | null; tgl_terakhir_cek: string | null
    } | null }

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

  const isRoom = asset.category === 'room'
  const isOccupied = !!activeBooking
  const booking = activeBooking?.bookings as { status: string; end_datetime: string } | null

  function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between py-2.5 border-b last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-right">{value}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-blue-950 text-white">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <span className="font-bold">Sewa Ruang & Alat</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* Photo / hero */}
        <div className="rounded-2xl overflow-hidden border shadow-sm bg-white">
          {asset.photo_url ? (
            <div className="relative h-52 w-full">
              <Image src={asset.photo_url} alt={asset.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="h-36 bg-gradient-to-br from-blue-950 to-indigo-900 flex items-center justify-center">
              {isRoom
                ? <Building2 className="h-14 w-14 text-white/25" />
                : <Package className="h-14 w-14 text-white/25" />}
            </div>
          )}
          <div className="p-5">
            <h1 className="text-xl font-bold mb-0.5">{asset.name}</h1>
            <p className="text-sm text-muted-foreground">
              {isRoom ? 'Ruangan' : 'Alat / Peralatan'} &mdash; {asset.buildings?.name ?? 'Tanpa gedung'}
            </p>
            {!asset.photo_url && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ImageOff className="h-3.5 w-3.5" /> Foto belum tersedia
              </div>
            )}
          </div>
        </div>

        {/* Booking status banner */}
        {isOccupied && booking && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <CalendarCheck className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Sedang Dipinjam</p>
              <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Tersedia kembali: {formatDateTime(booking.end_datetime)}
              </p>
            </div>
          </div>
        )}
        {!isOccupied && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <CalendarCheck className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800">Tersedia untuk dipinjam</p>
          </div>
        )}

        {/* Detail info card */}
        <div className="bg-white rounded-2xl border shadow-sm px-5 py-1">
          <InfoRow label="Kondisi" value={
            <ConditionBadge condition={asset.current_condition as 'good' | 'needs_repair' | 'damaged' | 'lost'} />
          } />
          {!isRoom && asset.ketersediaan && (
            <InfoRow label="Ketersediaan" value={
              <AvailabilityBadge status={asset.ketersediaan as 'tersedia' | 'digunakan' | 'hilang'} />
            } />
          )}
          {!isRoom && asset.status_tindakan && (
            <InfoRow label="Status Tindakan" value={
              <ActionStatusBadge status={asset.status_tindakan as 'normal' | 'perawatan' | 'menunggu_part' | 'afkir'} />
            } />
          )}
          {asset.current_location && (
            <InfoRow label="Lokasi" value={asset.current_location} />
          )}
          {!isRoom && asset.merk && (
            <InfoRow label="Merk / Produsen" value={asset.merk} />
          )}
          {!isRoom && asset.sumber && (
            <InfoRow label="Sumber Pengadaan" value={asset.sumber} />
          )}
          {!isRoom && asset.tgl_terakhir_cek && (
            <InfoRow label="Terakhir Dicek" value={new Date(asset.tgl_terakhir_cek).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
          )}
        </div>

        {/* Description */}
        {asset.description && (
          <div className="bg-white rounded-2xl border shadow-sm px-5 py-4 flex gap-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-600 leading-relaxed">{asset.description}</p>
          </div>
        )}

        {/* Room inventory link */}
        {isRoom && (
          <Link
            href={`/rooms/${id}/inventory`}
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
          >
            <Package className="mr-2 h-4 w-4" />
            Lihat Inventaris Ruangan
          </Link>
        )}

        {/* Admin action */}
        {!user && (
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
            <LogIn className="mr-2 h-4 w-4" />
            Login untuk Update Data (Admin/Staff)
          </Link>
        )}
        {user && (
          <Link href={`/admin/assets/${id}/edit`} className={cn(buttonVariants(), 'w-full bg-blue-950 hover:bg-blue-900')}>
            Update Kondisi Aset
          </Link>
        )}
      </main>
    </div>
  )
}
