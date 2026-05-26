import { createAdminDbClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  CalendarDays,
  ClipboardCheck,
  Clock,
} from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'

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

const USER_CATEGORY_LABELS: Record<string, string> = {
  mahasiswa_s1: 'Mahasiswa S1',
  mahasiswa_s2: 'Mahasiswa S2/S3',
  dosen: 'Dosen/Karyawan',
  mou_unesa: 'Kerjasama',
  umum: 'Umum',
}

const CONDITION_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  good: { label: 'Baik', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  needs_repair: { label: 'Perlu Perbaikan', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: ClipboardCheck },
  damaged: { label: 'Rusak', color: 'text-red-600 bg-red-50 border-red-200', icon: ClipboardCheck },
  lost: { label: 'Hilang', color: 'text-red-600 bg-red-50 border-red-200', icon: ClipboardCheck },
}

interface EquipmentRate {
  user_category: string
  rate_per_day: number | string | null
  rate_per_hour: number | string | null
  requires_supervision: boolean
}

interface EquipmentCheck {
  id: string
  checked_at: string
  condition: string
  notes: string | null
  checked_by_name: string | null
}

interface Equipment {
  id: string
  name: string
  description: string | null
  category: string | null
  merk: string | null
  current_condition: string
  ketersediaan: string | null
  photo_url: string | null
  tgl_terakhir_cek: string | null
  equipment_rates: EquipmentRate[] | null
}

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? null : n
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const adminDb = createAdminDbClient()

  // Find equipment by slug or UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  let id: string | null = null

  if (isUUID) {
    // Direct UUID lookup
    const { data: eq } = await adminDb
      .from('equipment')
      .select('id')
      .eq('id', slug)
      .eq('is_active', true)
      .single()
    id = eq?.id ?? null
  } else {
    // Find equipment by slug
    const { data: allEquipment } = await adminDb
      .from('equipment')
      .select('id, name')
      .eq('is_active', true)

    const matched = allEquipment?.find(
      (eq: { id: string; name: string }) => createSlug(eq.name) === slug
    )
    id = matched?.id ?? null
  }

  if (!id) notFound()

  const { data: equipment } = await adminDb
    .from('equipment')
    .select(
      'id, name, description, category, merk, current_condition, ketersediaan, photo_url, tgl_terakhir_cek, equipment_rates(user_category, rate_per_day, rate_per_hour, requires_supervision)'
    )
    .eq('id', id)
    .eq('is_active', true)
    .single() as { data: Equipment | null }

  if (!equipment) notFound()

  // Fetch latest check logs
  const { data: checkLogs } = await adminDb
    .from('equipment_checks')
    .select('id, checked_at, condition, notes, checked_by_name')
    .eq('equipment_id', id)
    .order('checked_at', { ascending: false })
    .limit(5) as { data: EquipmentCheck[] | null }

  // Check active bookings
  const now = new Date().toISOString()
  const { data: activeBookings } = await adminDb
    .from('equipment_booking_slots')
    .select('id, slot, status, booking:booking_id(reference_no, start_datetime, end_datetime)')
    .eq('equipment_id', id)
    .gte('slot', `["${now}"]`)
    .limit(5)

  // Fallback: check booking_items for legacy bookings
  let hasActiveBooking = activeBookings && activeBookings.length > 0
  if (!hasActiveBooking) {
    const { data: activeBookingList } = await adminDb
      .from('bookings')
      .select('id')
      .in('status', ['pending', 'approved', 'paid', 'active'])
      .gte('end_datetime', now)

    const activeBookingIds = (activeBookingList ?? []).map(b => b.id)

    if (activeBookingIds.length > 0) {
      const { data: legacyItems } = await adminDb
        .from('booking_items')
        .select('id')
        .eq('equipment_id', id)
        .eq('item_type', 'equipment')
        .in('booking_id', activeBookingIds)
        .limit(1)

      if (legacyItems && legacyItems.length > 0) {
        hasActiveBooking = true
      }
    }
  }

  const isAvailable =
    (!equipment.ketersediaan || equipment.ketersediaan === 'tersedia') && !hasActiveBooking

  const hasRates =
    equipment.equipment_rates && equipment.equipment_rates.length > 0

  const conditionConfig = CONDITION_CONFIG[equipment.current_condition] || {
    label: equipment.current_condition,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    icon: ClipboardCheck,
  }
  const ConditionIcon = conditionConfig.icon

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 text-[#374151] hover:text-[#2E4DA7] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Katalog
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div>
            <div className="relative aspect-square bg-[#F3F4F6] rounded-[14px] overflow-hidden">
              {equipment.photo_url ? (
                <SafeImage
                  src={equipment.photo_url}
                  alt={equipment.name}
                  className="w-full h-full object-cover"
                  fallbackClassName="w-full h-full flex items-center justify-center"
                  fallback={<Package className="h-16 w-16 text-[#9CA3AF]" />}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-16 w-16 text-[#9CA3AF]" />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="mb-4">
              <span className="inline-block px-3 py-1 text-xs font-medium text-[#2E4DA7] bg-[#EFF3FF] rounded-full">
                {CATEGORY_LABELS[equipment.category ?? ''] || equipment.category || 'Peralatan'}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold text-[#111827] mb-2">
              {equipment.name}
            </h1>

            {equipment.merk && (
              <p className="text-[#6B7280] mb-4">{equipment.merk}</p>
            )}

            <div className="flex items-center gap-2 mb-6">
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  isAvailable ? 'bg-emerald-500' : 'bg-red-500'
                )}
              />
              <span className="text-sm text-[#374151] font-medium">
                {isAvailable ? 'Tersedia' : 'Tidak Tersedia'}
              </span>
            </div>

            {equipment.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-[#111827] mb-2">
                  Deskripsi
                </h2>
                <p className="text-[#6B7280] leading-relaxed">
                  {equipment.description}
                </p>
              </div>
            )}

            {/* Rates */}
            {hasRates && (
              <Card className="border border-[#E5E7EB] rounded-[14px] mb-6">
                <CardContent className="p-5">
                  <h2 className="text-lg font-semibold text-[#111827] mb-4">
                    Tarif Sewa
                  </h2>
                  <div className="space-y-3">
                    {equipment.equipment_rates?.map((rate) => (
                      <div
                        key={rate.user_category}
                        className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0"
                      >
                        <div>
                          <p className="font-medium text-[#111827]">
                            {USER_CATEGORY_LABELS[rate.user_category] || rate.user_category}
                          </p>
                          {rate.requires_supervision && (
                            <p className="text-xs text-amber-600">
                              Membutuhkan supervisi
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#2E4DA7]">
                            {formatRupiah(toNumber(rate.rate_per_day) ?? 0)}/hari
                          </p>
                          {toNumber(rate.rate_per_hour) != null && (
                            <p className="text-xs text-[#6B7280]">
                              {formatRupiah(toNumber(rate.rate_per_hour) ?? 0)}/jam
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Condition */}
            <Card className={cn('border rounded-[14px] mb-6', conditionConfig.color)}>
              <CardContent className="p-5">
                <h2 className="text-lg font-semibold text-[#111827] mb-3">
                  Kondisi Alat
                </h2>
                <div className="flex items-center gap-2 mb-2">
                  <ConditionIcon className={cn('h-5 w-5', conditionConfig.color.split(' ')[0])} />
                  <span className="font-medium text-[#111827] capitalize">
                    {conditionConfig.label}
                  </span>
                </div>
                {equipment.tgl_terakhir_cek && (
                  <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <Clock className="h-4 w-4" />
                    <span>
                      Pengecekan terakhir:{' '}
                      {new Date(equipment.tgl_terakhir_cek).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Check Logs */}
            {checkLogs && checkLogs.length > 0 && (
              <Card className="border border-[#E5E7EB] rounded-[14px] mb-6">
                <CardContent className="p-5">
                  <h2 className="text-lg font-semibold text-[#111827] mb-4">
                    Riwayat Pengecekan
                  </h2>
                  <div className="space-y-3">
                    {checkLogs.map((log) => {
                      const logCondition = CONDITION_CONFIG[log.condition] || {
                        label: log.condition,
                        color: '',
                        icon: ClipboardCheck,
                      }
                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-3 rounded-[10px] bg-[#F9FAFB] border border-[#E5E7EB]"
                        >
                          <ClipboardCheck className="h-4 w-4 text-[#6B7280] mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm text-[#111827]">
                                {logCondition.label}
                              </span>
                              <span className="text-xs text-[#9CA3AF]">
                                {new Date(log.checked_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            {log.notes && (
                              <p className="text-xs text-[#6B7280] mt-1">{log.notes}</p>
                            )}
                            {log.checked_by_name && (
                              <p className="text-xs text-[#9CA3AF] mt-1">
                                Oleh: {log.checked_by_name}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA */}
            <div className="flex gap-3">
              <Link href="/login" className="flex-1">
                <Button className="w-full h-11 bg-[#2E4DA7] hover:bg-[#1e3a8a] text-white font-semibold rounded-lg">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Ajukan Peminjaman
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
