import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Building2, Package, LogIn, CalendarCheck, Info, MapPin, Wrench } from 'lucide-react'
import { cn, formatRupiah } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { AvailabilityBadge } from '@/components/shared/AvailabilityBadge'
import { Badge } from '@/components/ui/badge'

export const revalidate = 30

const CATEGORY_LABELS: Record<string, string> = {
  elektronik: 'Elektronik',
  mebel: 'Mebel',
  transportasi: 'Transportasi',
  alat_tes_pengukuran: 'Alat Tes & Pengukuran',
  alat_gym: 'Alat Gym',
  perlengkapan: 'Perlengkapan',
  lainnya: 'Lainnya',
}

const STATUS_LABELS: Record<string, string> = {
  normal: 'Normal',
  perawatan: 'Dalam Perawatan',
  menunggu_part: 'Menunggu Suku Cadang',
  afkir: 'Afkir',
}

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default async function EquipmentScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Find equipment by slug
  const { data: allEquipment } = await sb.from('equipment').select('id, name').eq('is_active', true)
  const matched = allEquipment?.find((e: { id: string; name: string }) => createSlug(e.name) === slug)
  if (!matched) notFound()
  const id = matched.id

  const { data: equipment } = await sb
    .from('equipment')
    .select('*, rooms:storage_room_id(name)')
    .eq('id', id)
    .eq('is_active', true)
    .single() as { data: {
      id: string; name: string; equipment_code: string; category: string
      merk: string | null; description: string | null; photo_url: string | null
      current_condition: string; ketersediaan: string; status_tindakan: string
      current_location: string | null; sumber: string | null
      rooms: { name: string } | null
    } | null }

  if (!equipment) notFound()

  const isAvailable = equipment.ketersediaan === 'tersedia' && equipment.current_condition === 'good'
  const isUnderMaintenance = equipment.status_tindakan !== 'normal'

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
          {equipment.photo_url ? (
            <div className="relative h-56 w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
              <SafeImage
                src={equipment.photo_url}
                alt={equipment.name}
                className="object-contain w-full h-full"
                fallbackClassName="w-full h-full rounded-lg"
              />
            </div>
          ) : (
            <div className="h-36 bg-gradient-to-br from-blue-950 to-indigo-900 flex items-center justify-center">
              <Package className="h-14 w-14 text-white/25" />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold mb-0.5">{equipment.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {CATEGORY_LABELS[equipment.category] ?? equipment.category}
                  {equipment.merk && ` — ${equipment.merk}`}
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs shrink-0">{equipment.equipment_code}</Badge>
            </div>
          </div>
        </div>

        {/* Availability banner */}
        {isAvailable && !isUnderMaintenance ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <CalendarCheck className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800">Tersedia untuk dipinjam</p>
          </div>
        ) : isUnderMaintenance ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Wrench className="h-5 w-5 text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Sedang dalam Perawatan</p>
              <p className="text-xs text-yellow-700 mt-0.5">{STATUS_LABELS[equipment.status_tindakan]}</p>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Package className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-800">Tidak tersedia saat ini</p>
          </div>
        )}

        {/* Detail info */}
        <div className="bg-white rounded-2xl border shadow-sm px-5 py-1">
          <InfoRow label="Kondisi" value={
            <ConditionBadge condition={equipment.current_condition as 'good' | 'needs_repair' | 'damaged' | 'lost'} />
          } />
          <InfoRow label="Ketersediaan" value={
            <AvailabilityBadge status={equipment.ketersediaan as 'tersedia' | 'digunakan' | 'hilang'} />
          } />
          {isUnderMaintenance && (
            <InfoRow label="Status" value={
              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                <Wrench className="h-3 w-3 mr-1" />
                {STATUS_LABELS[equipment.status_tindakan]}
              </Badge>
            } />
          )}
          {(equipment.rooms?.name || equipment.current_location) && (
            <InfoRow label="Lokasi" value={
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {equipment.rooms?.name ?? equipment.current_location}
              </span>
            } />
          )}
          {equipment.sumber && (
            <InfoRow label="Sumber Pengadaan" value={equipment.sumber} />
          )}
        </div>

        {/* Description */}
        {equipment.description && (
          <div className="bg-white rounded-2xl border shadow-sm px-5 py-4 flex gap-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-600 leading-relaxed">{equipment.description}</p>
          </div>
        )}

        {/* CTA */}
        {!user ? (
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
            <LogIn className="mr-2 h-4 w-4" />
            Login untuk Meminjam
          </Link>
        ) : isAvailable && !isUnderMaintenance ? (
          <Link href={`/booking/new?equipmentId=${id}`} className={cn(buttonVariants(), 'w-full bg-blue-950 hover:bg-blue-900')}>
            Ajukan Peminjaman
          </Link>
        ) : null}
      </main>
    </div>
  )
}
