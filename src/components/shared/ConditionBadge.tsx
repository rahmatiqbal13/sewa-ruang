import { cn } from '@/lib/utils'

const config: Record<string, { label: string; className: string }> = {
  good:         { label: 'Baik',              className: 'bg-emerald-100 text-emerald-900 border border-emerald-300' },
  needs_repair: { label: 'Perlu Perbaikan',   className: 'bg-amber-100 text-amber-900 border border-amber-300' },
  damaged:      { label: 'Rusak',             className: 'bg-red-100 text-red-900 border border-red-300' },
  lost:         { label: 'Hilang',            className: 'bg-red-100 text-red-900 border border-red-300' },
}

export function ConditionBadge({ condition, className }: { condition: string; className?: string }) {
  const c = config[condition] ?? { label: condition, className: 'bg-muted text-foreground/80 border border-border' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', c.className, className)}>
      {c.label}
    </span>
  )
}
