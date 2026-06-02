'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QRScanner } from '@/components/scan/QRScanner'
import {
  processScan,
  updateEntityFromScan,
  getBuildingsAndRooms,
  getEntityCurrentLocation,
  getUserRole,
  getEntityDetails,
} from '@/app/scan/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Scan, CheckCircle2, AlertCircle,
  Package, Building2, ClipboardList, MapPin,
  Users, Calendar, Clock, User,
  ShieldCheck, Eye, AlertTriangle,
  Info, Layers, History, Banknote, Pencil, QrCode, Power,
  CheckCircle, Ban
} from 'lucide-react'

const CONDITIONS = [
  { value: 'good', label: 'Baik', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'needs_repair', label: 'Perlu Perbaikan', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'damaged', label: 'Rusak', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'lost', label: 'Hilang', color: 'bg-slate-100 text-slate-700 border-slate-200' },
]

const TYPE_LABELS: Record<string, string> = {
  equipment: 'Alat',
  room: 'Ruangan',
  inventory: 'Inventaris',
}

const KETERSEDIAAN_LABELS: Record<string, string> = {
  tersedia: 'Tersedia',
  digunakan: 'Sedang Digunakan',
  hilang: 'Hilang',
  tidak_tersedia: 'Tidak Tersedia',
}

const STATUS_TINDAKAN_LABELS: Record<string, string> = {
  normal: 'Normal',
  perawatan: 'Dalam Perawatan',
  menunggu_part: 'Menunggu Part',
  afkir: 'Afkir',
}

const CATEGORY_LABELS: Record<string, string> = {
  elektronik: 'Elektronik',
  mebel: 'Mebel',
  transportasi: 'Transportasi',
  alat_tes_pengukuran: 'Alat Tes Pengukuran',
  alat_gym: 'Alat Gym',
  perlengkapan: 'Perlengkapan',
  lainnya: 'Lainnya',
}

const USER_CATEGORY_LABELS: Record<string, string> = {
  mahasiswa_s1: 'Mahasiswa S1',
  mahasiswa_s2: 'Mahasiswa S2/S3',
  dosen: 'Dosen & Karyawan',
  mou_unesa: 'MOU Unesa',
  umum: 'Umum',
}

interface ScanEntityDetails {
  name: string
  roomCode?: string
  photoUrl?: string
  condition?: string
  quantity?: number
  capacity?: number
  equipmentCode?: string
  buildingName?: string
  buildingCode?: string
  floorNumber?: number
  isForRent?: boolean
  ketersediaan?: string
  statusTindakan?: string
  category?: string
  merk?: string
  updatedAt?: string
  description?: string
  roomFloor?: number | null
  currentLocation?: string
  inventoryCode?: string
  roomName?: string
  notes?: string
  inventoryItems?: Array<{ id: string; name: string; quantity: number; condition: string; notes?: string | null; photo_url?: string | null; inventory_code?: string | null }>
  activeBookings?: Array<{ id: string; purpose?: string; status: string; reference_no: string; start_datetime: string; users?: { name: string; email?: string } | null }>
  pastBookings?: Array<{ id: string; purpose?: string; status: string; reference_no: string; start_datetime: string }>
  rates?: Array<{ user_category: string; rate_per_day: number; rate_per_hour?: number | null }>
}

