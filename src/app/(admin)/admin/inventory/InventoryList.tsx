'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Boxes, ChevronRight, Building2, DoorOpen, Package, Plus, Download,
  FileUp, Pencil, MoreHorizontal, Trash2, LayoutGrid,
  Table2, ChevronLeft, ChevronRightIcon, AlertTriangle
} from 'lucide-react'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { cn } from '@/lib/utils'
import { exportInventoryToExcel } from './exportInventory'
import { InventoryImportDialog } from './InventoryImportDialog'
import { EditInventoryItemDialog } from './[roomId]/EditInventoryItemDialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SafeImage } from '@/components/shared/SafeImage'

const CONDITIONS = [
  { value: '', label: 'Semua', color: 'bg-foreground text-white', bg: 'bg-muted border-border' },
  { value: 'good', label: 'Baik', color: 'bg-green-600 text-white', bg: 'bg-green-50 border-green-200' },
  { value: 'needs_repair', label: 'Perlu Perbaikan', color: 'bg-yellow-600 text-white', bg: 'bg-yellow-50 border-yellow-200' },
  { value: 'damaged', label: 'Rusak', color: 'bg-red-600 text-white', bg: 'bg-red-50 border-red-200' },
]

interface InventoryItem {
  id: string
  name: string
  merk: string | null
  quantity: number
  condition: 'good' | 'needs_repair' | 'damaged'
  inventory_code: string | null
  notes: string | null
  photo_url: string | null
  last_updated_at?: string
  room_id: string | null
  rooms: {
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

const ITEMS_PER_PAGE = 12

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function InventoryList({
  items,
  allItems,
  condCounts,
  totalCount,
  currentCondition
}: InventoryListProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | 'bulk' | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    // Select/deselect ALL items across all pages
    if (selectedIds.size === items.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(items.map(i => i.id)))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const isSelected = (id: string) => selectedIds.has(id)
  const isAllSelected = items.length > 0 && selectedIds.size === items.length
  const isPartialSelected = selectedIds.size > 0 && selectedIds.size < items.length
  const hasSelection = selectedIds.size > 0

  const handleExport = () => {
    setIsExporting(true)
    const selectedArray = Array.from(selectedIds)
    const inventoryToExport = selectedArray.length > 0
      ? allItems.filter(item => selectedArray.includes(item.id))
      : allItems

    const exportData = inventoryToExport.map(item => ({
      id: item.id,
      name: item.name,
      merk: item.merk,
      inventory_code: item.inventory_code,
      quantity: item.quantity,
      condition: item.condition,
      notes: item.notes,
      is_active: true,
      room_name: item.rooms?.name ?? null,
      building_name: item.rooms?.buildings?.name ?? null,
    }))

    exportInventoryToExcel(selectedArray, exportData)
    setIsExporting(false)
    clearSelection()
  }


  async function confirmDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase.from('room_inventories') as any

    const now = new Date().toISOString()
    if (deleteTarget === 'bulk') {
      const ids = Array.from(selectedIds)
      const { error } = await sb
        .update({ is_active: false, deleted_at: now })
        .in('id', ids)
      if (error) {
        toast.error('Gagal menghapus: ' + error.message)
      } else {
        toast.success(`${ids.length} item berhasil dihapus`)
        clearSelection()
        router.refresh()
      }
    } else {
      const { error } = await sb
        .update({ is_active: false, deleted_at: now })
        .eq('id', deleteTarget.id)
      if (error) {
        toast.error('Gagal menghapus: ' + error.message)
      } else {
        toast.success(`"${deleteTarget.name}" berhasil dihapus`)
        router.refresh()
      }
    }

    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const buildQueryString = (newCondition: string) => {
    if (newCondition) return `?condition=${newCondition}`
    return ''
  }

  return (
    <div className="p-6 space-y-6">
      {/* Edit Dialog */}
      {editingItem && (
        <EditInventoryItemDialog
          item={editingItem}
          open={true}
          onOpenChange={(open) => !open && setEditingItem(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null) }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-red-50">
              <AlertTriangle className="size-5 text-red-600" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {deleteTarget === 'bulk'
                ? `Hapus ${selectedIds.size} item?`
                : `Hapus "${deleteTarget instanceof Object ? (deleteTarget as InventoryItem).name : ''}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === 'bulk'
                ? `${selectedIds.size} item inventaris yang dipilih akan dihapus. Tindakan ini tidak dapat dibatalkan.`
                : 'Item inventaris ini akan dihapus. Tindakan ini tidak dapat dibatalkan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={confirmDelete}
            >
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <InventoryImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => {
          setIsImportDialogOpen(false)
          router.refresh()
        }}
      />

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-[14px] p-4">
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
          <h1 className="text-2xl font-bold text-foreground">Inventaris Ruangan</h1>
          <p className="text-muted-foreground text-sm">Barang-barang di dalam ruangan (tidak untuk disewakan)</p>
        </div>
        <div className="flex items-center gap-2">
          {hasSelection && (
            <>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting}
                className="hidden sm:flex border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Export ({selectedIds.size})
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget('bulk')}
                className="hidden sm:flex border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus ({selectedIds.size})
              </Button>
            </>
          )}
          
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="hidden sm:flex"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Mengekspor...' : 'Export Semua'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            className="hidden sm:flex"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Import
          </Button>
          
          <Link 
            href="/admin/inventory/new" 
            className="inline-flex items-center justify-center rounded-[10px] text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-amber-600 text-white hover:bg-amber-700 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" /> Tambah Item
          </Link>
        </div>
      </div>

      {/* Info Cards - Like Equipment Page */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted border border-border rounded-[14px] p-4">
          <p className="text-muted-foreground text-sm font-medium">Total Item</p>
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-[14px] p-4">
          <p className="text-green-600 text-sm font-medium">Kondisi Baik</p>
          <p className="text-2xl font-bold text-green-900">{condCounts['good'] ?? 0}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-[14px] p-4">
          <p className="text-yellow-600 text-sm font-medium">Perlu Perbaikan</p>
          <p className="text-2xl font-bold text-yellow-900">{condCounts['needs_repair'] ?? 0}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-[14px] p-4">
          <p className="text-red-600 text-sm font-medium">Rusak</p>
          <p className="text-2xl font-bold text-red-900">{condCounts['damaged'] ?? 0}</p>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map(tab => {
            const isActive = currentCondition === tab.value
            const count = tab.value ? (condCounts[tab.value] ?? 0) : totalCount
            return (
              <Link
                key={tab.value}
                href={`/admin/inventory${buildQueryString(tab.value)}`}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-medium transition-all',
                  isActive ? tab.color : 'bg-card border text-muted-foreground hover:bg-muted'
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-xs rounded-full px-1.5 py-0.5 font-bold',
                  isActive ? 'bg-white/20' : 'bg-muted'
                )}>
                  {count}
                </span>
              </Link>
            )
          })}
        </div>
        
        <div className="flex items-center gap-1 bg-muted p-1 rounded-[10px]">
          <button
            onClick={() => setViewMode('card')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              viewMode === 'card'
                ? 'bg-card text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Card</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              viewMode === 'table'
                ? 'bg-card text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Table2 className="h-4 w-4" />
            <span className="hidden sm:inline">Tabel</span>
          </button>
        </div>
      </div>

      {/* Selection Header */}
      {paginatedItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-[10px] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={el => { if (el) el.indeterminate = isPartialSelected }}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-border text-red-600 cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">
              {isAllSelected
                ? <span className="text-foreground font-medium">Semua {items.length} item dipilih</span>
                : hasSelection
                  ? <span className="text-foreground font-medium">{selectedIds.size} dari {items.length} item dipilih</span>
                  : <span>Pilih semua {items.length} item</span>}
            </span>
            {hasSelection && (
              <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground underline">
                Batalkan
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Halaman {currentPage}/{totalPages}
            </span>
            {hasSelection && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteTarget('bulk')}
                className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus ({selectedIds.size})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-[14px]">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Tidak ada item {currentCondition ? 'dengan kondisi ini' : 'inventaris'}</p>
          <Link href="/admin/inventory/new" className="text-amber-600 hover:underline"> Tambah sekarang</Link>
        </div>
      )}

      {/* CARD VIEW */}
      {viewMode === 'card' && paginatedItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {paginatedItems.map((item) => {
            const room = item.rooms
            const selected = isSelected(item.id)
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  "group overflow-hidden border border-[#E5E7EB] rounded-[14px] bg-white shadow-sm hover:shadow-md transition-all duration-300",
                  selected && "ring-2 ring-[#0891B2] border-[#0891B2]"
                )}
              >
                {/* Photo — Catalog Style */}
                <div className="relative aspect-[4/3] bg-[#F3F4F6] overflow-hidden">
                  {item.photo_url ? (
                    <SafeImage
                      src={item.photo_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      fallbackClassName="w-full h-full flex items-center justify-center"
                      fallback={<Package className="h-12 w-12 text-[#D1D5DB]" />}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-[#D1D5DB]" />
                    </div>
                  )}
                  
                  {/* Inventory Code Badge — top left */}
                  {item.inventory_code && (
                    <span className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
                      {item.inventory_code}
                    </span>
                  )}
                  
                  {/* Condition Badge — top right, catalog style */}
                  <div className="absolute top-3 right-3">
                    <span className={cn(
                      "text-xs font-medium px-2.5 py-1 rounded-full text-white",
                      item.condition === 'good' && "bg-emerald-500",
                      item.condition === 'needs_repair' && "bg-amber-500",
                      item.condition === 'damaged' && "bg-red-500"
                    )}>
                      {item.condition === 'good' ? 'Baik' : item.condition === 'needs_repair' ? 'Perlu Perbaikan' : 'Rusak'}
                    </span>
                  </div>
                  
                  {/* Checkbox — bottom left */}
                  <div className="absolute bottom-3 left-3">
                    <div
                      className="bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelection(item.id)}
                        className="h-4 w-4 rounded border-border text-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Content — Catalog Style */}
                <div className="p-4">
                  <h3 className="font-bold text-[#111827] text-base truncate group-hover:text-[#0891B2] transition-colors">
                    {item.name}
                  </h3>
                  {item.merk && (
                    <p className="text-xs text-[#6B7280] mb-1">{item.merk}</p>
                  )}
                  
                  {/* Location */}
                  <div className="mb-3 space-y-1">
                    {room ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                          <DoorOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{room.name}</span>
                          {room.room_code && <span className="font-mono text-[#9CA3AF]">({room.room_code})</span>}
                        </div>
                        {room.buildings && (
                          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{room.buildings.name}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-[#9CA3AF] italic">Lokasi tidak diketahui</p>
                    )}
                  </div>

                  {/* Quantity — Catalog Style */}
                  <div className="mb-3">
                    <p className="text-xs text-[#6B7280] mb-0.5">Jumlah</p>
                    <p className="text-xl font-bold text-[#111827]">{item.quantity} <span className="text-sm font-normal text-[#6B7280]">unit</span></p>
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <p className="text-xs text-[#9CA3AF] truncate mb-3" title={item.notes}>
                      {item.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-3 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="flex-1 h-9 flex items-center justify-center rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors text-xs font-medium"
                    >
                      Edit
                    </button>
                    
                    {room && (
                      <Link
                        href={`/admin/inventory/${item.rooms?.name ? createSlug(item.rooms.name) : item.room_id}`}
                        className="flex-1 h-9 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] transition-colors text-xs font-medium"
                      >
                        Detail Ruangan
                      </Link>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingItem(item)} className="gap-2 cursor-pointer">
                          <Pencil className="h-4 w-4" /> Edit Detail
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteTarget(item)} className="gap-2 cursor-pointer text-red-600">
                          <Trash2 className="h-4 w-4" /> Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && paginatedItems.length > 0 && (
        <div className="bg-card rounded-[14px] border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-border text-blue-600"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Foto</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Kode</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nama Item</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Lokasi</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Jumlah</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Kondisi</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedItems.map((item) => {
                  const room = item.rooms
                  const selected = isSelected(item.id)
                  
                  return (
                    <tr key={item.id} className={cn(selected && 'bg-blue-50/50', 'hover:bg-muted')}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelection(item.id)}
                          className="h-4 w-4 rounded border-border text-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 rounded-[10px] bg-muted overflow-hidden flex items-center justify-center">
                          {item.photo_url ? (
                            <SafeImage src={item.photo_url} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground/30" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                        {item.inventory_code ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.name}</p>
                        {item.merk && <p className="text-xs text-muted-foreground/70">{item.merk}</p>}
                        {item.notes && <p className="text-xs text-muted-foreground/50 truncate max-w-[200px]">{item.notes}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {room ? (
                          <div>
                            <p className="text-sm font-medium text-foreground/80">{room.name}</p>
                            <p className="text-xs text-muted-foreground/70">{room.buildings?.name}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/70">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold">{item.quantity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ConditionBadge condition={item.condition} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-amber-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingItem(item)} className="gap-2 cursor-pointer">
                                <Pencil className="h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteTarget(item)} className="gap-2 cursor-pointer text-red-600">
                                <Trash2 className="h-4 w-4" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {room && (
                            <Link
                          href={`/admin/inventory/${item.rooms?.name ? createSlug(item.rooms.name) : item.room_id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {currentPage} dari {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Selanjutnya <ChevronRightIcon className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
