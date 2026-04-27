import { cn } from '@/lib/utils'

const config: Record<string, { label: string; className: string }> = {
  normal:         { label: 'Normal',         className: 'bg-blue-100 text-blue-800 border border-blue-200' },
  perawatan:      { label: 'Perawatan',      className: 'bg-amber-100 text-amber-800 border border-amber-200' },
  menunggu_part:  { label: 'Menunggu Part',  className: 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200' },
  afkir:          { label: 'Afkir',          className: 'bg-slate-100 text-slate-600 border border-slate-200' },
}

export function ActionStatusBadge({ status, className }: { status: string; className?: string }) {
  const c = config[status] ?? { label: status, className: 'bg-zinc-100 text-zinc-600 border border-zinc-200' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', c.className, className)}>
      {c.label}
    </span>
  )
}
