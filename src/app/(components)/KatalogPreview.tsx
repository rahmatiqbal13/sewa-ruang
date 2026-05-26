'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, Wrench, ArrowRight } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'

interface PreviewRoom {
  id: string
  name: string
  room_code: string | null
  capacity: number | null
  photo_url: string | null
  rate_per_day: number | null
}

interface PreviewEquipment {
  id: string
  name: string
  category: string | null
  photo_url: string | null
  rate_per_day: number | null
}

interface KatalogPreviewProps {
  rooms: PreviewRoom[]
  equipment: PreviewEquipment[]
}

const CATEGORY_LABELS: Record<string, string> = {
  elektronik: 'Elektronik',
  mebel: 'Mebel',
  transportasi: 'Transportasi',
  alat_tes_pengukuran: 'Alat Tes & Pengukuran',
  alat_gym: 'Alat Gym',
  perlengkapan: 'Perlengkapan',
  lainnya: 'Lainnya',
}

function RoomCard({ room }: { room: PreviewRoom }) {
  return (
    <div className="group bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Photo */}
      <div className="h-48 bg-[#F3F4F6] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2E4DA7]/5 to-[#2A52C9]/5" />
        {room.photo_url ? (
          <SafeImage
            src={room.photo_url}
            alt={room.name}
            className="w-full h-full object-cover"
            fallbackClassName="w-full h-full flex items-center justify-center"
            fallback={<Building2 className="h-12 w-12 text-[#9CA3AF]" />}
          />
        ) : (
          <Building2 className="h-12 w-12 text-[#9CA3AF] relative z-10" />
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <span className="inline-block px-3 py-1 text-xs font-medium text-[#2E4DA7] bg-[#EFF3FF] rounded-full mb-3">
          {room.room_code || 'Ruangan'}
        </span>
        <h3 className="text-lg font-semibold text-[#111827] mb-2 group-hover:text-[#2E4DA7] transition-colors">
          {room.name}
        </h3>
        {room.capacity != null && (
          <p className="text-sm text-[#6B7280] mb-3">
            Kapasitas: {room.capacity} orang
          </p>
        )}
        <p className="text-[#2E4DA7] font-semibold">
          {room.rate_per_day != null && room.rate_per_day > 0
            ? `${formatRupiah(room.rate_per_day)}/hari`
            : 'Tarif belum diatur'
          }
        </p>
      </div>
    </div>
  )
}

function EquipmentCard({ item }: { item: PreviewEquipment }) {
  return (
    <div className="group bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Photo */}
      <div className="h-48 bg-[#F3F4F6] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2E4DA7]/5 to-[#2A52C9]/5" />
        {item.photo_url ? (
          <SafeImage
            src={item.photo_url}
            alt={item.name}
            className="w-full h-full object-cover"
            fallbackClassName="w-full h-full flex items-center justify-center"
            fallback={<Wrench className="h-12 w-12 text-[#9CA3AF]" />}
          />
        ) : (
          <Wrench className="h-12 w-12 text-[#9CA3AF] relative z-10" />
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <span className="inline-block px-3 py-1 text-xs font-medium text-[#2E4DA7] bg-[#EFF3FF] rounded-full mb-3">
          {CATEGORY_LABELS[item.category ?? ''] || item.category || 'Peralatan'}
        </span>
        <h3 className="text-lg font-semibold text-[#111827] mb-2 group-hover:text-[#2E4DA7] transition-colors">
          {item.name}
        </h3>
        <p className="text-[#2E4DA7] font-semibold">
          {item.rate_per_day != null && item.rate_per_day > 0
            ? `${formatRupiah(item.rate_per_day)}/hari`
            : 'Tarif belum diatur'
          }
        </p>
      </div>
    </div>
  )
}

export function KatalogPreview({ rooms, equipment }: KatalogPreviewProps) {
  const [activeTab, setActiveTab] = useState<'ruangan' | 'peralatan'>('ruangan')

  const hasRooms = rooms.length > 0
  const hasEquipment = equipment.length > 0
  const showEmpty = activeTab === 'ruangan' ? !hasRooms : !hasEquipment

  return (
    <div>
      {/* Tab Toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex p-1 bg-[#F3F4F6] rounded-xl">
          <button
            onClick={() => setActiveTab('ruangan')}
            className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'ruangan'
                ? 'bg-white text-[#2E4DA7] shadow-sm'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Ruangan
            </span>
          </button>
          <button
            onClick={() => setActiveTab('peralatan')}
            className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'peralatan'
                ? 'bg-white text-[#2E4DA7] shadow-sm'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Peralatan
            </span>
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {showEmpty && (
          <div className="col-span-full text-center py-12 text-[#6B7280]">
            <p className="text-lg font-medium">Belum ada data tersedia</p>
            <p className="text-sm mt-1">Silakan cek katalog lengkap untuk melihat semua item.</p>
          </div>
        )}

        {activeTab === 'ruangan' && rooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}

        {activeTab === 'peralatan' && equipment.map((item) => (
          <EquipmentCard key={item.id} item={item} />
        ))}
      </div>

      {/* View All Link */}
      <div className="text-center">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-[#2E4DA7] font-medium hover:gap-3 transition-all"
        >
          Lihat Semua Katalog
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
