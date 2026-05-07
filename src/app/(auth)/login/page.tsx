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
import { Building2, Loader2, CalendarDays, QrCode, Shield, ArrowLeft, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      router.push(['super_admin', 'admin', 'staff'].includes(profile?.role ?? '') ? '/admin/dashboard' : '/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  const features = [
    { icon: CalendarDays, title: 'Pengajuan Online', desc: 'Ajukan dan pantau status peminjaman kapan saja' },
    { icon: QrCode, title: 'QR Code per Aset', desc: 'Identifikasi cepat setiap ruangan dan peralatan' },
    { icon: Shield, title: 'Perjanjian Digital', desc: 'Dokumentasi tanggung jawab peminjaman otomatis' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col w-[520px] shrink-0 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4" />
        </div>
        
        {/* Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative z-10 flex flex-col h-full p-12">
          <Link href="/" className="flex items-center gap-3 font-bold text-xl text-white mb-16">
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 rounded-xl blur" />
              <div className="relative h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <span>RentSpace</span>
          </Link>

          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Platform #1 untuk Manajemen Aset</span>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Kelola Aset Institusi dengan Mudah
            </h2>
            <p className="text-white/80 text-lg mb-12 leading-relaxed max-w-md">
              Platform digital untuk peminjaman ruangan dan peralatan secara terpusat, transparan, dan efisien.
            </p>

            <div className="space-y-6">
              {features.map(f => (
                <div key={f.title} className="flex items-start gap-4 group">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                    <f.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-base">{f.title}</p>
                    <p className="text-white/70 text-sm mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/50 text-sm">
            &copy; {new Date().getFullYear()} RentSpace. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
        </div>
        
        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 font-bold text-xl text-slate-900 mb-8 justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur opacity-40" />
              <div className="relative h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <span>RentSpace</span>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Selamat Datang Kembali</h1>
              <p className="text-slate-500 text-sm">Masuk ke akun Anda untuk melanjutkan</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  className="h-12 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
                    Lupa password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-12 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                  {...register('password')}
                />
                {errors.password && <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>}
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold rounded-xl" 
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Masuk
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-center text-sm text-slate-600">
                Belum punya akun?{' '}
                <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline">
                  Daftar sekarang
                </Link>
              </p>
            </div>
          </div>

          <Link 
            href="/" 
            className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}
