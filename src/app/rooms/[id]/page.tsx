import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Building2, Package, LogIn, CalendarCheck, Clock, Info, Users, DoorOpen } from 'lucide-react'
import { formatDateTime, formatRupiah, cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'
import { Badge } from '@/components/ui/badge'

export const revalidate = 30

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default async function RoomScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Find room by slug
  const { data: allRooms } = await sb.from('rooms').select('id, name').eq('is_active', true)
  const matched = allRooms?.find((r: { id: string; name: string }) => createSlug(r.name) === slug)
  if (!matched) notFound()
  const id = matched.id

  const { data: room } = await sb
    .from('rooms')
    .select('*, buildings(name)')
    .eq('id', id)
    .eq('is_active', true)
    .single() as { data: {
      id: string; name: string; room_code: string; floor: number | null
      capacity: number | null; room_type: string | null; base_price: number
      description: string | null; facilities: string[] | null; photo_url: string | null
      is_for_rent: boolean; buildings: { name: string } | null
    } | null }

  if (!room) notFound()

  // Check if room is currently in use by looking at active booking_items
  const now = new Date().toISOString()
  const { data: roomItems } = await sb
    .from('booking_items')
    .select('booking_id, bookings!booking_id(status, start_datetime, end_datetime)')
    .eq('room_id', id) as { data: Array<{ booking_id: string; bookings: { status: string; start_datetime: string; end_datetime: string } | null }> | null }

  const activeBooking = roomItems?.find(item => {
    const b = item.bookings
    return b &&
      ['approved', 'paid', 'active'].includes(b.status) &&
      b.start_datetime <= now &&
      b.end_datetime >= now
  })?.bookings as { status: string; end_datetime: string } | null

  const isOccupied = !!activeBooking

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
          {room.photo_url ? (
            <div className="relative h-56 w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
              <SafeImage
                src={room.photo_url}
                alt={room.name}
                className="object-contain w-full h-full"
                fallbackClassName="w-full h-full rounded-lg"
              />
            </div>
          ) : (
            <div className="h-36 bg-gradient-to-br from-blue-950 to-indigo-900 flex items-center justify-center">
              <DoorOpen className="h-14 w-14 text-white/25" />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold mb-0.5">{room.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Ruangan &mdash; {room.buildings?.name ?? 'Tanpa gedung'}
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs shrink-0">{room.room_code}</Badge>
            </div>
          </div>
        </div>

        {/* Booking status banner */}
        {isOccupied && activeBooking && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <CalendarCheck className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Sedang Digunakan</p>
              <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Tersedia kembali: {formatDateTime(activeBooking.end_datetime)}
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

        {/* Detail info */}
        <div className="bg-white rounded-2xl border shadow-sm px-5 py-1">
          {room.capacity && <InfoRow label="Kapasitas" value={<span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {room.capacity} orang</span>} />}
          {room.floor && <InfoRow label="Lantai" value={`Lantai ${room.floor}`} />}
          {room.room_type && <InfoRow label="Tipe Ruangan" value={room.room_type} />}
          {room.is_for_rent && <InfoRow label="Tarif Dasar" value={formatRupiah(room.base_price)} />}
        </div>

        {/* Facilities */}
        {room.facilities && room.facilities.length > 0 && (
          <div className="bg-white rounded-2xl border shadow-sm px-5 py-4">
            <p className="text-sm font-medium mb-3">Fasilitas</p>
            <div className="flex flex-wrap gap-2">
              {room.facilities.map((f: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {room.description && (
          <div className="bg-white rounded-2xl border shadow-sm px-5 py-4 flex gap-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-600 leading-relaxed">{room.description}</p>
          </div>
        )}

        {/* Inventory link */}
        <Link
          href={`/rooms/${slug}/inventory`}
          className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
        >
          <Package className="mr-2 h-4 w-4" />
          Lihat Inventaris Ruangan
        </Link>

        {/* CTA */}
        {!user ? (
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
            <LogIn className="mr-2 h-4 w-4" />
            Login untuk Meminjam
          </Link>
        ) : room.is_for_rent ? (
          <Link href={`/booking/new?roomId=${id}`} className={cn(buttonVariants(), 'w-full bg-blue-950 hover:bg-blue-900')}>
            Ajukan Peminjaman
          </Link>
        ) : null}
      </main>
    </div>
  )
}
