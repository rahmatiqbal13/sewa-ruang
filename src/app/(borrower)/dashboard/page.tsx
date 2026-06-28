import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDateTime, formatRupiah, cn } from '@/lib/utils'
import {
  Plus,
  Building2,
  FileText,
  User,
  ArrowRight,
} from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'

interface BookingWithItems {
  id: string
  reference_no: string
  status: string
  start_datetime: string
  total_amount: number
  booking_items: Array<{
    item_type: 'room' | 'equipment'
    rooms: { name: string; room_code: string | null } | null
    equipment: { name: string; equipment_code: string | null } | null
  }>
}

export default async function BorrowerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div className="text-center py-8">Silakan login terlebih dahulu</div>
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Fetch bookings with items
  const [{ data: bookings }, { data: profile }] = await Promise.all([
    sb.from('bookings')
      .select(`
        id, 
        reference_no, 
        status, 
        start_datetime, 
        total_amount, 
        booking_items(
          item_type,
          rooms(name, room_code),
          equipment(name, equipment_code)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5) as Promise<{ data: BookingWithItems[] | null }>,
    sb.from('users')
      .select('name, institution, class_division, borrower_category')
      .eq('id', user.id)
      .maybeSingle() as Promise<{ data: { name: string; institution: string; class_division: string; borrower_category: string | null } | null }>,
  ])

  const pending = bookings?.filter(b => b.status === 'pending').length ?? 0
  const approved = bookings?.filter(b => ['approved', 'paid'].includes(b.status)).length ?? 0
  const completed = bookings?.filter(b => b.status === 'completed').length ?? 0

  // Find active booking: pending menunggu persetujuan, atau sudah approved/paid
  const activeBooking = bookings?.find(b => ['pending', 'approved', 'pending_payment', 'payment_uploaded', 'paid'].includes(b.status))

  // Get item name from booking
  function getItemName(booking: BookingWithItems): string {
    const items = booking.booking_items
    if (!items || items.length === 0) return 'Tidak ada item'

    const firstItem = items[0]
    if (firstItem.item_type === 'room' && firstItem.rooms) {
      return firstItem.rooms.name
    }
    if (firstItem.item_type === 'equipment' && firstItem.equipment) {
      return firstItem.equipment.name
    }
    return 'Item tidak diketahui'
  }



  const statusDotColor: Record<string, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-blue-500',
    paid: 'bg-emerald-500',
    completed: 'bg-gray-400',
    rejected: 'bg-red-500',
    cancelled: 'bg-gray-400',
  }

  return (
    <div className="space-y-5 p-4 md:p-6 pb-24">
      {/* Greeting Card */}
      <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-r from-[#0891B2] to-[#06b6d4] p-5 md:p-6">
        {/* Decorative circles */}
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute right-20 bottom-4 h-10 w-10 rounded-full bg-white/10" />

        <div className="relative z-10">
          <h2 className="text-lg font-bold text-white">
            Selamat datang, {profile?.name?.split(' ')[0]}
          </h2>
          <p className="mt-1 text-sm text-white/70">
            {profile?.institution}
          </p>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { href: '/booking/new', label: 'Ajukan Peminjaman', icon: Plus, color: 'bg-blue-500/10 text-blue-600' },
          { href: '/catalog', label: 'Katalog', icon: Building2, color: 'bg-purple-500/10 text-purple-600' },
          { href: '/bookings', label: 'Riwayat', icon: FileText, color: 'bg-green-500/10 text-green-600' },
          { href: '/profile', label: 'Profil', icon: User, color: 'bg-orange-500/10 text-orange-600' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-soft transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          >
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', action.color)}>
              <action.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#111827]">{action.label}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
          </Link>
        ))}
      </div>

      {/* Active Booking Card */}
      {activeBooking && (
        <div
          className={cn(
            'rounded-[14px] bg-white shadow-soft border-l-4 overflow-hidden',
            activeBooking.status === 'paid' ? 'border-l-[#10B981]' : 'border-l-[#F59E0B]'
          )}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-sm font-semibold text-[#0891B2]">
                {activeBooking.reference_no}
              </span>
              <StatusBadge status={activeBooking.status as unknown as "pending" | "approved" | "paid" | "completed" | "rejected" | "cancelled"} />
            </div>
            <h3 className="text-base font-semibold text-[#111827] mb-1">
              {getItemName(activeBooking)}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {formatDateTime(activeBooking.start_datetime)}
            </p>
            <Link
              href={`/bookings/${activeBooking.reference_no}`}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-[#0891B2] hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
            >
              Lihat Detail
            </Link>
          </div>
        </div>
      )}

      {/* Stat Cards Row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          title="Menunggu"
          value={pending}
          iconName="clock"
          color="orange"
        />
        <StatCard
          title="Disetujui"
          value={approved}
          iconName="calendar-days"
          color="blue"
        />
        <StatCard
          title="Selesai"
          value={completed}
          iconName="package"
          color="green"
        />
      </div>

      {/* Recent Bookings List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[#111827]">Pengajuan Terbaru</h3>
          <Link href="/bookings" className="text-xs font-medium text-[#0891B2] hover:underline">
            Lihat Semua
          </Link>
        </div>

        {bookings?.length === 0 ? (
          <EmptyState variant="bookings" actionHref="/booking/new" />
        ) : (
          <div className="space-y-2">
            {bookings?.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.reference_no}`}
                className="flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              >
                {/* Left: colored status dot */}
                <div
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full',
                    statusDotColor[booking.status] || 'bg-gray-400'
                  )}
                />

                {/* Center: asset name bold + ref DM Mono small + date */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#111827] truncate">
                    {getItemName(booking)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[11px] text-[#0891B2]">
                      {booking.reference_no}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(booking.start_datetime)}
                    </span>
                  </div>
                </div>

                {/* Right: StatusBadge component + amount */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={booking.status as unknown as "pending" | "approved" | "paid" | "completed" | "rejected" | "cancelled"} />
                  {booking.total_amount > 0 && (
                    <span className="text-xs font-semibold text-emerald-600 font-mono tabular-nums">
                      {formatRupiah(booking.total_amount)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
