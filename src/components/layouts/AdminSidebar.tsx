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
  ChevronRight, Database, FileText, Trash2, Scan
} from 'lucide-react'
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
  { label: 'Scan QR',             href: '/admin/scan',             icon: Scan },
  { label: 'Laporan',             href: '/admin/reports',          icon: BarChart3 },
  { label: 'Notifikasi',          href: '/admin/notifications',    icon: BellRing },
  { label: 'Pengaturan',          href: '/admin/settings',         icon: Settings },
]

const superAdminMenuItems: NavItem[] = [
  { label: 'Kelola Pengguna', href: '/super-admin/users',     icon: Users,     superAdminOnly: true },
  { label: 'Database',        href: '/super-admin/database',  icon: Database,  superAdminOnly: true },
  { label: 'System Logs',     href: '/super-admin/logs',      icon: FileText,  superAdminOnly: true },
  { label: 'Trash/Recycle',   href: '/super-admin/trash',     icon: Trash2,    superAdminOnly: true },
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
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

    if (item.superAdminOnly && !userIsSuperAdmin) return null

    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-200 overflow-hidden cursor-pointer',
          isActive
            ? 'bg-blue-600/15 text-blue-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
          item.superAdminOnly && !isActive && 'border-l-2 border-indigo-400 pl-[10px]'
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-600 rounded-r-full" />
        )}

        <item.icon className={cn(
          'h-4 w-4 shrink-0 transition-colors duration-200',
          isActive ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-600',
          item.superAdminOnly && !isActive && 'text-indigo-500'
        )} />

        <span className="flex-1">{item.label}</span>

        {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-400" />}
        {item.superAdminOnly && <ShieldCheck className="h-3 w-3 text-indigo-400" />}
      </Link>
    )
  }

  const displayName = institution?.short_name || institution?.name || 'RentSpace'

  return (
    <aside className="flex flex-col h-full bg-slate-900" suppressHydrationWarning>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0 border-b border-slate-700/50">
        {institution?.logo_url ? (
          <SafeImage
            src={institution.logo_url}
            alt={institution.name}
            className="h-9 w-auto rounded-[10px]"
            fallback={
              <div className="h-9 w-9 rounded-[10px] flex items-center justify-center bg-blue-500/20 border border-slate-600">
                <Building2 className="h-4 w-4 text-slate-300" />
              </div>
            }
          />
        ) : (
          <div className="h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0 bg-blue-500/20 border border-slate-600">
            <Building2 className="h-4 w-4 text-slate-300" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-semibold text-white leading-tight truncate max-w-[148px]">{displayName}</p>
          <p className="text-[11px] text-slate-400 tracking-wide mt-0.5">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 overflow-y-auto space-y-px"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
      >
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Menu Utama
        </p>

        {mainMenuItems.map(item => <NavLink key={item.href} item={item} />)}

        {userIsSuperAdmin && (
          <>
            <div className="pt-4 pb-2 px-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-md text-slate-400 bg-slate-800">
                  <ShieldCheck className="h-2.5 w-2.5" /> Super Admin
                </span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
            </div>
            {superAdminMenuItems.map(item => <NavLink key={item.href} item={item} />)}
          </>
        )}
      </nav>

      {/* Role badge */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          <ShieldCheck className="h-3 w-3" />
          {userIsSuperAdmin ? 'Super Administrator' : userRole === 'admin' ? 'Administrator' : 'Staff'}
        </div>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 px-3 py-2.5 w-full rounded-[10px] text-sm font-medium transition-all duration-200 cursor-pointer text-slate-400 hover:bg-red-500/10 hover:text-red-400"
        >
          <div className="h-7 w-7 rounded-[8px] flex items-center justify-center shrink-0 bg-slate-800">
            <LogOut className="h-3.5 w-3.5 text-slate-500 group-hover:text-red-400" />
          </div>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  )
}
