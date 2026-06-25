import { createAdminDbClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  BellRing,
  CalendarDays,
  UserPlus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  ArrowRight,
  Mail,
  CalendarCheck,
} from 'lucide-react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── Types ───────────────────────────────────────────────────────────────────

type FeedItem = {
  id: string
  type:
    | 'booking_new'
    | 'booking_pending'
    | 'booking_approved'
    | 'booking_rejected'
    | 'booking_completed'
    | 'user_new'
    | 'overdue'
    | 'returned'
  title: string
  description: string
  timestamp: string
  status?: string
  link: string
  meta?: Record<string, string>
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<
  FeedItem['type'],
  { icon: React.ElementType; color: string; bg: string; border: string }
> = {
  booking_new: {
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  booking_pending: {
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  booking_approved: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  booking_rejected: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  user_new: {
    icon: UserPlus,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  overdue: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  returned: {
    icon: Package,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  booking_completed: {
    icon: CalendarCheck,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
}

function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins} menit yang lalu`
  if (diffHours < 24) return `${diffHours} jam yang lalu`
  if (diffDays < 7) return `${diffDays} hari yang lalu`
  return formatDateTime(date)
}

function isRecent(date: string): boolean {
  const now = new Date()
  const then = new Date(date)
  const diffHours = (now.getTime() - then.getTime()) / 3600000
  return diffHours <= 24
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function NotificationInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const activeFilter = filter ?? 'all'

  const sb = createAdminDbClient()
  const now = new Date().toISOString()
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString()

  // ── Query 1: Recent bookings ──────────────────────────────────────────────
  const { data: recentBookings } = await sb
    .from('bookings')
    .select(
      'id, reference_no, status, purpose, start_datetime, end_datetime, created_at, total_amount, users!user_id(name, email, institution)'
    )
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(30)

  // ── Query 2: Pending bookings ─────────────────────────────────────────────
  const { data: pendingBookings } = await sb
    .from('bookings')
    .select(
      'id, reference_no, status, purpose, start_datetime, end_datetime, created_at, total_amount, users!user_id(name, email, institution)'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20)

  // ── Query 3: Approved / Paid bookings (recent) ────────────────────────────
  const { data: approvedBookings } = await sb
    .from('bookings')
    .select(
      'id, reference_no, status, purpose, start_datetime, end_datetime, created_at, total_amount, users!user_id(name, email, institution)'
    )
    .in('status', ['approved', 'paid'])
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(20)

  // ── Query 4: Rejected bookings (recent) ───────────────────────────────────
  const { data: rejectedBookings } = await sb
    .from('bookings')
    .select(
      'id, reference_no, status, purpose, start_datetime, end_datetime, created_at, total_amount, users!user_id(name, email, institution)'
    )
    .eq('status', 'rejected')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(20)

  // ── Query 5: New users ────────────────────────────────────────────────────
  const { data: newUsers } = await sb
    .from('users')
    .select(
      'id, name, email, institution, borrower_category, created_at'
    )
    .eq('role', 'borrower')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(15)

  // ── Query 6: Overdue bookings ─────────────────────────────────────────────
  const { data: overdueBookings } = await sb
    .from('bookings')
    .select(
      'id, reference_no, status, purpose, start_datetime, end_datetime, created_at, total_amount, users!user_id(name, email, institution)'
    )
    .lt('end_datetime', now)
    .in('status', ['approved', 'paid'])
    .order('end_datetime', { ascending: true })
    .limit(20)

  // ── Query 7: Recent returns ───────────────────────────────────────────────
  const { data: recentReturns } = await sb
    .from('returns')
    .select(
      'id, returned_at, condition, notes, booking_id, bookings!booking_id(end_datetime, reference_no, users!user_id(name, email, institution))'
    )
    .order('created_at', { ascending: false })
    .limit(20)

  // ── Query 8: Completed bookings ───────────────────────────────────────────
  const { data: completedBookings } = await sb
    .from('bookings')
    .select(
      'id, reference_no, status, purpose, start_datetime, end_datetime, created_at, total_amount, users!user_id(name, email, institution)'
    )
    .eq('status', 'completed')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(20)

  // ── Build feed ────────────────────────────────────────────────────────────
  const feed: FeedItem[] = []

  // Pendaftaran baru
  for (const u of (newUsers ?? []) as any[]) {
    feed.push({
      id: `user-${u.id}`,
      type: 'user_new',
      title: 'Pendaftaran Baru',
      description: `${u.name} — ${u.institution || 'Tanpa instansi'}`,
      timestamp: u.created_at,
      link: '/super-admin/users',
      meta: { kategori: u.borrower_category || '-' },
    })
  }

  // Peminjaman baru
  for (const b of (recentBookings ?? []) as any[]) {
    const user = (b.users ?? {}) as Record<string, string>
    feed.push({
      id: `booking-${b.id}`,
      type: 'booking_new',
      title: 'Peminjaman Baru',
      description: `${b.reference_no} — ${b.purpose} oleh ${user.name ?? 'Unknown'}`,
      timestamp: b.created_at,
      status: b.status,
      link: `/admin/bookings/${b.id}`,
      meta: { instansi: user.institution || '-', jumlah: b.total_amount?.toString() ?? '0' },
    })
  }

  // Pending
  for (const b of (pendingBookings ?? []) as any[]) {
    const user = (b.users ?? {}) as Record<string, string>
    feed.push({
      id: `pending-${b.id}`,
      type: 'booking_pending',
      title: 'Menunggu Persetujuan',
      description: `${b.reference_no} — ${b.purpose} oleh ${user.name ?? 'Unknown'}`,
      timestamp: b.created_at,
      status: b.status,
      link: `/admin/bookings/${b.id}`,
      meta: { instansi: user.institution || '-' },
    })
  }

  // Approved
  for (const b of (approvedBookings ?? []) as any[]) {
    const user = (b.users ?? {}) as Record<string, string>
    feed.push({
      id: `approved-${b.id}`,
      type: 'booking_approved',
      title: 'Peminjaman Disetujui',
      description: `${b.reference_no} — ${b.purpose} oleh ${user.name ?? 'Unknown'}`,
      timestamp: b.created_at,
      status: b.status,
      link: `/admin/bookings/${b.id}`,
      meta: { instansi: user.institution || '-' },
    })
  }

  // Rejected
  for (const b of (rejectedBookings ?? []) as any[]) {
    const user = (b.users ?? {}) as Record<string, string>
    feed.push({
      id: `rejected-${b.id}`,
      type: 'booking_rejected',
      title: 'Peminjaman Ditolak',
      description: `${b.reference_no} — ${b.purpose} oleh ${user.name ?? 'Unknown'}`,
      timestamp: b.created_at,
      status: b.status,
      link: `/admin/bookings/${b.id}`,
      meta: { instansi: user.institution || '-' },
    })
  }

  // Completed
  for (const b of (completedBookings ?? []) as any[]) {
    const user = (b.users ?? {}) as Record<string, string>
    feed.push({
      id: `completed-${b.id}`,
      type: 'booking_completed',
      title: 'Peminjaman Selesai',
      description: `${b.reference_no} — ${b.purpose} oleh ${user.name ?? 'Unknown'}`,
      timestamp: b.created_at,
      status: b.status,
      link: `/admin/bookings/${b.id}`,
      meta: { instansi: user.institution || '-' },
    })
  }

  // Overdue (belum direturn)
  const returnedBookingIds = new Set(
    ((recentReturns ?? []) as any[]).map((r: any) => r.booking_id)
  )
  for (const b of (overdueBookings ?? []) as any[]) {
    if (returnedBookingIds.has(b.id)) continue
    const user = (b.users ?? {}) as Record<string, string>
    feed.push({
      id: `overdue-${b.id}`,
      type: 'overdue',
      title: 'Keterlambatan Pengembalian',
      description: `${b.reference_no} — ${b.purpose} oleh ${user.name ?? 'Unknown'}`,
      timestamp: b.end_datetime,
      link: `/admin/bookings/${b.id}`,
      meta: { deadline: b.end_datetime, instansi: user.institution || '-' },
    })
  }

  // Returns terlambat
  for (const r of (recentReturns ?? []) as any[]) {
    const booking = r.bookings
    if (!booking) continue
    const end = new Date(booking.end_datetime)
    const returned = new Date(r.returned_at)
    if (returned > end) {
      const user = (booking.users ?? {}) as Record<string, string>
      feed.push({
        id: `return-${r.id}`,
        type: 'returned',
        title: 'Pengembalian Terlambat',
        description: `${booking.reference_no} — Dikembalikan ${formatDateTime(r.returned_at)} (Deadline: ${formatDateTime(booking.end_datetime)})`,
        timestamp: r.returned_at,
        link: `/admin/bookings/${r.booking_id}`,
        meta: { kondisi: r.condition, instansi: user.institution || '-' },
      })
    }
  }

  // Sort & deduplicate
  feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const seen = new Set<string>()
  const uniqueFeed = feed.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })

  // Apply filter
  const filtered =
    activeFilter === 'all'
      ? uniqueFeed
      : uniqueFeed.filter((item) => {
          if (activeFilter === 'booking') return item.type.startsWith('booking_')
          if (activeFilter === 'user') return item.type === 'user_new'
          if (activeFilter === 'overdue') return item.type === 'overdue' || item.type === 'returned'
          if (activeFilter === 'completed') return item.type === 'booking_completed'
          return true
        })

  // Counts
  const counts = {
    all: uniqueFeed.length,
    booking: uniqueFeed.filter((i) => i.type.startsWith('booking_')).length,
    user: uniqueFeed.filter((i) => i.type === 'user_new').length,
    overdue: uniqueFeed.filter((i) => i.type === 'overdue' || i.type === 'returned').length,
    completed: uniqueFeed.filter((i) => i.type === 'booking_completed').length,
  }

  // Recent count (24 jam) for header badge
  const recentCount = uniqueFeed.filter((i) => isRecent(i.timestamp)).length

  const filters = [
    { key: 'all', label: 'Semua', count: counts.all },
    { key: 'booking', label: 'Peminjaman', count: counts.booking },
    { key: 'user', label: 'Pendaftaran', count: counts.user },
    { key: 'overdue', label: 'Keterlambatan', count: counts.overdue },
    { key: 'completed', label: 'Selesai', count: counts.completed },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BellRing className="h-6 w-6 text-[#0891B2]" />
            Notifikasi
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pantau aktivitas sistem — peminjaman, pendaftaran, keterlambatan, dan selesai
          </p>
        </div>
        {recentCount > 0 && (
          <Badge className="bg-[#0891B2] hover:bg-[#0891B2] text-white">
            {recentCount} baru
          </Badge>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {filters.map((f) => {
          const active = activeFilter === f.key
          return (
            <Link
              key={f.key}
              href={`?filter=${f.key}`}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                active
                  ? 'border-blue-950 text-blue-950'
                  : 'border-transparent text-muted-foreground hover:text-foreground/80'
              )}
            >
              {f.label}
              <span
                className={cn(
                  'text-xs rounded-full px-2 py-0.5',
                  active
                    ? 'bg-blue-950 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {f.count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Feed list */}
      <Card className="border-border overflow-hidden">
        <CardContent className="divide-y p-0">
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <BellRing className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Tidak ada notifikasi untuk kategori ini
              </p>
            </div>
          )}

          {filtered.map((item) => {
            const meta = TYPE_META[item.type]
            const Icon = meta.icon
            const recent = isRecent(item.timestamp)

            return (
              <Link
                key={item.id}
                href={item.link}
                className="flex items-start gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group"
              >
                {/* Icon */}
                <div
                  className={cn(
                    'h-10 w-10 rounded-[10px] flex items-center justify-center shrink-0',
                    meta.bg,
                    meta.border,
                    'border'
                  )}
                >
                  <Icon className={cn('h-5 w-5', meta.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm text-foreground">
                      {item.title}
                    </p>
                    {recent && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-5 px-1.5 bg-[#0891B2]/10 text-[#0891B2] border-[#0891B2]/20"
                      >
                        Baru
                      </Badge>
                    )}
                    {item.status && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] h-5 capitalize',
                          item.status === 'pending' &&
                            'text-amber-600 border-amber-200 bg-amber-50',
                          item.status === 'approved' &&
                            'text-emerald-600 border-emerald-200 bg-emerald-50',
                          item.status === 'paid' &&
                            'text-emerald-600 border-emerald-200 bg-emerald-50',
                          item.status === 'rejected' &&
                            'text-red-600 border-red-200 bg-red-50'
                        )}
                      >
                        {item.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(item.timestamp)}
                    </span>
                    {item.meta?.instansi && item.meta.instansi !== '-' && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {item.meta.instansi}
                      </span>
                    )}
                    {item.meta?.jumlah && (
                      <span>Rp {Number(item.meta.jumlah).toLocaleString('id-ID')}</span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-2 group-hover:text-[#0891B2] transition-colors" />
              </Link>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
