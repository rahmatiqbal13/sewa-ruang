'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Building2, ArrowLeft, Camera } from 'lucide-react'
import { useState } from 'react'
import { PhotoUpload } from '@/components/shared/PhotoUpload'
import Link from 'next/link'

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  code: z.string().min(1).max(5).regex(/^[A-Z0-9]+$/, 'Hanya huruf kapital dan angka'),
  floor_count: z.coerce.number().int().min(1).max(99),
  address: z.string().optional(),
  description: z.string().optional(),
  photo_url: z.string().optional(),
})
type FormData = {
  name: string
  code: string
  floor_count: number
  address?: string
  description?: string
  photo_url?: string
}

interface Building {
  id: string; name: string; code: string; floor_count: number;
  address: string | null; description: string | null; photo_url: string | null
}

export function BuildingForm({ building }: { building?: Building }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: building ? {
      name: building.name,
      code: building.code,
      floor_count: building.floor_count,
      address: building.address ?? '',
      description: building.description ?? '',
      photo_url: building.photo_url ?? '',
    } : {
      floor_count: 1,
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    let error

    if (building) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabase.from('buildings') as any).update(data).eq('id', building.id)
      error = res.error
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Anda harus login terlebih dahulu')
        setLoading(false)
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabase.from('buildings') as any).insert({ ...data, created_by: user.id })
      error = res.error
    }

    if (error) {
      toast.error(error.message.includes('unique') ? 'Kode gedung sudah digunakan' : error.message)
      setLoading(false)
      return
    }

    toast.success(building ? 'Gedung berhasil diperbarui' : 'Gedung berhasil ditambahkan')
    router.push('/admin/buildings')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="max-w-3xl">
      {/* Back Button */}
      <Link 
        href="/admin/buildings"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar gedung
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 bg-indigo-600 rounded-[14px] flex items-center justify-center shadow-soft">
          <Building2 className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {building ? 'Edit Gedung' : 'Tambah Gedung Baru'}
          </h1>
          <p className="text-muted-foreground">
            {building ? 'Perbarui informasi gedung' : 'Isi detail gedung untuk menambahkan ke sistem'}
          </p>
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-4 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Photo Upload */}
            <div className="space-y-3">
              <Label className="text-foreground/80 font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground/70" />
                Foto Gedung
              </Label>
              <PhotoUpload
                value={watch('photo_url')}
                onChange={(url) => setValue('photo_url', url ?? '')}
                folder="buildings"
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground/80 font-medium">
                Nama Gedung <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="name"
                placeholder="Contoh: Gedung Kuliah Bersama, Gedung Laboratorium" 
                className="h-12 rounded-[14px] border-border focus:border-indigo-500 focus:ring-indigo-500/20"
                {...register('name')} 
              />
              {errors.name && (
                <p className="text-sm text-red-500 font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Code & Floor Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-foreground/80 font-medium">
                  Kode Gedung <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="A / B / LAB"
                  className="h-10 md:h-12 rounded-[10px] md:rounded-[14px] border-border uppercase font-mono focus:border-indigo-500 focus:ring-indigo-500/20"
                  {...register('code')}
                  onChange={(e) => {
                    const upperValue = e.target.value.toUpperCase()
                    setValue('code', upperValue, { shouldValidate: true })
                  }}
                />
                {errors.code && (
                  <p className="text-sm text-red-500 font-medium">{errors.code.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Maks 5 karakter, huruf kapital & angka</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor_count" className="text-foreground/80 font-medium">
                  Jumlah Lantai <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="floor_count"
                  type="number" 
                  min={1} 
                  max={99} 
                  placeholder="1" 
                  className="h-10 md:h-12 rounded-[10px] md:rounded-[14px] border-border focus:border-indigo-500 focus:ring-indigo-500/20"
                  {...register('floor_count')} 
                />
                {errors.floor_count && (
                  <p className="text-sm text-red-500 font-medium">{errors.floor_count.message}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-foreground/80 font-medium">
                Alamat / Lokasi
              </Label>
              <Input 
                id="address"
                placeholder="Jl. Contoh No. 1, Kampus Utama" 
                className="h-12 rounded-[14px] border-border focus:border-indigo-500 focus:ring-indigo-500/20"
                {...register('address')} 
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground/80 font-medium">
                Deskripsi
              </Label>
              <Textarea 
                id="description"
                placeholder="Deskripsi singkat tentang gedung ini..." 
                rows={4}
                className="rounded-[14px] border-border focus:border-indigo-500 focus:ring-indigo-500/20 resize-none"
                {...register('description')} 
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/60">
              <Button 
                type="submit" 
                disabled={loading}
                className="h-12 px-8"
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {building ? 'Simpan Perubahan' : 'Tambah Gedung'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                className="h-12 px-8 border-border hover:bg-muted"
              >
                Batal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
