'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Package, ChevronLeft, ChevronRight, AlertTriangle, Download, FileUp, LayoutGrid, Table2, ShieldCheck, Eye, Pencil, MapPin } from 'lucide-react'
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

  const getKetersediaanColor = (status: string) => KETERSEDIAAN[status]?.badgeClass ?? 'bg-muted text-muted-foreground'
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
    <div className="admin-page">
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

      {/* Duplicate warning */}
      {hasDuplicates && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-[14px] p-3.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-amber-800">
            <span className="font-semibold">{duplicateBaseNames.size} nama alat duplikat</span> — alat terduplikat ditandai warna oranye.
            <span className="text-amber-600"> Pertimbangkan untuk mengganti nama agar lebih spesifik.</span>
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Alat &amp; Peralatan
            {isSuperAdmin && <ShieldCheck className="h-4 w-4 text-purple-500" />}
          </h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            {isSuperAdmin ? 'Super Admin mode — semua operasi tersedia' : 'Alat yang dapat disewakan dengan tarif per kategori'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* View Toggle */}
          <div className="flex items-center gap-0.5 bg-muted p-1 rounded-lg shrink-0">
            {(['card', 'table'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                  viewMode === mode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode === 'card' ? <LayoutGrid className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{mode === 'card' ? 'Card' : 'Tabel'}</span>
              </button>
            ))}
          </div>
          {hasSelection && (
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">({selectedCount})</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)} className="hidden sm:flex">
            <FileUp className="mr-1.5 h-3.5 w-3.5" /> Import
          </Button>
          <Link href="/admin/equipment/new" className="inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tambah Alat</span>
            <span className="sm:hidden">Tambah</span>
          </Link>
        </div>
      </div>

      {/* Search + Filter */}
      <EquipmentFilters categories={uniqueCategories} />

      {/* Compact Availability Tabs */}
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
          { key: '',               label: 'Semua',          count: totalItems,                           isActive: !isInactiveTab && activeK === '',   color: 'blue',   href: buildTabUrl('') },
          { key: 'tersedia',       label: 'Tersedia',       count: availabilityCounts['tersedia'],        isActive: !isInactiveTab && activeK === 'tersedia',      color: 'green',  href: buildTabUrl('tersedia') },
          { key: 'digunakan',      label: 'Digunakan',      count: availabilityCounts['digunakan'],       isActive: !isInactiveTab && activeK === 'digunakan',     color: 'orange', href: buildTabUrl('digunakan') },
          { key: 'hilang',         label: 'Hilang',         count: availabilityCounts['hilang'],          isActive: !isInactiveTab && activeK === 'hilang',        color: 'red',    href: buildTabUrl('hilang') },
          { key: 'tidak_tersedia', label: 'Tidak Tersedia', count: availabilityCounts['tidak_tersedia'],  isActive: !isInactiveTab && activeK === 'tidak_tersedia',color: 'gray',   href: buildTabUrl('tidak_tersedia') },
          { key: 'nonaktif',       label: 'Non Aktif',      count: inactiveCount,                        isActive: isInactiveTab,                                 color: 'gray',   href: buildTabUrl('', true) },
        ]

        const colorMap: Record<string, { active: string; inactive: string }> = {
          blue:   { active: 'bg-blue-600 text-white border-blue-600',    inactive: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
          green:  { active: 'bg-green-600 text-white border-green-600',  inactive: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
          orange: { active: 'bg-orange-600 text-white border-orange-600',inactive: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' },
          red:    { active: 'bg-red-600 text-white border-red-600',      inactive: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
          gray:   { active: 'bg-foreground text-white border-foreground',inactive: 'bg-muted border-border text-muted-foreground hover:bg-muted/80' },
        }

        return (
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => {
              const colors = colorMap[tab.color]
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                    tab.isActive ? colors.active : colors.inactive
                  )}
                >
                  {tab.label}
                  <span className={cn('text-[10px] font-bold', tab.isActive ? 'opacity-80' : 'text-muted-foreground')}>
                    {tab.count}
                  </span>
                </Link>
              )
            })}
          </div>
        )
      })()}

      {/* Selection Header */}
      {equipment.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SelectAllCheckbox
              checked={isAllSelected}
              onCheckedChange={toggleAll}
              disabled={equipment.length === 0}
            />
            <span className="text-sm text-muted-foreground">
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
        <div className="empty-state">
          <Package className="h-10 w-10 mb-3 opacity-25" />
          <p className="text-sm font-medium">
            {searchParams.search ? `Tidak ada hasil untuk "${searchParams.search}"` : 'Belum ada alat'}
          </p>
          <Link href="/admin/equipment/new" className="mt-2 text-xs text-primary hover:underline">Tambah sekarang</Link>
        </div>
      )}

      {/* Equipment Display */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {equipment.map((item) => {
          const lowestRate = getDisplayRate(item.equipment_rates)
          const baseName = item.name.replace(/\s*\(\d+\)$/, '').toLowerCase().trim()
          const isDuplicate = duplicateBaseNames.has(baseName)
          const isAvailable = item.ketersediaan === 'tersedia'

          return (
            <div key={item.id} className={cn(
              "group overflow-hidden border border-[#E5E7EB] rounded-[14px] bg-white shadow-sm hover:shadow-md transition-all duration-300",
              isDuplicate && "ring-1 ring-amber-400",
              !item.is_active && "opacity-60"
            )}>
              {/* Photo — Catalog Style: square, object-cover, hover zoom */}
              <Link
                href={`/admin/equipment/${createSlug(item.name)}`}
                className="relative aspect-[4/3] bg-[#F3F4F6] block overflow-hidden"
              >
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

                {/* Status Badge — Catalog Style */}
                <div className="absolute top-3 right-3">
                  <Badge className={cn(
                    "text-xs font-medium border-0",
                    isAvailable ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  )}>
                    {isAvailable ? 'Tersedia' : 'Tidak Tersedia'}
                  </Badge>
                </div>

                {/* Code overlay — subtle */}
                {item.equipment_code && (
                  <span className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
                    {item.equipment_code}
                  </span>
                )}

                {/* Checkbox — bottom left */}
                <div
                  className="absolute bottom-3 left-3"
                  onClick={(e) => e.preventDefault()}
                >
                  <div className="bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm">
                    <ItemCheckbox
                      checked={isSelected(item.id)}
                      onCheckedChange={() => toggleSelection(item.id)}
                    />
                  </div>
                </div>

                {/* Nonaktif overlay */}
                {!item.is_active && (
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">NONAKTIF</span>
                  </div>
                )}
              </Link>

              {/* Info — Catalog Style */}
              <div className="p-4">
                {/* Category Pill */}
                <div className="mb-2 flex items-center gap-2">
                  {item.category && (
                    <span className="inline-flex items-center bg-[#F3F4F6] text-[#374151] text-xs rounded-full px-2.5 py-1">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                  )}
                  {isDuplicate && (
                    <span className="text-[10px] text-amber-600 flex items-center gap-0.5" title="Nama duplikat">
                      <AlertTriangle className="h-3 w-3" /> Duplikat
                    </span>
                  )}
                </div>

                {/* Title */}
                <Link href={`/admin/equipment/${createSlug(item.name)}`}>
                  <h3 className={cn(
                    "font-bold text-[#111827] text-base mb-1 truncate group-hover:text-[#0891B2] transition-colors",
                    !item.is_active && "line-through"
                  )} title={item.name}>
                    {item.name}
                  </h3>
                </Link>

                {/* Brand */}
                {item.merk && (
                  <p className="text-sm text-[#6B7280] mb-2">{item.merk}</p>
                )}

                {/* Price */}
                <div className="mb-3">
                  {lowestRate ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-[#0891B2] font-semibold text-lg">
                        {formatRupiah(lowestRate.rate_per_day)}
                      </span>
                      <span className="text-sm text-[#6B7280]">/hari</span>
                      {lowestRate.requires_supervision && (
                        <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-200 ml-1">
                          Supervisi
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-[#9CA3AF] italic">Tarif belum diatur</span>
                  )}
                </div>

                {/* Status Dots */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", 
                      item.current_condition === 'good' ? "bg-emerald-500" :
                      item.current_condition === 'needs_repair' ? "bg-amber-500" :
                      "bg-red-500"
                    )} />
                    <span className="text-xs text-[#6B7280]">
                      {item.current_condition === 'good' ? 'Baik' :
                       item.current_condition === 'needs_repair' ? 'Perlu Perbaikan' :
                       item.current_condition === 'damaged' ? 'Rusak' : 'Hilang'}
                    </span>
                  </div>
                  {item.status_tindakan !== 'normal' && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-xs text-[#6B7280]">
                        {item.status_tindakan === 'perawatan' ? 'Perawatan' :
                         item.status_tindakan === 'menunggu_part' ? 'Menunggu Part' : 'Afkir'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Location */}
                {item.current_location && (
                  <p className="text-xs text-[#6B7280] flex items-center gap-1 mb-3">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.current_location}</span>
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 pt-2 border-t border-[#E5E7EB]">
                  <Link
                    href={`/admin/equipment/${createSlug(item.name)}`}
                    className="flex-1 h-9 flex items-center justify-center rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors text-xs font-medium"
                  >
                    Detail
                  </Link>
                  <Link
                    href={`/admin/equipment/${createSlug(item.name)}/edit`}
                    className="flex-1 h-9 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] transition-colors text-xs font-medium"
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
          )
        })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-card rounded-[14px] border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col" className="w-10">
                    <SelectAllCheckbox checked={isAllSelected} onCheckedChange={toggleAll} disabled={equipment.length === 0} />
                  </th>
                  <th scope="col">Kode</th>
                  <th scope="col">Nama Alat</th>
                  <th scope="col">Kategori</th>
                  <th scope="col">Kondisi</th>
                  <th scope="col">Status</th>
                  <th scope="col">Lokasi</th>
                  <th scope="col">Tarif/Hari</th>
                  <th scope="col" className="text-right">Aksi</th>
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
                        'hover:bg-muted transition-colors',
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
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                            {item.equipment_code}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/70">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.photo_url ? (
                            <SafeImage
                              src={item.photo_url}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-[10px]"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded-[10px] flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground/30" />
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/admin/equipment/${createSlug(item.name)}`}
                              className={cn(
                                'font-medium text-sm text-foreground hover:text-blue-600 transition-colors',
                                !item.is_active && 'line-through'
                              )}
                            >
                              {item.name}
                            </Link>
                            {item.merk && (
                              <p className="text-xs text-muted-foreground">{item.merk}</p>
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
                          <span className="text-xs text-muted-foreground/70">-</span>
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
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              Nonaktif
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
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
                              <p className="text-[10px] text-muted-foreground/70">
                                {formatRupiah(lowestRate.rate_per_hour)}/jam
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/70 italic">Belum diatur</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/equipment/${createSlug(item.name)}`}
                            className="text-xs px-2 py-1 rounded-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
                          >
                            Detail
                          </Link>
                          <Link
                            href={`/admin/equipment/${createSlug(item.name)}/edit`}
                            className="text-xs px-2 py-1 rounded-[10px] bg-muted hover:bg-muted/80 transition-colors"
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
        <div className="flex items-center justify-between pt-1">
          <Link href={currentPage > 1 ? `/admin/equipment?${buildQueryString(currentPage - 1)}` : '#'} className={cn('page-btn', currentPage === 1 && 'opacity-40 pointer-events-none')}>
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </Link>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => {
              if (n === 1 || n === totalPages || (n >= currentPage - 1 && n <= currentPage + 1))
                return <Link key={n} href={`/admin/equipment?${buildQueryString(n)}`} className={n === currentPage ? 'page-btn-active' : 'page-btn-num'}>{n}</Link>
              if (n === 2 || n === totalPages - 1) return <span key={n} className="text-muted-foreground/30 text-sm px-1">…</span>
              return null
            })}
          </div>
          <Link href={currentPage < totalPages ? `/admin/equipment?${buildQueryString(currentPage + 1)}` : '#'} className={cn('page-btn', currentPage === totalPages && 'opacity-40 pointer-events-none')}>
            Selanjutnya <ChevronRight className="h-4 w-4" />
          </Link>
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
