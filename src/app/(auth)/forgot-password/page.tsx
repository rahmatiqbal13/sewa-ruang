'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Loader2, MailCheck } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email tidak valid'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setSentEmail(data.email)
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 font-bold text-blue-950 mb-8 justify-center">
          <div className="bg-blue-950 text-white p-1.5 rounded-lg">
            <Building2 className="h-4 w-4" />
          </div>
          Sewa Ruang & Alat
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <MailCheck className="h-7 w-7 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-zinc-900">Email Terkirim!</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Link reset password telah dikirim ke{' '}
                <span className="font-medium text-zinc-700">{sentEmail}</span>.
                Silakan cek inbox atau folder spam Anda.
              </p>
              <p className="text-xs text-muted-foreground">
                Link akan kadaluarsa dalam 1 jam.
              </p>
              <Link href="/login" className="block mt-2 text-sm text-blue-700 hover:underline font-medium">
                ← Kembali ke halaman masuk
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-zinc-900 mb-1">Lupa Password</h1>
              <p className="text-muted-foreground text-sm mb-7">
                Masukkan email akun Anda dan kami akan mengirimkan link untuk mereset password.
              </p>

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
                <Button type="submit" className="w-full h-11 bg-blue-950 hover:bg-blue-900 text-white font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Kirim Link Reset
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Ingat password?{' '}
                <Link href="/login" className="text-blue-700 hover:text-blue-900 font-medium hover:underline">
                  Masuk sekarang
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
