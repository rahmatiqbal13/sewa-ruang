'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Boxes, ChevronRight, Building2, DoorOpen, Package, Plus, Download, FileUp, CheckSquare } from 'lucide-react'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { cn } from '@/lib/utils'
import { exportInventoryToExcel, downloadInventoryTemplate } from './exportInventory'
import { ImportDialog } from '../equipment/ImportDialog'
import type { ImportResult } from '../equipment/importEquipment'

const CONDITIONS = [
  { value: '',             label: 'Semua',        color: 'bg-zinc-800 text-white' },
  { value: 'good',         label: 'Baik',         color: 'bg-green-600 text-white' },
  { value: 'needs_repair', label: 'Perlu Perbaikan', color: 'bg-yellow-500 text-white' },
  { value: 'damaged',      label: 'Rusak',           color: 'bg-red-600 text-white' },
]

interface InventoryItem {
  id: string
  name: string
  quantity: number
  condition: string
  inventory_code: string | null
  notes: string | null
  room_asset_id: string
  assets: {
    id: string
    name: string
    room_code: string | null
    buildings: { name: string; code: string } | null
  } | null
}

interface RoomGroup {
  room: {
    id: string
    name: string
    room_code: string | null
    buildings: { name: string; code: string } | null
  }
  count: number
  id: string
}

interface InventoryListProps {
  items: InventoryItem[]
  allItems: InventoryItem[]
  rooms: RoomGroup[]
  condCounts: Record<string, number>
  totalCount: number
  currentCondition: string
}

