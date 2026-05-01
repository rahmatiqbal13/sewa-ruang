'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { PhotoUpload } from '@/components/shared/PhotoUpload'

const schema = z.object({
  name: z.string().min(2),
  category: z.enum(['room', 'equipment']),
  building_id: z.string().optional(),
  floor_number: z.coerce.number().int().min(1).optional(),
  room_sequence: z.coerce.number().int().min(1).max(99).optional(),
  description: z.string().optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  rate_per_hour: z.coerce.number().min(0).optional(),
  rate_per_day: z.coerce.number().min(0).optional(),
  rate_mahasiswa: z.coerce.number().min(0).optional(),
  rate_pascasarjana: z.coerce.number().min(0).optional(),
  rate_dosen_karyawan: z.coerce.number().min(0).optional(),
  rate_kerjasama: z.coerce.number().min(0).optional(),
  rate_umum: z.coerce.number().min(0).optional(),
  asset_code: z.string().optional(),
  merk: z.string().optional(),
  ketersediaan: z.enum(['tersedia', 'digunakan', 'hilang']).optional(),
  status_tindakan: z.enum(['normal', 'perawatan', 'menunggu_part', 'afkir']).optional(),
  sumber: z.string().optional(),
  tgl_terakhir_cek: z.string().optional(),
  photo_url: z.string().optional(),
})
type FormData = {
  name: string
  category: 'room' | 'equipment'
  building_id?: string
  floor_number?: number
  room_sequence?: number
  description?: string
  capacity?: number
  rate_per_hour?: number
  rate_per_day?: number
  rate_mahasiswa?: number
  rate_pascasarjana?: number
  rate_dosen_karyawan?: number
  rate_kerjasama?: number
  rate_umum?: number
  asset_code?: string
  merk?: string
  ketersediaan?: 'tersedia' | 'digunakan' | 'hilang'
  status_tindakan?: 'normal' | 'perawatan' | 'menunggu_part' | 'afkir'
  sumber?: string
  tgl_terakhir_cek?: string
  photo_url?: string
}

interface Building { id: string; name: string; code: string; floor_count: number }
interface Asset {
  id: string; name: string; category: string; building_id: string | null
  floor_number: number | null; room_sequence: number | null; room_code: string | null
  description: string | null; capacity: number | null; rate_per_hour: number | null
  rate_per_day: number | null; merk: string | null; ketersediaan: string | null
  status_tindakan: string | null; sumber: string | null; tgl_terakhir_cek: string | null
  photo_url: string | null; asset_code: string | null
  rate_mahasiswa: number | null; rate_pascasarjana: number | null
  rate_dosen_karyawan: number | null; rate_kerjasama: number | null; rate_umum: number | null
}

