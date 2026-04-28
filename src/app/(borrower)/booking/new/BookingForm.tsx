'use client'

import { useState } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Info } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

const schema = z.object({
  asset_id: z.string().min(1, 'Pilih aset'),
  start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
  start_time: z.string().min(1, 'Jam mulai wajib diisi'),
  end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
  end_time: z.string().min(1, 'Jam selesai wajib diisi'),
  purpose: z.string().min(10, 'Tujuan minimal 10 karakter').max(500),
  estimated_participants: z.coerce.number().int().min(1).optional(),
  agreed: z.boolean().refine(v => v === true, 'Anda harus menyetujui perjanjian'),
})
type FormData = {
  asset_id: string
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  purpose: string
  estimated_participants?: number
  agreed: boolean
}

interface Asset {
  id: string; name: string; category: string; rate_per_hour: number | null
  rate_per_day: number | null; current_condition: string; room_code: string | null
  buildings: { name: string } | null
}
interface Profile { id: string; name: string; institution: string; class_division: string }

export function BookingForm({ assets, profile, defaultAssetId }: { assets: Asset[]; profile: Profile | null; defaultAssetId?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null)
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { asset_id: defaultAssetId ?? '' },
  })

  const assetId = watch('asset_id')
  const startDate = watch('start_date')
  const startTime = watch('start_time')
  const endDate = watch('end_date')
  const endTime = watch('end_time')

  const selectedAsset = assets.find(a => a.id === assetId)

  function recalcTotal(overrides?: Partial<{ asset_id: string; start_date: string; start_time: string; end_date: string; end_time: string }>) {
    const sd = overrides?.start_date ?? startDate
    const st = overrides?.start_time ?? startTime
    const ed = overrides?.end_date ?? endDate
    const et = overrides?.end_time ?? endTime
    const aid = overrides?.asset_id ?? assetId
    const asset = assets.find(a => a.id === aid) ?? selectedAsset
    if (!asset || !sd || !st || !ed || !et) return
    const start = new Date(`${sd}T${st}`)
    const end = new Date(`${ed}T${et}`)
    if (end <= start) { setEstimatedTotal(null); return }
    const hours = (end.getTime() - start.getTime()) / 3600000
    setEstimatedTotal(hours * (asset.rate_per_hour ?? 0))
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const start = new Date(`${data.start_date}T${data.start_time}`)
    const end = new Date(`${data.end_date}T${data.end_time}`)

    if (end <= start) {
      toast.error('Waktu selesai harus setelah waktu mulai')
      setLoading(false)
      return
    }

    const asset = assets.find(a => a.id === data.asset_id)
    const hours = (end.getTime() - start.getTime()) / 3600000
    const total = (asset?.rate_per_hour ?? 0) * hours

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data: booking, error } = await sb.from('bookings').insert({
      user_id: profile!.id,
      status: 'pending',
      purpose: data.purpose,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      total_amount: total,
      snapshot_rate: { rate_per_hour: asset?.rate_per_hour, rate_per_day: asset?.rate_per_day },
      reference_no: '',
    }).select('id').single() as { data: { id: string } | null; error: { message: string } | null }

    if (error || !booking) { toast.error(error?.message ?? 'Gagal membuat pengajuan'); setLoading(false); return }

    await sb.from('booking_assets').insert({ booking_id: booking.id, asset_id: data.asset_id })

    toast.success('Pengajuan berhasil dikirim!')
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'booking_submitted', booking_id: booking.id }),
    })
    router.push('/bookings')
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {profile && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm flex items-center gap-2 text-blue-700">
              <Info className="h-4 w-4 shrink-0" />
              Pengajuan atas nama <strong>{profile.name}</strong> — {profile.institution}, {profile.class_division}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Detail Peminjaman</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pilih Aset</Label>
            <Select defaultValue={defaultAssetId} onValueChange={(v) => { if (v) { setValue('asset_id', v); recalcTotal({ asset_id: v }) } }}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih ruang atau alat..." />
              </SelectTrigger>
              <SelectContent>
                {assets.filter(a => a.current_condition === 'good').map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    {a.room_code ? ` (${a.room_code})` : ''}
                    {a.rate_per_hour ? ` — ${formatRupiah(a.rate_per_hour)}/jam` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.asset_id && <p className="text-sm text-destructive">{errors.asset_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input type="date" {...register('start_date')} onChange={(e) => { register('start_date').onChange(e); recalcTotal({ start_date: e.target.value }) }} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Jam Mulai</Label>
              <Input type="time" {...register('start_time')} onChange={(e) => { register('start_time').onChange(e); recalcTotal({ start_time: e.target.value }) }} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai</Label>
              <Input type="date" {...register('end_date')} onChange={(e) => { register('end_date').onChange(e); recalcTotal({ end_date: e.target.value }) }} />
            </div>
            <div className="space-y-2">
              <Label>Jam Selesai</Label>
              <Input type="time" {...register('end_time')} onChange={(e) => { register('end_time').onChange(e); recalcTotal({ end_time: e.target.value }) }} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tujuan Penggunaan</Label>
            <Textarea placeholder="Jelaskan tujuan penggunaan (min. 10 karakter)..." {...register('purpose')} />
            {errors.purpose && <p className="text-sm text-destructive">{errors.purpose.message}</p>}
          </div>

          {selectedAsset?.category === 'room' && (
            <div className="space-y-2">
              <Label>Estimasi Jumlah Peserta</Label>
              <Input type="number" min={1} placeholder="30" {...register('estimated_participants')} />
            </div>
          )}

          {estimatedTotal !== null && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700">
                Estimasi total: <strong>{formatRupiah(estimatedTotal)}</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-1" {...register('agreed')} />
            <span className="text-sm text-muted-foreground">
              Saya menyetujui <strong>perjanjian tanggung jawab peminjaman</strong> dan bertanggung jawab
              penuh atas kondisi aset yang dipinjam selama masa peminjaman.
            </span>
          </label>
          {errors.agreed && <p className="text-sm text-destructive mt-2">{errors.agreed.message}</p>}
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Kirim Pengajuan
      </Button>
    </form>
  )
}
