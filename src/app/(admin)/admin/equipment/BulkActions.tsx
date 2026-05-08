'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { bulkSoftDeleteEquipment, bulkRestoreEquipment } from './equipmentActions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, RotateCcw, Loader2, CheckSquare, Square, X } from 'lucide-react'

interface Equipment {
  id: string
  name: string
  is_active: boolean
}

interface BulkActionsProps {
  equipment: Equipment[]
}

export function useBulkActions(equipment: Equipment[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === equipment.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(equipment.map(e => e.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const isSelected = (id: string) => selectedIds.has(id)
  const isAllSelected = selectedIds.size === equipment.length && equipment.length > 0
  const hasSelection = selectedIds.size > 0

  return {
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    hasSelection,
    selectedCount: selectedIds.size
  }
}

interface BulkActionsBarProps {
  selectedCount: number
  selectedIds: string[]
  equipment: Equipment[]
  onClear: () => void
}

export function BulkActionsBar({ 
  selectedCount, 
  selectedIds, 
  equipment,
  onClear 
}: BulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const selectedEquipment = equipment.filter(e => selectedIds.includes(e.id))
  const allActive = selectedEquipment.every(e => e.is_active)
  const allInactive = selectedEquipment.every(e => !e.is_active)
  const mixedStatus = !allActive && !allInactive

  async function handleBulkDelete() {
    setLoading(true)
    const result = await bulkSoftDeleteEquipment(selectedIds)
    
    if (result.success) {
      toast.success(result.message)
      onClear()
      router.refresh()
    } else {
      toast.error(result.message)
    }
    
    setLoading(false)
    setShowDeleteDialog(false)
  }

  async function handleBulkRestore() {
    setLoading(true)
    const result = await bulkRestoreEquipment(selectedIds)
    
    if (result.success) {
      toast.success(result.message)
      onClear()
      router.refresh()
    } else {
      toast.error(result.message)
    }
    
    setLoading(false)
    setShowRestoreDialog(false)
  }

  if (selectedCount === 0) return null

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white border shadow-lg rounded-xl px-4 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-blue-600" />
          <span className="font-medium">
            {selectedCount} alat dipilih
          </span>
        </div>
        
        <div className="h-6 w-px bg-slate-200" />
        
        <div className="flex items-center gap-2">
          {(allActive || mixedStatus) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Nonaktifkan
            </Button>
          )}
          
          {(allInactive || mixedStatus) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRestoreDialog(true)}
              className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Aktifkan
            </Button>
          )}
        </div>
        
        <div className="h-6 w-px bg-slate-200" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-slate-500"
        >
          <X className="h-4 w-4 mr-1" />
          Batal
        </Button>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan {selectedCount} Alat?</DialogTitle>
            <DialogDescription>
              Anda yakin ingin menonaktifkan {selectedCount} alat yang dipilih?
              <br /><br />
              Alat yang dinonaktifkan tidak akan ditampilkan di katalog publik.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={loading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menonaktifkan...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Nonaktifkan {selectedCount} Alat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aktifkan {selectedCount} Alat?</DialogTitle>
            <DialogDescription>
              Anda yakin ingin mengaktifkan kembali {selectedCount} alat yang dipilih?
              <br /><br />
              Alat akan kembali ditampilkan di katalog publik.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)} disabled={loading}>
              Batal
            </Button>
            <Button onClick={handleBulkRestore} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengaktifkan...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Aktifkan {selectedCount} Alat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface SelectAllCheckboxProps {
  checked: boolean
  onCheckedChange: () => void
  disabled?: boolean
}

export function SelectAllCheckbox({ checked, onCheckedChange, disabled }: SelectAllCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="h-5 w-5 border-2"
    />
  )
}

interface ItemCheckboxProps {
  checked: boolean
  onCheckedChange: () => void
}

export function ItemCheckbox({ checked, onCheckedChange }: ItemCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="h-4 w-4"
    />
  )
}
