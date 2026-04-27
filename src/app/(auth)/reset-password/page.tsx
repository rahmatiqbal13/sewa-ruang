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

    // PKCE flow: Supabase SSR sends ?code= in the URL
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          toast.error('Link tidak valid atau sudah kadaluarsa')
        } else {
          setReady(true)
        }
        setChecking(false)
      })
      return
    }

    // Implicit flow fallback: hash-based #access_token=...&type=recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
        setChecking(false)
      }
    })

    // Give the hash-based flow a moment to fire, then give up
    const timer = setTimeout(() => setChecking(false), 1500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
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
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900">Password Berhasil Diubah!</h1>
        <p className="text-sm text-muted-foreground">
          Anda akan diarahkan ke halaman masuk dalam beberapa detik...
        </p>
        <Link href="/login" className="block text-sm text-blue-700 hover:underline font-medium">
          Masuk sekarang →
        </Link>
      </div>
    )
  }

  if (checking) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-sm text-muted-foreground">Memverifikasi link...</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="h-7 w-7 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900">Link Tidak Valid</h1>
        <p className="text-sm text-muted-foreground">
          Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.
        </p>
        <Link href="/forgot-password" className="block text-sm text-blue-700 hover:underline font-medium">
          Minta link baru →
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">Buat Password Baru</h1>
      <p className="text-muted-foreground text-sm mb-7">
        Masukkan password baru untuk akun Anda.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-zinc-700">Password Baru</Label>
          <Input id="password" type="password" placeholder="Min. 8 karakter" className="h-11" {...register('password')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-zinc-700">Konfirmasi Password</Label>
          <Input id="confirm" type="password" placeholder="Ulangi password baru" className="h-11" {...register('confirm')} />
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
        </div>
        <Button type="submit" className="w-full h-11 bg-blue-950 hover:bg-blue-900 text-white font-semibold" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Simpan Password Baru
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 font-bold text-blue-950 mb-8 justify-center">
          <div className="bg-blue-950 text-white p-1.5 rounded-lg">
            <Building2 className="h-4 w-4" />
          </div>
          Sewa Ruang & Alat
        </div>
        <Suspense fallback={
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