export function AssetForm({ asset, buildings, lockedCategory }: { asset?: Asset; buildings: Building[]; lockedCategory?: 'room' | 'equipment' }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: asset ? {
      name: asset.name,
      category: asset.category as 'room' | 'equipment',
      building_id: asset.building_id ?? '',
      floor_number: asset.floor_number ?? undefined,
      room_sequence: asset.room_sequence ?? undefined,
      description: asset.description ?? '',
      capacity: asset.capacity ?? undefined,
      rate_per_hour: asset.rate_per_hour ?? undefined,
      rate_per_day: asset.rate_per_day ?? undefined,
      rate_mahasiswa: asset.rate_mahasiswa ?? undefined,
      rate_pascasarjana: asset.rate_pascasarjana ?? undefined,
      rate_dosen_karyawan: asset.rate_dosen_karyawan ?? undefined,
      rate_kerjasama: asset.rate_kerjasama ?? undefined,
      rate_umum: asset.rate_umum ?? undefined,
      asset_code: asset.asset_code ?? '',
      merk: asset.merk ?? '',
      ketersediaan: (asset.ketersediaan as FormData['ketersediaan']) ?? 'tersedia',
      status_tindakan: (asset.status_tindakan as FormData['status_tindakan']) ?? 'normal',
      sumber: asset.sumber ?? '',
      tgl_terakhir_cek: asset.tgl_terakhir_cek ?? '',
      photo_url: asset.photo_url ?? '',
    } : { category: lockedCategory ?? 'room', ketersediaan: 'tersedia', status_tindakan: 'normal' },
  })

  const category = lockedCategory ?? watch('category')
  const buildingId = watch('building_id')
  const selectedBuilding = buildings.find(b => b.id === buildingId)

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const payload = {
      ...data,
      building_id: data.category === 'room' ? (data.building_id || null) : null,
      floor_number: data.category === 'room' ? (data.floor_number || null) : null,
      room_sequence: data.category === 'room' ? (data.room_sequence || null) : null,
      merk: data.merk || null,
      sumber: data.sumber || null,
      tgl_terakhir_cek: data.tgl_terakhir_cek || null,
      photo_url: data.photo_url || null,
    }

    let error
    if (asset) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabase.from('assets') as any).update(payload).eq('id', asset.id)
      error = res.error
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabase.from('assets') as any).insert(payload)
      error = res.error
    }

    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success(asset ? 'Aset diperbarui' : 'Aset ditambahkan')
    const backPath = lockedCategory === 'room' ? '/admin/rooms' : '/admin/assets'
    router.push(asset
      ? (asset.category === 'room' ? '/admin/rooms' : '/admin/assets')
      : backPath
    )
    router.refresh()
    setLoading(false)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label>Nama Aset</Label>
            <Input placeholder="Nama ruang atau alat" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {!lockedCategory && (
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select defaultValue={asset?.category ?? 'room'} onValueChange={(v) => setValue('category', v as 'room' | 'equipment')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">Ruang</SelectItem>
                  <SelectItem value="equipment">Alat / Peralatan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {category === 'room' && (
            <>
              <div className="space-y-2">
                <Label>Gedung</Label>
                <Select
                  defaultValue={asset?.building_id ?? ''}
                  onValueChange={(v) => setValue('building_id', v ?? undefined)}
                >
                  <SelectTrigger>
                    <span className="flex flex-1 text-left text-sm">
                      {selectedBuilding
                        ? `${selectedBuilding.name} (${selectedBuilding.code})`
                        : <span className="text-muted-foreground">Pilih gedung...</span>}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lantai</Label>
                  <Select
                    defaultValue={asset?.floor_number?.toString()}
                    onValueChange={(v) => setValue('floor_number', v ? parseInt(v) : undefined)}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih lantai..." /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: selectedBuilding?.floor_count ?? 10 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={n.toString()}>Lantai {n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nomor Urut Ruang</Label>
                  <Input type="number" min={1} max={99} placeholder="1" {...register('room_sequence')} />
                  <p className="text-xs text-muted-foreground">Urutan ruang di lantai tersebut</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Kapasitas (orang)</Label>
                <Input type="number" min={1} placeholder="30" {...register('capacity')} />
              </div>
            </>
          )}

          {category === 'equipment' && (
            <>
              <div className="space-y-2">
                <Label>Merk / Produsen</Label>
                <Input placeholder="Samsung, Epson, dll." {...register('merk')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ketersediaan</Label>
                  <Select
                    defaultValue={asset?.ketersediaan ?? 'tersedia'}
                    onValueChange={(v) => v && setValue('ketersediaan', v as FormData['ketersediaan'])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tersedia">Tersedia</SelectItem>
                      <SelectItem value="digunakan">Digunakan</SelectItem>
                      <SelectItem value="hilang">Hilang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status Tindakan</Label>
                  <Select
                    defaultValue={asset?.status_tindakan ?? 'normal'}
                    onValueChange={(v) => v && setValue('status_tindakan', v as FormData['status_tindakan'])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="perawatan">Perawatan</SelectItem>
                      <SelectItem value="menunggu_part">Menunggu Part</SelectItem>
                      <SelectItem value="afkir">Afkir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sumber / Pengadaan</Label>
                  <Input placeholder="Pengadaan 2024, Hibah, dll." {...register('sumber')} />
                </div>
                <div className="space-y-2">
                  <Label>Tgl. Terakhir Cek</Label>
                  <Input type="date" {...register('tgl_terakhir_cek')} />
                </div>
              </div>
            </>
          )}

          {category === 'room' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tarif per Jam (Rp)</Label>
                <Input type="number" min={0} placeholder="50000" {...register('rate_per_hour')} />
              </div>
              <div className="space-y-2">
                <Label>Tarif per Hari (Rp)</Label>
                <Input type="number" min={0} placeholder="300000" {...register('rate_per_day')} />
              </div>
            </div>
          )}

          {category === 'equipment' && (
            <>
              <div className="space-y-2">
                <Label>Kode Alat</Label>
                <Input placeholder="USC-0001" {...register('asset_code')} />
              </div>
              <div className="space-y-1">
                <Label>Tarif Sewa per Hari (Rp) — per Kategori Peminjam</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Mahasiswa</p>
                    <Input type="number" min={0} placeholder="0" {...register('rate_mahasiswa')} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Mahasiswa Pascasarjana</p>
                    <Input type="number" min={0} placeholder="0" {...register('rate_pascasarjana')} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Dosen / Karyawan</p>
                    <Input type="number" min={0} placeholder="0" {...register('rate_dosen_karyawan')} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Kerjasama</p>
                    <Input type="number" min={0} placeholder="0" {...register('rate_kerjasama')} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Umum</p>
                    <Input type="number" min={0} placeholder="0" {...register('rate_umum')} />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Foto</Label>
            <PhotoUpload
              value={watch('photo_url')}
              onChange={(url) => setValue('photo_url', url ?? '')}
              folder={category === 'room' ? 'rooms' : 'equipment'}
            />
          </div>

          <div className="space-y-2">
            <Label>Deskripsi / Keterangan (opsional)</Label>
            <Textarea placeholder="Deskripsi atau catatan tambahan..." {...register('description')} />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {asset ? 'Simpan Perubahan' : 'Tambah Aset'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
