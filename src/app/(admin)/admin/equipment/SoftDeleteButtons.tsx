'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { softDeleteEquipment, restoreEquipment } from './equipmentActions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, RotateCcw, Loader2 } from 'lucide-react'

interface SoftDeleteButtonProps {
  equipmentId: string
  equipmentName: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
}

export function SoftDeleteButton({ 
  equipmentId, 
  equipmentName, 
  variant = 'outline',
  size = 'sm'
}: SoftDeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    const result = await softDeleteEquipment(equipmentId)
    
    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
    
    setLoading(false)
    setOpen(false)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Nonaktifkan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan Alat?</DialogTitle>
            <DialogDescription>
              Anda yakin ingin menonaktifkan alat <strong>{equipmentName}</strong>?
              <br /><br />
              Alat yang dinonaktifkan tidak akan ditampilkan di katalog publik, 
              tetapi data dan riwayat peminjaman tetap tersimpan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menonaktifkan...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Nonaktifkan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface RestoreButtonProps {
  equipmentId: string
  equipmentName: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
}

export function RestoreButton({ 
  equipmentId, 
  equipmentName,
  variant = 'outline',
  size = 'sm'
}: RestoreButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRestore() {
    setLoading(true)
    const result = await restoreEquipment(equipmentId)
    
    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
    
    setLoading(false)
    setOpen(false)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        Aktifkan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aktifkan Alat Kembali?</DialogTitle>
            <DialogDescription>
              Anda yakin ingin mengaktifkan kembali alat <strong>{equipmentName}</strong>?
              <br /><br />
              Alat akan kembali ditampilkan di katalog publik dan dapat dipinjam.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button 
              variant="default"
              onClick={handleRestore}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengaktifkan...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Aktifkan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
