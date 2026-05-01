'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from './AdminSidebar'
import { NotificationBell } from './NotificationBell'
import { Building2, Menu } from 'lucide-react'

export function AdminShell({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode
  userName?: string
  userRole?: string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <AdminSidebar onClose={() => setSidebarOpen(false)} userRole={userRole} />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 lg:pl-64 min-w-0">

        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-10 flex items-center gap-3 px-4 h-14 bg-blue-950 text-white shrink-0 shadow-md">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 font-bold text-sm flex-1">
            <Building2 className="h-4 w-4 text-blue-300" />
            Sewa Ruang & Alat
          </div>
          <NotificationBell />
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-10 items-center justify-between px-6 h-14 bg-white border-b border-zinc-200 shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-sm text-zinc-500">Sistem aktif</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            {userName && (
              <div className="flex items-center gap-2 pl-3 border-l border-zinc-200">
                <div className="h-8 w-8 rounded-full bg-blue-950 text-white text-xs font-bold flex items-center justify-center">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="text-right hidden xl:block">
                  <p className="text-sm font-medium text-zinc-800 leading-tight">{userName}</p>
                  <p className="text-xs text-zinc-400">{roleLabel[userRole ?? ''] ?? userRole}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
