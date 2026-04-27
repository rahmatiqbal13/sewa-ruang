'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Loader2, CalendarDays, QrCode, Shield } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
    if (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'Email atau password salah' : error.message)
      setLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase.from('users') as any)
        .select('role').eq('id', user.id).single() as { data: { role: string } | null }
      router.push(profile?.role === 'admin' || profile?.role === 'staff' ? '/admin/dashboard' : '/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col w-[480px] shrink-0 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full translate-y-48 -translate-x-48" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-16">
            <div className="bg-white/20 p-2 rounded-xl">
              <Building2 className="h-5 w-5" />
            </div>
            Sewa Ruang & Alat
          </Link>

          <h2 className="text-3xl font-bold mb-3 leading-tight">Kelola Aset Institusi dengan Mudah</h2>
          <p className="text-blue-200 mb-12 leading-relaxed">
            Platform digital untuk peminjaman ruangan dan peralatan secara terpusat, transparan, dan efisien.
          </p>

          <div className="space-y-5">
            {[
              { icon: CalendarDays, title: 'Pengajuan Online', desc: 'Ajukan dan pantau status peminjaman kapan saja' },
              { icon: QrCode, title: 'QR Code per Aset', desc: 'Identifikasi cepat setiap ruangan dan peralatan' },
              { icon: Shield, title: 'Perjanjian Digital', desc: 'Dokumentasi tanggung jawab peminjaman otomatis' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{f.title}</p>
                  <p className="text-blue-300 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 mt-auto text-blue-400 text-xs">
          &copy; {new Date().getFullYear()} Sistem Sewa Ruang & Alat
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-zinc-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 font-bold text-blue-950 mb-8 justify-center">
            <div className="bg-blue-950 text-white p-1.5 rounded-lg">
              <Building2 className="h-4 w-4" />
            </div>
            Sewa Ruang & Alat
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-8">
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">Selamat Datang</h1>
            <p className="text-muted-foreground text-sm mb-7">Masuk ke akun Anda untuk melanjutkan</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  className="h-11"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-zinc-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-11"
                  {...register('password')}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full h-11 bg-blue-950 hover:bg-blue-900 text-white font-semibold" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Masuk
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Belum punya akun?{' '}
              <Link href="/register" className="text-blue-700 hover:text-blue-900 font-medium hover:underline">
                Daftar sekarang
              </Link>
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">← Kembali ke Beranda</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
