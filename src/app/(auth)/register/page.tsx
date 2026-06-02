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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Loader2, User } from 'lucide-react'
import { ImageUpload } from '@/components/shared/ImageUpload'

import { BORROWER_CATEGORIES } from '@/lib/categories'

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').min(3, 'Nama minimal 3 karakter'),
  email: z.string().min(1, 'Email wajib diisi').email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi').min(6, 'Password minimal 6 karakter'),
  phone: z.string().min(1, 'Nomor WhatsApp wajib diisi').regex(/^(\+62|0)[0-9]{9,12}$/, 'Format WhatsApp tidak valid (contoh: 08123456789 atau +628123456789)'),
  borrower_category: z.enum(['mahasiswa_s1', 'mahasiswa_s2', 'dosen', 'kerjasama', 'umum'], { message: 'Kategori peminjam wajib dipilih' }),
  institution: z.string().min(2, 'Instansi wajib diisi').max(100),
  class_division: z.string().min(1, 'Kelas/Divisi wajib diisi').max(50),
  identity_number: z.string().max(20).optional(),
  telegram_username: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const { register, handleSubmit, setValue, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { name: data.name, role: 'borrower' } },
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    if (authData.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('users') as any).upsert({
        id: authData.user.id, name: data.name, email: data.email, role: 'borrower',
        phone: data.phone, borrower_category: data.borrower_category,
        institution: data.institution, class_division: data.class_division,
        identity_number: data.identity_number || null, telegram_username: data.telegram_username || null,
        photo_url: photoUrl || null,
        plain_password: data.password,
      })
    }
    toast.success('Akun berhasil dibuat! Selamat datang.')
    router.push('/dashboard')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F9FAFB]">
      <div className="w-full max-w-[560px]">
        <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E5E7EB] p-8 md:p-10">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-[10px] flex items-center justify-center bg-[#0891B2]">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-[#111827] font-bold text-2xl">Buat Akun Baru</h1>
                <p className="text-[#6B7280] text-sm">Isi data di bawah untuk mendaftar</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Photo Upload */}
            <div className="space-y-1.5">
              <Label className="text-[#111827] text-sm font-medium flex items-center gap-1">
                <User className="h-4 w-4" />
                Foto Profil <span className="text-[#9CA3AF] font-normal">(opsional)</span>
              </Label>
              <ImageUpload 
                value={photoUrl}
                onChange={setPhotoUrl}
                bucket="avatars"
                folder="users"
              />
              <p className="text-xs text-[#9CA3AF]">
                Upload foto profil Anda. Maksimal 5MB.
              </p>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[#111827] text-sm font-medium">Nama Lengkap</Label>
              <Input id="name" placeholder="Nama lengkap Anda" className="h-11 rounded-lg border-[#E5E7EB]" aria-describedby={errors.name ? 'name-error' : undefined} aria-invalid={!!errors.name} {...register('name')} />
              {errors.name && <p id="name-error" role="alert" className="text-xs text-red-600 font-medium">{errors.name.message}</p>}
            </div>

            {/* Email | Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[#111827] text-sm font-medium">Email</Label>
                <Input id="email" type="email" placeholder="nama@email.com" className="h-11 rounded-lg border-[#E5E7EB]" aria-describedby={errors.email ? 'email-error' : undefined} aria-invalid={!!errors.email} {...register('email')} />
                {errors.email && <p id="email-error" role="alert" className="text-xs text-red-600 font-medium">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[#111827] text-sm font-medium">Password</Label>
                <Input id="password" type="password" placeholder="Min. 6 karakter" className="h-11 rounded-lg border-[#E5E7EB]" aria-describedby={errors.password ? 'password-error' : undefined} aria-invalid={!!errors.password} {...register('password')} />
                {errors.password && <p id="password-error" role="alert" className="text-xs text-red-600 font-medium">{errors.password.message}</p>}
              </div>
            </div>

            {/* Phone | Telegram */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[#111827] text-sm font-medium">Nomor WhatsApp</Label>
                <Input id="phone" placeholder="08xxxxxxxxxx" className="h-11 rounded-lg border-[#E5E7EB]" aria-describedby={errors.phone ? 'phone-error' : undefined} aria-invalid={!!errors.phone} {...register('phone')} />
                {errors.phone && <p id="phone-error" role="alert" className="text-xs text-red-600 font-medium">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telegram_username" className="text-[#111827] text-sm font-medium flex items-center gap-1">
                  Username Telegram <span className="text-[#9CA3AF] font-normal">(opsional)</span>
                </Label>
                <Input id="telegram_username" placeholder="@username" className="h-11 rounded-lg border-[#E5E7EB]" {...register('telegram_username')} />
              </div>
            </div>

            {/* Kategori Peminjam */}
            <div className="space-y-1.5">
              <Label htmlFor="borrower_category" className="text-[#111827] text-sm font-medium">
                Kategori Peminjam <span className="text-red-600">*</span>
              </Label>
              <Select onValueChange={(v: string | null) => { if (v) setValue('borrower_category', v as FormData['borrower_category']) }}>
                <SelectTrigger id="borrower_category" className="h-11 rounded-lg border-[#E5E7EB]" aria-describedby={errors.borrower_category ? 'borrower_category-error' : undefined} aria-invalid={!!errors.borrower_category}><SelectValue placeholder="Pilih kategori Anda..." /></SelectTrigger>
                <SelectContent>
                  {BORROWER_CATEGORIES.map(c => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.borrower_category && <p id="borrower_category-error" role="alert" className="text-xs text-red-600 font-medium">{errors.borrower_category.message}</p>}
            </div>

            {/* Institution & Class */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="institution" className="text-[#111827] text-sm font-medium">Instansi / Organisasi</Label>
                <Input id="institution" placeholder="Universitas / Komunitas" className="h-11 rounded-lg border-[#E5E7EB]" maxLength={100} aria-describedby={errors.institution ? 'institution-error' : undefined} aria-invalid={!!errors.institution} {...register('institution')} />
                {errors.institution && <p id="institution-error" role="alert" className="text-xs text-red-600 font-medium">{errors.institution.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class_division" className="text-[#111827] text-sm font-medium">Kelas / Divisi</Label>
                <Input id="class_division" placeholder="TI-3A, Divisi IT" className="h-11 rounded-lg border-[#E5E7EB]" maxLength={50} aria-describedby={errors.class_division ? 'class_division-error' : undefined} aria-invalid={!!errors.class_division} {...register('class_division')} />
                {errors.class_division && <p id="class_division-error" role="alert" className="text-xs text-red-600 font-medium">{errors.class_division.message}</p>}
              </div>
            </div>

            {/* NIM / NIP / KTP */}
            <div className="space-y-1.5">
              <Label htmlFor="identity_number" className="text-[#111827] text-sm font-medium flex items-center gap-1">
                NIM / NIP / KTP <span className="text-[#9CA3AF] font-normal">(opsional)</span>
              </Label>
              <Input id="identity_number" placeholder="Nomor identitas" className="h-11 rounded-lg border-[#E5E7EB]" {...register('identity_number')} />
            </div>

            <Button type="submit" className="w-full h-11 bg-[#0891B2] hover:bg-[#0F2A6B] text-white font-semibold rounded-lg mt-2" disabled={loading || !isValid}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Buat Akun
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6B7280]">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-[#0891B2] hover:underline font-semibold">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
