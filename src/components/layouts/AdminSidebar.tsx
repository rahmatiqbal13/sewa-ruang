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
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'

type NavItem = { 
  label: string; 
  href: string; 
  icon: React.ElementType; 
}

const regularItems: NavItem[] = [
  { label: 'Dashboard',    href: '/admin/dashboard',     icon: LayoutDashboard },
  { label: 'Gedung',       href: '/admin/buildings',     icon: Building2 },
  { label: 'Ruangan',      href: '/admin/rooms',         icon: DoorOpen },
  { label: 'Alat',         href: '/admin/equipment',     icon: Package },
  { label: 'Inventaris',   href: '/admin/inventory',     icon: Boxes },
  { label: 'Pengajuan',    href: '/admin/bookings',      icon: CalendarDays },
  { label: 'Pembayaran',   href: '/admin/payments',      icon: CreditCard },
  { label: 'Pengembalian', href: '/admin/returns',       icon: RotateCcw },
  { label: 'QR Code',      href: '/admin/qr',            icon: QrCode },
  { label: 'Laporan',      href: '/admin/reports',       icon: BarChart3 },
  { label: 'Notifikasi',   href: '/admin/notifications', icon: BellRing },
  { label: 'Pengaturan',   href: '/admin/settings',      icon: Settings },
]

const superAdminItems: NavItem[] = [
  { label: 'Pengguna',     href: '/admin/users',         icon: Users },
]

export function AdminSidebar({ onClose, userRole }: { onClose?: () => void; userRole?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const isSuperAdmin = userRole === 'super_admin'
  const [isCollapsed, setIsCollapsed] = useState(false)

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
          'group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden',
          active
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )}
      >
        {/* Active Indicator */}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
        )}
        
        <item.icon className={cn(
          'h-5 w-5 shrink-0 transition-transform duration-200',
          active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500',
          'group-hover:scale-110'
        )} />
        
        <span className="flex-1">{item.label}</span>
        
        {active && (
          <ChevronRight className="h-4 w-4 text-white/70" />
        )}
      </Link>
    )
  }

  return (
    <aside className="flex flex-col h-full bg-white border-r border-slate-200/80">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-100">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-40" />
          <div className="relative h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Building2 className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg text-slate-900 leading-tight">RentSpace</span>
          <span className="text-xs text-slate-500">Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {/* Section Label */}
        <div className="px-4 mb-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Menu Utama
          </span>
        </div>
        
        {regularItems.map(item => <NavLink key={item.href} item={item} />)}

        {isSuperAdmin && (
          <>
            <div className="pt-4 pb-2">
              <div className="flex items-center gap-2 px-4 mb-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-500 flex items-center gap-1.5 bg-purple-50 px-2 py-1 rounded-full">
                  <ShieldCheck className="h-3 w-3" /> Super Admin
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              </div>
            </div>
            {superAdminItems.map(item => <NavLink key={item.href} item={item} />)}
          </>
        )}
      </nav>

      {/* Logout Section */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group"
        >
          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-red-100 transition-colors">
            <LogOut className="h-4 w-4 text-slate-500 group-hover:text-red-500 transition-colors" />
          </div>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  )
}
