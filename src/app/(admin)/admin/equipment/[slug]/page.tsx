import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, Package, MapPin, Building2, Calendar, 
  Clock, Tag, AlertTriangle, QrCode, Edit, History,
  CheckCircle2, XCircle, AlertCircle
} from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { EquipmentQRCode } from '../EquipmentQRCode'

const CATEGORY_LABELS: Record<string, string> = {
  elektronik: 'Elektronik',
  mebel: 'Mebel',
  transportasi: 'Transportasi',
  alat_tes_pengukuran: 'Alat Tes Pengukuran',
  alat_gym: 'Alat Gym/Fitness',
  perlengkapan: 'Perlengkapan',
  lainnya: 'Lainnya',
}

const USER_CATEGORY_LABELS: Record<string, string> = {
  mahasiswa_s1: 'Mahasiswa S1',
  mahasiswa_s2: 'Mahasiswa S2/Pasca',
  dosen: 'Dosen',
  mou_unesa: 'MoU Unesa',
  umum: 'Umum',
}

const KETERSEDIAAN_CONFIG = {
  tersedia: { label: 'Tersedia', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  digunakan: { label: 'Sedang Digunakan', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock },
  hilang: { label: 'Hilang', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
}

const STATUS_TINDAKAN_CONFIG = {
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  perawatan: { label: 'Dalam Perawatan', color: 'bg-yellow-100 text-yellow-700' },
  menunggu_part: { label: 'Menunggu Part', color: 'bg-purple-100 text-purple-700' },
  afkir: { label: 'Afkir', color: 'bg-gray-100 text-gray-700' },
}

interface Props {
  params: Promise<{ slug: string }>
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function slugMatchesEquipment(slug: string, equipmentName: string): boolean {
  return createSlug(equipmentName) === slug
}

export default async function EquipmentDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: userData } = await sb
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
    redirect('/admin/dashboard')
  }

  // Find equipment by slug
  const { data: allEquipment } = await sb
    .from('equipment')
    .select('id, name')

  const matchedEquipment = allEquipment?.find((eq: { id: string; name: string }) => 
    slugMatchesEquipment(slug, eq.name)
  )

  if (!matchedEquipment) {
    notFound()
  }

  const equipmentId = matchedEquipment.id

  // Get full equipment data with storage room and building
  const { data: equipment } = await sb
    .from('equipment')
    .select(`
      *,
      building:building_id(id, name, code),
      storage_room:storage_room_id(id, name, room_code, buildings(name, code))
    `)
    .eq('id', equipmentId)
    .single()

  if (!equipment) {
    notFound()
  }

  // Get equipment rates
  const { data: rates } = await sb
    .from('equipment_rates')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('user_category')

  // Get active and upcoming bookings
  const now = new Date().toISOString()
  
  const { data: activeBookings } = await sb
    .from('equipment_booking_slots')
    .select(`
      id,
      slot,
      quantity,
      status,
      booking:booking_id(
        id,
        booking_code,
        user:user_id(full_name, email),
        purpose,
        status
      )
    `)
    .eq('equipment_id', equipmentId)
    .gte('slot', `["${now}"]`)
    .order('slot', { ascending: true })
    .limit(10)

  // Get booking history (past bookings)
  const { data: pastBookings } = await sb
    .from('equipment_booking_slots')
    .select(`
      id,
      slot,
      quantity,
      status,
      booking:booking_id(
        id,
        booking_code,
        user:user_id(full_name, email),
        purpose,
        status
      )
    `)
    .eq('equipment_id', equipmentId)
    .lt('slot', `["${now}"]`)
    .order('slot', { ascending: false })
    .limit(5)

  const ketersediaanConfig = KETERSEDIAAN_CONFIG[equipment.ketersediaan as keyof typeof KETERSEDIAAN_CONFIG] || 
    { label: equipment.ketersediaan, color: 'bg-gray-100 text-gray-700', icon: AlertCircle }

  const statusTindakanConfig = STATUS_TINDAKAN_CONFIG[equipment.status_tindakan as keyof typeof STATUS_TINDAKAN_CONFIG] ||
    { label: equipment.status_tindakan, color: 'bg-gray-100 text-gray-700' }

  const KetersediaanIcon = ketersediaanConfig.icon

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/admin/equipment" 
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Alat
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{equipment.name}</h1>
              <Badge variant={equipment.is_active ? 'default' : 'secondary'}>
                {equipment.is_active ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </div>
            {equipment.equipment_code && (
              <p className="text-slate-500 font-mono text-sm">
                Kode: {equipment.equipment_code}
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href={`/admin/equipment/${slug}/edit`}>
                <Edit className="h-4 w-4 mr-2" /> Edit Alat
              </Link>
            </Button>
            <EquipmentQRCode 
              equipmentId={equipment.id}
              equipmentName={equipment.name}
              equipmentCode={equipment.equipment_code}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Photo & Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Photo Card */}
          <Card className="overflow-hidden">
            <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
              {equipment.photo_url ? (
                <SafeImage
                  src={equipment.photo_url}
                  alt={equipment.name}
                  className="object-contain w-full h-full"
                  fallbackClassName="w-full h-full rounded-lg"
                />
              ) : (
                <Package className="h-24 w-24 text-slate-300" />
              )}
            </div>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ketersediaan */}
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                ketersediaanConfig.color
              )}>
                <KetersediaanIcon className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{ketersediaanConfig.label}</p>
                  <p className="text-xs opacity-75">Ketersediaan saat ini</p>
                </div>
              </div>

              {/* Status Tindakan */}
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl",
                statusTindakanConfig.color
              )}>
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{statusTindakanConfig.label}</p>
                  <p className="text-xs opacity-75">Status tindakan</p>
                </div>
              </div>

              {/* Condition */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Kondisi:</span>
                <ConditionBadge condition={equipment.current_condition} />
              </div>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Lokasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Building */}
              {equipment.building && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{equipment.building.name}</p>
                    <p className="text-xs text-slate-500">{equipment.building.code}</p>
                  </div>
                </div>
              )}
              
              {/* Floor */}
              {equipment.floor && (
                <div className="flex items-start gap-3">
                  <div className="h-4 w-4 flex items-center justify-center text-slate-400 text-xs font-bold">L</div>
                  <div>
                    <p className="text-xs text-slate-500">Lantai</p>
                    <p className="font-medium text-sm">Lantai {equipment.floor}</p>
                  </div>
                </div>
              )}
              
              {/* Room */}
              {equipment.storage_room && (
                <div className="flex items-start gap-3">
                  <div className="h-4 w-4 flex items-center justify-center text-slate-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Ruangan</p>
                    <p className="font-medium text-sm">{equipment.storage_room.name}</p>
                    {equipment.storage_room.room_code && (
                      <p className="text-xs font-mono text-slate-400">{equipment.storage_room.room_code}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Additional location info */}
              {equipment.current_location && (
                <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Keterangan Tambahan</p>
                    <p className="text-sm">{equipment.current_location}</p>
                  </div>
                </div>
              )}
              
              {/* Show message if no location data */}
              {!equipment.building && !equipment.floor && !equipment.storage_room && !equipment.current_location && (
                <p className="text-sm text-slate-400 italic">Lokasi belum ditentukan</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details & Bookings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Informasi Alat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Kategori</p>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-slate-400" />
                    <p className="font-medium">
                      {CATEGORY_LABELS[equipment.category] || equipment.category}
                    </p>
                  </div>
                </div>
                
                {equipment.merk && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Merk/Brand</p>
                    <p className="font-medium">{equipment.merk}</p>
                  </div>
                )}
                
                {equipment.sumber && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Sumber Perolehan</p>
                    <p className="font-medium">{equipment.sumber}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-slate-500 mb-1">Terakhir Diupdate</p>
                  <p className="font-medium">
                    {equipment.updated_at 
                      ? new Date(equipment.updated_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '-'
                    }
                  </p>
                </div>
              </div>

              {equipment.description && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-slate-500 mb-2">Deskripsi</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{equipment.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rates Card */}
          {rates && rates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Tarif Sewa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rates.map((rate: { 
                    user_category: string
                    rate_per_day: number
                    rate_per_hour: number | null
                    requires_supervision: boolean 
                  }) => (
                    <div 
                      key={rate.user_category}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">
                          {USER_CATEGORY_LABELS[rate.user_category] || rate.user_category}
                        </p>
                        {rate.requires_supervision && (
                          <Badge variant="outline" className="text-xs">Perlu Supervisi</Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-emerald-600">
                          {formatRupiah(rate.rate_per_day)}
                          <span className="text-sm font-normal text-slate-500">/hari</span>
                        </p>
                        {rate.rate_per_hour && (
                          <p className="text-sm text-slate-500">
                            {formatRupiah(rate.rate_per_hour)}/jam
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Bookings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Jadwal Penggunaan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeBookings && activeBookings.length > 0 ? (
                <div className="space-y-3">
                  {activeBookings.map((bookingSlot: {
                    id: string
                    slot: string
                    quantity: number
                    status: string
                    booking: {
                      id: string
                      booking_code: string
                      user: { full_name: string; email: string }
                      purpose: string
                      status: string
                    }
                  }) => {
                    const slotData = bookingSlot.slot as unknown as { lower: string; upper: string }
                    const startDate = new Date(slotData.lower)
                    const endDate = new Date(slotData.upper)
                    const isCurrentlyActive = startDate <= new Date() && endDate >= new Date()
                    
                    return (
                      <div 
                        key={bookingSlot.id}
                        className={cn(
                          "p-4 rounded-xl border",
                          isCurrentlyActive 
                            ? "bg-orange-50 border-orange-200" 
                            : "bg-slate-50 border-slate-200"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isCurrentlyActive && (
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                              )}
                              <p className="font-medium text-sm">
                                {bookingSlot.booking.purpose || 'Peminjaman'}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {bookingSlot.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">
                              Kode: {bookingSlot.booking.booking_code}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {startDate.toLocaleDateString('id-ID')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - 
                                {endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                              Oleh: {bookingSlot.booking.user?.full_name || bookingSlot.booking.user?.email}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/bookings/${bookingSlot.booking.id}`}>
                              Detail
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Tidak ada jadwal penggunaan aktif</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Bookings History */}
          {pastBookings && pastBookings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" /> Riwayat Penggunaan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pastBookings.map((bookingSlot: {
                    id: string
                    slot: string
                    quantity: number
                    status: string
                    booking: {
                      id: string
                      booking_code: string
                      user: { full_name: string; email: string }
                      purpose: string
                      status: string
                    }
                  }) => {
                    const slotData = bookingSlot.slot as unknown as { lower: string; upper: string }
                    const startDate = new Date(slotData.lower)
                    
                    return (
                      <div 
                        key={bookingSlot.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-medium">
                              {bookingSlot.booking.purpose || 'Peminjaman'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {startDate.toLocaleDateString('id-ID')} • {bookingSlot.booking.user?.full_name}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {bookingSlot.status}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
