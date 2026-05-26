import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Package,
  ArrowLeft,
  Wrench,
  CheckCircle2,
  Info,
  CalendarDays,
  Building2,
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

interface EquipmentRate {
  user_category: string
  rate_per_day: number
  rate_per_hour: number | null
  requires_supervision: boolean
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
  equipment_rates: EquipmentRate[] | null
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: equipment } = await supabase
    .from('equipment')
    .select(
      'id, name, description, category, merk, current_condition, ketersediaan, photo_url, equipment_rates(user_category, rate_per_day, rate_per_hour, requires_supervision)'
    )
    .eq('id', id)
    .eq('is_active', true)
    .single() as { data: Equipment | null }

  if (!equipment) notFound()

  const isAvailable =
    !equipment.ketersediaan || equipment.ketersediaan === 'tersedia'

  const hasRates =
    equipment.equipment_rates && equipment.equipment_rates.length > 0

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
                            {formatRupiah(rate.rate_per_day)}/hari
                          </p>
                          {rate.rate_per_hour && (
                            <p className="text-xs text-[#6B7280]">
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

            {/* Condition */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[#111827] mb-2">
                Kondisi
              </h2>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-[#374151] capitalize">
                  {equipment.current_condition === 'good'
                    ? 'Baik'
                    : equipment.current_condition === 'needs_repair'
                      ? 'Perlu Perbaikan'
                      : equipment.current_condition === 'damaged'
                        ? 'Rusak'
                        : equipment.current_condition}
                </span>
              </div>
            </div>

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
