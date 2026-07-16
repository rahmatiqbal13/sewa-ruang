'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { CalendarView } from '@/components/calendar/CalendarView'

import { 
  Building2, 
  Package, 
  Users, 
  MapPin, 
  Search, 
  Filter,
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  ArrowRight,
  X,
  ChevronDown,
  Landmark,
  Hash,
  Layers,
  DoorOpen,
  List,
  Calendar,
  Info,
  Loader2,
  Clock,
  CalendarCheck,
  GraduationCap
} from 'lucide-react'
import { formatRupiah, formatDateTime, cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'
import { EmptyState } from '@/components/ui/empty-state'
import { fetchPublicScheduleAction } from '@/app/catalog/actions'

const PAGE_SIZE = 12

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

interface RoomRate { 
  usage_category: string
  rate_per_hour: number | null
  rate_per_day: number | null 
}

interface Room {
  id: string
  name: string
  capacity: number | null
  current_condition: string
  room_code: string | null
  floor_number: number | null
  photo_url: string | null
  door_photo_url?: string | null
  is_active: boolean
  is_for_rent: boolean | null
  room_rates: RoomRate[] | null
}

interface BuildingRow { 
  id: string
  name: string
  code: string
  assets: Room[] 
}

interface EquipmentRate {
  user_category: string
  rate_per_day: number | string | null
  rate_per_hour: number | string | null
  requires_supervision: boolean
}

interface EquipmentRow {
  id: string
  name: string
  description: string | null
  current_condition: string
  ketersediaan: string | null
  merk: string | null
  is_active: boolean
  photo_url?: string | null
  equipment_rates: EquipmentRate[] | null
  category?: string
}

interface InstitutionProfile {
  id?: string
  name: string
  short_name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  operating_hours: string | null
}

interface Props { 
  buildings: BuildingRow[]
  equipment: EquipmentRow[]
  institution: InstitutionProfile | null
  bookedRoomIds?: string[]
}

const EQUIPMENT_CATEGORIES = [
  { value: 'elektronik', label: 'Elektronik' },
  { value: 'mebel', label: 'Mebel' },
  { value: 'transportasi', label: 'Transportasi' },
  { value: 'alat_tes_pengukuran', label: 'Alat Tes & Pengukuran' },
  { value: 'alat_gym', label: 'Alat Gym' },
  { value: 'perlengkapan', label: 'Perlengkapan' },
  { value: 'lainnya', label: 'Lainnya' },
]

const CAPACITY_RANGES = [
  { value: '1-10', label: '1-10 orang', min: 1, max: 10 },
  { value: '11-30', label: '11-30 orang', min: 11, max: 30 },
  { value: '31-50', label: '31-50 orang', min: 31, max: 50 },
  { value: '50+', label: '50+ orang', min: 50, max: 9999 },
]

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? null : n
}

function getPriceRange(rates: EquipmentRate[] | null | undefined): { min: number | null; max: number | null } {
  if (!rates || rates.length === 0) return { min: null, max: null }
  const prices = rates.map(r => toNumber(r.rate_per_day)).filter((p): p is number => p != null)
  if (prices.length === 0) return { min: null, max: null }
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

function getLowestRoomRate(rates: RoomRate[] | null | undefined): number | null {
  if (!rates || rates.length === 0) return null
  const dayRates = rates.map(r => r.rate_per_day).filter((r): r is number => r != null)
  return dayRates.length > 0 ? Math.min(...dayRates) : null
}

function Paginator({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  
  const getVisiblePages = () => {
    const pages: (number | string)[] = []
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', total)
      } else if (page >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total)
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', total)
      }
    }
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="h-10 w-10 rounded-full border-[#E5E7EB] hover:bg-[#F3F4F6]"
      >
        <ChevronLeft className="h-4 w-4 text-[#6B7280]" />
      </Button>
      
      <div className="flex items-center gap-1">
        {getVisiblePages().map((p, i) => (
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-[#9CA3AF]">...</span>
          ) : (
            <Button
              key={p}
              variant={page === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(p as number)}
              className={cn(
                'h-10 w-10 text-sm font-medium rounded-full',
                page === p 
                  ? 'bg-[#0891B2] hover:bg-[#0891B2]/90 text-white border-0' 
                  : 'border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]'
              )}
            >
              {p}
            </Button>
          )
        ))}
      </div>
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page === total}
        className="h-10 w-10 rounded-full border-[#E5E7EB] hover:bg-[#F3F4F6]"
      >
        <ChevronRight className="h-4 w-4 text-[#6B7280]" />
      </Button>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Icon className="h-3.5 w-3.5 text-[#6B7280] shrink-0" />
      <span className="text-xs text-[#6B7280] w-16 shrink-0">{label}</span>
      <span className="text-xs text-[#111827] font-medium">: {value}</span>
    </div>
  )
}

