'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
  Clock,
  Tag,
  X,
  SlidersHorizontal,
  ChevronDown,
  Landmark,
  Hash,
  Layers,
  DoorOpen,
  List,
  Calendar,
  Info
} from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'
import { CalendarView } from '@/components/calendar/CalendarView'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCatalogGrid } from '@/components/ui/skeletons'
import { getBorrowerCategoryLabel } from '@/lib/categories'

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

function getRateByCategory(rates: EquipmentRate[] | null | undefined, category: string): number | null {
  if (!rates || rates.length === 0) return null
  const rate = rates.find(r => r.user_category === category)
  return rate ? toNumber(rate.rate_per_day) : null
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

function RoomCard({ room }: { room: Room & { buildingName: string; buildingCode?: string; displayName: string } }) {
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
              room.current_condition === 'good'
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            )}>
              {room.current_condition === 'good' ? 'Tersedia' : 'Sedang Digunakan'}
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
          <Link href={`/rooms/${slug}`} className="block">
            <Button
              className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg"
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              Booking
            </Button>
          </Link>
          {/* Secondary CTAs - Side by Side */}
          <div className="grid grid-cols-2 gap-2">
          <Link href={`/rooms/${slug}#jadwal`} className="block">
            <Button
              variant="outline"
              className="w-full h-9 border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-xs font-medium rounded-lg"
            >
              <List className="h-3.5 w-3.5 mr-1.5" />
              Jadwal
            </Button>
          </Link>
          <Link href={`/rooms/${slug}#kalender`} className="block">
            <Button
              variant="outline"
              className="w-full h-9 border-[#0891B2] text-[#0891B2] hover:bg-[#ecfeff] text-xs font-medium rounded-lg"
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Kalender
            </Button>
          </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

function EquipmentCard({ item }: { item: EquipmentRow & { displayName: string } }) {
  const priceRange = getPriceRange(item.equipment_rates)
  const hasRates = item.equipment_rates && item.equipment_rates.length > 0
  const isAvailable = !item.ketersediaan || item.ketersediaan === 'tersedia'

  return (
    <Card className="group overflow-hidden border border-[#E5E7EB] rounded-[14px] bg-white shadow-sm hover:shadow-md transition-all duration-300">
      {/* Image Placeholder */}
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
          <Link href={`/equipment/${createSlug(item.name)}`} className="block">
            <Button
              className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg"
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              Booking
            </Button>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/equipment/${createSlug(item.name)}#jadwal`} className="block">
              <Button
                variant="outline"
                className="w-full h-9 border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-xs font-medium rounded-lg"
              >
                <List className="h-3.5 w-3.5 mr-1.5" />
                Jadwal
              </Button>
            </Link>
            <Link href={`/equipment/${createSlug(item.name)}#kalender`} className="block">
              <Button
                variant="outline"
                className="w-full h-9 border-[#0891B2] text-[#0891B2] hover:bg-[#ecfeff] text-xs font-medium rounded-lg"
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Kalender
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Filter Sidebar Component
function FilterSidebar({ 
  buildings,
  assetType,
  setAssetType,
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
  onApply,
  onReset,
  isMobile = false
}: {
  buildings: BuildingRow[]
  assetType: 'all' | 'rooms' | 'equipment'
  setAssetType: (v: 'all' | 'rooms' | 'equipment') => void
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
  onApply: () => void
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
      {/* TIPE ASET */}
      <div>
        <h4 className="font-semibold text-[#111827] text-sm mb-3">TIPE ASET</h4>
        <RadioGroup value={assetType} onValueChange={(v) => setAssetType(v as 'all' | 'rooms' | 'equipment')}>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="type-all" className="border-[#D1D5DB]" />
              <Label htmlFor="type-all" className="text-sm text-[#374151] cursor-pointer">Semua</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="rooms" id="type-rooms" className="border-[#D1D5DB]" />
              <Label htmlFor="type-rooms" className="text-sm text-[#374151] cursor-pointer">Ruangan</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="equipment" id="type-equipment" className="border-[#D1D5DB]" />
              <Label htmlFor="type-equipment" className="text-sm text-[#374151] cursor-pointer">Peralatan</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* GEDUNG */}
      {assetType !== 'equipment' && (
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
      {assetType !== 'rooms' && (
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
        <h4 className="font-semibold text-[#111827] text-sm mb-3">HARGA</h4>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm">Rp</span>
            <input
              type="number"
              placeholder="Min"
              value={priceRange.min}
              onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
              className="w-full pl-8 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
            />
          </div>
          <span className="text-[#9CA3AF]">-</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm">Rp</span>
            <input
              type="number"
              placeholder="Max"
              value={priceRange.max}
              onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
              className="w-full pl-8 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
            />
          </div>
        </div>
      </div>

      {/* KAPASITAS */}
      {assetType !== 'equipment' && (
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

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button 
          onClick={onApply}
          className="flex-1 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white h-10 rounded-lg"
        >
          Terapkan Filter
        </Button>
        <Button 
          variant="ghost" 
          onClick={onReset}
          className="h-10 px-4 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg"
        >
          Reset
        </Button>
      </div>
    </div>
  )

  if (isMobile) {
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
              {(selectedBuildings.length + selectedCategories.length + selectedCapacity.length > 0 || showAvailableOnly) && (
                <Badge className="ml-2 bg-[#0891B2] text-white text-xs">
                  {selectedBuildings.length + selectedCategories.length + selectedCapacity.length + (showAvailableOnly ? 1 : 0)}
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

export function CatalogClient({ buildings, equipment, institution }: Props) {
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

  // Reset pagination when filters change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, selectedBuildings, selectedCategories, selectedCapacity, showAvailableOnly, sortBy, activeTab])

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

  const activeFilterCount = selectedBuildings.length + selectedCategories.length + selectedCapacity.length + (showAvailableOnly ? 1 : 0)

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
              assetType={activeTab}
              setAssetType={setActiveTab}
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
              onApply={() => {}}
              onReset={handleResetFilters}
            />
          </div>

          {/* Main Grid Area */}
          <div className="flex-1 min-w-0">
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
                    assetType={activeTab}
                    setAssetType={setActiveTab}
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
                    onApply={() => {}}
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
                      <RoomCard key={item.data.id} room={item.data as Room & { buildingName: string; buildingCode?: string; displayName: string }} />
                    ) : (
                      <EquipmentCard key={item.data.id} item={item.data as EquipmentRow & { displayName: string }} />
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
    </div>
  )
}
