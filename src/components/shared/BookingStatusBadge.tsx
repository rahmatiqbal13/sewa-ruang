import { Badge } from '@/components/ui/badge'

const STATUS = {
  pending: { label: 'Menunggu', variant: 'secondary' as const },
  approved: { label: 'Disetujui', variant: 'default' as const },
  rejected: { label: 'Ditolak', variant: 'destructive' as const },
  paid: { label: 'Lunas', variant: 'default' as const },
  completed: { label: 'Selesai', variant: 'outline' as const },
  cancelled: { label: 'Dibatalkan', variant: 'secondary' as const },
}

export function BookingStatusBadge({ status }: { status: string }) {
  const s = STATUS[status as keyof typeof STATUS] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}
