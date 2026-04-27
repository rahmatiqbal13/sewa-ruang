import { cn } from '@/lib/utils'

const config: Record<string, { label: string; className: string }> = {
  good:         { label: 'Baik',          className: 'bg-green-100 text-green-800 border border-green-200' },
  needs_repair: { label: 'Rusak Ringan',  className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  damaged:      { label: 'Rusak Berat',   className: 'bg-red-100 text-red-800 border border-red-200' },
  lost:         { label: 'Hilang',        className: 'bg-red-100 text-red-800 border border-red-200' },
}

export function ConditionBadge({ condition, className }: { condition: string; className?: string }) {
  const c = config[condition] ?? { label: condition, className: 'bg-zinc-100 text-zinc-600 border border-zinc-200' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', c.className, className)}>
      {c.label}
    </span>
  )
}
