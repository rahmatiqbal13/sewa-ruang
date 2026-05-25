'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  GraduationCap, 
  UserCog, 
  Building2, 
  Users, 
  ShieldCheck,
  Clock,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn, formatRupiah } from '@/lib/utils'

export interface Rate {
  user_category: string
  rate_per_day: number
  rate_per_hour: number | null
  requires_supervision: boolean
}

interface EquipmentRatesFormProps {
  initialRates?: Rate[]
  onRatesChange?: (rates: Rate[]) => void
}

export const CATEGORIES = [
  { 
    key: 'mahasiswa_s1', 
    label: 'Mahasiswa S1',
    shortLabel: 'Mhs S1',
    color: 'blue',
    icon: GraduationCap
  },
  { 
    key: 'mahasiswa_s2', 
    label: 'Mahasiswa S2',
    shortLabel: 'Mhs S2',
    color: 'purple',
    icon: GraduationCap
  },
  { 
    key: 'dosen', 
    label: 'Dosen',
    shortLabel: 'Dosen',
    color: 'emerald',
    icon: UserCog
  },
  { 
    key: 'mou_unesa', 
    label: 'MoU Unesa',
    shortLabel: 'MoU',
    color: 'orange',
    icon: Building2
  },
  { 
    key: 'umum', 
    label: 'Umum',
    shortLabel: 'Umum',
    color: 'slate',
    icon: Users
  },
]

const COLOR_STYLES: Record<string, { bg: string; border: string; text: string; accent: string; lightBg: string }> = {
  blue: { 
    bg: 'bg-blue-50/50', 
    border: 'border-blue-200', 
    text: 'text-blue-700',
    accent: 'bg-blue-500',
    lightBg: 'bg-blue-50'
  },
  purple: { 
    bg: 'bg-purple-50/50', 
    border: 'border-purple-200', 
    text: 'text-purple-700',
    accent: 'bg-purple-500',
    lightBg: 'bg-purple-50'
  },
  emerald: { 
    bg: 'bg-emerald-50/50', 
    border: 'border-emerald-200', 
    text: 'text-emerald-700',
    accent: 'bg-emerald-500',
    lightBg: 'bg-emerald-50'
  },
  orange: { 
    bg: 'bg-orange-50/50', 
    border: 'border-orange-200', 
    text: 'text-orange-700',
    accent: 'bg-orange-500',
    lightBg: 'bg-orange-50'
  },
  slate: { 
    bg: 'bg-muted/50', 
    border: 'border-border', 
    text: 'text-foreground/80',
    accent: 'bg-muted-foreground',
    lightBg: 'bg-muted'
  },
}

