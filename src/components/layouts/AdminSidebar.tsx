'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Building2, LayoutDashboard, Package, CalendarDays,
  CreditCard, RotateCcw, BarChart3, QrCode, Boxes,
  LogOut, Users, Settings, BellRing, DoorOpen, ShieldCheck,
} from 'lucide-react'

type NavItem = { label: string; href: string; icon: React.ElementType; color: string }

const regularItems: NavItem[] = [
  { label: 'Dashboard',    href: '/admin/dashboard',     icon: LayoutDashboard, color: 'text-blue-400' },
  { label: 'Gedung',       href: '/admin/buildings',     icon: Building2,       color: 'text-orange-400' },
  { label: 'Ruangan',      href: '/admin/rooms',         icon: DoorOpen,        color: 'text-purple-400' },
  { label: 'Alat',         href: '/admin/assets',        icon: Package,         color: 'text-green-400' },
  { label: 'Inventaris',   href: '/admin/inventory',     icon: Boxes,           color: 'text-teal-400' },
  { label: 'Pengajuan',    href: '/admin/bookings',      icon: CalendarDays,    color: 'text-amber-400' },
  { label: 'Pembayaran',   href: '/admin/payments',      icon: CreditCard,      color: 'text-emerald-400' },
  { label: 'Pengembalian', href: '/admin/returns',       icon: RotateCcw,       color: 'text-rose-400' },
  { label: 'QR Code',      href: '/admin/qr',            icon: QrCode,          color: 'text-violet-400' },
  { label: 'Laporan',      href: '/admin/reports',       icon: BarChart3,       color: 'text-sky-400' },
  { label: 'Notifikasi',   href: '/admin/notifications', icon: BellRing,        color: 'text-red-400' },
  { label: 'Pengaturan',   href: '/admin/settings',      icon: Settings,        color: 'text-zinc-400' },
]

const superAdminItems: NavItem[] = [
  { label: 'Pengguna',     href: '/admin/users',         icon: Users,           color: 'text-indigo-400' },
]

export function AdminSidebar({ onClose, userRole }: { onClose?: () => void; userRole?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const isSuperAdmin = userRole === 'super_admin'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  function NavLink({ item }: { item: NavItem }) {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-blue-300 hover:text-white hover:bg-blue-800/60'
        )}
      >
        <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : item.color)} />
        {item.label}
      </Link>
    )
  }

  return (
    <aside className="flex flex-col h-full bg-blue-950 text-blue-100">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-blue-800">
        <Building2 className="h-6 w-6 text-blue-300" />
        <span className="font-bold text-sm leading-tight text-white">Sewa Ruang & Alat</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {regularItems.map(item => <NavLink key={item.href} item={item} />)}

        {isSuperAdmin && (
          <>
            <div className="pt-4 pb-1">
              <div className="flex items-center gap-2 px-3 mb-1">
                <div className="flex-1 h-px bg-blue-800/70" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-500 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Super Admin
                </span>
                <div className="flex-1 h-px bg-blue-800/70" />
              </div>
            </div>
            {superAdminItems.map(item => <NavLink key={item.href} item={item} />)}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-blue-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-blue-300 hover:text-white hover:bg-blue-800/60 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  )
}
