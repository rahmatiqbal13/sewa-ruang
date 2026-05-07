'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { 
  Filter, 
  X, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Tag,
  Search
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface EquipmentFiltersProps {
  categories: string[]
}

const KETERSEDIAAN_OPTIONS = [
  { value: '', label: 'Semua Status', icon: Package, color: 'text-slate-600' },
  { value: 'tersedia', label: 'Tersedia', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'digunakan', label: 'Sedang Digunakan', icon: Clock, color: 'text-orange-600' },
  { value: 'hilang', label: 'Hilang/Rusak', icon: AlertTriangle, color: 'text-red-600' },
]

const CONDITION_OPTIONS = [
  { value: '', label: 'Semua Kondisi' },
  { value: 'good', label: 'Baik' },
  { value: 'needs_repair', label: 'Perlu Perbaikan' },
  { value: 'damaged', label: 'Rusak' },
  { value: 'lost', label: 'Hilang' },
]

const CATEGORY_LABELS: Record<string, string> = {
  elektronik: 'Elektronik',
  mebel: 'Mebel',
  transportasi: 'Transportasi',
  alat_tes_pengukuran: 'Alat Tes Pengukuran',
  alat_gym: 'Alat Gym/Fitness',
  perlengkapan: 'Perlengkapan',
  lainnya: 'Lainnya',
}

export function EquipmentFilters({ categories }: EquipmentFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const ketersediaan = searchParams.get('ketersediaan') || ''
  const category = searchParams.get('category') || ''
  const condition = searchParams.get('condition') || ''
  const search = searchParams.get('search') || ''

  const selectedKetersediaan = useMemo(() => {
    return KETERSEDIAAN_OPTIONS.find(opt => opt.value === ketersediaan)
  }, [ketersediaan])

  const selectedCategory = useMemo(() => {
    return category ? { value: category, label: CATEGORY_LABELS[category] || category } : null
  }, [category])

  const selectedCondition = useMemo(() => {
    return CONDITION_OPTIONS.find(opt => opt.value === condition)
  }, [condition])

  // Build URL with params
  const buildUrl = useCallback((params: Record<string, string>) => {
    const current = {
      ketersediaan,
      category,
      condition,
      search,
      ...params
    }
    const valid = Object.entries(current).filter(([_, v]) => v)
    return valid.length > 0 ? '/admin/equipment?' + valid.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '/admin/equipment'
  }, [ketersediaan, category, condition, search])

  const hasActiveFilters = ketersediaan || category || condition || search

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
      {/* Search Bar */}
      <form 
        action="/admin/equipment" 
        method="GET"
        className="flex gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          const searchValue = formData.get('search') as string
          router.push(buildUrl({ search: searchValue }))
        }}
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            name="search"
            placeholder="Cari alat berdasarkan nama, kode, atau merk..."
            defaultValue={search}
            className="pl-10"
          />
        </div>
        {ketersediaan && <input type="hidden" name="ketersediaan" value={ketersediaan} />}
        {category && <input type="hidden" name="category" value={category} />}
        {condition && <input type="hidden" name="condition" value={condition} />}
        <button
          type="submit"
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Cari
        </button>
        {search && (
          <Link
            href="/admin/equipment"
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Reset
          </Link>
        )}
      </form>

      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 text-slate-700 mb-4">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filter</span>
          {hasActiveFilters && (
            <Link
              href="/admin/equipment"
              className="ml-auto text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Reset Filter
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ketersediaan Filter */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Status Ketersediaan</label>
          <Select
            value={ketersediaan}
            onValueChange={(value) => router.push(buildUrl({ ketersediaan: value || '' }))}
          >
              <SelectTrigger className="w-full">
                {selectedKetersediaan ? (
                  <span className="flex items-center gap-2">
                    <selectedKetersediaan.icon className={cn("h-4 w-4", selectedKetersediaan.color)} />
                    {selectedKetersediaan.label}
                  </span>
                ) : (
                  <span className="text-slate-400">Pilih status...</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {KETERSEDIAAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <option.icon className={cn("h-4 w-4", option.color)} />
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Kategori</label>
          <Select
            value={category}
            onValueChange={(value) => router.push(buildUrl({ category: value || '' }))}
          >
              <SelectTrigger className="w-full">
                {selectedCategory ? (
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-slate-400" />
                    {selectedCategory.label}
                  </span>
                ) : (
                  <span className="text-slate-400">Pilih kategori...</span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kategori</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condition Filter */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Kondisi</label>
          <Select
            value={condition}
            onValueChange={(value) => router.push(buildUrl({ condition: value || '' }))}
          >
              <SelectTrigger className="w-full">
                {selectedCondition ? (
                  <span>{selectedCondition.label}</span>
                ) : (
                  <span className="text-slate-400">Pilih kondisi...</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
