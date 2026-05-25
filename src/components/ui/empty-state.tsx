import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  Inbox, Search, FileText, Package, Building2, 
  CalendarDays, Users, CreditCard, Bell
} from "lucide-react"

type EmptyStateVariant = 
  | 'default' 
  | 'search' 
  | 'bookings' 
  | 'equipment' 
  | 'rooms' 
  | 'payments' 
  | 'notifications'
  | 'users'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  className?: string
  minHeight?: boolean
}

const variantConfig: Record<EmptyStateVariant, {
  icon: React.ElementType
  defaultTitle: string
  defaultDescription: string
  defaultActionLabel?: string
  iconBgColor: string
  iconColor: string
}> = {
  default: {
    icon: Inbox,
    defaultTitle: 'Tidak ada data',
    defaultDescription: 'Belum ada data yang tersedia saat ini.',
    iconBgColor: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  search: {
    icon: Search,
    defaultTitle: 'Tidak ada hasil',
    defaultDescription: 'Pencarian tidak menemukan hasil yang cocok. Coba kata kunci lain.',
    iconBgColor: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  bookings: {
    icon: FileText,
    defaultTitle: 'Belum ada pengajuan',
    defaultDescription: 'Anda belum membuat pengajuan peminjaman.',
    defaultActionLabel: 'Ajukan Peminjaman',
    iconBgColor: 'bg-amber-50',
    iconColor: 'text-amber-500',
  },
  equipment: {
    icon: Package,
    defaultTitle: 'Belum ada peralatan',
    defaultDescription: 'Tidak ada peralatan yang terdaftar dalam sistem.',
    defaultActionLabel: 'Tambah Peralatan',
    iconBgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
  },
  rooms: {
    icon: Building2,
    defaultTitle: 'Belum ada ruangan',
    defaultDescription: 'Tidak ada ruangan yang terdaftar dalam sistem.',
    defaultActionLabel: 'Tambah Ruangan',
    iconBgColor: 'bg-sky-50',
    iconColor: 'text-sky-500',
  },
  payments: {
    icon: CreditCard,
    defaultTitle: 'Belum ada pembayaran',
    defaultDescription: 'Tidak ada transaksi pembayaran yang tercatat.',
    iconBgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
  },
  notifications: {
    icon: Bell,
    defaultTitle: 'Tidak ada notifikasi',
    defaultDescription: 'Anda tidak memiliki notifikasi saat ini.',
    iconBgColor: 'bg-violet-50',
    iconColor: 'text-violet-500',
  },
  users: {
    icon: Users,
    defaultTitle: 'Belum ada pengguna',
    defaultDescription: 'Tidak ada pengguna yang terdaftar dalam sistem.',
    iconBgColor: 'bg-rose-50',
    iconColor: 'text-rose-500',
  },
}

export function EmptyState({
  variant = 'default',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  minHeight = true,
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  const displayTitle = title || config.defaultTitle
  const displayDescription = description || config.defaultDescription
  const displayActionLabel = actionLabel || config.defaultActionLabel

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-4 py-12',
        minHeight && 'min-h-[320px]',
        className
      )}
    >
      {/* Illustration */}
      <div className={cn('h-20 w-20 rounded-[16px] flex items-center justify-center mb-5', config.iconBgColor)}>
        <Icon className={cn('h-10 w-10', config.iconColor)} strokeWidth={1.5} />
      </div>

      {/* Decorative elements */}
      <div className="relative mb-4">
        <div className="absolute -top-8 -left-12 h-2 w-2 rounded-full bg-border" />
        <div className="absolute -top-4 -right-10 h-3 w-3 rounded-full bg-border/60" />
        <div className="absolute top-2 -left-16 h-1.5 w-1.5 rounded-full bg-border/40" />
        <div className="absolute -top-6 right-14 h-2 w-2 rounded-full bg-border/50" />
      </div>

      {/* Text content */}
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        {displayTitle}
      </h3>
      <p className="text-sm text-muted-foreground max-w-[280px] mb-5 leading-relaxed">
        {displayDescription}
      </p>

      {/* CTA Button */}
      {displayActionLabel && (actionHref || onAction) && (
        <>
          {actionHref ? (
            <Link href={actionHref}>
              <Button 
                size="sm" 
                className="h-9 px-4 rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                {displayActionLabel}
              </Button>
            </Link>
          ) : (
            <Button 
              size="sm" 
              onClick={onAction}
              className="h-9 px-4 rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              {displayActionLabel}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

export function EmptyStateCard({
  variant = 'default',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('bg-card rounded-[14px] border border-border', className)}>
      <EmptyState
        variant={variant}
        title={title}
        description={description}
        actionLabel={actionLabel}
        actionHref={actionHref}
        onAction={onAction}
        minHeight={false}
      />
    </div>
  )
}
