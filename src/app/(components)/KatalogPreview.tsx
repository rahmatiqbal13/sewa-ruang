'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, Wrench, ArrowRight } from 'lucide-react'

// Type definitions
interface RoomItem {
  id: string
  name: string
  type: string
  capacity: number
  price: string
}

interface EquipmentItem {
  id: string
  name: string
  type: string
  price: string
}

type CatalogItem = RoomItem | EquipmentItem

// Static placeholder data for catalog preview
const roomsData: RoomItem[] = [
  {
    id: '1',
    name: 'Ruang Seminar A101',
    type: 'Ruang Kelas',
    capacity: 50,
    price: 'Rp 500.000/hari',
  },
  {
    id: '2',
    name: 'Laboratorium Komputer',
    type: 'Lab',
    capacity: 30,
    price: 'Rp 750.000/hari',
  },
  {
    id: '3',
    name: 'Aula Utama',
    type: 'Aula',
    capacity: 200,
    price: 'Rp 1.500.000/hari',
  },
]

const equipmentData: EquipmentItem[] = [
  {
    id: '1',
    name: 'Proyektor Epson',
    type: 'Elektronik',
    price: 'Rp 150.000/hari',
  },
  {
    id: '2',
    name: 'Sound System',
    type: 'Elektronik',
    price: 'Rp 300.000/hari',
  },
  {
    id: '3',
    name: 'Kursi Lipat',
    type: 'Mebel',
    price: 'Rp 10.000/unit',
  },
]

// Type guard to check if item is a RoomItem
function isRoomItem(item: CatalogItem): item is RoomItem {
  return 'capacity' in item
}

export function KatalogPreview() {
  const [activeTab, setActiveTab] = useState<'ruangan' | 'peralatan'>('ruangan')

  const displayData = activeTab === 'ruangan' ? roomsData : equipmentData

  return (
    <div>
      {/* Tab Toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex p-1 bg-[#F3F4F6] rounded-xl">
          <button
            onClick={() => setActiveTab('ruangan')}
            className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'ruangan'
                ? 'bg-white text-[#1B3A8C] shadow-sm'
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
                ? 'bg-white text-[#1B3A8C] shadow-sm'
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
        {displayData.map((item) => (
          <div
            key={item.id}
            className="group bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-all duration-300"
          >
            {/* Photo Placeholder */}
            <div className="h-48 bg-[#F3F4F6] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1B3A8C]/5 to-[#2A52C9]/5" />
              {activeTab === 'ruangan' ? (
                <Building2 className="h-12 w-12 text-[#9CA3AF]" />
              ) : (
                <Wrench className="h-12 w-12 text-[#9CA3AF]" />
              )}
            </div>

            {/* Content */}
            <div className="p-5">
              <span className="inline-block px-3 py-1 text-xs font-medium text-[#1B3A8C] bg-[#EFF3FF] rounded-full mb-3">
                {item.type}
              </span>
              <h3 className="text-lg font-semibold text-[#111827] mb-2 group-hover:text-[#1B3A8C] transition-colors">
                {item.name}
              </h3>
              {isRoomItem(item) && (
                <p className="text-sm text-[#6B7280] mb-3">
                  Kapasitas: {item.capacity} orang
                </p>
              )}
              <p className="text-[#1B3A8C] font-semibold">{item.price}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <div className="text-center">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-[#1B3A8C] font-medium hover:gap-3 transition-all"
        >
          Lihat Semua Katalog
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
