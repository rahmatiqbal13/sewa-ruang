'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from './AdminSidebar'
import { NotificationBell } from './NotificationBell'
import { Building2, Menu, ChevronDown, Shield, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'

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

export function AdminShell({
  children,
  userName,
  userRole,
  photoUrl,
  institution,
}: {
  children: React.ReactNode
  userName?: string
  userRole?: string
  photoUrl?: string
  institution?: InstitutionProfile | null
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
  }

  const roleColor: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
    admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    staff: 'bg-blue-100 text-blue-700 border-blue-200',
  }

  const displayName = institution?.short_name || institution?.name || 'RentSpace'

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <AdminSidebar 
          onClose={() => setSidebarOpen(false)} 
          userRole={userRole}
          institution={institution}
        />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 lg:pl-72 min-w-0">

        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-16 bg-white border-b border-slate-200 text-slate-900 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 font-bold text-lg flex-1">
            {institution?.logo_url ? (
              <SafeImage
                src={institution.logo_url}
                alt={institution.name}
                className="h-8 w-auto"
                fallback={
                  <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                }
              />
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg blur opacity-40" />
                <div className="relative h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
            <span className="truncate">{displayName}</span>
          </div>
          <NotificationBell />
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 items-center justify-between px-8 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-slate-500 font-medium">Sistem aktif dan berjalan normal</span>
            </div>
            {institution && (
              <div className="h-4 w-px bg-slate-300 mx-2" />
            )}
            {institution && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span className="font-medium">{institution.name}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            
            {userName && (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                {photoUrl ? (
                  <SafeImage
                    src={photoUrl}
                    alt={userName}
                    className="h-10 w-10 rounded-xl object-cover border-2 border-slate-200"
                    fallback={
                      <div className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold border-2',
                        roleColor[userRole ?? ''] || 'bg-slate-100 text-slate-700 border-slate-200'
                      )}>
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    }
                  />
                ) : (
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold border-2',
                    roleColor[userRole ?? ''] || 'bg-slate-100 text-slate-700 border-slate-200'
                  )}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-right hidden xl:block">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{userName}</p>
                  <div className="flex items-center gap-1.5">
                    {userRole === 'super_admin' && <Shield className="h-3 w-3 text-purple-500" />}
                    <p className="text-xs text-slate-500">{roleLabel[userRole ?? ''] ?? userRole}</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 hidden xl:block" />
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
