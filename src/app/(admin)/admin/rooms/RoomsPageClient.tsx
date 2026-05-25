'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, DoorOpen, Users, Building2, Layers, Tag, EyeOff, ArrowUpRight, Upload, Download, FileSpreadsheet } from 'lucide-react'
import { RoomActions } from './RoomActions'
import { RoomFilters } from './RoomFilters'
import { formatRupiah, cn } from '@/lib/utils'
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
    const valid = Object.entries(current).filter(([_, v]) => v) as [string, string][]
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
        <div className="flex items-center gap-3 py-2 px-3 bg-muted rounded-[10px] border border-border">
          <Checkbox
            checked={isAllSelected}
            ref={(el) => { if (el) (el as HTMLInputElement).indeterminate = isIndeterminate }}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-xs text-muted-foreground">
            {selectedIds.length > 0 ? `${selectedIds.length} dipilih` : 'Pilih semua'}
          </span>
          {selectedIds.length > 0 && (
            <button onClick={() => setSelectedIds([])} className="text-xs text-muted-foreground/70 hover:text-muted-foreground ml-auto">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms?.map((room) => {
          const building = room.buildings
          const isForRent = room.is_for_rent !== false
          const isSelected = selectedIds.includes(room.id)
          return (
            <div
              key={room.id}
              className={cn(
                'group bg-card rounded-[14px] border border-border shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-px transition-all duration-200',
                !isForRent && 'opacity-70',
                isSelected && 'ring-2 ring-primary border-primary'
              )}
            >
              {/* Photo */}
              <div className="relative h-40 bg-muted overflow-hidden flex items-center justify-center p-2">
                <div
                  className={cn('absolute top-2.5 left-2.5 z-10 bg-card rounded-[10px] p-1 shadow-sm transition-all', isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => handleSelectRoom(room.id)} />
                </div>

                {room.photo_url ? (
                  <SafeImage src={room.photo_url} alt={room.name} className="object-contain w-full h-full" fallbackClassName="w-full h-full rounded-[10px]" />
                ) : (
                  <DoorOpen className="h-12 w-12 text-border" />
                )}

                {room.room_code && (
                  <span className="absolute bottom-2 left-2 bg-card/90 backdrop-blur text-[10px] font-bold font-mono px-2 py-0.5 rounded-[10px] text-indigo-700 border border-indigo-100">
                    {room.room_code}
                  </span>
                )}

                <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
                  <Badge variant={room.is_active ? 'success' : 'secondary'} className="text-[10px]">
                    {room.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  {hasIsForRent && (
                    isForRent
                      ? <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"><Tag className="h-2.5 w-2.5" /> Sewa</span>
                      : <span className="bg-muted-foreground text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"><EyeOff className="h-2.5 w-2.5" /> Non-sewa</span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3.5">
                <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                  {room.name}
                </h3>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {building && <p className="flex items-center gap-1.5"><Building2 className="h-3 w-3 text-muted-foreground/70" /> {building.name}</p>}
                  <div className="flex items-center gap-3">
                    {room.floor_number && <p className="flex items-center gap-1"><Layers className="h-3 w-3 text-muted-foreground/70" /> Lt. {room.floor_number}</p>}
                    {room.capacity && <p className="flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground/70" /> {room.capacity} org</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/60">
                  <div className="flex items-center gap-1.5">
                    <ConditionBadge condition={room.current_condition} />
                    {room.rate_per_hour && (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                        {formatRupiah(room.rate_per_hour)}/jam
                      </span>
                    )}
                  </div>
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
