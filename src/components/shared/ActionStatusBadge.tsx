import { cn } from '@/lib/utils'

const config: Record<string, { label: string; className: string }> = {
  normal:         { label: 'Normal',         className: 'bg-sky-100 text-sky-900 border border-sky-300' },
  perawatan:      { label: 'Perawatan',      className: 'bg-amber-100 text-amber-900 border border-amber-300' },
  menunggu_part:  { label: 'Menunggu Part',  className: 'bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300' },
  afkir:          { label: 'Afkir',          className: 'bg-muted text-foreground/80 border border-border' },
}

export function ActionStatusBadge({ status, className }: { status: string; className?: string }) {
  const c = config[status] ?? { label: status, className: 'bg-muted text-foreground/80 border border-border' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', c.className, className)}>
      {c.label}
    </span>
  )
}
