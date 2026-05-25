'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Filter, X, Tag, Search, EyeOff, CalendarPlus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { CATEGORY_LABELS, CONDITION_OPTIONS } from './equipmentConstants'

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

  const hasActiveFilters = ketersediaan || category || condition || search || showInactive || todayOnly || inactiveOnly

  return (
    <div className="bg-card rounded-[14px] border border-border p-4 space-y-4">
      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const value = (new FormData(e.currentTarget)).get('search') as string
          router.push(buildUrl({ search: value || '' }))
        }}
        className="flex gap-2"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            name="search"
            type="text"
            placeholder="Cari nama, kode, atau merk..."
            defaultValue={search}
            className="pl-10"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-foreground text-white rounded-[10px] text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          Cari
        </button>
      </form>

      {/* Dropdowns */}
      <div className="border-t border-border/60 pt-4">
        <div className="flex items-center gap-2 text-foreground/80 mb-3">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filter</span>
          {hasActiveFilters && (
            <Link href="/admin/equipment" className="ml-auto text-xs text-muted-foreground hover:text-foreground/80 flex items-center gap-1">
              <X className="h-3 w-3" /> Reset Semua
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
        <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap gap-4">
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
    </div>
  )
}
