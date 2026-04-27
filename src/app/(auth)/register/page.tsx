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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Loader2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  phone: z.string().min(10, 'Nomor WhatsApp tidak valid'),
  institution: z.string().min(2, 'Instansi wajib diisi').max(100),
  class_division: z.string().min(1, 'Kelas/Divisi wajib diisi').max(50),
  identity_number: z.string().max(20).optional(),
  telegram_username: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name, role: 'borrower' },
      },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    if (authData.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('users') as any).upsert({
        id: authData.user.id,
        name: data.name,
        email: data.email,
        role: 'borrower',
        phone: data.phone,
        institution: data.institution,
        class_division: data.class_division,
        identity_number: data.identity_number || null,
        telegram_username: data.telegram_username || null,
      })
    }
    toast.success('Akun berhasil dibuat! Silakan masuk.')
    router.push('/login')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Daftar Akun</CardTitle>
          <CardDescription>Buat akun untuk mengajukan peminjaman</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" placeholder="Nama lengkap Anda" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nama@email.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Min. 8 karakter" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor WhatsApp</Label>
              <Input id="phone" placeholder="08xxxxxxxxxx" {...register('phone')} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">Instansi / Organisasi</Label>
              <Input id="institution" placeholder="Universitas / Perusahaan / Komunitas" {...register('institution')} />
              {errors.institution && <p className="text-sm text-destructive">{errors.institution.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="class_division">Kelas / Divisi</Label>
              <Input id="class_division" placeholder="Contoh: TI-3A, Divisi IT" {...register('class_division')} />
              {errors.class_division && <p className="text-sm text-destructive">{errors.class_division.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="identity_number">NIM / NIP / KTP (opsional)</Label>
              <Input id="identity_number" placeholder="Nomor identitas" {...register('identity_number')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram_username">Username Telegram (opsional)</Label>
              <Input id="telegram_username" placeholder="@username" {...register('telegram_username')} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Daftar
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Masuk
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
