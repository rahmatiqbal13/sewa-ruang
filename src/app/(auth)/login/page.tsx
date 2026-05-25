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
import { Building2, Loader2, Eye, EyeOff, Clock, Shield, Zap, Mail } from 'lucide-react'

const schema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi').min(6, 'Password minimal 6 karakter'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
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

  return (
    <div className="min-h-screen flex">
      {/* Left panel — 40% on desktop */}
      <div className="hidden lg:flex lg:w-[40%] flex-col shrink-0 relative overflow-hidden bg-gradient-to-br from-[#1B3A8C] to-[#2A52C9]">
        {/* Geometric pattern overlay */}
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/2 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/3" />
        <div className="absolute bottom-1/3 right-1/4 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[10px] flex items-center justify-center bg-white/10 border border-white/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">Sewa Ruang & Alat USC</span>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <p className="text-white/80 text-sm leading-relaxed mb-8">
              Sistem manajemen peminjaman ruang dan peralatan laboratorium
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium">Proses Cepat</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium">Aman & Terintegrasi</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium">Real-time Notification</span>
              </div>
            </div>
          </div>

          <p className="text-white/40 text-xs">
            &copy; {new Date().getFullYear()} USC. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel — 60% on desktop / 100% on mobile */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 font-bold text-[#1B3A8C] mb-10 justify-center">
            <div className="h-9 w-9 rounded-[10px] flex items-center justify-center bg-[#1B3A8C]">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-base">Sewa Ruang & Alat USC</span>
          </div>

          <div className="mb-6">
            <h1 className="text-[#111827] font-bold text-2xl mb-1.5">
              Selamat Datang Kembali
            </h1>
            <p className="text-[#6B7280] text-sm">
              Masuk ke akun Anda untuk melanjutkan
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-[#111827]">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@unesa.ac.id"
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  aria-invalid={!!errors.email}
                  className="h-11 rounded-lg border-[#E5E7EB] pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p id="email-error" role="alert" className="text-xs text-red-600 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-[#111827]">
                  Kata Sandi
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#1B3A8C] hover:underline"
                >
                  Lupa Password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  aria-invalid={!!errors.password}
                  className="h-11 rounded-lg border-[#E5E7EB] pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="text-xs text-red-600 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-lg bg-[#1B3A8C] hover:bg-[#0F2A6B] text-white"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Masuk...' : 'Masuk'}
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-xs text-[#9CA3AF]">atau</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          <div className="mt-6">
            <p className="text-center text-sm text-[#6B7280]">
              Belum punya akun?{' '}
              <Link
                href="/register"
                className="font-semibold text-[#1B3A8C] hover:underline"
              >
                Daftar Sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
