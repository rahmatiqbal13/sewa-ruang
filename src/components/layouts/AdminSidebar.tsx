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
  ChevronRight, Database, FileText, Trash2
} from 'lucide-react'
import { useState } from 'react'
import { SafeImage } from '@/components/shared/SafeImage'
import { isSuperAdmin, UserRole } from '@/lib/permissions'

type NavItem = { 
  label: string; 
  href: string; 
  icon: React.ElementType;
  requiredRole?: UserRole[];
  superAdminOnly?: boolean;
}

interface InstitutionProfile {
  id?: string
  name: string
  short_name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  operating_hours: string | null
}

// Menu items with role requirements
const mainMenuItems: NavItem[] = [
  { label: 'Dashboard',           href: '/admin/dashboard',        icon: LayoutDashboard },
  { label: 'Gedung',              href: '/admin/buildings',        icon: Building2 },
  { label: 'Ruangan',             href: '/admin/rooms',            icon: DoorOpen },
  { label: 'Alat',                href: '/admin/equipment',        icon: Package },
  { label: 'Inventaris',          href: '/admin/inventory',        icon: Boxes },
  { label: 'Pengajuan',           href: '/admin/bookings',         icon: CalendarDays },
  { label: 'Pembayaran',          href: '/admin/payments',         icon: CreditCard },
  { label: 'Pengembalian',        href: '/admin/returns',          icon: RotateCcw },
  { label: 'QR Code',             href: '/admin/qr',               icon: QrCode },
  { label: 'Laporan',             href: '/admin/reports',          icon: BarChart3 },
  { label: 'Notifikasi',          href: '/admin/notifications',    icon: BellRing },
  { label: 'Pengaturan',          href: '/admin/settings',         icon: Settings },
]

// Super admin only menu items
const superAdminMenuItems: NavItem[] = [
  { label: 'Kelola Pengguna', href: '/admin/users', icon: Users, superAdminOnly: true },
  { label: 'Database',        href: '/admin/database', icon: Database, superAdminOnly: true },
  { label: 'System Logs',     href: '/admin/logs', icon: FileText, superAdminOnly: true },
  { label: 'Trash/Recycle',   href: '/admin/trash', icon: Trash2, superAdminOnly: true },
]

interface AdminSidebarProps {
  onClose?: () => void
  userRole?: string
  institution?: InstitutionProfile | null
}

export function AdminSidebar({ onClose, userRole, institution }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const userIsSuperAdmin = isSuperAdmin(userRole)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  function NavLink({ item }: { item: NavItem }) {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    
    // Check if item should be visible
    if (item.superAdminOnly && !userIsSuperAdmin) {
      return null
    }
    
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          'group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden',
          active
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
          item.superAdminOnly && 'border-l-2 border-purple-400'
        )}
      >
        {/* Active Indicator */}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
        )}
        
        <item.icon className={cn(
          'h-5 w-5 shrink-0 transition-transform duration-200',
          active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500',
          'group-hover:scale-110',
          item.superAdminOnly && !active && 'text-purple-500'
        )} />
        
        <span className="flex-1">{item.label}</span>
        
        {active && (
          <ChevronRight className="h-4 w-4 text-white/70" />
        )}
        
        {item.superAdminOnly && (
          <ShieldCheck className="h-3 w-3 text-purple-500" />
        )}
      </Link>
    )
  }

  const displayName = institution?.short_name || institution?.name || 'RentSpace'

  return (
    <aside className="flex flex-col h-full bg-white border-r border-slate-200/80">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-100">
        {institution?.logo_url ? (
          <SafeImage
            src={institution.logo_url}
            alt={institution.name}
            className="h-10 w-auto rounded-lg"
            fallback={
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-40" />
                <div className="relative h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
              </div>
            }
          />
        ) : (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-40" />
            <div className="relative h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
          </div>
        )}
        <div className="flex flex-col">
          <span className="font-bold text-lg text-slate-900 leading-tight truncate max-w-[140px]">{displayName}</span>
          <span className="text-xs text-slate-500">Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {/* Main Menu Section */}
        <div className="px-4 mb-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Menu Utama
          </span>
        </div>
        
        {mainMenuItems.map(item => <NavLink key={item.href} item={item} />)}

        {/* Super Admin Section */}
        {userIsSuperAdmin && (
          <>
            <div className="pt-6 pb-2">
              <div className="flex items-center gap-2 px-4 mb-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-600 flex items-center gap-1.5 bg-purple-100 px-3 py-1.5 rounded-full">
                  <ShieldCheck className="h-3 w-3" /> Super Admin
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent" />
              </div>
            </div>
            {superAdminMenuItems.map(item => <NavLink key={item.href} item={item} />)}
          </>
        )}
      </nav>

      {/* Role Badge */}
      <div className="px-4 py-2">
        <div className={cn(
          'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
          userIsSuperAdmin 
            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
            : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
        )}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {userIsSuperAdmin ? 'Super Administrator' : userRole === 'admin' ? 'Administrator' : 'Staff'}
        </div>
      </div>

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
