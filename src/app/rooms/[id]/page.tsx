import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Building2, 
  Package, 
  LogIn, 
  CalendarCheck, 
  Clock, 
  Info, 
  Users, 
  DoorOpen,
  MapPin,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Layers
} from 'lucide-react'
import { formatDateTime, formatRupiah, cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'

export const revalidate = 30

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

interface RoomRate {
  usage_category: string
  rate_per_hour: number | null
  rate_per_day: number
}

interface Booking {
  status: string
  start_datetime: string
  end_datetime: string
}

interface BookingItem {
  booking_id: string
  bookings: Booking | null
}

const USER_CATEGORY_LABELS: Record<string, string> = {
  'mahasiswa_s1': 'Mahasiswa S1',
  'mahasiswa_s2': 'Mahasiswa S2/S3',
  'dosen': 'Dosen/Karyawan',
  'mou_unesa': 'Kerjasama',
  'umum': 'Umum'
}

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    .select('*, buildings(name, code, address)')
    .eq('id', id)
    .eq('is_active', true)
    .single() as { data: {
      id: string; name: string; room_code: string; floor: number | null
      capacity: number | null; room_type: string | null; base_price: number
      description: string | null; facilities: string[] | null; photo_url: string | null
      is_for_rent: boolean; buildings: { name: string; code: string; address: string | null } | null
    } | null }

  if (!room) notFound()

  // Fetch room rates
  const { data: roomRates } = await sb
    .from('room_rates')
    .select('usage_category, rate_per_hour, rate_per_day')
    .eq('room_id', id) as { data: RoomRate[] | null }

  // Check if room is currently in use by looking at active booking_items
  const now = new Date().toISOString()
  const { data: roomItems } = await sb
    .from('booking_items')
    .select('booking_id, bookings!booking_id(status, start_datetime, end_datetime)')
    .eq('room_id', id) as { data: BookingItem[] | null }

  const activeBooking = roomItems?.find(item => {
    const b = item.bookings
    return b &&
      ['approved', 'paid', 'active'].includes(b.status) &&
      b.start_datetime <= now &&
      b.end_datetime >= now
  })?.bookings as { status: string; end_datetime: string } | null

  const isOccupied = !!activeBooking
  const isAvailable = !isOccupied

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/catalog" className="flex items-center gap-2 text-[#374151] hover:text-[#111827] transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Kembali ke Katalog</span>
          </Link>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#1B3A8C]" />
            <span className="font-bold text-[#111827]">Sewa Ruang & Alat</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#6B7280] mb-6">
          <Link href="/catalog" className="hover:text-[#1B3A8C]">Katalog</Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-[#1B3A8C]">Ruangan</Link>
          <span>/</span>
          <span className="text-[#111827] font-medium">{room.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Photo Gallery & Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Gallery */}
            <Card className="border border-[#E5E7EB] rounded-[14px] overflow-hidden shadow-sm">
              <div className="relative aspect-[16/9] bg-[#F3F4F6]">
                {room.photo_url ? (
                  <SafeImage
                    src={room.photo_url}
                    alt={room.name}
                    className="object-cover w-full h-full"
                    fallbackClassName="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <DoorOpen className="h-24 w-24 text-[#D1D5DB]" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <Badge className={cn(
                    "text-sm font-medium border-0 px-3 py-1",
                    isAvailable 
                      ? "bg-emerald-500 text-white" 
                      : "bg-red-500 text-white"
                  )}>
                    {isAvailable ? 'Tersedia' : 'Sedang Digunakan'}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Room Info */}
            <Card className="border border-[#E5E7EB] rounded-[14px] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] mb-2">{room.name}</h1>
                    <div className="flex items-center gap-2 text-[#6B7280]">
                      <MapPin className="h-4 w-4" />
                      <span>{room.buildings?.name ?? 'Tanpa gedung'}</span>
                      {room.buildings?.code && (
                        <Badge variant="outline" className="text-xs font-mono ml-2">
                          {room.buildings.code}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-sm shrink-0">
                    {room.room_code}
                  </Badge>
                </div>

                {/* Status Banner */}
                {isOccupied && activeBooking && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
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
                {isAvailable && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <p className="text-sm font-medium text-emerald-800">Tersedia untuk dipinjam</p>
                  </div>
                )}

                {/* Info Cards Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {room.capacity && (
                    <div className="bg-[#F9FAFB] rounded-xl p-4 text-center">
                      <Users className="h-5 w-5 text-[#1B3A8C] mx-auto mb-2" />
                      <p className="text-xs text-[#6B7280] mb-1">Kapasitas</p>
                      <p className="font-semibold text-[#111827]">{room.capacity} orang</p>
                    </div>
                  )}
                  {room.floor !== null && (
                    <div className="bg-[#F9FAFB] rounded-xl p-4 text-center">
                      <Layers className="h-5 w-5 text-[#1B3A8C] mx-auto mb-2" />
                      <p className="text-xs text-[#6B7280] mb-1">Lantai</p>
                      <p className="font-semibold text-[#111827]">Lantai {room.floor}</p>
                    </div>
                  )}
                  {room.room_type && (
                    <div className="bg-[#F9FAFB] rounded-xl p-4 text-center">
                      <Building2 className="h-5 w-5 text-[#1B3A8C] mx-auto mb-2" />
                      <p className="text-xs text-[#6B7280] mb-1">Tipe</p>
                      <p className="font-semibold text-[#111827]">{room.room_type}</p>
                    </div>
                  )}
                  <div className="bg-[#F9FAFB] rounded-xl p-4 text-center">
                    <MapPin className="h-5 w-5 text-[#1B3A8C] mx-auto mb-2" />
                    <p className="text-xs text-[#6B7280] mb-1">Gedung</p>
                    <p className="font-semibold text-[#111827]">{room.buildings?.name ?? '-'}</p>
                  </div>
                </div>

                {/* Description */}
                {room.description && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-[#111827] mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4 text-[#6B7280]" />
                      Deskripsi
                    </h3>
                    <p className="text-[#6B7280] leading-relaxed">{room.description}</p>
                  </div>
                )}

                {/* Facilities */}
                {room.facilities && room.facilities.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[#111827] mb-3">Fasilitas</h3>
                    <div className="flex flex-wrap gap-2">
                      {room.facilities.map((f: string, i: number) => (
                        <Badge key={i} variant="secondary" className="bg-[#EFF3FF] text-[#1B3A8C] hover:bg-[#EFF3FF]/80 text-xs px-3 py-1">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Link */}
            <Link href={`/rooms/${slug}/inventory`}>
              <Card className="border border-[#E5E7EB] rounded-[14px] shadow-sm hover:shadow-md hover:border-[#1B3A8C]/30 transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#EFF3FF] rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-[#1B3A8C]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#111827]">Lihat Inventaris Ruangan</p>
                      <p className="text-sm text-[#6B7280]">Daftar peralatan yang tersedia di ruangan ini</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#6B7280] group-hover:text-[#1B3A8C] transition-colors" />
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Right Column - Pricing & CTA */}
          <div className="space-y-6">
            {/* Tariff Table */}
            <Card className="border border-[#E5E7EB] rounded-[14px] shadow-sm sticky top-24">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#111827] mb-4">Tarif Sewa</h3>
                
                {roomRates && roomRates.length > 0 ? (
                  <div className="space-y-4">
                    {roomRates.map((rate, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3 border-b border-[#E5E7EB] last:border-0">
                        <div>
                          <p className="font-medium text-[#111827] text-sm">
                            {USER_CATEGORY_LABELS[rate.usage_category] || rate.usage_category}
                          </p>
                          {rate.rate_per_hour && (
                            <p className="text-xs text-[#6B7280]">
                              {formatRupiah(rate.rate_per_hour)}/jam
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#1B3A8C]">{formatRupiah(rate.rate_per_day)}</p>
                          <p className="text-xs text-[#6B7280]">/hari</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[#9CA3AF] text-sm">Tarif belum diatur</p>
                  </div>
                )}

                {/* CTA Buttons */}
                <div className="mt-6 pt-6 border-t border-[#E5E7EB] space-y-3">
                  {!user ? (
                    <Link href="/login">
                      <Button variant="outline" className="w-full h-12 border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]">
                        <LogIn className="mr-2 h-4 w-4" />
                        Login untuk Meminjam
                      </Button>
                    </Link>
                  ) : room.is_for_rent ? (
                    <Link href={`/booking/new?room_id=${id}`}>
                      <Button className="w-full h-12 bg-[#1B3A8C] hover:bg-[#1B3A8C]/90 text-white font-medium">
                        Ajukan Peminjaman
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="w-full h-12 bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed">
                      Tidak Tersedia untuk Dipinjam
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Base Price Card (if exists) */}
            {room.base_price > 0 && (
              <Card className="border border-[#E5E7EB] rounded-[14px] shadow-sm bg-[#EFF3FF]">
                <CardContent className="p-4">
                  <p className="text-sm text-[#6B7280] mb-1">Tarif Dasar</p>
                  <p className="text-2xl font-bold text-[#1B3A8C]">{formatRupiah(room.base_price)}</p>
                  <p className="text-xs text-[#6B7280]">per hari</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
