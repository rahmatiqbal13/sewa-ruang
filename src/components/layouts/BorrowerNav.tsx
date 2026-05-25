'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Building2, Home, List, FileText, LogOut, User, ChevronDown } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface Props { userName: string; photoUrl?: string }

const navLinks = [
  { href: '/dashboard', icon: Home,     label: 'Beranda' },
  { href: '/catalog',   icon: List,     label: 'Katalog' },
  { href: '/bookings',  icon: FileText, label: 'Pengajuan' },
]

export function BorrowerNav({ userName, photoUrl }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Top navbar */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border md:shadow-sm md:shadow-black/5">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-2.5 font-semibold">
              <div className="h-8 w-8 bg-primary rounded-[10px] flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="hidden sm:inline text-sm text-foreground">Sewa Ruang &amp; Alat</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map(n => {
                const active = pathname === n.href || pathname.startsWith(n.href + '/')
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-sm font-medium transition-colors',
                      active
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <n.icon className="h-3.5 w-3.5" />
                    {n.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity rounded-[10px] px-2 py-1.5 hover:bg-muted outline-none">
              <Avatar className="h-8 w-8 rounded-[8px]">
                {photoUrl && <AvatarImage src={photoUrl} alt={userName} className="object-cover" />}
                <AvatarFallback className="text-xs font-bold text-white bg-primary rounded-[8px]">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium text-foreground">{userName}</span>
              <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-[12px]">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground">Peminjam</p>
              </div>
              <Link href="/profile">
                <DropdownMenuItem className="gap-2 cursor-pointer mt-1 text-sm rounded-[8px]">
                  <User className="h-3.5 w-3.5" /> Profil Saya
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} variant="destructive" className="gap-2 cursor-pointer text-sm rounded-[8px]">
                <LogOut className="h-3.5 w-3.5" /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile bottom tab navigation */}
      <nav className="bottom-nav">
        <div className="grid grid-cols-3 max-w-md mx-auto">
          {navLinks.map(n => {
            const active = pathname === n.href || pathname.startsWith(n.href + '/')
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'bottom-nav-item',
                  active ? 'bottom-nav-item-active' : 'bottom-nav-item-inactive'
                )}
              >
                <n.icon className={cn('h-5 w-5', active ? 'stroke-[2.5]' : 'stroke-[1.5]')} />
                {n.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom spacer for mobile */}
      <div className="md:hidden h-14" />
    </>
  )
}
