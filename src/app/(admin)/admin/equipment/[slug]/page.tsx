import { createClient, createAdminDbClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, Package, MapPin, Building2, Calendar, 
  Clock, Tag, AlertTriangle, QrCode, Edit, History,
  CheckCircle2, XCircle, AlertCircle, ClipboardCheck
} from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { EquipmentQRCode } from '../EquipmentQRCode'
import { SoftDeleteButton, RestoreButton } from '../SoftDeleteButtons'
import { CheckForm } from './CheckForm'

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
  tidak_tersedia: { label: 'Tidak Tersedia', color: 'bg-muted text-foreground/80 border-border', icon: AlertCircle },
}

const STATUS_TINDAKAN_CONFIG = {
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  perawatan: { label: 'Dalam Perawatan', color: 'bg-yellow-100 text-yellow-700' },
  menunggu_part: { label: 'Menunggu Part', color: 'bg-purple-100 text-purple-700' },
  afkir: { label: 'Afkir', color: 'bg-muted text-foreground/80' },
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
  const sb = createAdminDbClient()
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
    .single() as any

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
  
  let { data: activeBookings } = await sb
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
    .limit(10) as any

  // Fallback: check booking_items for legacy bookings without equipment_booking_slots
  if (!activeBookings || activeBookings.length === 0) {
    const { data: activeBookingList } = await sb
      .from('bookings')
      .select('id, reference_no, user_id, purpose, status, start_datetime, end_datetime')
      .in('status', ['pending', 'approved', 'paid', 'active'])
      .gte('end_datetime', now)
      .order('start_datetime', { ascending: true })
      .limit(10)

    const activeBookingIds = (activeBookingList ?? []).map((b: {id: string}) => b.id)

    if (activeBookingIds.length > 0) {
      const { data: legacyItems } = await sb
        .from('booking_items')
        .select('id, quantity, booking_id')
        .eq('equipment_id', equipmentId)
        .eq('item_type', 'equipment')
        .in('booking_id', activeBookingIds)

      if (legacyItems && legacyItems.length > 0) {
        activeBookings = legacyItems.map((item: any) => {
          const b = (activeBookingList as any[]).find((ab: any) => ab.id === item.booking_id)
          if (!b) return null
          return {
            id: item.id,
            slot: `["${b.start_datetime}", "${b.end_datetime}"]`,
            quantity: item.quantity,
            status: b.status,
            booking: {
              id: b.id,
              booking_code: b.reference_no,
              user: { full_name: b.user_id, email: '' },
              purpose: b.purpose,
              status: b.status,
            }
          }
        }).filter(Boolean)
      }
    }
  }

  // Get booking history (past bookings)
  let { data: pastBookings } = await sb
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
    .limit(5) as any

  // Fallback for past bookings
  if (!pastBookings || pastBookings.length === 0) {
    const { data: pastBookingList } = await sb
      .from('bookings')
      .select('id, reference_no, user_id, purpose, status, start_datetime, end_datetime')
      .in('status', ['pending', 'approved', 'paid', 'active', 'completed', 'cancelled'])
      .lt('end_datetime', now)
      .order('start_datetime', { ascending: false })
      .limit(5)

    const pastBookingIds = (pastBookingList ?? []).map((b: {id: string}) => b.id)

    if (pastBookingIds.length > 0) {
      const { data: legacyPastItems } = await sb
        .from('booking_items')
        .select('id, quantity, booking_id')
        .eq('equipment_id', equipmentId)
        .eq('item_type', 'equipment')
        .in('booking_id', pastBookingIds)

      if (legacyPastItems && legacyPastItems.length > 0) {
        pastBookings = legacyPastItems.map((item: any) => {
          const b = (pastBookingList as any[]).find((pb: any) => pb.id === item.booking_id)
          if (!b) return null
          return {
            id: item.id,
            slot: `["${b.start_datetime}", "${b.end_datetime}"]`,
            quantity: item.quantity,
            status: b.status,
            booking: {
              id: b.id,
              booking_code: b.reference_no,
              user: { full_name: b.user_id, email: '' },
              purpose: b.purpose,
              status: b.status,
            }
          }
        }).filter(Boolean)
      }
    }
  }

  // Get equipment check logs
  const { data: checkLogs } = await sb
    .from('equipment_checks')
    .select('id, checked_at, condition, notes, checked_by_name')
    .eq('equipment_id', equipmentId)
    .order('checked_at', { ascending: false })
    .limit(10)

  // Check if equipment is currently borrowed (has active booking)
  const hasActiveBooking = activeBookings && activeBookings.length > 0

  const ketersediaanConfig = hasActiveBooking
    ? KETERSEDIAAN_CONFIG['digunakan']
    : (KETERSEDIAAN_CONFIG[equipment.ketersediaan as keyof typeof KETERSEDIAAN_CONFIG] || 
       { label: equipment.ketersediaan, color: 'bg-muted text-foreground/80', icon: AlertCircle })

  const statusTindakanConfig = STATUS_TINDAKAN_CONFIG[equipment.status_tindakan as keyof typeof STATUS_TINDAKAN_CONFIG] ||
    { label: equipment.status_tindakan, color: 'bg-muted text-foreground/80' }

  const KetersediaanIcon = ketersediaanConfig.icon

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/admin/equipment" 
          className="text-sm text-muted-foreground hover:text-foreground/80 flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Alat
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{equipment.name}</h1>
              <Badge variant={equipment.is_active ? 'default' : 'secondary'}>
                {equipment.is_active ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </div>
            {equipment.equipment_code && (
              <p className="text-muted-foreground font-mono text-sm">
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
            {equipment.is_active ? (
              <SoftDeleteButton 
                equipmentId={equipment.id}
                equipmentName={equipment.name}
              />
            ) : (
              <RestoreButton 
                equipmentId={equipment.id}
                equipmentName={equipment.name}
              />
            )}
          </div>
        </div>
      </div>

      {/* Active Booking Warning */}
      {hasActiveBooking && activeBookings && activeBookings.length > 0 && (
        <div className="mb-6 p-4 rounded-[10px] bg-orange-50 border border-orange-200">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-orange-800">Alat Sedang Dipinjam</p>
              <p className="text-sm text-orange-700 mt-1">
                {activeBookings.length} peminjaman aktif saat ini.
                {activeBookings[0]?.booking?.booking_code && (
                  <span> Kode booking: {activeBookings[0].booking.booking_code}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Photo & Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Photo Card */}
          <Card className="overflow-hidden">
            <div className="aspect-square bg-primary flex items-center justify-center p-4">
              {equipment.photo_url ? (
                <SafeImage
                  src={equipment.photo_url}
                  alt={equipment.name}
                  className="object-contain w-full h-full"
                  fallbackClassName="w-full h-full rounded-[10px]"
                />
              ) : (
                <Package className="h-24 w-24 text-muted-foreground/30" />
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
              {/* Aktif/Nonaktif Badge */}
              {!equipment.is_active && (
                <div className="flex items-center gap-3 p-3 rounded-[14px] bg-muted border border-border">
                  <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground/80">Nonaktif</p>
                    <p className="text-xs text-muted-foreground">Alat tidak ditampilkan di katalog</p>
                  </div>
                </div>
              )}

              {/* Ketersediaan */}
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-[14px] border",
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
                "flex items-center gap-3 p-3 rounded-[14px]",
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
                <span className="text-sm text-muted-foreground">Kondisi:</span>
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
                  <Building2 className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{equipment.building.name}</p>
                    <p className="text-xs text-muted-foreground">{equipment.building.code}</p>
                  </div>
                </div>
              )}
              
              {/* Floor */}
              {equipment.floor && (
                <div className="flex items-start gap-3">
                  <div className="h-4 w-4 flex items-center justify-center text-muted-foreground/70 text-xs font-bold">L</div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lantai</p>
                    <p className="font-medium text-sm">Lantai {equipment.floor}</p>
                  </div>
                </div>
              )}
              
              {/* Room */}
              {equipment.storage_room && (
                <div className="flex items-start gap-3">
                  <div className="h-4 w-4 flex items-center justify-center text-muted-foreground/70">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ruangan</p>
                    <p className="font-medium text-sm">{equipment.storage_room.name}</p>
                    {equipment.storage_room.room_code && (
                      <p className="text-xs font-mono text-muted-foreground/70">{equipment.storage_room.room_code}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Additional location info */}
              {equipment.current_location && (
                <div className="flex items-start gap-3 pt-2 border-t border-border/60">
                  <MapPin className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Keterangan Tambahan</p>
                    <p className="text-sm">{equipment.current_location}</p>
                  </div>
                </div>
              )}
              
              {/* Show message if no location data */}
              {!equipment.building && !equipment.floor && !equipment.storage_room && !equipment.current_location && (
                <p className="text-sm text-muted-foreground/70 italic">Lokasi belum ditentukan</p>
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
                  <p className="text-sm text-muted-foreground mb-1">Kategori</p>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground/70" />
                    <p className="font-medium">
                      {CATEGORY_LABELS[equipment.category] || equipment.category}
                    </p>
                  </div>
                </div>
                
                {equipment.merk && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Merk/Brand</p>
                    <p className="font-medium">{equipment.merk}</p>
                  </div>
                )}
                
                {equipment.sumber && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Sumber Perolehan</p>
                    <p className="font-medium">{equipment.sumber}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Terakhir Diupdate</p>
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
                  <p className="text-sm text-muted-foreground mb-2">Deskripsi</p>
                  <p className="text-foreground/80 whitespace-pre-wrap">{equipment.description}</p>
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
                      className="p-4 bg-muted rounded-[14px] border border-border/60"
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
                          <span className="text-sm font-normal text-muted-foreground">/hari</span>
                        </p>
                        {rate.rate_per_hour && (
                          <p className="text-sm text-muted-foreground">
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
                          "p-4 rounded-[14px] border",
                          isCurrentlyActive 
                            ? "bg-orange-50 border-orange-200" 
                            : "bg-muted border-border"
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
                            <p className="text-xs text-muted-foreground mb-2">
                              Kode: {bookingSlot.booking.booking_code}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                            <p className="text-xs text-muted-foreground mt-2">
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
                <div className="text-center py-8 text-muted-foreground">
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
                        className="flex items-center justify-between p-3 bg-muted rounded-[10px] text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground/70" />
                          <div>
                            <p className="font-medium">
                              {bookingSlot.booking.purpose || 'Peminjaman'}
                            </p>
                            <p className="text-xs text-muted-foreground">
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

          {/* Equipment Checks - Form & Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" /> Pengecekan Kondisi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CheckForm equipmentId={equipment.id} slug={slug} />
            </CardContent>
          </Card>

          {checkLogs && checkLogs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" /> Riwayat Pengecekan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checkLogs.map((log: {
                    id: string
                    checked_at: string
                    condition: string
                    notes: string | null
                    checked_by_name: string | null
                  }) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between p-3 bg-muted rounded-[10px] text-sm"
                    >
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                        <div>
                          <p className="font-medium capitalize">
                            {log.condition === 'good' ? 'Baik' :
                             log.condition === 'needs_repair' ? 'Perlu Perbaikan' :
                             log.condition === 'damaged' ? 'Rusak' :
                             log.condition === 'lost' ? 'Hilang' : log.condition}
                          </p>
                          {log.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>
                          )}
                          {log.checked_by_name && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              Oleh: {log.checked_by_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(log.checked_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
