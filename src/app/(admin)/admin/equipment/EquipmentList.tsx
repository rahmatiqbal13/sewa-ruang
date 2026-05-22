'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Package, ChevronLeft, ChevronRight, AlertTriangle, Download, FileUp, LayoutGrid, Table2, ShieldCheck } from 'lucide-react'
import { formatRupiah, cn } from '@/lib/utils'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { SafeImage } from '@/components/shared/SafeImage'
import { EquipmentFilters } from './EquipmentFilters'
import { SoftDeleteButton, RestoreButton } from './SoftDeleteButtons'
import { DeleteEquipmentButton } from './DeleteEquipmentButton'
import { useBulkActions, BulkActionsBar, ItemCheckbox, SelectAllCheckbox } from './BulkActions'
import { exportEquipmentToExcel } from './exportEquipment'
import { importEquipmentFromExcel, undoImportEquipment, deleteAllEquipment } from './importEquipment'
import { downloadEquipmentTemplate } from './exportEquipment'
import { ImportDialog } from './ImportDialog'
import type { ImportResult } from './importEquipment'
import { CATEGORY_LABELS, KETERSEDIAAN } from './equipmentConstants'

// Helper function to create slug from name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface Equipment {
  id: string
  name: string
  equipment_code: string | null
  description: string | null
  merk: string | null
  category: string | null
  current_condition: string
  ketersediaan: string
  status_tindakan: string
  is_active: boolean
  photo_url: string | null
  current_location: string | null
  storage_room_id: string | null
  equipment_rates: Array<{
    user_category: string
    rate_per_day: number
    rate_per_hour: number | null
    requires_supervision: boolean
  }>
}

interface EquipmentListProps {
  equipment: Equipment[]  // Paginated equipment for display
  allEquipment: Equipment[]  // All equipment for export
  totalItems: number
  currentPage: number
  totalPages: number
  availabilityCounts: {
    tersedia: number
    digunakan: number
    hilang: number
    tidak_tersedia: number
  }
  duplicateBaseNames: Set<string>
  uniqueCategories: string[]
  hasDuplicates: boolean
  inactiveCount: number
  searchParams: {
    ketersediaan?: string
    category?: string
    condition?: string
    search?: string
    todayOnly?: string
    inactiveOnly?: string
  }
  isSuperAdmin?: boolean
}

const ITEMS_PER_PAGE = 10

