'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Download, FileUp, CheckSquare, Package, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { AddInventoryItemDialog } from './AddInventoryItemDialog'
import { InventoryItemActions } from './InventoryItemActions'
import { formatDateTime, cn } from '@/lib/utils'
import { exportInventoryToExcel, downloadInventoryTemplate } from '../exportInventory'
import { importInventoryFromExcel } from '../importInventory'
import { ImportDialog } from '../../equipment/ImportDialog'
import type { ImportResult } from '../../equipment/importEquipment'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface InventoryItem {
  id: string
  name: string
  merk: string | null
  quantity: number
  condition: 'good' | 'needs_repair' | 'damaged'
  inventory_code: string | null
  notes: string | null
  last_updated_at: string
  users: { name: string } | null
  photo_url: string | null
  room_id: string
}

interface Room {
  id: string
  name: string
  room_code: string | null
  buildings: { name: string } | null
}

interface RoomInventoryListProps {
  room: Room
  items: InventoryItem[]
  allItems: InventoryItem[]
  roomId: string
}

export function RoomInventoryList({ room, items, allItems, roomId }: RoomInventoryListProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<'bulk' | string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(item => item.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const isSelected = (id: string) => selectedIds.has(id)
  const isAllSelected = selectedIds.size === items.length && items.length > 0
  const isPartialSelected = selectedIds.size > 0 && selectedIds.size < items.length
  const hasSelection = selectedIds.size > 0

  async function confirmDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase.from('room_inventories') as any

    const now = new Date().toISOString()
    if (deleteTarget === 'bulk') {
      const ids = Array.from(selectedIds)
      const { error } = await sb.update({ is_active: false, deleted_at: now }).in('id', ids)
      if (error) toast.error('Gagal menghapus: ' + error.message)
      else { toast.success(`${ids.length} item berhasil dihapus`); clearSelection(); router.refresh() }
    } else {
      const { error } = await sb.update({ is_active: false, deleted_at: now }).eq('id', deleteTarget)
      if (error) toast.error('Gagal menghapus: ' + error.message)
      else { toast.success('Item berhasil dihapus'); router.refresh() }
    }
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const handleExport = () => {
    setIsExporting(true)
    const selectedArray = Array.from(selectedIds)
    // Use allItems for export, but filter by selected if any
    const inventoryToExport = selectedArray.length > 0
      ? allItems.filter(item => selectedArray.includes(item.id))
      : allItems
    
    // Transform data for export
    const exportData = inventoryToExport.map(item => ({
      id: item.id,
      name: item.name,
      merk: item.merk,
      inventory_code: item.inventory_code,
      quantity: item.quantity,
      condition: item.condition,
      notes: item.notes,
      is_active: true,
    }))
    
    exportInventoryToExcel(selectedArray, exportData, {
      id: room.id,
      name: room.name,
      room_code: room.room_code || ''
    })
    setIsExporting(false)
    clearSelection()
  }

  const handleImport = async (formData: FormData): Promise<ImportResult> => {
    return await importInventoryFromExcel(formData, roomId)
  }

  const conditionMap: Record<string, { label: string; variant: 'default'|'outline'|'destructive' }> = {
    good: { label: 'Baik', variant: 'default' },
    needs_repair: { label: 'Perlu Perbaikan', variant: 'outline' },
    damaged: { label: 'Rusak', variant: 'destructive' },
  }

  return (
    <div className="p-6 space-y-6">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={open => { if (!open && !isDeleting) setDeleteTarget(null) }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-red-50">
              <AlertTriangle className="size-5 text-red-600" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {deleteTarget === 'bulk' ? `Hapus ${selectedIds.size} item?` : 'Hapus item ini?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === 'bulk'
                ? `${selectedIds.size} item inventaris akan dihapus. Item bisa dipulihkan dari halaman Trash.`
                : 'Item inventaris ini akan dihapus. Bisa dipulihkan dari halaman Trash.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={confirmDelete}>
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => {
          setIsImportDialogOpen(false)
          router.refresh()
        }}
        onImport={handleImport}
        onDownloadTemplate={downloadInventoryTemplate}
        title="Import Inventaris"
        description={`Unggah file Excel untuk mengimport data inventaris ke ruangan ${room.name}`}
        entityName="inventaris"
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/inventory" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventaris Ruangan</h1>
          <p className="text-muted-foreground text-sm">
            {room.name} {room.room_code && `(${room.room_code})`} — {room.buildings?.name}
          </p>
        </div>
      </div>

      {/* Stats and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border rounded-[10px] px-3 py-1.5">
            <Package className="h-4 w-4 text-teal-500" />
            {items.length} item inventaris
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isExporting} className="hidden sm:flex">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {hasSelection ? `Export (${selectedIds.size})` : 'Export Semua'}
          </Button>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="hidden sm:flex">
            <FileUp className="mr-2 h-4 w-4" />Import
          </Button>
          <AddInventoryItemDialog roomId={roomId} />
        </div>
      </div>

      {/* Selection Bar */}
      <div className="flex items-center justify-between bg-card border rounded-[10px] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={el => { if (el) el.indeterminate = isPartialSelected }}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-border text-red-600 cursor-pointer"
          />
          <span className="text-sm text-muted-foreground">
            {isAllSelected
              ? <span className="text-foreground font-medium">Semua {items.length} item dipilih</span>
              : hasSelection
                ? <span className="text-foreground font-medium">{selectedIds.size} dari {items.length} dipilih</span>
                : <span>Pilih semua {items.length} item</span>}
          </span>
          {hasSelection && (
            <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground underline">
              Batalkan
            </button>
          )}
        </div>
        {hasSelection && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeleteTarget('bulk')}
            className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={el => { if (el) el.indeterminate = isPartialSelected }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border text-red-600 cursor-pointer"
                  />
                </TableHead>
                <TableHead>Nama Item</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Terakhir Diperbarui</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    Belum ada item inventaris
                    <div className="mt-4">
                      <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="mr-2">
                        <FileUp className="mr-2 h-4 w-4" />
                        Import dari Excel
                      </Button>
                      <AddInventoryItemDialog roomId={roomId} />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => {
                const cond = conditionMap[item.condition]
                const selected = isSelected(item.id)
                
                return (
                  <TableRow 
                    key={item.id}
                    className={cn(selected && 'bg-blue-50/50')}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelection(item.id)}
                        className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.photo_url && (
                          <div className="h-8 w-8 rounded bg-muted overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={item.photo_url} 
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{item.inventory_code ?? '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell><Badge variant={cond?.variant}>{cond?.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(item.last_updated_at)}
                      {item.users?.name && (
                        <span className="block text-xs">oleh {item.users.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <InventoryItemActions item={{
                          id: item.id,
                          name: item.name,
                          merk: item.merk,
                          quantity: item.quantity,
                          condition: item.condition,
                          inventory_code: item.inventory_code,
                          notes: item.notes,
                          photo_url: item.photo_url,
                          room_id: item.room_id,
                        }} />
                        <button
                          onClick={() => setDeleteTarget(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Hapus item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Links */}
      <div className="flex gap-2">
        <Link href={`/rooms/${roomId}/inventory`} target="_blank" className={buttonVariants({ variant: 'outline' })}>
          Lihat Tampilan Publik
        </Link>
        <Link href={`/admin/qr?id=${roomId}&type=room`} className={buttonVariants({ variant: 'outline' })}>
          Generate QR Code Ruang
        </Link>
      </div>
    </div>
  )
}
