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
  { value: '',      label: 'Semua Ruangan',   color: 'bg-zinc-800 text-white' },
  { value: 'true',  label: 'Disewakan',       color: 'bg-purple-600 text-white' },
  { value: 'false', label: 'Tidak Disewakan', color: 'bg-zinc-500 text-white' },
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
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ruangan</h1>
          <p className="text-slate-500 mt-1">Kelola ruangan yang tersedia untuk peminjaman</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="border-slate-200"
          >
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!rooms || rooms.length === 0}
            className="border-slate-200"
          >
            <Download className="mr-2 h-4 w-4" /> 
            Export {selectedIds.length > 0 ? `(${selectedIds.length})` : 'All'}
          </Button>
          <Link 
            href="/admin/rooms/new" 
            className={cn(buttonVariants(), 'bg-purple-600 hover:bg-purple-700')}
          >
            <Plus className="mr-2 h-4 w-4" /> Tambah Ruangan
          </Link>
        </div>
      </div>

      {/* Filters - Client Component */}
      <RoomFilters buildings={buildings ?? []} />

      {/* Rent filter tabs */}
      {hasIsForRent && (
        <div className="flex gap-2 flex-wrap">
          {RENT_TABS.map(tab => {
            const isActive = (for_rent ?? '') === tab.value
            const count = tabCounts[tab.value] ?? 0
            return (
              <Link
                key={tab.value}
                href={`/admin/rooms${buildQueryString({ for_rent: tab.value })}`}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  isActive ? tab.color : 'bg-white border text-zinc-600 hover:bg-zinc-50'
                )}
              >
                {tab.value === 'true'  && <Tag    className="h-3.5 w-3.5" />}
                {tab.value === 'false' && <EyeOff className="h-3.5 w-3.5" />}
                {tab.label}
                {count > 0 && (
                  <span className={cn('text-xs rounded-full px-1.5 py-0.5 font-bold', isActive ? 'bg-white/20' : 'bg-zinc-100')}>
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Selection Bar */}
      {rooms && rooms.length > 0 && (
        <div className="flex items-center gap-4 py-3 px-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={isAllSelected}
              ref={(el) => {
                if (el) {
                  (el as HTMLInputElement).indeterminate = isIndeterminate
                }
              }}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-slate-600">
              {selectedIds.length > 0 
                ? `${selectedIds.length} ruangan dipilih` 
                : 'Pilih semua'}
            </span>
          </div>
          {selectedIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-slate-500"
            >
              Batal pilih
            </Button>
          )}
        </div>
      )}

      {/* Empty State */}
      {rooms?.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="h-20 w-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <DoorOpen className="h-10 w-10 text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {(buildingFilter || floorFilter || for_rent) ? 'Tidak ada ruangan yang sesuai filter' : 'Belum ada data ruangan'}
          </h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            {(buildingFilter || floorFilter || for_rent)
              ? 'Coba ubah filter atau reset untuk melihat semua ruangan' 
              : 'Mulai dengan menambahkan ruangan pertama untuk mengelola peminjaman'}
          </p>
          {(buildingFilter || floorFilter || for_rent) ? (
            <Link 
              href="/admin/rooms"
              className={cn(buttonVariants(), 'bg-purple-600 hover:bg-purple-700')}
            >
              Reset Filter
            </Link>
          ) : (
            <Link 
              href="/admin/rooms/new" 
              className={cn(buttonVariants(), 'bg-purple-600 hover:bg-purple-700')}
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah Ruangan
            </Link>
          )}
        </div>
      )}

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {rooms?.map((room) => {
          const building = room.buildings
          const isForRent = room.is_for_rent !== false
          const isSelected = selectedIds.includes(room.id)
          return (
            <div 
              key={room.id} 
              className={cn(
                'group bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-900/5 overflow-hidden hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300',
                !isForRent && 'opacity-70',
                isSelected && 'ring-2 ring-purple-500 border-purple-500'
              )}
            >
              {/* Photo */}
              <div className="relative h-48 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 overflow-hidden flex items-center justify-center p-3">
                {/* Checkbox overlay */}
                <div className="absolute top-4 left-4 z-10">
                  <div 
                    className={cn(
                      'bg-white rounded-lg p-1 shadow-md transition-all',
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => handleSelectRoom(room.id)}
                      className="h-5 w-5"
                    />
                  </div>
                </div>

                {room.photo_url ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <SafeImage 
                      src={room.photo_url} 
                      alt={room.name} 
                      className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-105"
                      fallbackClassName="w-full h-full rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <DoorOpen className="h-16 w-16 text-purple-200" />
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Room Code Badge */}
                {room.room_code && (
                  <div className="absolute top-4 left-14">
                    <span className="bg-white/95 backdrop-blur-sm text-xs font-bold px-3 py-1.5 rounded-xl font-mono text-purple-700 shadow-sm border border-purple-100">
                      {room.room_code}
                    </span>
                  </div>
                )}
                
                {/* Status Badges */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                  <Badge 
                    variant={room.is_active ? 'success' : 'secondary'} 
                    className="shadow-sm"
                  >
                    {room.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  {hasIsForRent && (
                    isForRent ? (
                      <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <Tag className="h-2.5 w-2.5" /> Disewakan
                      </span>
                    ) : (
                      <span className="bg-zinc-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <EyeOff className="h-2.5 w-2.5" /> Tidak Disewakan
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-5">
                <h3 className="font-semibold text-lg text-slate-900 mb-1 group-hover:text-purple-600 transition-colors truncate">
                  {room.name}
                </h3>
                
                <div className="mt-3 space-y-2 text-sm text-slate-500">
                  {building && (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-orange-500" />
                      </div>
                      <span>{building.name}</span>
                    </div>
                  )}
                  {room.floor_number && (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <Layers className="h-4 w-4 text-blue-500" />
                      </div>
                      <span>Lantai {room.floor_number}</span>
                    </div>
                  )}
                  {room.capacity && (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-green-500" />
                      </div>
                      <span>{room.capacity} orang</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <ConditionBadge condition={room.current_condition} />
                    {room.rate_per_hour && (
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
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

      {/* Summary Stats */}
      {rooms && rooms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Ruangan</p>
                <p className="text-3xl font-bold mt-1">{rooms.length}</p>
              </div>
              <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                <DoorOpen className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Ruangan Aktif</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{activeCount}</p>
              </div>
              <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Badge variant="success" className="h-6 w-6 p-0 flex items-center justify-center">
                  <span className="text-xs">✓</span>
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Total Kapasitas</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{totalCapacity}</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">orang</p>
          </div>
        </div>
      )}

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