function RoomCard({ room, onOpenCalendar, onOpenSchedule, isBooked }: { room: Room & { buildingName: string; buildingCode?: string; displayName: string }; onOpenCalendar: (id: string, name: string) => void; onOpenSchedule: (id: string, name: string) => void; isBooked?: boolean }) {
  const lowestRate = useMemo(() => getLowestRoomRate(room.room_rates), [room.room_rates])
  const slug = createSlug(room.name)

  return (
    <Card className="group overflow-hidden border border-[#E5E7EB] rounded-[14px] bg-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
      {/* Card Header - Room Name & Location */}
      <div className="px-4 pt-4 pb-0">
        <h3 className="font-bold text-[#111827] text-base leading-tight mb-1 line-clamp-2" title={room.displayName}>
          {room.displayName}
        </h3>
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="h-3.5 w-3.5 text-[#0891B2] shrink-0" />
          <span className="text-xs font-medium text-[#0891B2] line-clamp-1">
            {room.buildingName}
          </span>
        </div>
      </div>

      {/* Card Body - Photo on top, info below (bulletproof layout) */}
      <div className="px-4 pb-4 space-y-4">
        {/* Photo - Full Width */}
        <div className="relative aspect-[16/10] bg-[#F3F4F6] rounded-[10px] overflow-hidden">
          {room.photo_url ? (
            <SafeImage
              src={room.photo_url}
              alt={room.displayName}
              className="w-full h-full object-cover"
              fallbackClassName="w-full h-full flex items-center justify-center"
              fallback={<Building2 className="h-10 w-10 text-[#D1D5DB]" />}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="h-10 w-10 text-[#D1D5DB]" />
            </div>
          )}
          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <Badge className={cn(
              "text-[10px] font-medium border-0 px-2 py-0.5",
              isBooked
                ? "bg-red-500 text-white"
                : room.current_condition === 'good'
                  ? "bg-emerald-500 text-white"
                  : "bg-red-500 text-white"
            )}>
              {isBooked ? 'Sedang Digunakan' : room.current_condition === 'good' ? 'Tersedia' : 'Sedang Digunakan'}
            </Badge>
          </div>
        </div>

        {/* Info Rows */}
        <div className="space-y-0.5">
          {room.buildingCode && (
            <InfoRow icon={Landmark} label="Unit" value={room.buildingCode} />
          )}
          <InfoRow icon={Building2} label="Gedung" value={room.buildingName} />
          <InfoRow icon={DoorOpen} label="Ruangan" value={room.displayName} />
          {room.floor_number != null && (
            <InfoRow icon={Layers} label="Lantai" value={room.floor_number} />
          )}
          {room.room_code && (
            <InfoRow icon={Hash} label="Nomor" value={room.room_code} />
          )}
          {room.capacity != null && (
            <InfoRow icon={Users} label="Kapasitas" value={`${room.capacity} Orang`} />
          )}
        </div>

        {/* Price (if available) */}
        {lowestRate !== null ? (
          <div className="flex items-baseline gap-1">
            {lowestRate === 0 ? (
              <span className="text-emerald-600 font-semibold text-sm">Gratis</span>
            ) : (
              <>
                <span className="text-[#0891B2] font-semibold text-sm">{formatRupiah(lowestRate)}</span>
                <span className="text-xs text-[#6B7280]">/hari</span>
              </>
            )}
          </div>
        ) : (
          <div className="text-xs text-[#9CA3AF] italic">Tarif belum diatur</div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="px-4 pb-4 pt-0 mt-auto border-t border-[#E5E7EB]">
        <div className="pt-3 space-y-2">
          {/* Primary CTA - Full Width */}
          <Link href={`/booking/new?room_id=${room.id}`} className="block">
            <Button
              className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg"
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              Booking
            </Button>
          </Link>
          {/* Secondary CTAs - Side by Side */}
          <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="w-full h-9 border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-xs font-medium rounded-lg"
            onClick={() => onOpenSchedule(room.id, room.displayName)}
          >
            <List className="h-3.5 w-3.5 mr-1.5" />
            Jadwal
          </Button>
          <Button
            variant="outline"
            className="w-full h-9 border-[#0891B2] text-[#0891B2] hover:bg-[#ecfeff] text-xs font-medium rounded-lg"
            onClick={() => onOpenCalendar(room.id, room.displayName)}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Kalender
          </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function EquipmentCard({ item, onOpenCalendar, onOpenSchedule }: { item: EquipmentRow & { displayName: string }; onOpenCalendar: (id: string, name: string) => void; onOpenSchedule: (id: string, name: string) => void }) {
  const priceRange = getPriceRange(item.equipment_rates)
  const hasRates = item.equipment_rates && item.equipment_rates.length > 0
  const isAvailable = !item.ketersediaan || item.ketersediaan === 'tersedia'

  return (
    <Card className="group overflow-hidden border border-[#E5E7EB] rounded-[14px] bg-white shadow-sm hover:shadow-md transition-all duration-300">
      {/* Image Placeholder */}
      {/* eslint-disable @next/next/no-img-element */}
      <div className="relative aspect-square bg-[#F3F4F6] overflow-hidden">
        {item.photo_url ? (
          <img 
            src={item.photo_url} 
            alt={item.displayName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-[#D1D5DB]" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <Badge className={cn(
            "text-xs font-medium border-0",
            isAvailable 
              ? "bg-emerald-500 text-white" 
              : "bg-red-500 text-white"
          )}>
            {isAvailable ? 'Tersedia' : 'Sedang Digunakan'}
          </Badge>
        </div>
      {/* eslint-enable @next/next/no-img-element */}
      </div>
      
      <CardContent className="p-4">
        {/* Category Pill */}
        <div className="mb-2">
          <span className="inline-flex items-center bg-[#F3F4F6] text-[#374151] text-xs rounded-full px-2.5 py-1">
            {item.category || 'Peralatan'}
          </span>
        </div>
        
        {/* Title */}
        <h3 className="font-bold text-[#111827] text-lg mb-1 line-clamp-1" title={item.displayName}>
          {item.displayName}
        </h3>
        
        {/* Brand */}
        {item.merk && (
          <p className="text-sm text-[#6B7280] mb-2">{item.merk}</p>
        )}
        
        {/* Price */}
        <div className="mb-4">
          {hasRates && priceRange.min !== null ? (
            <div className="flex items-baseline gap-1">
              {priceRange.min === 0 && priceRange.max === 0 ? (
                <span className="text-emerald-600 font-semibold text-lg">Gratis</span>
              ) : (
                <>
                  <span className="text-[#0891B2] font-semibold text-lg">
                    {formatRupiah(priceRange.min)}
                  </span>
                  <span className="text-sm text-[#6B7280]">/hari</span>
                  {priceRange.max !== priceRange.min && (
                    <span className="text-xs text-[#9CA3AF] ml-1">
                      - {formatRupiah(priceRange.max as number)}
                    </span>
                  )}
                </>
              )}
            </div>
          ) : (
            <span className="text-sm text-[#9CA3AF] italic">Tarif belum diatur</span>
          )}
        </div>
        
        {/* Stock Indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isAvailable ? "bg-emerald-500" : "bg-red-500"
          )} />
          <span className="text-xs text-[#6B7280]">
            {isAvailable ? 'Stok tersedia' : 'Tidak tersedia'}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-2">
          <Link href={`/booking/new?equipment_id=${item.id}`} className="block">
            <Button
              className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg"
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              Booking
            </Button>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full h-9 border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-xs font-medium rounded-lg"
              onClick={() => onOpenSchedule(item.id, item.displayName)}
            >
              <List className="h-3.5 w-3.5 mr-1.5" />
              Jadwal
            </Button>
            <Button
              variant="outline"
              className="w-full h-9 border-[#0891B2] text-[#0891B2] hover:bg-[#ecfeff] text-xs font-medium rounded-lg"
              onClick={() => onOpenCalendar(item.id, item.displayName)}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Kalender
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Active Filter Chips
function ActiveFilterChips({
  selectedBuildings,
  setSelectedBuildings,
  selectedCategories,
  setSelectedCategories,
  selectedCapacity,
  setSelectedCapacity,
  showAvailableOnly,
  setShowAvailableOnly,
  searchQuery,
  setSearchQuery,
  priceRange,
  setPriceRange,
  onResetAll,
}: {
  selectedBuildings: string[]
  setSelectedBuildings: (v: string[]) => void
  selectedCategories: string[]
  setSelectedCategories: (v: string[]) => void
  selectedCapacity: string[]
  setSelectedCapacity: (v: string[]) => void
  showAvailableOnly: boolean
  setShowAvailableOnly: (v: boolean) => void
  searchQuery: string
  setSearchQuery: (v: string) => void
  priceRange: { min: string; max: string }
  setPriceRange: (v: { min: string; max: string }) => void
  onResetAll: () => void
}) {
  const hasAnyFilter =
    selectedBuildings.length > 0 ||
    selectedCategories.length > 0 ||
    selectedCapacity.length > 0 ||
    showAvailableOnly ||
    searchQuery ||
    priceRange.min ||
    priceRange.max

  if (!hasAnyFilter) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <Search className="h-3 w-3" />
          &quot;{searchQuery}&quot;
          <X className="h-3 w-3 ml-0.5" />
        </button>
      )}
      {selectedBuildings.map((id) => {
        const b = selectedBuildings.find(() => true) // placeholder
        return (
          <button
            key={id}
            onClick={() => setSelectedBuildings(selectedBuildings.filter((bid) => bid !== id))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-medium rounded-full border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <Building2 className="h-3 w-3" />
            Gedung
            <X className="h-3 w-3 ml-0.5" />
          </button>
        )
      })}
      {selectedCategories.map((cat) => {
        const label = EQUIPMENT_CATEGORIES.find((c) => c.value === cat)?.label || cat
        return (
          <button
            key={cat}
            onClick={() => setSelectedCategories(selectedCategories.filter((c) => c !== cat))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-200 hover:bg-purple-100 transition-colors"
          >
            <Package className="h-3 w-3" />
            {label}
            <X className="h-3 w-3 ml-0.5" />
          </button>
        )
      })}
      {selectedCapacity.map((cap) => {
        const label = CAPACITY_RANGES.find((c) => c.value === cap)?.label || cap
        return (
          <button
            key={cap}
            onClick={() => setSelectedCapacity(selectedCapacity.filter((c) => c !== cap))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            <Users className="h-3 w-3" />
            {label}
            <X className="h-3 w-3 ml-0.5" />
          </button>
        )
      })}
      {(priceRange.min || priceRange.max) && (
        <button
          onClick={() => setPriceRange({ min: '', max: '' })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          Harga: {priceRange.min ? `Rp${Number(priceRange.min).toLocaleString('id')}` : '0'} - {priceRange.max ? `Rp${Number(priceRange.max).toLocaleString('id')}` : '∞'}
          <X className="h-3 w-3 ml-0.5" />
        </button>
      )}
      {showAvailableOnly && (
        <button
          onClick={() => setShowAvailableOnly(false)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200 hover:bg-green-100 transition-colors"
        >
          Tersedia saja
          <X className="h-3 w-3 ml-0.5" />
        </button>
      )}
      <button
        onClick={onResetAll}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
      >
        Hapus semua filter
      </button>
    </div>
  )
}

// Filter Sidebar Component
function FilterSidebar({
  buildings,
  activeTab,
  selectedBuildings,
  setSelectedBuildings,
  selectedCategories,
  setSelectedCategories,
  priceRange,
  setPriceRange,
  selectedCapacity,
  setSelectedCapacity,
  showAvailableOnly,
  setShowAvailableOnly,
  onReset,
  isMobile = false
}: {
  buildings: BuildingRow[]
  activeTab: 'all' | 'rooms' | 'equipment'
  selectedBuildings: string[]
  setSelectedBuildings: (v: string[]) => void
  selectedCategories: string[]
  setSelectedCategories: (v: string[]) => void
  priceRange: { min: string; max: string }
  setPriceRange: (v: { min: string; max: string }) => void
  selectedCapacity: string[]
  setSelectedCapacity: (v: string[]) => void
  showAvailableOnly: boolean
  setShowAvailableOnly: (v: boolean) => void
  onReset: () => void
  isMobile?: boolean
}) {
  const handleBuildingToggle = (id: string) => {
    setSelectedBuildings(
      selectedBuildings.includes(id)
        ? selectedBuildings.filter(b => b !== id)
        : [...selectedBuildings, id]
    )
  }

  const handleCategoryToggle = (value: string) => {
    setSelectedCategories(
      selectedCategories.includes(value)
        ? selectedCategories.filter(c => c !== value)
        : [...selectedCategories, value]
    )
  }

  const handleCapacityToggle = (value: string) => {
    setSelectedCapacity(
      selectedCapacity.includes(value)
        ? selectedCapacity.filter(c => c !== value)
        : [...selectedCapacity, value]
    )
  }

  const content = (
    <div className="space-y-6">
      {/* GEDUNG */}
      {activeTab !== 'equipment' && (
        <div>
          <h4 className="font-semibold text-[#111827] text-sm mb-3">GEDUNG</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {buildings.map(building => (
              <div key={building.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`building-${building.id}`}
                  checked={selectedBuildings.includes(building.id)}
                  onCheckedChange={() => handleBuildingToggle(building.id)}
                  className="border-[#D1D5DB]"
                />
                <Label htmlFor={`building-${building.id}`} className="text-sm text-[#374151] cursor-pointer">
                  {building.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KATEGORI ALAT */}
      {activeTab !== 'rooms' && (
        <div>
          <h4 className="font-semibold text-[#111827] text-sm mb-3">KATEGORI ALAT</h4>
          <div className="space-y-2">
            {EQUIPMENT_CATEGORIES.map(cat => (
              <div key={cat.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`cat-${cat.value}`}
                  checked={selectedCategories.includes(cat.value)}
                  onCheckedChange={() => handleCategoryToggle(cat.value)}
                  className="border-[#D1D5DB]"
                />
                <Label htmlFor={`cat-${cat.value}`} className="text-sm text-[#374151] cursor-pointer">
                  {cat.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HARGA */}
      <div>
        <h4 className="font-semibold text-[#111827] text-sm mb-3">HARGA (Rp)</h4>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-xs">MIN</span>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={priceRange.min}
              onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
              className="w-full pl-10 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
            />
          </div>
          <span className="text-[#9CA3AF] text-sm">-</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-xs">MAX</span>
            <input
              type="number"
              placeholder="∞"
              min="0"
              value={priceRange.max}
              onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
              className="w-full pl-11 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
            />
          </div>
        </div>
      </div>

      {/* KAPASITAS */}
      {activeTab !== 'equipment' && (
        <div>
          <h4 className="font-semibold text-[#111827] text-sm mb-3">KAPASITAS</h4>
          <div className="space-y-2">
            {CAPACITY_RANGES.map(range => (
              <div key={range.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`cap-${range.value}`}
                  checked={selectedCapacity.includes(range.value)}
                  onCheckedChange={() => handleCapacityToggle(range.value)}
                  className="border-[#D1D5DB]"
                />
                <Label htmlFor={`cap-${range.value}`} className="text-sm text-[#374151] cursor-pointer">
                  {range.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATUS */}
      <div>
        <h4 className="font-semibold text-[#111827] text-sm mb-3">STATUS</h4>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="available-only"
            checked={showAvailableOnly}
            onCheckedChange={(v) => setShowAvailableOnly(v as boolean)}
            className="border-[#D1D5DB]"
          />
          <Label htmlFor="available-only" className="text-sm text-[#374151] cursor-pointer">
            Tampilkan tersedia saja
          </Label>
        </div>
      </div>

      {/* Reset */}
      <div className="pt-2">
        <Button
          variant="ghost"
          onClick={onReset}
          className="w-full h-10 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg"
        >
          Reset Filter
        </Button>
      </div>
    </div>
  )

  if (isMobile) {
    const activeFilterCount =
      selectedBuildings.length +
      selectedCategories.length +
      selectedCapacity.length +
      (showAvailableOnly ? 1 : 0) +
      (priceRange.min || priceRange.max ? 1 : 0)

    return (
      <Sheet>
        <SheetTrigger
          render={
            <button
              type="button"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-[#E5E7EB] bg-white shadow-sm hover:bg-[#F3F4F6] hover:text-[#111827] h-10 px-4 text-[#374151]"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {activeFilterCount > 0 && (
                <Badge className="ml-2 bg-[#0891B2] text-white text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </button>
          }
        />
        <SheetContent side="right" className="w-[320px] sm:w-[400px] p-0">
          <SheetHeader className="p-6 pb-4 border-b border-[#E5E7EB]">
            <SheetTitle className="text-[#111827] font-semibold">Filter Katalog</SheetTitle>
          </SheetHeader>
          <div className="p-6 overflow-y-auto h-[calc(100vh-120px)]">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Card className="border border-[#E5E7EB] rounded-[14px] shadow-sm sticky top-24">
      <CardContent className="p-5">
        <h3 className="font-bold text-[#111827] mb-5">Filter</h3>
        {content}
      </CardContent>
    </Card>
  )
}

export function CatalogClient({ buildings, equipment, bookedRoomIds = [] }: Props) {
  // Tab state: 'all' | 'rooms' | 'equipment'
  const [activeTab, setActiveTab] = useState<'all' | 'rooms' | 'equipment'>('all')
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filter states
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [selectedCapacity, setSelectedCapacity] = useState<string[]>([])
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)
  
  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high'>('name')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Calendar modal state
  const [calendarModal, setCalendarModal] = useState<{
    open: boolean
    type: 'room' | 'equipment'
    id: string
    name: string
  }>({ open: false, type: 'room', id: '', name: '' })

  const openRoomCalendar = (id: string, name: string) => {
    setCalendarModal({ open: true, type: 'room', id, name })
  }
  const openEquipmentCalendar = (id: string, name: string) => {
    setCalendarModal({ open: true, type: 'equipment', id, name })
  }

  // Schedule modal state
  const [scheduleModal, setScheduleModal] = useState<{
    open: boolean
    type: 'room' | 'equipment'
    id: string
    name: string
  }>({ open: false, type: 'room', id: '', name: '' })

  const openRoomSchedule = (id: string, name: string) => {
    setScheduleModal({ open: true, type: 'room', id, name })
  }
  const openEquipmentSchedule = (id: string, name: string) => {
    setScheduleModal({ open: true, type: 'equipment', id, name })
  }

  // Reset pagination when filters change
  useEffect(() => {
    const id = setTimeout(() => setCurrentPage(1), 0)
    return () => clearTimeout(id)
  }, [searchQuery, selectedBuildings, selectedCategories, selectedCapacity, showAvailableOnly, sortBy, activeTab, priceRange.min, priceRange.max])

  // Transform rooms data
  const allRooms = useMemo(() =>
    buildings.flatMap(b =>
      b.assets
        .filter(a => a.is_active && a.is_for_rent !== false)
        .map(a => ({ ...a, buildingName: b.name, buildingCode: b.code, buildingId: b.id }))
    ),
    [buildings]
  )

  // Add display names for duplicates
  const roomsWithNumbers = useMemo(() => {
    const nameCount: Record<string, number> = {}
    for (const r of allRooms) nameCount[r.name] = (nameCount[r.name] || 0) + 1
    const nameIndex: Record<string, number> = {}
    return allRooms.map(r => {
      nameIndex[r.name] = (nameIndex[r.name] || 0) + 1
      return { ...r, displayName: nameCount[r.name] > 1 ? `${r.name} ${nameIndex[r.name]}` : r.name }
    })
  }, [allRooms])

  const equipWithNumbers = useMemo(() => {
    const nameCount: Record<string, number> = {}
    for (const e of equipment) nameCount[e.name] = (nameCount[e.name] || 0) + 1
    const nameIndex: Record<string, number> = {}
    return equipment.map(e => {
      nameIndex[e.name] = (nameIndex[e.name] || 0) + 1
      return { ...e, displayName: nameCount[e.name] > 1 ? `${e.name} ${nameIndex[e.name]}` : e.name }
    })
  }, [equipment])

  // Filter rooms
  const filteredRooms = useMemo(() => {
    return roomsWithNumbers.filter(r => {
      const matchSearch = !searchQuery || 
        r.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (r.room_code?.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchBuilding = selectedBuildings.length === 0 || selectedBuildings.includes(r.buildingId)
      const matchCapacity = selectedCapacity.length === 0 || selectedCapacity.some(cap => {
        const range = CAPACITY_RANGES.find(c => c.value === cap)
        return range && r.capacity && r.capacity >= range.min && r.capacity <= range.max
      })
      const matchAvailable = !showAvailableOnly || r.current_condition === 'good'
      return matchSearch && matchBuilding && matchCapacity && matchAvailable
    }).sort((a, b) => {
      if (sortBy === 'name') return a.displayName.localeCompare(b.displayName)
      if (sortBy === 'price-low') {
        const aPrice = getLowestRoomRate(a.room_rates) ?? Infinity
        const bPrice = getLowestRoomRate(b.room_rates) ?? Infinity
        return aPrice - bPrice
      }
      if (sortBy === 'price-high') {
        const aPrice = getLowestRoomRate(a.room_rates) ?? 0
        const bPrice = getLowestRoomRate(b.room_rates) ?? 0
        return bPrice - aPrice
      }
      return 0
    })
  }, [roomsWithNumbers, searchQuery, selectedBuildings, selectedCapacity, showAvailableOnly, sortBy])

  // Filter equipment
  const filteredEquipment = useMemo(() => {
    return equipWithNumbers.filter(e => {
      const matchSearch = !searchQuery || 
        e.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (e.merk?.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchCategory = selectedCategories.length === 0 || selectedCategories.includes(e.category || '')
      const matchPrice = (!priceRange.min || (getPriceRange(e.equipment_rates).min ?? 0) >= parseInt(priceRange.min)) &&
        (!priceRange.max || (getPriceRange(e.equipment_rates).max ?? Infinity) <= parseInt(priceRange.max))
      const matchAvailable = !showAvailableOnly || (!e.ketersediaan || e.ketersediaan === 'tersedia')
      return matchSearch && matchCategory && matchPrice && matchAvailable
    }).sort((a, b) => {
      if (sortBy === 'name') return a.displayName.localeCompare(b.displayName)
      if (sortBy === 'price-low') {
        const aPrice = getPriceRange(a.equipment_rates).min ?? Infinity
        const bPrice = getPriceRange(b.equipment_rates).min ?? Infinity
        return aPrice - bPrice
      }
      if (sortBy === 'price-high') {
        const aPrice = getPriceRange(a.equipment_rates).max ?? 0
        const bPrice = getPriceRange(b.equipment_rates).max ?? 0
        return bPrice - aPrice
      }
      return 0
    })
  }, [equipWithNumbers, searchQuery, selectedCategories, priceRange, showAvailableOnly, sortBy])

  // Combine based on active tab
  const displayItems = useMemo(() => {
    if (activeTab === 'rooms') return { rooms: filteredRooms, equipment: [] }
    if (activeTab === 'equipment') return { rooms: [], equipment: filteredEquipment }
    return { rooms: filteredRooms, equipment: filteredEquipment }
  }, [activeTab, filteredRooms, filteredEquipment])

  const totalItems = displayItems.rooms.length + displayItems.equipment.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  
  // Paginate combined items
  const paginatedItems = useMemo(() => {
    const allItems = [
      ...displayItems.rooms.map(r => ({ type: 'room' as const, data: r })),
      ...displayItems.equipment.map(e => ({ type: 'equipment' as const, data: e }))
    ]
    return allItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  }, [displayItems, currentPage])

  const handleResetFilters = () => {
    setSelectedBuildings([])
    setSelectedCategories([])
    setPriceRange({ min: '', max: '' })
    setSelectedCapacity([])
    setShowAvailableOnly(false)
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-[#ecfeff] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#111827] mb-3">
              Katalog Ruang & Alat
            </h1>
            <p className="text-[#6B7280] text-base max-w-xl mx-auto">
              Temukan ruangan dan peralatan laboratorium yang tersedia
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-[560px] mx-auto relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Cari ruangan atau alat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[52px] pl-14 pr-12 bg-white rounded-full border-0 shadow-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[#F3F4F6]"
              >
                <X className="h-4 w-4 text-[#9CA3AF]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filter Sidebar - Desktop */}
          <div className="hidden lg:block w-[280px] flex-shrink-0">
            <FilterSidebar
              buildings={buildings}
              activeTab={activeTab}
              selectedBuildings={selectedBuildings}
              setSelectedBuildings={setSelectedBuildings}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              selectedCapacity={selectedCapacity}
              setSelectedCapacity={setSelectedCapacity}
              showAvailableOnly={showAvailableOnly}
              setShowAvailableOnly={setShowAvailableOnly}
              onReset={handleResetFilters}
            />
          </div>

          {/* Main Grid Area */}
          <div className="flex-1 min-w-0">
            {/* Active Filter Chips */}
            <ActiveFilterChips
              selectedBuildings={selectedBuildings}
              setSelectedBuildings={setSelectedBuildings}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              selectedCapacity={selectedCapacity}
              setSelectedCapacity={setSelectedCapacity}
              showAvailableOnly={showAvailableOnly}
              setShowAvailableOnly={setShowAvailableOnly}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              onResetAll={handleResetFilters}
            />

            {/* Tabs & Sort Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              {/* Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === 'all'
                      ? "bg-[#0891B2] text-white"
                      : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                  )}
                >
                  Semua
                </button>
                <button
                  onClick={() => setActiveTab('rooms')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === 'rooms'
                      ? "bg-[#0891B2] text-white"
                      : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                  )}
                >
                  Ruangan ({filteredRooms.length})
                </button>
                <button
                  onClick={() => setActiveTab('equipment')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === 'equipment'
                      ? "bg-[#0891B2] text-white"
                      : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                  )}
                >
                  Peralatan ({filteredEquipment.length})
                </button>
              </div>

              {/* Sort & Mobile Filter */}
              <div className="flex items-center gap-3">
                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'price-low' | 'price-high')}
                    className="appearance-none h-10 pl-4 pr-10 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 cursor-pointer"
                  >
                    <option value="name">Urutkan: Nama</option>
                    <option value="price-low">Urutkan: Harga Terendah</option>
                    <option value="price-high">Urutkan: Harga Tertinggi</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280] pointer-events-none" />
                </div>

                {/* Mobile Filter Button */}
                <div className="lg:hidden">
                  <FilterSidebar
                    buildings={buildings}
                    activeTab={activeTab}
                    selectedBuildings={selectedBuildings}
                    setSelectedBuildings={setSelectedBuildings}
                    selectedCategories={selectedCategories}
                    setSelectedCategories={setSelectedCategories}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    selectedCapacity={selectedCapacity}
                    setSelectedCapacity={setSelectedCapacity}
                    showAvailableOnly={showAvailableOnly}
                    setShowAvailableOnly={setShowAvailableOnly}
                    onReset={handleResetFilters}
                    isMobile
                  />
                </div>
              </div>
            </div>

            {/* Info Banner - Rooms */}
            {(activeTab === 'all' || activeTab === 'rooms') && (
              <div className="mb-6 p-4 rounded-[10px] bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800 space-y-1">
                    <p className="font-medium">Informasi:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs">
                      <li>Pastikan <strong>tanggal</strong> dan <strong>waktu</strong> peminjaman ruangan belum digunakan oleh orang lain.</li>
                      <li>Ruangan yang masih dalam proses ACC tidak dapat dipesan, selama belum ditolak oleh verifikator.</li>
                      <li>Untuk informasi lebih lanjut silakan hubungi admin.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Results Count */}
            <div className="mb-6">
              <p className="text-[#6B7280] text-sm">
                Menampilkan <span className="font-semibold text-[#111827]">{paginatedItems.length}</span> dari{' '}
                <span className="font-semibold text-[#111827]">{totalItems}</span> hasil
              </p>
            </div>

            {/* Catalog Grid */}
            {totalItems === 0 ? (
              <EmptyState 
                variant="search" 
                actionLabel="Reset Filter"
                onAction={handleResetFilters}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedItems.map((item) => (
                    item.type === 'room' ? (
                      <RoomCard key={item.data.id} room={item.data as Room & { buildingName: string; buildingCode?: string; displayName: string }} onOpenCalendar={openRoomCalendar} onOpenSchedule={openRoomSchedule} isBooked={bookedRoomIds.includes(item.data.id)} />
                    ) : (
                      <EquipmentCard key={item.data.id} item={item.data as EquipmentRow & { displayName: string }} onOpenCalendar={openEquipmentCalendar} onOpenSchedule={openEquipmentSchedule} />
                    )
                  ))}
                </div>
                <Paginator page={currentPage} total={totalPages} onChange={setCurrentPage} />
              </>
            )}
          </div>
        </div>
      </main>

      {/* CTA Section */}
      <section className="bg-[#0891B2] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Siap Meminjam?
          </h2>
          <p className="text-[#ecfeff] mb-8 max-w-2xl mx-auto">
            Login untuk melakukan pemesanan dan kelola peminjaman Anda dengan mudah
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-white text-[#0891B2] hover:bg-[#ecfeff] px-8 h-12 text-base font-medium rounded-lg">
              Login Sekarang
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Calendar Modal */}
      <Dialog open={calendarModal.open} onOpenChange={(open) => setCalendarModal(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-[14px] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg font-bold text-[#111827] flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#0891B2]" />
              Kalender Ketersediaan — {calendarModal.name}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <CalendarView
              roomId={calendarModal.type === 'room' ? calendarModal.id : undefined}
              equipmentId={calendarModal.type === 'equipment' ? calendarModal.id : undefined}
              className="border-0 shadow-none"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={scheduleModal.open} onOpenChange={(open) => setScheduleModal(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto rounded-[14px] p-0">
          <ScheduleView
            type={scheduleModal.type}
            id={scheduleModal.id}
            name={scheduleModal.name}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── ScheduleView Component ──────────────────────────────────────────────────

interface ScheduleBooking {
  id: string
  reference_no: string
  start_datetime: string
  end_datetime: string
  status: string
  purpose: string | null
}

interface ScheduleClass {
  id: string
  mata_kuliah: string
  dosen: string
  kelas: string
  semester: string
  start_datetime: string
  end_datetime: string
}

function ScheduleView({ type, id, name }: { type: 'room' | 'equipment'; id: string; name: string }) {
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<ScheduleBooking[]>([])
  const [classes, setClasses] = useState<ScheduleClass[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function fetchSchedule() {
      setLoading(true)
      try {
        const { bookings: fetchedBookings, classes: fetchedClasses } = await fetchPublicScheduleAction(type, id)
        if (!cancelled) {
          setBookings(fetchedBookings)
          setClasses(fetchedClasses)
        }
      } catch (err) {
        console.error('Schedule fetch error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSchedule()
    return () => { cancelled = true }
  }, [type, id])

  const STATUS_LABEL: Record<string, string> = {
    pending: 'Menunggu Konfirmasi',
    approved: 'Disetujui',
    paid: 'Lunas',
    active: 'Sedang Digunakan',
  }

  const STATUS_COLOR: Record<string, string> = {
    pending: 'text-amber-700 bg-amber-100',
    approved: 'text-emerald-700 bg-emerald-100',
    paid: 'text-blue-700 bg-blue-100',
    active: 'text-red-700 bg-red-100',
  }

  const STATUS_DOT: Record<string, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-emerald-500',
    paid: 'bg-blue-500',
    active: 'bg-red-500',
  }

  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-2">
        <DialogTitle className="text-lg font-bold text-[#111827] flex items-center gap-2">
          <List className="h-5 w-5 text-emerald-600" />
          Jadwal Peminjaman — {name}
        </DialogTitle>
      </DialogHeader>

      <div className="px-6 pb-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-2 text-sm text-muted-foreground">Memuat jadwal…</span>
          </div>
        ) : (
          <>
            {/* Upcoming Bookings */}
            <section>
              <h4 className="text-sm font-semibold text-[#111827] mb-3 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-[#0891B2]" />
                Peminjaman Mendatang
              </h4>
              {bookings.length > 0 ? (
                <div className="space-y-2">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-[10px] border border-[#E5E7EB]"
                    >
                      <div className={cn('mt-1 w-2 h-2 rounded-full shrink-0', STATUS_DOT[booking.status] ?? 'bg-gray-400')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-xs font-semibold text-indigo-700">
                            {booking.reference_no}
                          </span>
                          <span className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                            STATUS_COLOR[booking.status] ?? 'bg-muted text-muted-foreground'
                          )}>
                            {STATUS_LABEL[booking.status] ?? booking.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280] mb-1">
                          {booking.purpose || 'Tanpa keterangan'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            {formatDateTime(booking.start_datetime)} — {formatDateTime(booking.end_datetime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-[#F9FAFB] rounded-[10px] border border-[#E5E7EB]">
                  <CalendarDays className="h-8 w-8 text-[#D1D5DB] mx-auto mb-2" />
                  <p className="text-sm text-[#6B7280]">Belum ada jadwal peminjaman mendatang</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">{type === 'room' ? 'Ruangan' : 'Alat'} ini tersedia untuk dipinjam</p>
                </div>
              )}
            </section>

            {/* Class Schedules (rooms only) */}
            {type === 'room' && (
              <section>
                <h4 className="text-sm font-semibold text-[#111827] mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-500" />
                  Jadwal Kuliah Mendatang
                </h4>
                {classes.length > 0 ? (
                  <div className="space-y-2">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-start gap-3 p-3 bg-blue-50 rounded-[10px] border border-blue-200"
                      >
                        <div className="mt-1 w-2 h-2 rounded-full shrink-0 bg-blue-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#111827]">
                            {cls.mata_kuliah} — {cls.dosen} ({cls.kelas})
                          </p>
                          <p className="text-xs text-[#6B7280] mt-0.5">
                            {formatDateTime(cls.start_datetime)} — {formatDateTime(cls.end_datetime)}
                          </p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            {cls.semester}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-blue-50 rounded-[10px] border border-blue-200">
                    <GraduationCap className="h-8 w-8 text-[#D1D5DB] mx-auto mb-2" />
                    <p className="text-sm text-[#6B7280]">Tidak ada jadwal kuliah mendatang</p>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}
