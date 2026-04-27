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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  quantity: z.coerce.number().int().min(1),
  condition: z.enum(['good', 'needs_repair', 'damaged']),
  inventory_code: z.string().optional(),
  notes: z.string().optional(),
})
type FormData = {
  name: string
  quantity: number
  condition: 'good' | 'needs_repair' | 'damaged'
  inventory_code?: string
  notes?: string
}

export function AddInventoryItemDialog({ roomId }: { roomId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { quantity: 1, condition: 'good' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('room_inventory_items') as any).insert({
      room_asset_id: roomId,
      name: data.name,
      quantity: data.quantity,
      condition: data.condition,
      inventory_code: data.inventory_code || null,
      notes: data.notes || null,
      last_updated_by: user!.id,
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Item berhasil ditambahkan')
    reset()
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" /> Tambah Item
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Item Inventaris</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nama Item</Label>
            <Input placeholder="Proyektor, AC, Papan Tulis..." {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input type="number" min={1} {...register('quantity')} />
            </div>
            <div className="space-y-2">
              <Label>Kode Inventaris (opsional)</Label>
              <Input placeholder="INV-001" {...register('inventory_code')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Kondisi</Label>
            <Select defaultValue="good" onValueChange={(v) => setValue('condition', v as FormData['condition'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Baik</SelectItem>
                <SelectItem value="needs_repair">Perlu Perbaikan</SelectItem>
                <SelectItem value="damaged">Rusak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Textarea placeholder="Catatan tambahan..." {...register('notes')} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tambah Item
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
