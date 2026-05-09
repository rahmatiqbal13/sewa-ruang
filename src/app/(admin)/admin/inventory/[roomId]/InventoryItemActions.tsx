'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MoreHorizontal, Pencil, Trash2, Edit3 } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditInventoryItemDialog } from './EditInventoryItemDialog'

interface Item {
  id: string
  name: string
  quantity: number
  condition: 'good' | 'needs_repair' | 'damaged'
  inventory_code: string | null
  notes: string | null
  photo_url: string | null
}

interface InventoryItemActionsProps {
  item: Item
}

export function InventoryItemActions({ item }: InventoryItemActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [quickConditionOpen, setQuickConditionOpen] = useState(false)
  const [condition, setCondition] = useState(item.condition)
  const [updating, setUpdating] = useState(false)

  async function updateCondition() {
    if (condition === item.condition) {
      setQuickConditionOpen(false)
      return
    }

    setUpdating(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('room_inventory_items') as any).update({
      condition: condition,
      last_updated_by: user!.id,
      last_updated_at: new Date().toISOString(),
    }).eq('id', item.id)
    
    if (error) { 
      toast.error('Gagal memperbarui kondisi: ' + error.message)
      setUpdating(false)
      return 
    }
    
    toast.success('Kondisi diperbarui')
    setQuickConditionOpen(false)
    router.refresh()
    setUpdating(false)
  }

  async function softDelete() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('room_inventory_items') as any)
      .update({ is_active: false })
      .eq('id', item.id)
    
    if (error) {
      toast.error('Gagal menghapus: ' + error.message)
      return
    }
    
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
          {/* Edit Lengkap */}
          <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2 cursor-pointer">
            <Edit3 className="h-4 w-4" /> Edit Detail
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Quick Edit Kondisi */}
          <DropdownMenuItem onClick={() => setQuickConditionOpen(true)} className="gap-2 cursor-pointer">
            <Pencil className="h-4 w-4" /> Ubah Kondisi
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Delete */}
          <DropdownMenuItem onClick={softDelete} variant="destructive" className="gap-2 cursor-pointer">
            <Trash2 className="h-4 w-4" /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Full Edit Dialog */}
      <EditInventoryItemDialog
        item={item}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Quick Condition Edit Dialog */}
      <Dialog open={quickConditionOpen} onOpenChange={setQuickConditionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Kondisi: {item.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Kondisi</Label>
              <Select 
                value={condition} 
                onValueChange={(v) => setCondition(v as Item['condition'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Baik</SelectItem>
                  <SelectItem value="needs_repair">Perlu Perbaikan</SelectItem>
                  <SelectItem value="damaged">Rusak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={updateCondition} 
                className="flex-1"
                disabled={updating || condition === item.condition}
              >
                {updating ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setQuickConditionOpen(false)}
                disabled={updating}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