export function EquipmentRatesForm({ initialRates = [], onRatesChange }: EquipmentRatesFormProps) {
  const [rates, setRates] = useState<Record<string, Rate>>(() => {
    const initial: Record<string, Rate> = {}
    CATEGORIES.forEach(cat => {
      const existing = initialRates.find(rate => rate.user_category === cat.key)
      initial[cat.key] = existing ? {
        ...existing,
        rate_per_day: existing.rate_per_day ?? 0,
        rate_per_hour: existing.rate_per_hour ?? null,
        requires_supervision: existing.requires_supervision ?? false
      } : {
        user_category: cat.key,
        rate_per_day: 0,
        rate_per_hour: null,
        requires_supervision: false
      }
    })
    return initial
  })

  const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    CATEGORIES.forEach(cat => {
      const existing = initialRates.find(rate => rate.user_category === cat.key)
      initial[cat.key] = existing ? existing.rate_per_day > 0 : false
    })
    return initial
  })

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    CATEGORIES.forEach(cat => {
      const existing = initialRates.find(rate => rate.user_category === cat.key)
      initial[cat.key] = existing ? existing.rate_per_day > 0 : false
    })
    return initial
  })

  const updateRate = (category: string, field: keyof Rate, value: number | boolean | null) => {
    setRates(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        user_category: category,
        [field]: value
      }
    }))
  }

  const toggleCategory = (category: string, enabled: boolean) => {
    setEnabledCategories(prev => ({ ...prev, [category]: enabled }))
    setExpanded(prev => ({ ...prev, [category]: enabled }))
    if (!enabled) {
      updateRate(category, 'rate_per_day', 0)
      updateRate(category, 'rate_per_hour', null)
    }
  }

  const toggleExpand = (category: string) => {
    setExpanded(prev => ({ ...prev, [category]: !prev[category] }))
  }

  // Notify parent when rates change
  useEffect(() => {
    if (onRatesChange) {
      const activeRates = Object.values(rates).filter(rate => rate.rate_per_day > 0)
      onRatesChange(activeRates)
    }
  }, [rates, onRatesChange])

  // Calculate stats
  const enabledCount = Object.values(enabledCategories).filter(Boolean).length
  const activeRates = Object.values(rates).filter(rate => rate.rate_per_day > 0)
  const lowestRate = activeRates.length > 0 
    ? activeRates.sort((a, b) => a.rate_per_day - b.rate_per_day)[0] 
    : null
  const highestRate = activeRates.length > 0 
    ? activeRates.sort((a, b) => b.rate_per_day - a.rate_per_day)[0] 
    : null

  return (
    <div className="space-y-4">
      {/* Compact Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Aktif:</span>
          <span className="font-semibold text-foreground">{enabledCount}/{CATEGORIES.length}</span>
        </div>
        {lowestRate && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Terendah:</span>
            <span className="font-semibold text-emerald-600">{formatRupiah(lowestRate.rate_per_day)}</span>
          </div>
        )}
        {highestRate && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Tertinggi:</span>
            <span className="font-semibold text-blue-600">{formatRupiah(highestRate.rate_per_day)}</span>
          </div>
        )}
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 gap-3">
        {CATEGORIES.map(category => {
          const rate = rates[category.key]
          const isEnabled = enabledCategories[category.key]
          const isExpanded = expanded[category.key]
          const colors = COLOR_STYLES[category.color]
          const Icon = category.icon
          
          return (
            <div 
              key={category.key} 
              className={cn(
                "rounded-[14px] border transition-all",
                isEnabled ? colors.bg : 'bg-muted/50',
                isEnabled ? colors.border : 'border-border'
              )}
            >
              {/* Header - Always visible */}
              <div 
                className={cn(
                  "px-4 py-3 flex items-center justify-between cursor-pointer",
                  isEnabled && "border-b",
                  isEnabled ? colors.border : 'border-border'
                )}
                onClick={() => isEnabled && toggleExpand(category.key)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-9 w-9 rounded-[10px] flex items-center justify-center text-white",
                    isEnabled ? colors.accent : 'bg-muted'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className={cn("font-semibold text-sm", isEnabled ? colors.text : 'text-muted-foreground')}>
                      {category.label}
                    </h4>
                    {isEnabled && rate.rate_per_day > 0 && (
                      <p className="text-xs text-emerald-600 font-medium">
                        {formatRupiah(rate.rate_per_day)}/hari
                        {rate.rate_per_hour && ` • ${formatRupiah(rate.rate_per_hour)}/jam`}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {isEnabled && (
                    <Badge variant="outline" className={cn("text-xs", colors.text, colors.lightBg)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  )}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => toggleCategory(category.key, checked)}
                    />
                  </div>
                  {isEnabled && (
                    isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground/70" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
                  )}
                </div>
              </div>

              {/* Expandable Content */}
              {isEnabled && isExpanded && (
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Daily Rate */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Per Hari
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-xs">Rp</span>
                        <Input
                          name={`${category.key}_day`}
                          type="number"
                          min="0"
                          placeholder="0"
                          className="pl-7 h-9 text-sm"
                          defaultValue={rate?.rate_per_day || ''}
                        />
                      </div>
                    </div>

                    {/* Hourly Rate */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Per Jam
                        <span className="text-[10px] normal-case">(opsional)</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-xs">Rp</span>
                        <Input
                          name={`${category.key}_hour`}
                          type="number"
                          min="0"
                          placeholder="-"
                          className="pl-7 h-9 text-sm"
                          defaultValue={rate?.rate_per_hour ?? ''}
                        />
                      </div>
                    </div>

                    {/* Supervision */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Supervisi
                      </Label>
                      {/* Hidden input ensures supervision value selalu masuk FormData */}
                      <input
                        type="hidden"
                        name={`${category.key}_supervision`}
                        value={rate?.requires_supervision ? 'true' : 'false'}
                        readOnly
                      />
                      <Select
                        value={rate?.requires_supervision ? 'true' : 'false'}
                        onValueChange={(value) => updateRate(category.key, 'requires_supervision', value === 'true')}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Pilih..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Ya, Perlu</SelectItem>
                          <SelectItem value="false">Tidak</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