export function EquipmentList({
  equipment,
  allEquipment,
  totalItems,
  currentPage,
  totalPages,
  availabilityCounts,
  duplicateBaseNames,
  uniqueCategories,
  hasDuplicates,
  inactiveCount,
  searchParams,
  isSuperAdmin = false,
}: EquipmentListProps) {
  const {
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    hasSelection,
    selectedCount
  } = useBulkActions(equipment)

  const [isExporting, setIsExporting] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')

  const handleExport = () => {
    setIsExporting(true)
    const selectedArray = Array.from(selectedIds)
    // Use allEquipment for export, but filter by selected if any
    const equipmentToExport = selectedArray.length > 0
      ? allEquipment.filter(item => selectedArray.includes(item.id))
      : allEquipment
    exportEquipmentToExcel([], equipmentToExport)
    setIsExporting(false)
    clearSelection()
  }

  const handleImport = async (formData: FormData): Promise<ImportResult> => {
    return await importEquipmentFromExcel(formData)
  }

  const getKetersediaanColor = (status: string) => KETERSEDIAAN[status]?.badgeClass ?? 'bg-gray-100 text-gray-700'
  const getKetersediaanLabel = (status: string) => KETERSEDIAAN[status]?.label ?? status

  const getDisplayRate = (rates: { rate_per_day: number; rate_per_hour: number | null; user_category: string; requires_supervision: boolean }[] | null | undefined) => {
    if (!rates || rates.length === 0) return null
    const sorted = [...rates].sort((a, b) => a.rate_per_day - b.rate_per_day)
    return sorted[0]
  }

  const buildQueryString = (newPage: number) => {
    const params = new URLSearchParams()
    if (searchParams.ketersediaan) params.set('ketersediaan', searchParams.ketersediaan)
    if (searchParams.category) params.set('category', searchParams.category)
    if (searchParams.condition) params.set('condition', searchParams.condition)
    if (searchParams.search) params.set('search', searchParams.search)
    if (searchParams.todayOnly) params.set('todayOnly', searchParams.todayOnly)
    params.set('page', newPage.toString())
    return params.toString()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImport={handleImport}
        onDownloadTemplate={downloadEquipmentTemplate}
        onUndoImport={undoImportEquipment}
        onDeleteAll={deleteAllEquipment}
        title="Import Alat"
        description="Unggah file Excel untuk mengimport data alat"
        entityName="alat"
      />

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">Apa itu Asset (Alat)?</h3>
            <p className="text-sm text-blue-700 mt-1">
              Asset adalah alat dan peralatan yang dapat <strong>disewakan</strong> oleh pengguna.
              Contoh: Alat tes pengukuran, alat gym, proyektor, dll.
              Untuk barang inventaris ruangan (meja, kursi, AC), gunakan menu
              <Link href="/admin/inventory" className="text-blue-800 underline hover:text-blue-900"> Inventaris</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Duplicate Warning Banner */}
      {hasDuplicates && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">Perhatian: Ada Nama Alat yang Sama!</h3>
              <p className="text-sm text-amber-700 mt-1">
                Terdapat {duplicateBaseNames.size} nama alat yang memiliki duplikat.
                Alat dengan nama sama ditandai dengan warna <span className="font-medium">oranje/amber</span>.
                Pertimbangkan untuk mengganti nama agar lebih spesifik.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Alat & Peralatan (Asset)
            {isSuperAdmin && <ShieldCheck className="h-6 w-6 text-purple-600" />}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isSuperAdmin 
              ? 'Kelola alat yang dapat disewakan — Super Admin mode aktif' 
              : 'Alat yang dapat disewakan dengan tarif per kategori pengguna'}
          </p>
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
              Export ({selectedCount})
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
          
          {/* Import Button */}
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            className="hidden sm:flex"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Import
          </Button>
          
          <Link href="/admin/equipment/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" /> Tambah Alat
          </Link>
        </div>
      </div>

      {/* Clickable availability tabs */}
      {(() => {
        const activeK = searchParams.ketersediaan || ''
        const isInactiveTab = searchParams.inactiveOnly === 'true'

        const buildTabUrl = (k: string, inactive = false) => {
          const params = new URLSearchParams()
          if (k) params.set('ketersediaan', k)
          if (inactive) params.set('inactiveOnly', 'true')
          if (searchParams.category) params.set('category', searchParams.category)
          if (searchParams.condition) params.set('condition', searchParams.condition)
          if (searchParams.search) params.set('search', searchParams.search)
          if (searchParams.todayOnly) params.set('todayOnly', searchParams.todayOnly)
          const q = params.toString()
          return q ? `/admin/equipment?${q}` : '/admin/equipment'
        }

        const tabs = [
          { key: '',               label: 'Semua',          count: totalItems,                           isActive: !isInactiveTab && activeK === '',   activeClass: 'bg-blue-600 text-white border-blue-600',    inactiveClass: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',   href: buildTabUrl('') },
          { key: 'tersedia',       label: 'Tersedia',       count: availabilityCounts['tersedia'],        isActive: !isInactiveTab && activeK === 'tersedia',      activeClass: 'bg-green-600 text-white border-green-600',  inactiveClass: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100', href: buildTabUrl('tersedia') },
          { key: 'digunakan',      label: 'Digunakan',      count: availabilityCounts['digunakan'],       isActive: !isInactiveTab && activeK === 'digunakan',     activeClass: 'bg-orange-600 text-white border-orange-600',inactiveClass: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',href: buildTabUrl('digunakan') },
          { key: 'hilang',         label: 'Hilang',         count: availabilityCounts['hilang'],          isActive: !isInactiveTab && activeK === 'hilang',        activeClass: 'bg-red-600 text-white border-red-600',      inactiveClass: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',       href: buildTabUrl('hilang') },
          { key: 'tidak_tersedia', label: 'Tidak Tersedia', count: availabilityCounts['tidak_tersedia'],  isActive: !isInactiveTab && activeK === 'tidak_tersedia',activeClass: 'bg-gray-600 text-white border-gray-600',    inactiveClass: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',   href: buildTabUrl('tidak_tersedia') },
          { key: 'nonaktif',       label: 'Non Aktif',      count: inactiveCount,                        isActive: isInactiveTab,                                 activeClass: 'bg-slate-700 text-white border-slate-700',  inactiveClass: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100', href: buildTabUrl('', true) },
        ]

        return (
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors',
                  tab.isActive ? tab.activeClass : tab.inactiveClass
                )}
              >
                <span>{tab.label}</span>
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full', tab.isActive ? 'bg-white/25' : 'bg-black/10')}>
                  {tab.count}
                </span>
              </Link>
            ))}
          </div>
        )
      })()}

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <EquipmentFilters categories={uniqueCategories} />
        </div>
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('card')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              viewMode === 'card'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
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
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            <Table2 className="h-4 w-4" />
            <span className="hidden sm:inline">Tabel</span>
          </button>
        </div>
      </div>

      {/* Selection Header */}
      {equipment.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SelectAllCheckbox
              checked={isAllSelected}
              onCheckedChange={toggleAll}
              disabled={equipment.length === 0}
            />
            <span className="text-sm text-slate-600">
              {hasSelection ? `${selectedCount} dipilih` : 'Pilih semua'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Menampilkan {equipment.length} dari {totalItems} alat
            {totalPages > 1 && ` (Halaman ${currentPage} dari ${totalPages})`}
          </p>
        </div>
      )}

      {/* Empty State */}
      {equipment.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>
            {searchParams.search
              ? `Tidak ada alat dengan kata kunci "${searchParams.search}"`
              : 'Belum ada alat.'}
            <Link href="/admin/equipment/new" className="text-primary hover:underline"> Tambah sekarang</Link>
          </p>
        </div>
      )}

      {/* Equipment Display */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {equipment.map((item) => {
          const lowestRate = getDisplayRate(item.equipment_rates)
          const baseName = item.name.replace(/\s*\(\d+\)$/, '').toLowerCase().trim()
          const isDuplicate = duplicateBaseNames.has(baseName)

          return (
            <div key={item.id} className={cn(
              "rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow group",
              isDuplicate ? "bg-amber-50 border-amber-300" : "bg-white",
              !item.is_active && "opacity-60 grayscale"
            )}>
              {/* Photo - Clickable to detail */}
              <Link
                href={`/admin/equipment/${createSlug(item.name)}`}
                className="relative h-44 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-2 block"
              >
                {item.photo_url ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <SafeImage
                      src={item.photo_url}
                      alt={item.name}
                      className="object-contain w-full h-full max-h-40"
                      fallbackClassName="w-full h-full rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-12 w-12 text-blue-200" />
                  </div>
                )}
                {item.equipment_code && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-white/90 backdrop-blur text-xs font-bold px-2 py-0.5 rounded-lg font-mono text-blue-700 border border-blue-200">
                      {item.equipment_code}
                    </span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                  {!item.is_active && (
                    <span className="bg-gray-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Nonaktif
                    </span>
                  )}
                  <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-xs">
                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>

                {/* Category Badge */}
                {item.category && (
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                  </div>
                )}

                {/* Checkbox overlay */}
                <div className="absolute bottom-2 right-2">
                  <div
                    className="bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm"
                    onClick={(e) => e.preventDefault()}
                  >
                    <ItemCheckbox
                      checked={isSelected(item.id)}
                      onCheckedChange={() => toggleSelection(item.id)}
                    />
                  </div>
                </div>
              </Link>

              {/* Info */}
              <div className="p-4">
                <Link href={`/admin/equipment/${createSlug(item.name)}`}>
                  <h3 className={cn(
                    "font-semibold text-zinc-900 text-sm truncate group-hover:text-blue-600 transition-colors",
                    !item.is_active && "line-through"
                  )} title={item.name}>
                    {item.name}
                  </h3>
                </Link>
                {item.merk && (
                  <p className="text-xs text-zinc-500 mt-0.5">{item.merk}</p>
                )}

                {/* Availability & Status */}
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', getKetersediaanColor(item.ketersediaan))}>
                    {getKetersediaanLabel(item.ketersediaan)}
                  </span>
                  {item.status_tindakan !== 'normal' && (
                    <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                      {item.status_tindakan === 'perawatan' ? 'Perawatan' :
                       item.status_tindakan === 'menunggu_part' ? 'Menunggu Part' : 'Afkir'}
                    </span>
                  )}
                  {isDuplicate && (
                    <span className="bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5">
                      <AlertTriangle className="h-3 w-3" /> Duplikat
                    </span>
                  )}
                </div>

                {/* Location */}
                {item.current_location && (
                  <p className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                    <span className="truncate">{item.current_location}</span>
                  </p>
                )}

                {/* Pricing */}
                <div className="mt-3 pt-2 border-t">
                  {lowestRate ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">Mulai dari</p>
                        <p className="text-sm font-semibold text-emerald-600">
                          {formatRupiah(lowestRate.rate_per_day)}/hari
                        </p>
                        {lowestRate.rate_per_hour && (
                          <p className="text-[10px] text-zinc-400">
                            {formatRupiah(lowestRate.rate_per_hour)}/jam
                          </p>
                        )}
                      </div>
                      {lowestRate.requires_supervision && (
                        <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-200">
                          Perlu Supervisi
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">Tarif belum diatur</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t">
                  <ConditionBadge condition={item.current_condition} />
                  <div className="flex gap-1">
                    <Link
                      href={`/admin/equipment/${createSlug(item.name)}`}
                      className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
                    >
                      Detail
                    </Link>
                    <Link
                      href={`/admin/equipment/${createSlug(item.name)}/edit`}
                      className="text-xs px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 transition-colors"
                    >
                      Edit
                    </Link>
                    {item.is_active ? (
                      <SoftDeleteButton
                        equipmentId={item.id}
                        equipmentName={item.name}
                        variant="outline"
                        size="sm"
                      />
                    ) : (
                      <RestoreButton
                        equipmentId={item.id}
                        equipmentName={item.name}
                        variant="outline"
                        size="sm"
                      />
                    )}
                    {isSuperAdmin && !item.is_active && (
                      <DeleteEquipmentButton
                        id={item.id}
                        equipmentName={item.name}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-10">
                    <SelectAllCheckbox
                      checked={isAllSelected}
                      onCheckedChange={toggleAll}
                      disabled={equipment.length === 0}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Kode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Nama Alat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Kategori</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Kondisi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Lokasi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Tarif/Hari</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {equipment.map((item) => {
                  const lowestRate = getDisplayRate(item.equipment_rates)
                  const baseName = item.name.replace(/\s*\(\d+\)$/, '').toLowerCase().trim()
                  const isDuplicate = duplicateBaseNames.has(baseName)

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'hover:bg-zinc-50 transition-colors',
                        isDuplicate && 'bg-amber-50/50',
                        !item.is_active && 'opacity-60'
                      )}
                    >
                      <td className="px-4 py-3">
                        <ItemCheckbox
                          checked={isSelected(item.id)}
                          onCheckedChange={() => toggleSelection(item.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {item.equipment_code ? (
                          <span className="text-xs font-mono bg-zinc-100 px-2 py-0.5 rounded">
                            {item.equipment_code}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.photo_url ? (
                            <SafeImage
                              src={item.photo_url}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
                              <Package className="h-4 w-4 text-zinc-300" />
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/admin/equipment/${createSlug(item.name)}`}
                              className={cn(
                                'font-medium text-sm text-zinc-900 hover:text-blue-600 transition-colors',
                                !item.is_active && 'line-through'
                              )}
                            >
                              {item.name}
                            </Link>
                            {item.merk && (
                              <p className="text-xs text-zinc-500">{item.merk}</p>
                            )}
                            {isDuplicate && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 mt-0.5">
                                <AlertTriangle className="h-3 w-3" /> Duplikat
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.category ? (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ConditionBadge condition={item.current_condition} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border', getKetersediaanColor(item.ketersediaan))}>
                            {getKetersediaanLabel(item.ketersediaan)}
                          </span>
                          {item.status_tindakan !== 'normal' && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                              {item.status_tindakan === 'perawatan' ? 'Perawatan' :
                               item.status_tindakan === 'menunggu_part' ? 'Menunggu Part' : 'Afkir'}
                            </span>
                          )}
                          {!item.is_active && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                              Nonaktif
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-600 truncate max-w-[120px] block">
                          {item.current_location || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {lowestRate ? (
                          <div>
                            <span className="text-sm font-semibold text-emerald-600">
                              {formatRupiah(lowestRate.rate_per_day)}
                            </span>
                            {lowestRate.rate_per_hour && (
                              <p className="text-[10px] text-zinc-400">
                                {formatRupiah(lowestRate.rate_per_hour)}/jam
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">Belum diatur</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/equipment/${createSlug(item.name)}`}
                            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
                          >
                            Detail
                          </Link>
                          <Link
                            href={`/admin/equipment/${createSlug(item.name)}/edit`}
                            className="text-xs px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 transition-colors"
                          >
                            Edit
                          </Link>
                          {item.is_active ? (
                            <SoftDeleteButton
                              equipmentId={item.id}
                              equipmentName={item.name}
                              variant="outline"
                              size="sm"
                            />
                          ) : (
                            <RestoreButton
                              equipmentId={item.id}
                              equipmentName={item.name}
                              variant="outline"
                              size="sm"
                            />
                          )}
                          {isSuperAdmin && !item.is_active && (
                            <DeleteEquipmentButton
                              id={item.id}
                              equipmentName={item.name}
                            />
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
        <div className="flex items-center justify-center gap-2 pt-6">
          {currentPage > 1 ? (
            <Link
              href={`/admin/equipment?${buildQueryString(currentPage - 1)}`}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white border text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </span>
          )}

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const shouldShow =
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)

              const showEllipsis =
                (pageNum === 2 && currentPage > 3) ||
                (pageNum === totalPages - 1 && currentPage < totalPages - 2)

              if (showEllipsis) {
                return <span key={`ellipsis-${pageNum}`} className="px-2 text-zinc-400">...</span>
              }

              if (!shouldShow) return null

              return (
                <Link
                  key={pageNum}
                  href={`/admin/equipment?${buildQueryString(pageNum)}`}
                  className={cn(
                    'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                    currentPage === pageNum
                      ? 'bg-zinc-800 text-white'
                      : 'bg-white border text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                  )}
                >
                  {pageNum}
                </Link>
              )
            })}
          </div>

          {currentPage < totalPages ? (
            <Link
              href={`/admin/equipment?${buildQueryString(currentPage + 1)}`}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white border text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
            >
              Selanjutnya
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
              Selanjutnya
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      )}

      {/* Page Info Footer */}
      {totalPages > 1 && (
        <div className="text-center text-sm text-muted-foreground">
          Halaman {currentPage} dari {totalPages} • {ITEMS_PER_PAGE} item per halaman
        </div>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedCount}
        selectedIds={Array.from(selectedIds)}
        equipment={equipment}
        onClear={clearSelection}
      />
    </div>
  )
}
