'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QRScanner } from '@/components/scan/QRScanner'
import {
  processScan,
  updateEntityFromScan,
  getBuildingsAndRooms,
  getEntityCurrentLocation,
  getUserRole,
  getEntityDetails,
} from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Scan, CheckCircle2, AlertCircle, ArrowLeft,
  Package, Building2, ClipboardList, MapPin, Home,
  Users, Boxes, Calendar, Clock, User, Phone, Mail,
  ShieldCheck, Eye, Tag, Wrench, AlertTriangle,
  Info, Layers, History, Banknote, Pencil, QrCode, Power,
  CheckCircle, XCircle, Ban, FileText, StickyNote
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

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
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

function PublicScanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [scanResult, setScanResult] = useState<string>('')
  const [scanError, setScanError] = useState('')
  const [scannedData, setScannedData] = useState<{ type: string; id: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [buildings, setBuildings] = useState<BuildingOption[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [currentLocation, setCurrentLocation] = useState<EntityLocation | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedRoom, setSelectedRoom] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [entityDetails, setEntityDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const type = searchParams.get('type')
  const id = searchParams.get('id')

  const canUpdate = userRole === 'admin' || userRole === 'super_admin'

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
    if (type && id) {
      setLoadingDetails(true)

      getEntityCurrentLocation(type, id).then((loc) => {
        if (loc) {
          setCurrentLocation(loc)
          if (loc.buildingId) setSelectedBuilding(loc.buildingId)
          if (loc.roomId) setSelectedRoom(loc.roomId)
        }
      }).catch(() => setCurrentLocation(null))

      getEntityDetails(type, id).then((details) => {
        setEntityDetails(details)
        setLoadingDetails(false)
      }).catch(() => {
        setEntityDetails(null)
        setLoadingDetails(false)
      })
    }
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
      router.push(`/scan?type=${result.type}&id=${result.id}`)
    }
  }, [router])

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

  // Mode: Scan QR (no query params)
  if (!type || !id) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <div className="p-6 max-w-2xl mx-auto">
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
      <div className="min-h-[100dvh] bg-background p-6">
        <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!entityDetails) {
    return (
      <div className="min-h-[100dvh] bg-background p-6">
        <div className="max-w-5xl mx-auto text-center py-16">
          <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{typeLabel} tidak ditemukan</p>
        </div>
      </div>
    )
  }

  // Shared: condition badge component
  const ConditionBadge = ({ condition, className = '' }: { condition: string; className?: string }) => {
    const cond = CONDITIONS.find(c => c.value === condition)
    return (
      <Badge className={`${cond?.color || 'bg-slate-100 text-slate-700'} ${className}`}>
        {cond?.label || condition}
      </Badge>
    )
  }

  // ============================================
  // ROOM DETAIL VIEW (Image 1 style)
  // ============================================
  if (type === 'room') {
    return (
      <div className="min-h-[100dvh] bg-background">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{entityDetails.name}</h1>
              <Badge className="bg-[#0891B2] text-white hover:bg-[#0891B2] text-xs px-2.5 py-0.5">Aktif</Badge>
            </div>
            <p className="text-muted-foreground font-mono text-sm">{entityDetails.roomCode}</p>
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
              <Card className="border-border rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Informasi Ruangan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-0">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Gedung</p>
                      <p className="font-medium text-foreground">{entityDetails.buildingName}</p>
                      <p className="text-sm text-muted-foreground">{entityDetails.buildingCode !== '-' ? entityDetails.buildingCode : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Layers className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Lantai</p>
                      <p className="font-medium text-foreground">Lantai {entityDetails.floorNumber ?? '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Kapasitas</p>
                      <p className="font-medium text-foreground">{entityDetails.capacity ? `${entityDetails.capacity} orang` : '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Condition & Status */}
              <Card className="border-border rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-medium text-emerald-800">{entityDetails.isForRent ? 'Disewakan' : 'Tidak Disewakan'}</p>
                      <p className="text-xs text-emerald-600">Status ruangan saat ini</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Kondisi:</span>
                    <ConditionBadge condition={entityDetails.condition} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Inventaris Ruangan */}
              <Card className="border-border rounded-2xl">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    Inventaris Ruangan
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">{entityDetails.inventoryItems?.length || 0} item inventaris</span>
                </CardHeader>
                <CardContent className="pt-0">
                  {entityDetails.inventoryItems && entityDetails.inventoryItems.length > 0 ? (
                    <div className="overflow-x-auto -mx-4 px-4">
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Nama Barang</th>
                            <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">Jumlah</th>
                            <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">Kondisi</th>
                            <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entityDetails.inventoryItems.map((item: any) => (
                            <tr key={item.id} className="border-b border-border/60 last:border-0">
                              <td className="py-3 px-3 font-medium">{item.name}</td>
                              <td className="py-3 px-3 text-center">{item.quantity}</td>
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
              <Card className="border-border rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    Jadwal Penggunaan
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {entityDetails.activeBookings && entityDetails.activeBookings.length > 0 ? (
                    <div className="space-y-2">
                      {entityDetails.activeBookings.map((booking: any) => (
                        <div key={booking.id} className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-foreground">{booking.purpose || 'Peminjaman'}</p>
                            <Badge variant="outline" className="text-xs">{booking.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">Ref: {booking.reference_no}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {booking.users?.name || '-'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(booking.start_datetime)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Tidak ada jadwal penggunaan aktif</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Past Bookings */}
              {entityDetails.pastBookings && entityDetails.pastBookings.length > 0 && (
                <Card className="border-border rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <History className="h-5 w-5 text-muted-foreground" />
                      Riwayat Penggunaan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {entityDetails.pastBookings.map((booking: any) => (
                      <div key={booking.id} className="p-3 bg-muted/50 border border-border rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{booking.purpose || 'Peminjaman'}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(booking.start_datetime)} • {booking.reference_no}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{booking.status}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* QR Info Card */}
          <Card className="mt-6 rounded-2xl bg-blue-50 border-blue-100">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <QrCode className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-blue-800">Fitur QR Code</p>
                  <p className="text-sm text-blue-600 mt-0.5">
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
  // EQUIPMENT DETAIL VIEW (Image 2 style)
  // ============================================
  if (type === 'equipment') {
    return (
      <div className="min-h-[100dvh] bg-background">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{entityDetails.name}</h1>
              <Badge className="bg-[#0891B2] text-white hover:bg-[#0891B2] text-xs px-2.5 py-0.5">Aktif</Badge>
            </div>
            <p className="text-muted-foreground text-sm">Kode: {entityDetails.equipmentCode}</p>

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
              <Card className="border-border rounded-2xl">
                <CardHeader className="pb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Availability */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                    entityDetails.ketersediaan === 'tersedia'
                      ? 'bg-emerald-50 border-emerald-100'
                      : entityDetails.ketersediaan === 'digunakan'
                      ? 'bg-blue-50 border-blue-100'
                      : 'bg-slate-50 border-slate-100'
                  }`}>
                    {entityDetails.ketersediaan === 'tersedia' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : entityDetails.ketersediaan === 'digunakan' ? (
                      <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                    ) : (
                      <Ban className="h-5 w-5 text-slate-600 shrink-0" />
                    )}
                    <div>
                      <p className={`font-medium ${
                        entityDetails.ketersediaan === 'tersedia' ? 'text-emerald-800' :
                        entityDetails.ketersediaan === 'digunakan' ? 'text-blue-800' :
                        'text-slate-800'
                      }`}>
                        {KETERSEDIAAN_LABELS[entityDetails.ketersediaan] || entityDetails.ketersediaan}
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
                      ? 'bg-blue-50 border-blue-100'
                      : 'bg-amber-50 border-amber-100'
                  }`}>
                    <AlertTriangle className={`h-5 w-5 shrink-0 ${
                      entityDetails.statusTindakan === 'normal' ? 'text-blue-600' : 'text-amber-600'
                    }`} />
                    <div>
                      <p className={`font-medium ${
                        entityDetails.statusTindakan === 'normal' ? 'text-blue-800' : 'text-amber-800'
                      }`}>
                        {STATUS_TINDAKAN_LABELS[entityDetails.statusTindakan] || entityDetails.statusTindakan}
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
                    <span className="text-sm text-muted-foreground">Kondisi:</span>
                    <ConditionBadge condition={entityDetails.condition} />
                  </div>
                </CardContent>
              </Card>

              {/* Lokasi Card */}
              <Card className="border-border rounded-2xl">
                <CardHeader className="pb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Lokasi</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{entityDetails.buildingName}</p>
                      <p className="text-sm text-muted-foreground">{entityDetails.buildingCode !== '-' ? entityDetails.buildingCode : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Layers className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Lantai</p>
                      <p className="font-medium text-foreground">Lantai {entityDetails.roomFloor ?? '-'}</p>
                    </div>
                  </div>
                  {entityDetails.currentLocation && entityDetails.currentLocation !== '-' && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Keterangan Tambahan</p>
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
              <Card className="border-border rounded-2xl">
                <CardHeader className="pb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Informasi Alat</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Kategori</p>
                      <p className="font-medium text-foreground">{CATEGORY_LABELS[entityDetails.category] || entityDetails.category || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Merk/Brand</p>
                      <p className="font-medium text-foreground">{entityDetails.merk || '-'}</p>
                    </div>
                  </div>
                  {entityDetails.updatedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Terakhir Diupdate</p>
                      <p className="font-medium text-foreground">{formatDate(entityDetails.updatedAt)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Deskripsi</p>
                    <p className="text-foreground text-sm whitespace-pre-wrap">{entityDetails.description || '-'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Tarif Sewa */}
              {entityDetails.rates && entityDetails.rates.length > 0 && (
                <Card className="border-border rounded-2xl">
                  <CardHeader className="pb-3 flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Tarif Sewa</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entityDetails.rates.map((rate: any) => (
                        <div key={rate.user_category} className="p-3 rounded-xl bg-muted/60 border border-border">
                          <p className="text-sm font-medium text-foreground">{USER_CATEGORY_LABELS[rate.user_category] || rate.user_category}</p>
                          <p className="text-lg font-bold text-emerald-600 mt-0.5">
                            Rp {Number(rate.rate_per_day).toLocaleString('id-ID')}
                            <span className="text-sm font-normal text-muted-foreground">/hari</span>
                          </p>
                          {rate.rate_per_hour && (
                            <p className="text-xs text-muted-foreground mt-0.5">
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
              <Card className="border-border rounded-2xl">
                <CardHeader className="pb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Jadwal Penggunaan</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {entityDetails.activeBookings && entityDetails.activeBookings.length > 0 ? (
                    <div className="space-y-2">
                      {entityDetails.activeBookings.map((booking: any) => (
                        <div key={booking.id} className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-foreground">{booking.purpose || 'Peminjaman'}</p>
                            <Badge variant="outline" className="text-xs">{booking.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">Ref: {booking.reference_no}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {booking.users?.name || '-'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(booking.start_datetime)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Tidak ada jadwal penggunaan aktif</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Riwayat Penggunaan */}
              <Card className="border-border rounded-2xl">
                <CardHeader className="pb-3 flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Riwayat Penggunaan</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {entityDetails.pastBookings && entityDetails.pastBookings.length > 0 ? (
                    <div className="space-y-2">
                      {entityDetails.pastBookings.map((booking: any) => (
                        <div key={booking.id} className="p-3 bg-muted/50 border border-border rounded-xl flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{booking.purpose || 'Peminjaman'}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(booking.start_datetime)} • {booking.reference_no}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">{booking.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
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
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl gap-2"
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
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl gap-2"
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
            <Card className="mt-6 rounded-2xl bg-blue-50 border-blue-100">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">Mode Lihat Saja</p>
                    <p className="text-sm text-blue-600 mt-0.5">
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
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{entityDetails.name}</h1>
            <Badge className="bg-[#0891B2] text-white hover:bg-[#0891B2]">Aktif</Badge>
          </div>
          <p className="text-muted-foreground font-mono text-sm">{entityDetails.inventoryCode}</p>
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

export default function ScanPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    }>
      <PublicScanPage />
    </Suspense>
  )
}
