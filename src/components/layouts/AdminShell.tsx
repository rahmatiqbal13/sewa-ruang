'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from './AdminSidebar'
import { NotificationBell } from './NotificationBell'
import { Building2, Menu, ChevronDown, Shield, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SafeImage } from '@/components/shared/SafeImage'
import { CreditFooter } from '@/components/shared/CreditFooter'

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
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const pathname = usePathname()

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  // Swipe gesture for sidebar
  const minSwipeDistance = 50

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    // Swipe right from left edge (0-30px) opens sidebar
    if (isRightSwipe && touchStart < 30 && !sidebarOpen) {
      setSidebarOpen(true)
    }
    // Swipe left closes sidebar
    if (isLeftSwipe && sidebarOpen) {
      setSidebarOpen(false)
    }
  }, [touchStart, touchEnd, sidebarOpen])

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
  }

  const roleColor: Record<string, string> = {
    super_admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    admin: 'bg-sky-100 text-sky-700 border-sky-200',
    staff: 'bg-muted text-muted-foreground border-border',
  }

  const displayName = institution?.short_name || institution?.name || 'RentSpace'

  return (
    <div 
      className="flex min-h-screen bg-slate-50"
      suppressHydrationWarning
      data-hydration-id="admin-shell"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
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
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-16 bg-card border-b border-border shrink-0"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-[10px] hover:bg-muted transition-colors"
            aria-label="Buka menu navigasi"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 font-semibold text-base flex-1 text-foreground">
            {institution?.logo_url ? (
              <SafeImage
                src={institution.logo_url}
                alt={institution.name}
                className="h-8 w-auto"
                fallback={
                  <div className="h-8 w-8 bg-primary rounded-[10px] flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                }
              />
            ) : (
              <div className="h-8 w-8 bg-primary rounded-[10px] flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="truncate">{displayName}</span>
          </div>
          <NotificationBell />
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 items-center justify-between px-8 h-14 bg-card border-b border-border shrink-0"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-muted-foreground font-medium">Sistem aktif</span>
            </div>
            {institution && (
              <div className="h-4 w-px bg-border mx-2" />
            )}
            {institution && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="font-medium text-foreground/80">{institution.name}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            
            {userName && (
              <div className="flex items-center gap-3 pl-4 border-l border-border">
                {photoUrl ? (
                  <SafeImage
                    src={photoUrl}
                    alt={userName}
                    className="h-9 w-9 rounded-[10px] object-cover border border-border"
                    fallback={
                      <div className={cn(
                        'h-9 w-9 rounded-[10px] flex items-center justify-center text-sm font-bold border',
                        roleColor[userRole ?? ''] || 'bg-muted text-foreground border-border'
                      )}>
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    }
                  />
                ) : (
                  <div className={cn(
                    'h-9 w-9 rounded-[10px] flex items-center justify-center text-sm font-bold border',
                    roleColor[userRole ?? ''] || 'bg-muted text-foreground border-border'
                  )}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-right hidden xl:block">
                  <p className="text-sm font-semibold text-foreground leading-tight">{userName}</p>
                  <div className="flex items-center gap-1.5">
                    {userRole === 'super_admin' && <Shield className="h-3 w-3 text-indigo-500" />}
                    <p className="text-xs text-muted-foreground">{roleLabel[userRole ?? ''] ?? userRole}</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden xl:block" />
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
          <CreditFooter />
        </main>
      </div>
    </div>
  )
}
