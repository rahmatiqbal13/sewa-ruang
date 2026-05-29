'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QRScanner } from '@/components/scan/QRScanner'
import { processScan, updateEntityFromScan, getBuildingsAndRooms, getEntityCurrentLocation } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Scan, CheckCircle2, AlertCircle, ArrowLeft,
  Package, Building2, ClipboardList, MapPin, Home
} from 'lucide-react'

const CONDITIONS = [
  { value: 'good', label: 'Baik' },
  { value: 'needs_repair', label: 'Perlu Perbaikan' },
  { value: 'damaged', label: 'Rusak' },
  { value: 'lost', label: 'Hilang' },
]

const TYPE_LABELS: Record<string, string> = {
  equipment: 'Alat',
  room: 'Ruangan',
  inventory: 'Inventaris',
}

const TYPE_ICONS: Record<string, typeof Package> = {
  equipment: Package,
  room: Building2,
  inventory: ClipboardList,
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

export default function ScanPageClient() {
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

  const type = searchParams.get('type')
  const id = searchParams.get('id')

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
      getEntityCurrentLocation(type, id).then((loc) => {
        if (loc) {
          setCurrentLocation(loc)
          if (loc.buildingId) setSelectedBuilding(loc.buildingId)
          if (loc.roomId) setSelectedRoom(loc.roomId)
        }
      }).catch(() => setCurrentLocation(null))
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
      router.push(`/admin/scan?type=${result.type}&id=${result.id}`)
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
    }
  }

  // Mode: Scan QR (no query params)
  if (!type || !id) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scan className="h-6 w-6 text-[#0891B2]" />
            Scan QR Code
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Scan QR Code ruangan, alat, atau inventaris untuk update kondisi
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
          <div className="mt-4 p-4 rounded-[10px] bg-[#ecfeff] border border-[#0891B2]/20 text-[#0891B2] text-sm">
            Memproses: {scanResult}
          </div>
        )}
      </div>
    )
  }

  // Mode: Form update after scan
  const Icon = TYPE_ICONS[type] || Package
  const typeLabel = TYPE_LABELS[type] || type

  return (
    <div className="p-6 max-w-xl mx-auto">
      <button
        onClick={() => router.push('/admin/scan')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Scanner
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Icon className="h-6 w-6 text-[#0891B2]" />
          Update {typeLabel}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Hasil scan: {id}
        </p>
      </div>

      <Card className="border border-border rounded-[14px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Perbarui Kondisi & Lokasi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="id" value={id} />

            {/* Current Location Display */}
            {currentLocation && (
              <div className="p-4 rounded-[10px] bg-[#F9FAFB] border border-[#E5E7EB] space-y-2">
                <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Lokasi Saat Ini</p>
                <div className="flex items-start gap-3">
                  <Home className="h-5 w-5 text-[#0891B2] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-[#111827]">
                      {currentLocation.buildingName !== '-' ? currentLocation.buildingName : 'Belum ditentukan'}
                    </p>
                    <p className="text-sm text-[#6B7280]">
                      {currentLocation.roomName !== '-' ? currentLocation.roomName : 'Ruangan belum ditentukan'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Kondisi Saat Ini
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CONDITIONS.map((c) => (
                  <label
                    key={c.value}
                    className="flex items-center gap-2 p-3 rounded-[10px] border border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  >
                    <input
                      type="radio"
                      name="condition"
                      value={c.value}
                      required
                      className="accent-[#0891B2]"
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
                  className="w-full h-10 rounded-[10px] border border-border bg-muted/50 pl-10 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 appearance-none"
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
                  className="w-full h-10 rounded-[10px] border border-border bg-muted/50 pl-10 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                Catatan
              </label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Contoh: Baterai masih bagus, ada goresan kecil..."
                className="w-full rounded-[10px] border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Nama Petugas
              </label>
              <input
                type="text"
                name="checked_by_name"
                placeholder="Nama petugas pemeriksa"
                className="w-full h-10 rounded-[10px] border border-border bg-muted/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
              />
            </div>

            {submitMessage && (
              <div className={`p-3 rounded-[10px] text-sm flex items-center gap-2 ${submitMessage.includes('Berhasil') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {submitMessage.includes('Berhasil') ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                {submitMessage}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/scan')}
                className="flex-1 h-11 rounded-lg"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 bg-[#0891B2] hover:bg-[#0e7490] text-white font-medium rounded-lg"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
