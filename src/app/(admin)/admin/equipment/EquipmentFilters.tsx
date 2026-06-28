'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useEffect } from 'react'
import { Filter, X, Tag, Search, EyeOff, CalendarPlus, SlidersHorizontal } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { CATEGORY_LABELS, CONDITION_OPTIONS } from './equipmentConstants'
import { cn } from '@/lib/utils'

interface EquipmentFiltersProps {
  categories: string[]
}

export function EquipmentFilters({ categories }: EquipmentFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const ketersediaan = searchParams.get('ketersediaan') || ''
  const category = searchParams.get('category') || ''
  const condition = searchParams.get('condition') || ''
  const search = searchParams.get('search') || ''
  const showInactive = searchParams.get('showInactive') === 'true'
  const todayOnly = searchParams.get('todayOnly') === 'true'
  const inactiveOnly = searchParams.get('inactiveOnly') === 'true'

  const [searchValue, setSearchValue] = useState(search)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setSearchValue(search), 0)
    return () => clearTimeout(id)
  }, [search])

  // Auto-expand if filters are active
  const hasActiveFilters = category || condition || showInactive || todayOnly
  useEffect(() => {
    if (hasActiveFilters) setExpanded(true)
  }, [hasActiveFilters])

  const buildUrl = useCallback((params: Record<string, string>) => {
    const next = {
      ketersediaan, category, condition, search,
      showInactive: showInactive ? 'true' : '',
      todayOnly: todayOnly ? 'true' : '',
      inactiveOnly: inactiveOnly ? 'true' : '',
      ...params,
    }
    const entries = Object.entries(next).filter(([, v]) => v)
    return entries.length > 0 ? '/admin/equipment?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '/admin/equipment'
  }, [ketersediaan, category, condition, search, showInactive, todayOnly, inactiveOnly])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(buildUrl({ search: searchValue || '' }))
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            name="search"
            type="text"
            placeholder="Cari nama, kode, atau merk..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          Cari
        </button>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className={cn(
            "px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 shrink-0",
            expanded || hasActiveFilters
              ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filter</span>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {([category, condition, showInactive, todayOnly].filter(Boolean).length)}
            </span>
          )}
        </button>
      </form>

      {/* Expandable Filter Panel */}
      {expanded && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-4 animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground/80">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filter Lanjutan</span>
            </div>
            {hasActiveFilters && (
              <Link href="/admin/equipment" className="text-xs text-muted-foreground hover:text-foreground/80 flex items-center gap-1">
                <X className="h-3 w-3" /> Reset
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Kategori</label>
              <Select value={category} onValueChange={(v) => router.push(buildUrl({ category: v || '' }))}>
                <SelectTrigger className="w-full">
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground/70" />
                    <SelectValue placeholder="Semua Kategori" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Kondisi</label>
              <Select value={condition} onValueChange={(v) => router.push(buildUrl({ condition: v || '' }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Kondisi" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-border/60">
            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={showInactive}
                onCheckedChange={(checked) => router.push(buildUrl({ showInactive: checked ? 'true' : '' }))}
              />
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground group-hover:text-foreground">
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground/70" />
                Tampilkan nonaktif
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={todayOnly}
                onCheckedChange={(checked) => router.push(buildUrl({ todayOnly: checked ? 'true' : '' }))}
              />
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground group-hover:text-foreground">
                <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground/70" />
                Ditambahkan hari ini
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {category && (
            <Link
              href={buildUrl({ category: '' })}
              className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
            >
              {CATEGORY_LABELS[category] || category}
              <X className="h-3 w-3" />
            </Link>
          )}
          {condition && (
            <Link
              href={buildUrl({ condition: '' })}
              className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
            >
              {CONDITION_OPTIONS.find(c => c.value === condition)?.label || condition}
              <X className="h-3 w-3" />
            </Link>
          )}
          {showInactive && (
            <Link
              href={buildUrl({ showInactive: '' })}
              className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
            >
              Nonaktif ditampilkan
              <X className="h-3 w-3" />
            </Link>
          )}
          {todayOnly && (
            <Link
              href={buildUrl({ todayOnly: '' })}
              className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
            >
              Hari ini
              <X className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
