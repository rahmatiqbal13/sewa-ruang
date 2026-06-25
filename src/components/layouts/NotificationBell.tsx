'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Bell, CalendarCheck, UserPlus, ChevronRight,
  Clock, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useNotifications } from './NotificationContext'

type NotifType = 'overdue' | 'due' | 'booking' | 'registration'

interface NotifItem {
  id: string
  type: NotifType
  title: string
  subtitle: string
  time: string
  href: string
}

// Visual config per type
const TYPE_CFG = {
  overdue: {
    label: 'Telat Kembali',
    Icon: AlertTriangle,
    iconBg: 'bg-red-100 group-hover:bg-red-200',
    iconText: 'text-red-600',
    dot: 'bg-red-500',
  },
  due: {
    label: 'Jatuh Tempo',
    Icon: Clock,
    iconBg: 'bg-orange-100 group-hover:bg-orange-200',
    iconText: 'text-orange-600',
    dot: 'bg-orange-400',
  },
  booking: {
    label: 'Pengajuan Baru',
    Icon: CalendarCheck,
    iconBg: 'bg-amber-100 group-hover:bg-amber-200',
    iconText: 'text-amber-600',
    dot: 'bg-amber-400',
  },
  registration: {
    label: 'Member Baru',
    Icon: UserPlus,
    iconBg: 'bg-emerald-100 group-hover:bg-emerald-200',
    iconText: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
} satisfies Record<NotifType, {
  label: string
  Icon: React.ElementType
  iconBg: string
  iconText: string
  dot: string
}>

// Overdue → top priority, registration → lowest
const PRIORITY: Record<NotifType, number> = {
  overdue: 0, due: 1, booking: 2, registration: 3,
}

const ACTIVE_STATUSES = ['approved', 'paid']

export function NotificationBell() {
  const [items, setItems] = useState<NotifItem[]>([])
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const { seenIds, markAllSeen, setItemIds } = useNotifications()

  const fetchActivity = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = createClient() as any
      const now = new Date()
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const week = new Date(now.getTime() - 7 * 86_400_000)

      const ITEM_SELECT = 'booking_items(item_type, rooms:room_id(name), equipment:equipment_id(name))'

      const [
        { data: overdueRows },
        { data: dueRows },
        { data: newBookingRows },
        { data: newUserRows },
      ] = await Promise.all([
        // Overdue: past end_datetime, still active (not returned)
        sb.from('bookings')
          .select(`id, reference_no, end_datetime, users!user_id(name), ${ITEM_SELECT}`)
          .in('status', ACTIVE_STATUSES)
          .lt('end_datetime', now.toISOString())
          .order('end_datetime', { ascending: true })
          .limit(5),

        // Due within 24 hours
        sb.from('bookings')
          .select(`id, reference_no, end_datetime, users!user_id(name), ${ITEM_SELECT}`)
          .in('status', ACTIVE_STATUSES)
          .gte('end_datetime', now.toISOString())
          .lte('end_datetime', in24h.toISOString())
          .order('end_datetime', { ascending: true })
          .limit(5),

        // New booking requests (pending approval)
        sb.from('bookings')
          .select(`id, reference_no, created_at, users!user_id(name), ${ITEM_SELECT}`)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),

        // New member registrations (last 7 days)
        sb.from('users')
          .select('id, name, created_at')
          .eq('role', 'borrower')
          .gte('created_at', week.toISOString())
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      const notifs: NotifItem[] = []

      // Overdue returns
      for (const b of (overdueRows ?? [])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const first = (b.booking_items as any[])?.[0]
        const assetName = (first?.item_type === 'room' ? first?.rooms?.name : first?.equipment?.name) ?? 'aset'
        const daysLate = Math.floor((now.getTime() - new Date(b.end_datetime).getTime()) / 86_400_000)
        notifs.push({
          id: `ov-${b.id}`,
          type: 'overdue',
          title: `Telat pengembalian — ${b.reference_no}`,
          subtitle: `${b.users?.name ?? 'Peminjam'} · ${assetName} · ${
            daysLate >= 1 ? `${daysLate} hari telat` : 'jatuh tempo hari ini'
          }`,
          time: b.end_datetime,
          href: `/admin/bookings/${b.id}`,
        })
      }

      // Due soon
      for (const b of (dueRows ?? [])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const first = (b.booking_items as any[])?.[0]
        const assetName = (first?.item_type === 'room' ? first?.rooms?.name : first?.equipment?.name) ?? 'aset'
        const hoursLeft = Math.ceil((new Date(b.end_datetime).getTime() - now.getTime()) / 3_600_000)
        notifs.push({
          id: `due-${b.id}`,
          type: 'due',
          title: `Jatuh tempo — ${b.reference_no}`,
          subtitle: `${b.users?.name ?? 'Peminjam'} · ${assetName} · ${
            hoursLeft <= 1 ? 'kurang dari 1 jam' : `${hoursLeft} jam lagi`
          }`,
          time: b.end_datetime,
          href: `/admin/bookings/${b.id}`,
        })
      }

      // New booking requests
      for (const b of (newBookingRows ?? [])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const first = (b.booking_items as any[])?.[0]
        const assetName = (first?.item_type === 'room' ? first?.rooms?.name : first?.equipment?.name) ?? 'aset'
        notifs.push({
          id: `bk-${b.id}`,
          type: 'booking',
          title: `Pengajuan baru — ${b.reference_no}`,
          subtitle: `${b.users?.name ?? 'Peminjam'} · ${assetName}`,
          time: b.created_at,
          href: `/admin/bookings/${b.id}`,
        })
      }

      // New registrations
      for (const u of (newUserRows ?? [])) {
        notifs.push({
          id: `u-${u.id}`,
          type: 'registration',
          title: 'Member baru mendaftar',
          subtitle: u.name,
          time: u.created_at,
          href: '/admin/users',
        })
      }

      // Sort: by priority first, then by urgency within same type
      notifs.sort((a, b) => {
        const diff = PRIORITY[a.type] - PRIORITY[b.type]
        if (diff !== 0) return diff
        // overdue/due: oldest deadline first (most urgent)
        if (a.type === 'overdue' || a.type === 'due') {
          return new Date(a.time).getTime() - new Date(b.time).getTime()
        }
        // others: newest first
        return new Date(b.time).getTime() - new Date(a.time).getTime()
      })

      const sliced = notifs.slice(0, 12)
      setItems(sliced)
      setItemIds(sliced.map(i => i.id))
    } catch {
      // silently ignore
    }
  }, [setItemIds])

  useEffect(() => {
    const timeout = setTimeout(() => fetchActivity(), 0)
    return () => clearTimeout(timeout)
  }, [fetchActivity])

  // Mark all as seen when popover opens
  useEffect(() => {
    if (!open || items.length === 0) return
    const timeout = setTimeout(() => {
      markAllSeen(items.map(i => i.id))
    }, 300)
    return () => clearTimeout(timeout)
  }, [open, items, markAllSeen])

  // Re-fetch every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchActivity, 60000)
    return () => clearInterval(interval)
  }, [fetchActivity])

  const unreadItems = items.filter(i => !seenIds.has(i.id))
  const unreadCount = unreadItems.length

  const overdueCount  = items.filter(i => i.type === 'overdue').length
  const dueCount      = items.filter(i => i.type === 'due').length
  const bookingCount  = items.filter(i => i.type === 'booking').length
  const totalCount    = items.length

  const unreadOverdue = unreadItems.filter(i => i.type === 'overdue').length
  const unreadDue     = unreadItems.filter(i => i.type === 'due').length

  // Badge color reflects highest urgency among unread items
  const badgeCls = unreadOverdue > 0
    ? 'from-red-500 to-red-600 shadow-red-500/30'
    : unreadDue > 0
      ? 'from-orange-400 to-orange-500 shadow-orange-400/30'
      : 'from-red-500 to-pink-600 shadow-red-500/30'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={`relative p-2.5 rounded-[14px] hover:bg-muted transition-all duration-200 group ${unreadOverdue > 0 ? 'text-red-500' : 'text-muted-foreground/70 hover:text-muted-foreground'}`}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[20px] h-5 bg-gradient-to-br text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg animate-pulse',
            badgeCls
          )}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[420px] p-0 shadow-2xl shadow-foreground/10 border-border rounded-[14px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-gradient-to-r from-muted to-card">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Notifikasi</p>
              <div className="flex items-center gap-2 flex-wrap">
                {overdueCount > 0 && (
                  <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                    {overdueCount} telat kembali
                  </span>
                )}
                {dueCount > 0 && (
                  <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                    {dueCount} jatuh tempo
                  </span>
                )}
                {bookingCount > 0 && (
                  <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    {bookingCount} pengajuan
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchActivity}
              className="p-1.5 rounded-[10px] hover:bg-muted text-muted-foreground/70 hover:text-muted-foreground transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <Link
              href="/admin/notifications/inbox"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-muted">
          {items.length === 0 && (
            <div className="py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground/70">Semua aman</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Tidak ada notifikasi saat ini</p>
            </div>
          )}

          {items.map((item) => {
            const cfg = TYPE_CFG[item.type]
            const Icon = cfg.Icon
            const isUnread = !seenIds.has(item.id)
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => { setOpen(false); router.push(item.href) }}
                className="flex items-start gap-4 px-5 py-3.5 hover:bg-muted transition-all duration-200 group"
              >
                {/* Left dot indicator */}
                <div className="mt-1.5 shrink-0">
                  <div className={cn('w-2 h-2 rounded-full', isUnread ? cfg.dot : 'bg-transparent')} />
                </div>

                {/* Icon */}
                <div className={cn(
                  'mt-0.5 rounded-[14px] p-2.5 shrink-0 transition-colors',
                  cfg.iconBg,
                )}>
                  <Icon className={cn('h-4 w-4', cfg.iconText)} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      item.type === 'overdue' && 'bg-red-100 text-red-700',
                      item.type === 'due'     && 'bg-orange-100 text-orange-700',
                      item.type === 'booking' && 'bg-amber-100 text-amber-700',
                      item.type === 'registration' && 'bg-emerald-100 text-emerald-700',
                    )}>
                      {cfg.label}
                    </span>
                    {isUnread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{item.subtitle}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {item.type === 'overdue' || item.type === 'due'
                      ? `Batas: ${formatDateTime(item.time)}`
                      : formatDateTime(item.time)
                    }
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-2 shrink-0 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            )
          })}
        </div>

        {/* Footer summary */}
        {items.length > 0 && (
          <div className="px-5 py-3 border-t border-border/60 bg-muted flex items-center justify-between">
            <p className="text-xs text-muted-foreground/70">{totalCount} total notifikasi</p>
            {overdueCount > 0 && (
              <Link
                href="/admin/returns"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Lihat pengembalian →
              </Link>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
