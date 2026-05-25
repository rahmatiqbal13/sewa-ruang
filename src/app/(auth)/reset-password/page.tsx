'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Loader2, CheckCircle2, XCircle } from 'lucide-react'

const schema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirm: z.string().min(1, 'Konfirmasi password wajib diisi'),
}).refine((d) => d.password === d.confirm, {
  message: 'Password tidak cocok',
  path: ['confirm'],
})
type FormData = z.infer<typeof schema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    const supabase = createClient()

    // If callback route already exchanged the code, session exists — check it
    const errorParam = searchParams.get('error')
    if (errorParam === 'invalid_link') {
      setChecking(false)
      return
    }

    // Check if there's already an active recovery session (set by /auth/callback)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
        setChecking(false)
        return
      }

      // Fallback: listen for PASSWORD_RECOVERY event (implicit/hash flow)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true)
          setChecking(false)
        }
      })

      const timer = setTimeout(() => setChecking(false), 2000)

      return () => {
        subscription.unsubscribe()
        clearTimeout(timer)
      }
    })
  }, [searchParams])

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 3000)
  }

  if (success) {
    return (
      <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E5E7EB] p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-[#111827]">Password Berhasil Diubah!</h1>
        <p className="text-sm text-[#6B7280]">
          Anda akan diarahkan ke halaman masuk dalam beberapa detik...
        </p>
        <Link href="/login" className="block text-sm text-[#1B3A8C] hover:underline font-medium">
          Masuk sekarang →
        </Link>
      </div>
    )
  }

  if (checking) {
    return (
      <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E5E7EB] p-8 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B3A8C] mx-auto" />
        <p className="text-sm text-[#6B7280]">Memverifikasi link...</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E5E7EB] p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="h-7 w-7 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-[#111827]">Link Tidak Valid</h1>
        <p className="text-sm text-[#6B7280]">
          Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.
        </p>
        <Link href="/forgot-password" className="block text-sm text-[#1B3A8C] hover:underline font-medium">
          Minta link baru →
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E5E7EB] p-8">
      <h1 className="text-2xl font-bold text-[#111827] mb-1">Buat Password Baru</h1>
      <p className="text-[#6B7280] text-sm mb-7">
        Masukkan password baru untuk akun Anda.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-[#111827]">Password Baru</Label>
          <Input id="password" type="password" placeholder="Min. 8 karakter" className="h-11 rounded-lg border-[#E5E7EB]" {...register('password')} />
          {errors.password && <p className="text-xs text-red-600 font-medium">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-sm font-medium text-[#111827]">Konfirmasi Password</Label>
          <Input id="confirm" type="password" placeholder="Ulangi password baru" className="h-11 rounded-lg border-[#E5E7EB]" {...register('confirm')} />
          {errors.confirm && <p className="text-xs text-red-600 font-medium">{errors.confirm.message}</p>}
        </div>
        <Button type="submit" className="w-full h-11 bg-[#1B3A8C] hover:bg-[#0F2A6B] text-white font-semibold rounded-lg" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Simpan Password Baru
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F9FAFB]">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 font-bold text-[#1B3A8C] mb-8 justify-center">
          <div className="bg-[#1B3A8C] text-white p-1.5 rounded-[10px]">
            <Building2 className="h-4 w-4" />
          </div>
          Sewa Ruang & Alat USC
        </div>
        <Suspense fallback={
          <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E5E7EB] p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#1B3A8C] mx-auto" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
