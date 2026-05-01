'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PhotoUpload } from '@/components/shared/PhotoUpload'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  returned_at: z.string().min(1),
  condition: z.enum(['good', 'minor_damage', 'major_damage', 'lost']),
  notes: z.string().optional(),
  photo_url: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function RecordReturnForm({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { returned_at: new Date().toISOString().slice(0, 16), condition: 'good' },
  })

  const condition = watch('condition')
  const photoUrl = watch('photo_url')

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('returns') as any).insert({
      booking_id: bookingId,
      returned_at: new Date(data.returned_at).toISOString(),
      condition: data.condition,
      notes: data.notes || null,
      photo_url: data.photo_url || null,
      recorded_by: user!.id,
    })

    if (error) { toast.error(error.message); setLoading(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('bookings') as any).update({ status: 'completed' }).eq('id', bookingId)

    toast.success('Pengembalian berhasil dicatat')
    router.push('/admin/returns')
    router.refresh()
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Form Pengembalian</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Waktu Pengembalian Aktual</Label>
            <Input type="datetime-local" {...register('returned_at')} />
          </div>

          <div className="space-y-2">
            <Label>Kondisi Aset</Label>
            <Select defaultValue="good" onValueChange={(v) => v && setValue('condition', v as FormData['condition'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Baik</SelectItem>
                <SelectItem value="minor_damage">Rusak Ringan</SelectItem>
                <SelectItem value="major_damage">Rusak Berat</SelectItem>
                <SelectItem value="lost">Hilang</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Catatan Kondisi {condition !== 'good' && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              placeholder={condition !== 'good' ? 'Wajib diisi — jelaskan kondisi kerusakan/kehilangan...' : 'Catatan tambahan (opsional)...'}
              {...register('notes')}
            />
          </div>

          <div className="space-y-2">
            <Label>Foto Kondisi Aset</Label>
            <PhotoUpload
              value={photoUrl}
              onChange={(url) => setValue('photo_url', url ?? '')}
              folder="returns"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pengembalian
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
