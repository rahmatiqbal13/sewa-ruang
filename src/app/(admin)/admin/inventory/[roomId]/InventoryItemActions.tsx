'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Item {
  id: string; name: string; quantity: number; condition: string;
  inventory_code: string | null; notes: string | null
}

export function InventoryItemActions({ item }: { item: Item }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [condition, setCondition] = useState(item.condition)

  async function updateCondition() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('room_inventory_items') as any).update({
      condition: condition as 'good' | 'needs_repair' | 'damaged',
      last_updated_by: user!.id,
      last_updated_at: new Date().toISOString(),
    }).eq('id', item.id)
    if (error) { toast.error('Gagal memperbarui'); return }
    toast.success('Kondisi diperbarui')
    setEditOpen(false)
    router.refresh()
  }

  async function softDelete() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('room_inventory_items') as any).update({ is_active: false }).eq('id', item.id)
    toast.success('Item dihapus')
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2 cursor-pointer">
            <Pencil className="h-4 w-4" /> Edit Kondisi
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={softDelete} variant="destructive" className="gap-2 cursor-pointer">
            <Trash2 className="h-4 w-4" /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Kondisi: {item.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Kondisi</Label>
              <Select defaultValue={item.condition} onValueChange={(v) => v && setCondition(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Baik</SelectItem>
                  <SelectItem value="needs_repair">Perlu Perbaikan</SelectItem>
                  <SelectItem value="damaged">Rusak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={updateCondition} className="w-full">Simpan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
