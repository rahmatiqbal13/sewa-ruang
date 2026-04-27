'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Building2, Home, List, FileText, LogOut, User } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface Props { userName: string }

const mobileNav = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/catalog', icon: List, label: 'Katalog' },
  { href: '/bookings', icon: FileText, label: 'Pengajuan' },
]

export function BorrowerNav({ userName }: Props) {
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
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-2 font-bold text-blue-950">
              <div className="bg-blue-950 text-white p-1 rounded-md">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <span className="hidden sm:inline text-sm">Sewa Ruang</span>
            </Link>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {mobileNav.map(n => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    pathname === n.href || pathname.startsWith(n.href + '/')
                      ? 'bg-blue-50 text-blue-950'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity rounded-xl px-2 py-1.5 hover:bg-zinc-50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-950 text-white text-xs font-bold">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium text-zinc-700">{userName}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">Peminjam</p>
              </div>
              <DropdownMenuItem className="gap-2 cursor-pointer mt-1">
                <User className="h-4 w-4" /> Profil Saya
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} variant="destructive" className="gap-2 cursor-pointer">
                <LogOut className="h-4 w-4" /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t shadow-lg">
        <div className="grid grid-cols-3">
          {mobileNav.map(n => {
            const active = pathname === n.href || pathname.startsWith(n.href + '/')
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                  active ? 'text-blue-950' : 'text-zinc-400 hover:text-zinc-700'
                )}
              >
                <n.icon className={cn('h-5 w-5', active && 'stroke-2')} />
                {n.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom padding spacer for mobile (so content not hidden behind bottom nav) */}
      <div className="md:hidden h-16" />
    </>
  )
}
