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
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  code: z.string().min(1).max(5).regex(/^[A-Z0-9]+$/, 'Hanya huruf kapital dan angka'),
  floor_count: z.coerce.number().int().min(1).max(99),
  address: z.string().optional(),
  description: z.string().optional(),
})
type FormData = {
  name: string
  code: string
  floor_count: number
  address?: string
  description?: string
}

interface Building {
  id: string; name: string; code: string; floor_count: number;
  address: string | null; description: string | null
}

export function BuildingForm({ building }: { building?: Building }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: building ? {
      name: building.name,
      code: building.code,
      floor_count: building.floor_count,
      address: building.address ?? '',
      description: building.description ?? '',
    } : {},
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabase.from('buildings') as any).insert({ ...data, created_by: user!.id })
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
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label>Nama Gedung</Label>
            <Input placeholder="Gedung A / Gedung Kuliah Bersama" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kode Gedung</Label>
              <Input
                placeholder="A / B / LAB"
                className="uppercase"
                {...register('code')}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase()
                }}
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
              <p className="text-xs text-muted-foreground">Maks 5 karakter, huruf kapital & angka</p>
            </div>
            <div className="space-y-2">
              <Label>Jumlah Lantai</Label>
              <Input type="number" min={1} max={99} placeholder="1" {...register('floor_count')} />
              {errors.floor_count && <p className="text-sm text-destructive">{errors.floor_count.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Alamat / Lokasi (opsional)</Label>
            <Input placeholder="Jl. Contoh No. 1, Kampus Utama" {...register('address')} />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi (opsional)</Label>
            <Textarea placeholder="Deskripsi singkat gedung..." {...register('description')} />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {building ? 'Simpan Perubahan' : 'Tambah Gedung'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
