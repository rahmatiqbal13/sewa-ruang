'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Building2, LayoutDashboard, Package, CalendarDays,
  CreditCard, RotateCcw, BarChart3, QrCode, Boxes,
  LogOut, Users, Settings, BellRing, DoorOpen,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Gedung', href: '/admin/buildings', icon: Building2 },
  { label: 'Ruangan', href: '/admin/rooms', icon: DoorOpen },
  { label: 'Aset', href: '/admin/assets', icon: Package },
  { label: 'Inventaris', href: '/admin/inventory', icon: Boxes },
  { label: 'Pengajuan', href: '/admin/bookings', icon: CalendarDays },
  { label: 'Pembayaran', href: '/admin/payments', icon: CreditCard },
  { label: 'Pengembalian', href: '/admin/returns', icon: RotateCcw },
  { label: 'QR Code', href: '/admin/qr', icon: QrCode },
  { label: 'Laporan', href: '/admin/reports', icon: BarChart3 },
  { label: 'Pengguna', href: '/admin/users', icon: Users },
  { label: 'Notifikasi', href: '/admin/notifications', icon: BellRing },
  { label: 'Pengaturan', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-zinc-900 text-zinc-100 shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-zinc-700">
        <Building2 className="h-6 w-6 text-primary" />
        <span className="font-bold text-sm leading-tight">Sewa Ruang & Alat</span>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-zinc-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  )
}