export function InventoryList({
  items,
  allItems,
  rooms,
  condCounts,
  totalCount,
  currentCondition
}: InventoryListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(item => item.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const isSelected = (id: string) => selectedIds.has(id)
  const isAllSelected = selectedIds.size === items.length && items.length > 0
  const hasSelection = selectedIds.size > 0

  const handleExport = () => {
    setIsExporting(true)
    const selectedArray = Array.from(selectedIds)
    // Use allItems for export, but filter by selected if any
    const inventoryToExport = selectedArray.length > 0
      ? allItems.filter(item => selectedArray.includes(item.id))
      : allItems
    
    // Transform data for export
    const exportData = inventoryToExport.map(item => ({
      id: item.id,
      item_name: item.name,
      quantity: item.quantity,
      condition: item.condition,
      description: item.notes,
      is_active: true,
    }))
    
    exportInventoryToExcel(selectedArray, exportData)
    setIsExporting(false)
    clearSelection()
  }

  const handleImport = async (formData: FormData): Promise<ImportResult> => {
    // For the main inventory page, we need to redirect to a room first
    // This is handled differently - show an alert to select a room first
    return {
      success: false,
      message: 'Silakan pilih ruangan terlebih dahulu untuk mengimport inventaris. Pergi ke halaman detail ruangan untuk import.',
      totalRows: 0,
      successCount: 0,
      errorCount: 1,
      errors: [{ row: 0, message: 'Pilih ruangan terlebih dahulu' }]
    }
  }

  const conditionCardClass: Record<string, string> = {
    good: 'bg-emerald-50 border-emerald-200',
    needs_repair: 'bg-amber-50 border-amber-200',
    damaged: 'bg-red-50 border-red-200',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImport={handleImport}
        onDownloadTemplate={downloadInventoryTemplate}
        title="Import Inventaris"
        description="Unggah file Excel untuk mengimport data inventaris. Import inventaris harus dilakukan di halaman detail ruangan."
        entityName="inventaris"
      />

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <Boxes className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Apa itu Inventaris?</h3>
            <p className="text-sm text-amber-700 mt-1">
              Inventaris adalah barang-barang yang ada di dalam ruangan (meja, kursi, AC, dll) yang 
              <strong> tidak untuk disewakan</strong>. Untuk alat yang bisa disewakan, gunakan menu 
              <Link href="/admin/equipment" className="text-amber-800 underline hover:text-amber-900"> Alat & Peralatan</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventaris Ruangan</h1>
          <p className="text-muted-foreground text-sm">Barang-barang di dalam ruangan (tidak untuk disewakan)</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Selected Button */}
          {hasSelection && (
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
              className="hidden sm:flex border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export ({selectedIds.size})
            </Button>
          )}
          
          {/* Export All Button */}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="hidden sm:flex"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Mengekspor...' : 'Export Semua'}
          </Button>
          
          {/* Import Button - disabled on main page, shows info */}
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            className="hidden sm:flex"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Import
          </Button>
          
          <Button asChild className="bg-amber-600 hover:bg-amber-700">
            <Link href="/admin/inventory/new">
              <Plus className="h-4 w-4 mr-1" /> Tambah Item
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-zinc-500 bg-white border rounded-lg px-3 py-1.5">
          <Boxes className="h-4 w-4 text-teal-500" />
          {totalCount} item · {rooms.length} ruangan
        </div>
        {hasSelection && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
            <CheckSquare className="h-4 w-4" />
            {selectedIds.size} dipilih
            <button 
              onClick={clearSelection}
              className="text-xs underline hover:text-blue-800 ml-1"
            >
              Batal
            </button>
          </div>
        )}
      </div>

      {/* Condition filter */}
      <div className="flex gap-2 flex-wrap">
        {CONDITIONS.map(tab => {
          const isActive = currentCondition === tab.value
          const count = tab.value ? (condCounts[tab.value] ?? 0) : totalCount
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/inventory?condition=${tab.value}` : '/admin/inventory'}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                isActive ? tab.color : 'bg-white border text-zinc-600 hover:bg-zinc-50'
              )}
            >
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

      {/* Room summary cards (only when no filter) */}
      {!currentCondition && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {rooms.map(({ room, count, id }) => (
            <Link
              key={id}
              href={`/admin/inventory/${id}`}
              className="bg-white rounded-xl border shadow-sm p-3 hover:shadow-md hover:border-teal-300 transition-all group"
            >
              <div className="flex items-center gap-2 mb-1">
                <DoorOpen className="h-4 w-4 text-purple-400 shrink-0" />
                <span className="text-xs font-mono text-zinc-400">{room.room_code ?? '—'}</span>
              </div>
              <p className="text-sm font-semibold text-zinc-800 truncate group-hover:text-teal-700">{room.name}</p>
              {room.buildings && (
                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 text-orange-400 shrink-0" />
                  {room.buildings.name}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">{count} item</Badge>
                <ChevronRight className="h-3 w-3 text-zinc-300 group-hover:text-teal-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Selection Header */}
      {items.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleAll}
              className="h-5 w-5 rounded border-2 border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">
              {hasSelection ? `${selectedIds.size} dipilih` : 'Pilih semua'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Menampilkan {items.length} dari {totalCount} item
          </p>
        </div>
      )}

      {/* All items grid */}
      <div>
        <h2 className="text-base font-semibold text-zinc-700 mb-3">
          {currentCondition ? `Item kondisi — ${CONDITIONS.find(c => c.value === currentCondition)?.label}` : 'Semua Item Inventaris'}
        </h2>
        {items.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Tidak ada item {currentCondition ? 'dengan kondisi ini' : 'inventaris'}</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {items.map((item) => {
            const room = item.assets
            const cardClass = conditionCardClass[item.condition] ?? 'bg-zinc-50 border-zinc-200'
            const selected = isSelected(item.id)
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  `rounded-xl border p-3 transition-shadow hover:shadow-md ${cardClass}`,
                  selected && 'ring-2 ring-blue-500'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelection(item.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-zinc-900 truncate">{item.name}</p>
                      {item.inventory_code && (
                        <span className="text-xs font-mono text-zinc-400">{item.inventory_code}</span>
                      )}
                    </div>
                  </div>
                  <ConditionBadge condition={item.condition} />
                </div>

                <div className="mt-2 space-y-1 text-xs text-zinc-500">
                  {room && (
                    <>
                      <p className="flex items-center gap-1">
                        <DoorOpen className="h-3 w-3 text-purple-400 shrink-0" />
                        {room.name}
                        {room.room_code && <span className="font-mono">({room.room_code})</span>}
                      </p>
                      {room.buildings && (
                        <p className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-orange-400 shrink-0" />
                          {room.buildings.name}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5">
                  <span className="text-xs text-zinc-600 font-medium">{item.quantity} unit</span>
                  {room && (
                    <Link
                      href={`/admin/inventory/${item.room_asset_id}`}
                      className="text-xs px-2 py-1 rounded bg-white/50 hover:bg-white text-zinc-600 hover:text-zinc-900 transition-colors font-medium"
                    >
                      Detail <ChevronRight className="h-3 w-3 inline ml-0.5" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
