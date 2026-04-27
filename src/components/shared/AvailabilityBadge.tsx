import { cn } from '@/lib/utils'

const config: Record<string, { label: string; className: string }> = {
  tersedia: { label: 'Tersedia',  className: 'bg-green-100 text-green-800 border border-green-200' },
  digunakan: { label: 'Digunakan', className: 'bg-blue-100 text-blue-800 border border-blue-200' },
  hilang:    { label: 'Hilang',   className: 'bg-red-100 text-red-800 border border-red-200' },
}

export function AvailabilityBadge({ status, className }: { status: string; className?: string }) {
  const c = config[status] ?? { label: status, className: 'bg-zinc-100 text-zinc-600 border border-zinc-200' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', c.className, className)}>
      {c.label}
    </span>
  )
}
