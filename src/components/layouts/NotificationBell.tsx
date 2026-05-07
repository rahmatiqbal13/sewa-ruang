'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Bell, CalendarCheck, UserPlus, ChevronRight } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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
      <PopoverTrigger className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-all duration-200 group">
        <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 bg-gradient-to-br from-red-500 to-pink-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg shadow-red-500/30 animate-pulse">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 shadow-2xl shadow-slate-900/10 border-slate-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifikasi</p>
              <p className="text-xs text-slate-500">{count} aktivitas terbaru</p>
            </div>
          </div>
          <Link
            href="/admin/bookings"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Lihat semua
          </Link>
        </div>
        
        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Bell className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">Tidak ada notifikasi baru</p>
            </div>
          )}
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => { setOpen(false); router.push(item.href) }}
              className={cn(
                "flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-all duration-200 group",
                index !== items.length - 1 && "border-b border-slate-50"
              )}
            >
              <div className={cn(
                'mt-0.5 rounded-xl p-2.5 shrink-0',
                item.type === 'booking' 
                  ? 'bg-amber-100 text-amber-600 group-hover:bg-amber-200' 
                  : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200'
              )}>
                {item.type === 'booking'
                  ? <CalendarCheck className="h-4 w-4" />
                  : <UserPlus className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                <p className="text-sm text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  {formatDateTime(item.time)}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 mt-2 shrink-0 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
