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
import { Building2, Loader2, CheckCircle2 } from 'lucide-react'

const BORROWER_CATEGORIES = [
  { value: 'mahasiswa',       label: 'Mahasiswa' },
  { value: 'pascasarjana',    label: 'Mahasiswa Pascasarjana' },
  { value: 'dosen_karyawan',  label: 'Dosen / Karyawan' },
  { value: 'kerjasama',       label: 'Kerjasama' },
  { value: 'umum',            label: 'Umum' },
]

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  phone: z.string().min(10, 'Nomor WhatsApp tidak valid'),
  borrower_category: z.enum(['mahasiswa', 'pascasarjana', 'dosen_karyawan', 'kerjasama', 'umum'], { message: 'Kategori peminjam wajib dipilih' }),
  institution: z.string().min(2, 'Instansi wajib diisi').max(100),
  class_division: z.string().min(1, 'Kelas/Divisi wajib diisi').max(50),
  identity_number: z.string().max(20).optional(),
  telegram_username: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
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
      })
    }
    toast.success('Akun berhasil dibuat! Silakan masuk.')
    router.push('/login')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[400px] shrink-0 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-16">
            <div className="bg-white/20 p-2 rounded-xl">
              <Building2 className="h-5 w-5" />
            </div>
            Sewa Ruang & Alat
          </Link>
          <h2 className="text-3xl font-bold mb-4 leading-tight">Bergabung Sekarang</h2>
          <p className="text-blue-200 mb-10 leading-relaxed">
            Buat akun peminjam dan mulai ajukan peminjaman ruangan atau peralatan secara digital.
          </p>
          <div className="space-y-4">
            {['Proses pengajuan 100% online', 'Notifikasi status real-time', 'Riwayat peminjaman tersimpan', 'Perjanjian digital otomatis'].map(t => (
              <div key={t} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                <span className="text-blue-100">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 mt-auto text-blue-400 text-xs">
          &copy; {new Date().getFullYear()} Sistem Sewa Ruang & Alat
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-start justify-center py-8 px-6 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 font-bold text-blue-950 mb-6 justify-center">
            <div className="bg-blue-950 text-white p-1.5 rounded-lg">
              <Building2 className="h-4 w-4" />
            </div>
            Sewa Ruang & Alat
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-8">
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">Buat Akun</h1>
            <p className="text-muted-foreground text-sm mb-7">Isi data diri untuk membuat akun peminjam</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-zinc-700">Nama Lengkap</Label>
                  <Input placeholder="Nama lengkap Anda" className="h-10" {...register('name')} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-zinc-700">Email</Label>
                  <Input type="email" placeholder="nama@email.com" className="h-10" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-zinc-700">Password</Label>
                  <Input type="password" placeholder="Min. 8 karakter" className="h-10" {...register('password')} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-zinc-700">Nomor WhatsApp</Label>
                  <Input placeholder="08xxxxxxxxxx" className="h-10" {...register('phone')} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-zinc-700">Kategori Peminjam <span className="text-destructive">*</span></Label>
                  <Select onValueChange={(v) => v && setValue('borrower_category', v as FormData['borrower_category'])}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Pilih kategori Anda..." /></SelectTrigger>
                    <SelectContent>
                      {BORROWER_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.borrower_category && <p className="text-xs text-destructive">{errors.borrower_category.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-700">Instansi / Organisasi</Label>
                  <Input placeholder="Universitas / Komunitas" className="h-10" {...register('institution')} />
                  {errors.institution && <p className="text-xs text-destructive">{errors.institution.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-700">Kelas / Divisi</Label>
                  <Input placeholder="TI-3A, Divisi IT" className="h-10" {...register('class_division')} />
                  {errors.class_division && <p className="text-xs text-destructive">{errors.class_division.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-700 flex items-center gap-1">NIM / NIP / KTP <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                  <Input placeholder="Nomor identitas" className="h-10" {...register('identity_number')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-700 flex items-center gap-1">Username Telegram <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                  <Input placeholder="@username" className="h-10" {...register('telegram_username')} />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 bg-blue-950 hover:bg-blue-900 text-white font-semibold mt-2" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Buat Akun
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-blue-700 hover:text-blue-900 font-medium hover:underline">Masuk sekarang</Link>
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
