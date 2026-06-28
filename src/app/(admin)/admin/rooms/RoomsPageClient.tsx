'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, DoorOpen, Users, Building2, Layers, Tag, EyeOff, Upload, Download, Eye, Pencil } from 'lucide-react'
import { RoomActions } from './RoomActions'
import { RoomFilters } from './RoomFilters'
import { formatRupiah, cn } from '@/lib/utils'

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { SafeImage } from '@/components/shared/SafeImage'
import { ImportDialog } from '@/app/(admin)/admin/equipment/ImportDialog'
import { importRoomsFromExcel } from './importRooms'
import { downloadRoomsTemplate } from './exportRooms'
import { exportRoomsToExcel } from './exportRooms'
import type { ImportResult } from '../equipment/importEquipment'

const RENT_TABS = [
  { value: '',      label: 'Semua Ruangan',   color: 'bg-foreground text-white' },
  { value: 'true',  label: 'Disewakan',       color: 'bg-purple-600 text-white' },
  { value: 'false', label: 'Tidak Disewakan', color: 'bg-foreground text-white' },
]

interface Building {
  id: string
  name: string
  code: string
  floor_count?: number
}

interface Room {
  id: string
  name: string
  room_code: string | null
  floor_number: number | null
  capacity: number | null
  rate_per_hour: number | null
  current_condition: string
  is_active: boolean
  is_for_rent?: boolean
  photo_url: string | null
  door_photo_url?: string | null
  buildings: Building | null
  floor?: number | null
  room_type?: string
  description?: string | null
  building_id?: string | null
}

interface RoomsPageClientProps {
  rooms: Room[] | null
  buildings: Building[] | null
  for_rent?: string
  buildingFilter?: string
  floorFilter?: string
}

