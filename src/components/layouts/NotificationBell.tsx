'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Bell, CalendarCheck, UserPlus, ChevronRight } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface NotifItem {
  id: string
  type: 'booking' | 'registration'
  title: string
  subtitle: string
  time: string
  href: string
}

export function NotificationBell() {
  const [items, setItems] = useState<NotifItem[]>([])
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetchActivity() {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const [{ data: bookings }, { data: newUsers }] = await Promise.all([
        sb.from('bookings')
          .select('id, reference_no, created_at, status, users(name), booking_assets(assets(name))')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(8),
        sb.from('users')
          .select('id, name, created_at')
          .eq('role', 'borrower')
          .gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString())
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const notifs: NotifItem[] = []

      for (const b of (bookings ?? [])) {
        const assetName = (b.booking_assets?.[0]?.assets?.name as string) ?? 'aset'
        notifs.push({
          id: `b-${b.id}`,
          type: 'booking',
          title: `Pengajuan baru — ${b.reference_no}`,
          subtitle: `${(b.users as {name:string}|null)?.name ?? 'Peminjam'} · ${assetName}`,
          time: b.created_at,
          href: `/admin/bookings/${b.id}`,
        })
      }

      for (const u of (newUsers ?? [])) {
        notifs.push({
          id: `u-${u.id}`,
          type: 'registration',
          title: `Member baru mendaftar`,
          subtitle: u.name,
          time: u.created_at,
          href: `/admin/users`,
        })
      }

      notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setItems(notifs.slice(0, 10))
    }

    fetchActivity()
  }, [])

  const count = items.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="relative p-2 rounded-lg hover:bg-zinc-100 transition-colors">
        <Bell className="h-5 w-5 text-zinc-600" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-zinc-50">
          <p className="text-sm font-semibold text-zinc-800">Aktivitas Terbaru</p>
          <Link
            href="/admin/bookings"
            onClick={() => setOpen(false)}
            className="text-xs text-blue-600 hover:underline"
          >
            Lihat semua
          </Link>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y">
          {items.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada aktivitas terbaru
            </div>
          )}
          {items.map(item => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => { setOpen(false); router.push(item.href) }}
              className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors"
            >
              <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${item.type === 'booking' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                {item.type === 'booking'
                  ? <CalendarCheck className="h-3.5 w-3.5" />
                  : <UserPlus className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-800 truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{formatDateTime(item.time)}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-300 mt-1 shrink-0" />
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
