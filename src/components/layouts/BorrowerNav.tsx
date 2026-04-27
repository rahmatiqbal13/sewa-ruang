'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Building2, Home, List, LogOut, User } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Props { userName: string }

export function BorrowerNav({ userName }: Props) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary">
            <Building2 className="h-5 w-5" />
            <span className="hidden sm:inline">Sewa Ruang</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push('/dashboard')}>
              <Home className="h-4 w-4" /> Dashboard
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push('/catalog')}>
              <List className="h-4 w-4" /> Katalog
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/bookings')}>
              Pengajuan Saya
            </Button>
          </nav>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity rounded-lg px-2 py-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium">{userName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/profile')} className="flex items-center gap-2 cursor-pointer">
              <User className="h-4 w-4" /> Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive" className="gap-2 cursor-pointer">
              <LogOut className="h-4 w-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
