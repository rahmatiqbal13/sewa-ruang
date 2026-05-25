import { cn } from '@/lib/utils'

const config: Record<string, { label: string; className: string }> = {
  tersedia: { label: 'Tersedia',  className: 'bg-emerald-100 text-emerald-900 border border-emerald-300' },
  digunakan: { label: 'Digunakan', className: 'bg-sky-100 text-sky-900 border border-sky-300' },
  hilang:    { label: 'Hilang',   className: 'bg-red-100 text-red-900 border border-red-300' },
}

export function AvailabilityBadge({ status, className }: { status: string; className?: string }) {
  const c = config[status] ?? { label: status, className: 'bg-muted text-foreground/80 border border-border' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', c.className, className)}>
      {c.label}
    </span>
  )
}