function ConditionBadge({ condition, className = '' }: { condition?: string; className?: string }) {
  const cond = CONDITIONS.find(c => c.value === condition)
  return (
    <Badge className={`${cond?.color || 'bg-slate-100 text-slate-700'} ${className}`}>
      {cond?.label || condition}
    </Badge>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface RoomOption {
  id: string
  name: string
  buildingId: string
  buildingName: string
  label: string
}

interface BuildingOption {
  id: string
  name: string
  code: string
}

interface EntityLocation {
  name: string
  condition: string
  buildingId: string | null
  buildingName: string
  roomId: string | null
  roomName: string
  locationText: string
}

interface ScanPageClientProps {
  embedded?: boolean
}

export default function ScanPageClient({ embedded = false }: ScanPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [scanResult, setScanResult] = useState<string>('')
  const [scanError, setScanError] = useState('')
  const [scannedData] = useState<{ type: string; id: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [buildings, setBuildings] = useState<BuildingOption[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [, setCurrentLocation] = useState<EntityLocation | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedRoom, setSelectedRoom] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [entityDetails, setEntityDetails] = useState<ScanEntityDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const type = searchParams.get('type')
  const id = searchParams.get('id')

  const canUpdate = userRole === 'admin' || userRole === 'super_admin'
  const basePath = embedded ? '/admin/scan' : '/scan'

  useEffect(() => {
    getUserRole().then(({ role }) => {
      setUserRole(role)
    })
  }, [])

  useEffect(() => {
    getBuildingsAndRooms().then((data) => {
      setBuildings(data.buildings)
      setRooms(data.rooms)
    }).catch(() => {
      setBuildings([])
      setRooms([])
    })
  }, [])

  useEffect(() => {
    if (!type || !id) return
    let cancelled = false

    const fetchDetails = async () => {
      setLoadingDetails(true)
      try {
        const [locResult, detailsResult] = await Promise.allSettled([
          getEntityCurrentLocation(type, id),
          getEntityDetails(type, id),
        ])
        if (cancelled) return
        if (locResult.status === 'fulfilled' && locResult.value) {
          setCurrentLocation(locResult.value)
          if (locResult.value.buildingId) setSelectedBuilding(locResult.value.buildingId)
          if (locResult.value.roomId) setSelectedRoom(locResult.value.roomId)
        } else {
          setCurrentLocation(null)
        }
        if (detailsResult.status === 'fulfilled') {
          setEntityDetails(detailsResult.value as ScanEntityDetails)
        } else {
          setEntityDetails(null)
        }
      } catch {
        if (cancelled) return
        setCurrentLocation(null)
        setEntityDetails(null)
      } finally {
        if (!cancelled) setLoadingDetails(false)
      }
    }

    fetchDetails()
    return () => { cancelled = true }
  }, [type, id])

  const filteredRooms = selectedBuilding
    ? rooms.filter((r) => r.buildingId === selectedBuilding)
    : rooms

  const handleScan = useCallback(async (text: string) => {
    setScanResult(text)
    setScanError('')

    const result = await processScan(text)
    if (result.error) {
      setScanError(result.error)
      return
    }

    if (result.type && result.id) {
      router.push(`${basePath}?type=${result.type}&id=${result.id}`)
    }
  }, [router, basePath])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMessage('')

    const formData = new FormData(e.currentTarget)
    const result = await updateEntityFromScan(formData)

    setSubmitting(false)
    if (result.error) {
      setSubmitMessage(result.error)
    } else {
      setSubmitMessage(`Berhasil memperbarui ${result.entityName}!`)
      e.currentTarget.reset()
      setSelectedBuilding('')
      setSelectedRoom('')
      if (type && id) {
        const details = await getEntityDetails(type, id)
        setEntityDetails(details)
      }
    }
  }

  const containerClass = embedded ? '' : 'min-h-[100dvh] bg-background'
  const contentClass = embedded ? 'p-6' : 'p-6 max-w-2xl mx-auto'
  const detailClass = embedded ? 'max-w-6xl mx-auto p-6' : 'max-w-6xl mx-auto p-4 sm:p-6 lg:p-8'

  // Mode: Scan QR (no query params)
  if (!type || !id) {
    return (
      <div className={containerClass}>
        <div className={contentClass}>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <Scan className="h-6 w-6 text-primary" />
              Scan QR Code
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Scan QR Code ruangan atau alat untuk melihat detail lengkap
            </p>
          </div>

          <QRScanner onScan={handleScan} />

          {scanError && (
            <div className="mt-4 p-4 rounded-[10px] bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {scanError}
            </div>
          )}

          {scanResult && !scanError && !scannedData && (
            <div className="mt-4 p-4 rounded-[10px] bg-primary/5 border border-primary/20 text-primary text-sm">
              Memproses: {scanResult}
            </div>
          )}
        </div>
      </div>
    )
  }

  const typeLabel = TYPE_LABELS[type] || type

  if (loadingDetails) {
    return (
      <div className={containerClass}>
        <div className={`${detailClass} flex items-center justify-center py-20`}>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!entityDetails) {
    return (
      <div className={containerClass}>
        <div className={`${detailClass} text-center py-16`}>
          <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{typeLabel} tidak ditemukan</p>
        </div>
      </div>
    )
  }

  // ============================================
  // ROOM DETAIL VIEW
  // ============================================
  if (type === 'room') {
    return (
      <div className={containerClass}>
        <div className={detailClass}>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{entityDetails.name}</h1>
              <Badge className="bg-gradient-to-r from-[#0891B2] to-[#22D3EE] text-white border-0 text-xs px-3 py-1 shadow-sm">Aktif</Badge>
            </div>
            <p className="text-[#0891B2] font-mono text-sm">{entityDetails.roomCode}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Photo */}
              <div className="rounded-2xl overflow-hidden border border-border bg-muted aspect-[4/3]">
                {entityDetails.photoUrl ? (
                  <img
                    src={entityDetails.photoUrl}
                    alt={entityDetails.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Building2 className="h-16 w-16 opacity-20" />
                  </div>
                )}
              </div>

              {/* Informasi Ruangan */}
              <Card className="border-border rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#0891B2] to-[#22D3EE]" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Informasi Ruangan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-0">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#0891B2]/10">
                      <Building2 className="h-5 w-5 text-[#0891B2] shrink-0" />
                    </div>
                    <div>
                      <p className="text-sm text-[#0891B2] font-medium">Gedung</p>
                      <p className="font-medium text-foreground">{entityDetails.buildingName}</p>
                      <p className="text-sm text-muted-foreground">{entityDetails.buildingCode !== '-' ? entityDetails.buildingCode : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#0891B2]/10">
                      <Layers className="h-5 w-5 text-[#0891B2] shrink-0" />
                    </div>
                    <div>
                      <p className="text-sm text-[#0891B2] font-medium">Lantai</p>
                      <p className="font-medium text-foreground">Lantai {entityDetails.floorNumber ?? '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#0891B2]/10">
                      <Users className="h-5 w-5 text-[#0891B2] shrink-0" />
                    </div>
                    <div>
                      <p className="text-sm text-[#0891B2] font-medium">Kapasitas</p>
                      <p className="font-medium text-foreground">{entityDetails.capacity ? `${entityDetails.capacity} orang` : '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Condition & Status */}
              <Card className="border-border rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-400 to-[#22C55E]" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-[#22C55E]/5 border border-emerald-100">
                    <div className="p-1.5 rounded-full bg-emerald-100">
                      <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                    </div>
                    <div>
                      <p className="font-medium text-emerald-800">{entityDetails.isForRent ? 'Disewakan' : 'Tidak Disewakan'}</p>
                      <p className="text-xs text-emerald-600">Status ruangan saat ini</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#0891B2] font-medium">Kondisi:</span>
                    <ConditionBadge condition={entityDetails.condition} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Inventaris Ruangan */}
              <Card className="border-border rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100">
                      <ClipboardList className="h-5 w-5 text-amber-600" />
                    </div>
                    Inventaris Ruangan
                  </CardTitle>
                  <span className="text-sm font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">{entityDetails.inventoryItems?.length || 0} item</span>
                </CardHeader>
                <CardContent className="pt-0">
                  {entityDetails.inventoryItems && entityDetails.inventoryItems.length > 0 ? (
                    <div className="overflow-x-auto -mx-4 px-4">
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="border-b border-border bg-gradient-to-r from-amber-50/50 to-orange-50/30">
                            <th className="text-left py-2.5 px-3 font-medium text-amber-700">Nama Barang</th>
                            <th className="text-center py-2.5 px-3 font-medium text-amber-700">Jumlah</th>
                            <th className="text-center py-2.5 px-3 font-medium text-amber-700">Kondisi</th>
                            <th className="text-left py-2.5 px-3 font-medium text-amber-700">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entityDetails.inventoryItems.map((item) => (
                            <tr key={item.id} className="border-b border-border/60 last:border-0 hover:bg-amber-50/30 transition-colors">
                              <td className="py-3 px-3 font-medium">{item.name}</td>
                              <td className="py-3 px-3 text-center font-semibold text-amber-700">{item.quantity}</td>
                              <td className="py-3 px-3 text-center">
                                <ConditionBadge condition={item.condition} />
                              </td>
                              <td className="py-3 px-3 text-muted-foreground">{item.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Tidak ada item inventaris di ruangan ini
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Bookings */}
              <Card className="border-border rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-orange-400 to-rose-400" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-100">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    Jadwal Penggunaan
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {entityDetails.activeBookings && entityDetails.activeBookings.length > 0 ? (
                    <div className="space-y-2">
                      {entityDetails.activeBookings.map((booking) => (
                        <div key={booking.id} className="p-3 bg-gradient-to-r from-orange-50 to-rose-50/30 border border-orange-100 rounded-xl hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-foreground">{booking.purpose || 'Peminjaman'}</p>
                            <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">{booking.status}</Badge>
                          </div>
                          <p className="text-xs text-orange-600/80 mb-1">Ref: {booking.reference_no}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3 text-orange-500" />
                              {booking.users?.name || '-'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-orange-500" />
                              {formatDate(booking.start_datetime)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="p-3 rounded-full bg-orange-100 w-fit mx-auto mb-2">
                        <Calendar className="h-6 w-6 text-orange-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">Tidak ada jadwal penggunaan aktif</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Past Bookings */}
              {entityDetails.pastBookings && entityDetails.pastBookings.length > 0 && (
                <Card className="border-border rounded-2xl overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-400" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-violet-100">
                        <History className="h-5 w-5 text-violet-600" />
                      </div>
                      Riwayat Penggunaan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
{entityDetails.pastBookings.map((booking) => (
                    <div key={booking.id} className="p-3 bg-gradient-to-r from-violet-50/50 to-purple-50/30 border border-violet-100 rounded-xl flex items-center justify-between hover:shadow-sm transition-shadow">
                      <div>
                        <p className="text-sm font-medium text-foreground">{booking.purpose || 'Peminjaman'}</p>
                        <p className="text-xs text-violet-600/80">{formatDate(booking.start_datetime)} • {booking.reference_no}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 border-violet-200">{booking.status}</Badge>
                    </div>
                  ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* QR Info Card */}
          <Card className="mt-6 rounded-2xl overflow-hidden border-[#0891B2]/20">
            <div className="h-1 bg-gradient-to-r from-[#0891B2] to-[#22D3EE]" />
            <CardContent className="p-5 bg-gradient-to-br from-[#0891B2]/5 to-[#22D3EE]/5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#0891B2]/10">
                  <QrCode className="h-5 w-5 text-[#0891B2] shrink-0" />
                </div>
                <div>
                  <p className="font-medium text-[#0891B2]">Fitur QR Code</p>
                  <p className="text-sm text-[#0891B2]/80 mt-0.5">
                    Scan QR code untuk melihat informasi lengkap ruangan dan inventaris.
                    Admin dapat melakukan pengecekan kondisi langsung dari halaman ini.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ============================================
  // EQUIPMENT DETAIL VIEW
  // ============================================
  if (type === 'equipment') {
    return (
      <div className={containerClass}>
        <div className={detailClass}>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{entityDetails.name}</h1>
              <Badge className="bg-gradient-to-r from-[#0891B2] to-[#22D3EE] text-white border-0 text-xs px-3 py-1 shadow-sm">Aktif</Badge>
            </div>
            <p className="text-[#0891B2] text-sm font-medium">Kode: {entityDetails.equipmentCode}</p>

            {/* Admin Actions */}
            {canUpdate && (
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg gap-1.5"
                  onClick={() => router.push(`/admin/equipment/${entityDetails.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}/edit`)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Alat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg gap-1.5"
                  onClick={() => router.push('/admin/qr')}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR Code
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg gap-1.5 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                  onClick={() => {/* TODO: deactivate */}}
                >
                  <Power className="h-3.5 w-3.5" />
                  Nonaktifkan
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Photo */}
              <div className="rounded-2xl overflow-hidden border border-border bg-muted aspect-square max-h-[420px]">
                {entityDetails.photoUrl ? (
                  <img
                    src={entityDetails.photoUrl}
                    alt={entityDetails.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Package className="h-16 w-16 opacity-20" />
                  </div>
                )}
              </div>

              {/* Status Card */}
              <Card className="border-border rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-400 via-[#22D3EE] to-blue-400" />
                <CardHeader className="pb-3 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#0891B2]/10">
                    <Clock className="h-5 w-5 text-[#0891B2]" />
                  </div>
                  <CardTitle className="text-base font-semibold">Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Availability */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                    entityDetails.ketersediaan === 'tersedia'
                      ? 'bg-gradient-to-r from-emerald-50 to-emerald-50/30 border-emerald-100'
                      : entityDetails.ketersediaan === 'digunakan'
                      ? 'bg-gradient-to-r from-blue-50 to-blue-50/30 border-blue-100'
                      : 'bg-gradient-to-r from-slate-50 to-slate-50/30 border-slate-100'
                  }`}>
                    <div className={`p-1.5 rounded-full ${
                      entityDetails.ketersediaan === 'tersedia' ? 'bg-emerald-100' :
                      entityDetails.ketersediaan === 'digunakan' ? 'bg-blue-100' :
                      'bg-slate-100'
                    }`}>
                      {entityDetails.ketersediaan === 'tersedia' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                      ) : entityDetails.ketersediaan === 'digunakan' ? (
                        <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                      ) : (
                        <Ban className="h-5 w-5 text-slate-600 shrink-0" />
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${
                        entityDetails.ketersediaan === 'tersedia' ? 'text-emerald-800' :
                        entityDetails.ketersediaan === 'digunakan' ? 'text-blue-800' :
                        'text-slate-800'
                      }`}>
                        {KETERSEDIAAN_LABELS[entityDetails.ketersediaan || ''] || entityDetails.ketersediaan}
                      </p>
                      <p className={`text-xs ${
                        entityDetails.ketersediaan === 'tersedia' ? 'text-emerald-600' :
                        entityDetails.ketersediaan === 'digunakan' ? 'text-blue-600' :
                        'text-slate-600'
                      }`}>
                        Ketersediaan saat ini
                      </p>
                    </div>
                  </div>

                  {/* Status Tindakan */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                    entityDetails.statusTindakan === 'normal'
                      ? 'bg-gradient-to-r from-blue-50 to-blue-50/30 border-blue-100'
                      : 'bg-gradient-to-r from-amber-50 to-amber-50/30 border-amber-100'
                  }`}>
                    <div className={`p-1.5 rounded-full ${
                      entityDetails.statusTindakan === 'normal' ? 'bg-blue-100' : 'bg-amber-100'
                    }`}>
                      <AlertTriangle className={`h-5 w-5 shrink-0 ${
                        entityDetails.statusTindakan === 'normal' ? 'text-blue-600' : 'text-amber-600'
                      }`} />
                    </div>
                    <div>
                      <p className={`font-medium ${
                        entityDetails.statusTindakan === 'normal' ? 'text-blue-800' : 'text-amber-800'
                      }`}>
                        {STATUS_TINDAKAN_LABELS[entityDetails.statusTindakan || ''] || entityDetails.statusTindakan}
                      </p>
                      <p className={`text-xs ${
                        entityDetails.statusTindakan === 'normal' ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        Status tindakan
                      </p>
                    </div>
                  </div>

                  {/* Condition */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#0891B2] font-medium">Kondisi:</span>
                    <ConditionBadge condition={entityDetails.condition} />
                  </div>
                </CardContent>
              </Card>

              {/* Lokasi Card */}
              <Card className="border-border rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-rose-400 to-pink-400" />
                <CardHeader className="pb-3 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-100">
                    <MapPin className="h-5 w-5 text-rose-600" />
                  </div>
                  <CardTitle className="text-base font-semibold">Lokasi</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-rose-50">
                      <Building2 className="h-5 w-5 text-rose-500 shrink-0" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{entityDetails.buildingName}</p>
                      <p className="text-sm text-rose-600/80">{entityDetails.buildingCode !== '-' ? entityDetails.buildingCode : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-rose-50">
                      <Layers className="h-5 w-5 text-rose-500 shrink-0" />
                    </div>
                    <div>
                      <p className="text-sm text-rose-600 font-medium">Lantai</p>
                      <p className="font-medium text-foreground">Lantai {entityDetails.roomFloor ?? '-'}</p>
                    </div>
                  </div>
                  {entityDetails.currentLocation && entityDetails.currentLocation !== '-' && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-rose-50">
                        <MapPin className="h-5 w-5 text-rose-500 shrink-0" />
                      </div>
                      <div>
                        <p className="text-sm text-rose-600 font-medium">Keterangan Tambahan</p>
                        <p className="font-medium text-foreground">{entityDetails.currentLocation}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Informasi Alat */}
              <Card className="border-border rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#0891B2] to-[#22D3EE]" />
                <CardHeader className="pb-3 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#0891B2]/10">
                    <Info className="h-5 w-5 text-[#0891B2]" />
                  </div>
                  <CardTitle className="text-base font-semibold">Informasi Alat</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#0891B2]/5 to-[#22D3EE]/5 border border-[#0891B2]/10">
                      <p className="text-sm text-[#0891B2] font-medium">Kategori</p>
                      <p className="font-medium text-foreground mt-1">{CATEGORY_LABELS[entityDetails.category || ''] || entityDetails.category || '-'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#0891B2]/5 to-[#22D3EE]/5 border border-[#0891B2]/10">
                      <p className="text-sm text-[#0891B2] font-medium">Merk/Brand</p>
                      <p className="font-medium text-foreground mt-1">{entityDetails.merk || '-'}</p>
                    </div>
                  </div>
                  {entityDetails.updatedAt && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[#0891B2]/10">
                        <Clock className="h-4 w-4 text-[#0891B2] shrink-0" />
                      </div>
                      <div>
                        <p className="text-sm text-[#0891B2] font-medium">Terakhir Diupdate</p>
                        <p className="font-medium text-foreground">{formatDate(entityDetails.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-[#0891B2] font-medium mb-1">Deskripsi</p>
                    <p className="text-foreground text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-xl">{entityDetails.description || '-'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Tarif Sewa */}
              {entityDetails.rates && entityDetails.rates.length > 0 && (
                <Card className="border-border rounded-2xl overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-[#22C55E] to-emerald-400" />
                  <CardHeader className="pb-3 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100">
                      <Banknote className="h-5 w-5 text-emerald-600" />
                    </div>
                    <CardTitle className="text-base font-semibold">Tarif Sewa</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entityDetails.rates.map((rate) => (
                        <div key={rate.user_category} className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-50/30 border border-emerald-100 hover:shadow-sm transition-shadow">
                          <p className="text-sm font-medium text-emerald-800">{USER_CATEGORY_LABELS[rate.user_category] || rate.user_category}</p>
                          <p className="text-lg font-bold text-emerald-600 mt-0.5">
                            Rp {Number(rate.rate_per_day).toLocaleString('id-ID')}
                            <span className="text-sm font-normal text-emerald-500">/hari</span>
                          </p>
                          {rate.rate_per_hour && (
                            <p className="text-xs text-emerald-500 mt-0.5">
                              Rp {Number(rate.rate_per_hour).toLocaleString('id-ID')}/jam
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Jadwal Penggunaan */}
              <Card className="border-border rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-orange-400 to-rose-400" />
                <CardHeader className="pb-3 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-100">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                  <CardTitle className="text-base font-semibold">Jadwal Penggunaan</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {entityDetails.activeBookings && entityDetails.activeBookings.length > 0 ? (
                    <div className="space-y-2">
                      {entityDetails.activeBookings.map((booking) => (
                        <div key={booking.id} className="p-3 bg-gradient-to-r from-orange-50 to-rose-50/30 border border-orange-100 rounded-xl hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-foreground">{booking.purpose || 'Peminjaman'}</p>
                            <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">{booking.status}</Badge>
                          </div>
                          <p className="text-xs text-orange-600/80 mb-1">Ref: {booking.reference_no}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3 text-orange-500" />
                              {booking.users?.name || '-'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-orange-500" />
                              {formatDate(booking.start_datetime)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="p-3 rounded-full bg-orange-100 w-fit mx-auto mb-2">
                        <Calendar className="h-6 w-6 text-orange-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">Tidak ada jadwal penggunaan aktif</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Riwayat Penggunaan */}
              <Card className="border-border rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-400" />
                <CardHeader className="pb-3 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-100">
                    <History className="h-5 w-5 text-violet-600" />
                  </div>
                  <CardTitle className="text-base font-semibold">Riwayat Penggunaan</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {entityDetails.pastBookings && entityDetails.pastBookings.length > 0 ? (
                    <div className="space-y-2">
                      {entityDetails.pastBookings.map((booking) => (
                        <div key={booking.id} className="p-3 bg-gradient-to-r from-violet-50/50 to-purple-50/30 border border-violet-100 rounded-xl flex items-center justify-between hover:shadow-sm transition-shadow">
                          <div>
                            <p className="text-sm font-medium text-foreground">{booking.purpose || 'Peminjaman'}</p>
                            <p className="text-xs text-violet-600/80">{formatDate(booking.start_datetime)} • {booking.reference_no}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 border-violet-200">{booking.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="p-3 rounded-full bg-violet-100 w-fit mx-auto mb-2">
                        <History className="h-6 w-6 text-violet-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">Belum ada riwayat penggunaan</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Admin: Pengecekan Kondisi */}
          {canUpdate && !isEditing && (
            <div className="mt-6">
              <Button
                onClick={() => setIsEditing(true)}
                className="w-full h-12 bg-gradient-to-r from-[#0891B2] to-[#22D3EE] hover:opacity-90 text-white font-medium rounded-xl gap-2 shadow-md shadow-[#0891B2]/20"
              >
                <ShieldCheck className="h-4 w-4" />
                Catat Pengecekan
              </Button>
            </div>
          )}

          {canUpdate && isEditing && (
            <Card className="mt-6 border-border rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-semibold">Pengecekan Kondisi</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Batal
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input type="hidden" name="type" value={type} />
                  <input type="hidden" name="id" value={id} />

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Kondisi Saat Ini
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CONDITIONS.map((c) => (
                        <label
                          key={c.value}
                          className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        >
                          <input
                            type="radio"
                            name="condition"
                            value={c.value}
                            required
                            className="accent-primary"
                          />
                          <span className="text-sm">{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Building Selection */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Update Lokasi — Gedung
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 z-10" />
                      <select
                        name="building_id"
                        value={selectedBuilding}
                        onChange={(e) => {
                          setSelectedBuilding(e.target.value)
                          setSelectedRoom('')
                        }}
                        className="w-full h-10 rounded-xl border border-border bg-muted/50 pl-10 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                      >
                        <option value="">Pilih gedung...</option>
                        {buildings.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} {b.code ? `(${b.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Room Selection */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Update Lokasi — Ruangan
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 z-10" />
                      <select
                        name="room_id"
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        disabled={!selectedBuilding}
                        className="w-full h-10 rounded-xl border border-border bg-muted/50 pl-10 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {selectedBuilding ? 'Pilih ruangan...' : 'Pilih gedung terlebih dahulu'}
                        </option>
                        {filteredRooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedBuilding && filteredRooms.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">Tidak ada ruangan di gedung ini</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Catatan Pengecekan
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Contoh: Baterai masih bagus, ada goresan kecil pada body..."
                      className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Nama Pemeriksa
                    </label>
                    <input
                      type="text"
                      name="checked_by_name"
                      placeholder="Nama petugas pengecekan"
                      className="w-full h-10 rounded-xl border border-border bg-muted/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {submitMessage && (
                    <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${submitMessage.includes('Berhasil') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {submitMessage.includes('Berhasil') ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                      {submitMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 bg-gradient-to-r from-[#0891B2] to-[#22D3EE] hover:opacity-90 text-white font-medium rounded-xl gap-2 shadow-md shadow-[#0891B2]/20"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {submitting ? 'Menyimpan...' : 'Catat Pengecekan'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Public info footer */}
          {!canUpdate && (
            <Card className="mt-6 rounded-2xl overflow-hidden border-[#0891B2]/20">
              <div className="h-1 bg-gradient-to-r from-[#0891B2] to-[#22D3EE]" />
              <CardContent className="p-5 bg-gradient-to-br from-[#0891B2]/5 to-[#22D3EE]/5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#0891B2]/10">
                    <Eye className="h-5 w-5 text-[#0891B2] shrink-0" />
                  </div>
                  <div>
                    <p className="font-medium text-[#0891B2]">Mode Lihat Saja</p>
                    <p className="text-sm text-[#0891B2]/80 mt-0.5">
                      Anda hanya dapat melihat detail. Hanya Admin dan Super Admin yang dapat mengubah kondisi dan lokasi.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // ============================================
  // INVENTORY DETAIL VIEW (fallback)
  // ============================================
  return (
    <div className={containerClass}>
      <div className={embedded ? 'max-w-2xl mx-auto p-6' : 'max-w-2xl mx-auto p-4 sm:p-6 lg:p-8'}>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{entityDetails.name}</h1>
            <Badge className="bg-gradient-to-r from-[#0891B2] to-[#22D3EE] text-white border-0 shadow-sm">Aktif</Badge>
          </div>
          <p className="text-[#0891B2] font-mono text-sm font-medium">{entityDetails.inventoryCode}</p>
        </div>

        <Card className="border-border rounded-2xl mb-5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Lokasi</p>
                <p className="font-medium">{entityDetails.roomName}</p>
                <p className="text-sm text-muted-foreground">{entityDetails.buildingName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Kondisi:</span>
              <ConditionBadge condition={entityDetails.condition} />
            </div>
            {entityDetails.quantity && (
              <p className="text-sm text-muted-foreground">Jumlah: {entityDetails.quantity} unit</p>
            )}
            {entityDetails.notes && (
              <p className="text-sm text-foreground whitespace-pre-wrap">{entityDetails.notes}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
