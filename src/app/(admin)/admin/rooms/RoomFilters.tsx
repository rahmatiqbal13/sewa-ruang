'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { Filter, X, Building2, Layers } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Building {
  id: string
  name: string
  code: string
  floor_count?: number
}

interface RoomFiltersProps {
  buildings: Building[]
}

export function RoomFilters({ buildings }: RoomFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const buildingFilter = searchParams.get('building') || ''
  const floorFilter = searchParams.get('floor') || ''
  const forRentFilter = searchParams.get('for_rent') || ''

  // Get selected building info
  const selectedBuilding = useMemo(() => {
    return buildings.find(b => b.id === buildingFilter)
  }, [buildings, buildingFilter])

  // Generate floor options based on selected building
  const floorOptions = useMemo(() => {
    const maxFloor = selectedBuilding?.floor_count || 10
    return Array.from({ length: maxFloor }, (_, i) => i + 1)
  }, [selectedBuilding])

  // Build URL with params
  const buildUrl = useCallback((params: Record<string, string>) => {
    const current = {
      building: buildingFilter,
      floor: floorFilter,
      for_rent: forRentFilter,
      ...params
    }
    const valid = Object.entries(current).filter(([_, v]) => v)
    return valid.length > 0 ? '/admin/rooms?' + valid.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '/admin/rooms'
  }, [buildingFilter, floorFilter, forRentFilter])

  const hasActiveFilters = buildingFilter || floorFilter || forRentFilter

  const handleBuildingChange = (value: string | null) => {
    // When building changes, reset floor filter
    router.push(buildUrl({ building: value || '', floor: '' }))
  }

  const handleFloorChange = (value: string | null) => {
    router.push(buildUrl({ floor: value || '' }))
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
      <div className="flex items-center gap-2 text-slate-700">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filter</span>
        {hasActiveFilters && (
          <Link 
            href="/admin/rooms"
            className="ml-auto text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Building Filter */}
        <div>
          <label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Jenis Gedung
          </label>
          <Select value={buildingFilter} onValueChange={handleBuildingChange}>
            <SelectTrigger className="w-full">
              {selectedBuilding ? (
                <span className="truncate">{selectedBuilding.name} ({selectedBuilding.code})</span>
              ) : (
                <span className="text-slate-400">Pilih gedung...</span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Gedung</SelectItem>
              {buildings?.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name} ({building.code}) - {building.floor_count} Lantai
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Floor Filter */}
        <div>
          <label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Lantai Gedung
            {selectedBuilding && (
              <span className="text-xs text-purple-600 ml-auto">
                ({selectedBuilding.floor_count} lantai)
              </span>
            )}
          </label>
          <Select 
            value={floorFilter} 
            onValueChange={handleFloorChange}
            disabled={!buildingFilter}
          >
            <SelectTrigger className={cn(
              "w-full",
              !buildingFilter && "bg-slate-50 text-slate-400"
            )}>
              {floorFilter ? (
                <span>Lantai {floorFilter}</span>
              ) : (
                <span className="text-slate-400">
                  {buildingFilter ? "Pilih lantai..." : "Pilih gedung dulu"}
                </span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Lantai</SelectItem>
              {floorOptions.map((floor) => (
                <SelectItem key={floor} value={floor.toString()}>
                  Lantai {floor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