export function RoomsPageClient({ 
  rooms, 
  buildings, 
  for_rent, 
  buildingFilter, 
  floorFilter 
}: RoomsPageClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isImportOpen, setIsImportOpen] = useState(false)

  const hasIsForRent = true

  const rentCount   = rooms?.filter(r => r.is_for_rent !== false).length ?? 0
  const noRentCount = rooms?.filter(r => r.is_for_rent === false).length ?? 0
  const tabCounts: Record<string, number> = {
    '': rooms?.length ?? 0,
    'true': rentCount,
    'false': noRentCount,
  }

  // Calculate statistics
  const totalCapacity = rooms?.reduce((acc, r) => acc + (r.capacity || 0), 0) ?? 0
  const activeCount = rooms?.filter(r => r.is_active).length ?? 0

  // Build query string helper for rent tabs
  const buildQueryString = (params: Record<string, string>) => {
    const current = { for_rent, building: buildingFilter, floor: floorFilter, ...params }
    const valid = Object.entries(current).filter((entry) => entry[1]) as [string, string][]
    return valid.length > 0 ? '?' + valid.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : ''
  }

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === (rooms?.length ?? 0)) {
      setSelectedIds([])
    } else {
      setSelectedIds(rooms?.map(r => r.id) ?? [])
    }
  }

  const handleSelectRoom = (roomId: string) => {
    setSelectedIds(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    )
  }

  // Export handler
  const handleExport = () => {
    if (!rooms || rooms.length === 0) return

    // Prepare rooms with building info for export
    const roomsForExport = rooms.map(room => ({
      id: room.id,
      name: room.name,
      room_code: room.room_code || '',
      building_id: room.buildings?.id || null,
      floor: room.floor_number,
      capacity: room.capacity,
      room_type: room.room_type || 'other',
      description: room.description || null,
      is_active: room.is_active,
      building: room.buildings ? {
        id: room.buildings.id,
        name: room.buildings.name,
        code: room.buildings.code
      } : undefined
    }))

    exportRoomsToExcel(selectedIds, roomsForExport)
  }

  // Import handler
  const handleImport = async (formData: FormData): Promise<ImportResult> => {
    const result = await importRoomsFromExcel(formData)
    if (result.success) {
      // Refresh page after successful import
      window.location.reload()
    }
    return result
  }

  const isAllSelected = !!rooms && rooms.length > 0 && selectedIds.length === rooms.length
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < (rooms?.length ?? 0)

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ruangan</h1>
          <p className="page-subtitle">Kelola ruangan yang tersedia untuk peminjaman</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="rounded-[10px]">
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!rooms || rooms.length === 0} className="rounded-[10px]">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </Button>
          <Link href="/admin/rooms/new" className="inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Tambah Ruangan
          </Link>
        </div>
      </div>

      {/* Summary stats */}
      {rooms && rooms.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Ruangan',     value: rooms.length, accent: 'border-t-indigo-400' },
            { label: 'Ruangan Aktif',     value: activeCount,  accent: 'border-t-emerald-400' },
            { label: 'Total Kapasitas',   value: totalCapacity, accent: 'border-t-amber-400' },
          ].map(s => (
            <div key={s.label} className={cn('mini-stat', s.accent)}>
              <p className="mini-stat-label">{s.label}</p>
              <p className="mini-stat-value">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <RoomFilters buildings={buildings ?? []} />

      {/* Rent filter tabs */}
      {hasIsForRent && (
        <div className="flex gap-1.5 flex-wrap">
          {RENT_TABS.map(tab => {
            const isActive = (for_rent ?? '') === tab.value
            const count = tabCounts[tab.value] ?? 0
            return (
              <Link
                key={tab.value}
                href={`/admin/rooms${buildQueryString({ for_rent: tab.value })}`}
                className={cn('filter-pill', isActive ? 'filter-pill-active' : 'filter-pill-inactive')}
              >
                {tab.value === 'true'  && <Tag    className="h-3 w-3" />}
                {tab.value === 'false' && <EyeOff className="h-3 w-3" />}
                {tab.label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', isActive ? 'bg-card/20' : 'bg-muted text-muted-foreground/70')}>
                  {count}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Selection bar */}
      {rooms && rooms.length > 0 && (
        <div className="flex items-center gap-3 py-2 px-3 bg-white rounded-[10px] border border-[#E5E7EB]">
          <Checkbox
            checked={isAllSelected}
            ref={(el) => { if (el) (el as HTMLInputElement).indeterminate = isIndeterminate }}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-xs text-[#6B7280]">
            {selectedIds.length > 0 ? `${selectedIds.length} dipilih` : 'Pilih semua'}
          </span>
          {selectedIds.length > 0 && (
            <button onClick={() => setSelectedIds([])} className="text-xs text-[#9CA3AF] hover:text-[#6B7280] ml-auto transition-colors">
              Batal
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {rooms?.length === 0 && (
        <div className="empty-state">
          <DoorOpen className="h-10 w-10 mb-3 opacity-25" />
          <p className="text-sm font-medium text-foreground">
            {(buildingFilter || floorFilter || for_rent) ? 'Tidak ada ruangan yang sesuai filter' : 'Belum ada ruangan'}
          </p>
          <Link
            href={(buildingFilter || floorFilter || for_rent) ? '/admin/rooms' : '/admin/rooms/new'}
            className="mt-2 text-xs text-primary hover:underline"
          >
            {(buildingFilter || floorFilter || for_rent) ? 'Reset filter' : 'Tambah ruangan'}
          </Link>
        </div>
      )}

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {rooms?.map((room) => {
          const building = room.buildings
          const isForRent = room.is_for_rent !== false
          const isSelected = selectedIds.includes(room.id)
          return (
            <div
              key={room.id}
              className={cn(
                'group overflow-hidden border border-[#E5E7EB] rounded-[14px] bg-white shadow-sm hover:shadow-md transition-all duration-300',
                !isForRent && 'opacity-70',
                isSelected && 'ring-2 ring-[#0891B2] border-[#0891B2]'
              )}
            >
              {/* Photo — Catalog Style */}
              <div className="relative aspect-[4/3] bg-[#F3F4F6] overflow-hidden">
                {room.photo_url ? (
                  <SafeImage
                    src={room.photo_url}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    fallbackClassName="w-full h-full flex items-center justify-center"
                    fallback={<DoorOpen className="h-12 w-12 text-[#D1D5DB]" />}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <DoorOpen className="h-12 w-12 text-[#D1D5DB]" />
                  </div>
                )}

                {/* Checkbox — bottom left */}
                <div
                  className={cn('absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm transition-all', isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => handleSelectRoom(room.id)} />
                </div>

                {/* Room Code — top left */}
                {room.room_code && (
                  <span className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
                    {room.room_code}
                  </span>
                )}

                {/* Status Badges — top right */}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                  <Badge className={cn(
                    "text-xs font-medium border-0",
                    room.is_active ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  )}>
                    {room.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  {hasIsForRent && (
                    isForRent
                      ? <span className="bg-[#0891B2] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Disewakan</span>
                      : <span className="bg-[#6B7280] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Tidak Disewakan</span>
                  )}
                </div>

                {/* Nonaktif overlay */}
                {!room.is_active && (
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">NONAKTIF</span>
                  </div>
                )}
              </div>

              {/* Info — Catalog Style */}
              <div className="p-4">
                <Link href={`/admin/rooms/${createSlug(room.name)}`}>
                  <h3 className={cn(
                    "font-bold text-[#111827] text-base mb-1 truncate group-hover:text-[#0891B2] transition-colors",
                    !room.is_active && "line-through"
                  )} title={room.name}>
                    {room.name}
                  </h3>
                </Link>

                {/* Building */}
                {building && (
                  <p className="text-sm text-[#6B7280] flex items-center gap-1 mb-2">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{building.name}</span>
                  </p>
                )}

                {/* Meta row with dot indicators */}
                <div className="flex items-center gap-3 mb-3">
                  {room.floor_number !== null && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-xs text-[#6B7280]">Lt. {room.floor_number}</span>
                    </div>
                  )}
                  {room.capacity && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-xs text-[#6B7280]">{room.capacity} org</span>
                    </div>
                  )}
                </div>

                {/* Condition + Price */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full",
                      room.current_condition === 'good' ? "bg-emerald-500" :
                      room.current_condition === 'needs_repair' ? "bg-amber-500" :
                      "bg-red-500"
                    )} />
                    <span className="text-xs text-[#6B7280]">
                      {room.current_condition === 'good' ? 'Baik' :
                       room.current_condition === 'needs_repair' ? 'Perlu Perbaikan' :
                       room.current_condition === 'damaged' ? 'Rusak' : 'Hilang'}
                    </span>
                  </div>
                  {room.rate_per_hour && (
                    <span className="text-xs font-semibold text-[#0891B2]">
                      {formatRupiah(room.rate_per_hour)}/jam
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-3 border-t border-[#E5E7EB]">
                  <Link
                    href={`/admin/rooms/${createSlug(room.name)}`}
                    className="flex-1 h-9 flex items-center justify-center rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors text-xs font-medium"
                  >
                    Detail
                  </Link>
                  <Link
                    href={`/admin/rooms/${createSlug(room.name)}/edit`}
                    className="flex-1 h-9 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] transition-colors text-xs font-medium"
                  >
                    Edit
                  </Link>
                  <RoomActions id={room.id} name={room.name} isActive={room.is_active} isForRent={isForRent} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
        onDownloadTemplate={downloadRoomsTemplate}
        title="Import Ruangan"
        description="Unggah file Excel untuk mengimport data ruangan"
        entityName="ruangan"
      />
    </div>
  )
}
