'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Download, FileUp, Plus, CheckSquare, Package, Loader2 } from 'lucide-react'
import { AddInventoryItemDialog } from './AddInventoryItemDialog'
import { InventoryItemActions } from './InventoryItemActions'
import { formatDateTime, cn } from '@/lib/utils'
import { exportInventoryToExcel, downloadInventoryTemplate } from '../exportInventory'
import { importInventoryFromExcel } from '../importInventory'
import { ImportDialog } from '../../equipment/ImportDialog'
import type { ImportResult } from '../../equipment/importEquipment'

interface InventoryItem {
  id: string
  name: string
  quantity: number
  condition: string
  inventory_code: string | null
  notes: string | null
  last_updated_at: string
  users: { name: string } | null
  photo_url: string | null
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
  const hasSelection = selectedIds.size > 0

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
      item_name: item.name,
      quantity: item.quantity,
      condition: item.condition,
      description: item.notes,
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
          <h1 className="text-2xl font-bold">Inventaris Ruangan</h1>
          <p className="text-muted-foreground text-sm">
            {room.name} {room.room_code && `(${room.room_code})`} — {room.buildings?.name}
          </p>
        </div>
      </div>

      {/* Stats and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-500 bg-white border rounded-lg px-3 py-1.5">
            <Package className="h-4 w-4 text-teal-500" />
            {items.length} item inventaris
          </div>
          {hasSelection && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
              <CheckSquare className="h-4 w-4" />
              {selectedIds.size} dipilih
              <button 
                onClick={clearSelection}
                className="text-xs underline hover:text-blue-800 ml-1"
              >
                Batal
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Export Selected Button */}
          {hasSelection && (
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
              className="hidden sm:flex border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export ({selectedIds.size})
            </Button>
          )}
          
          {/* Export All Button */}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="hidden sm:flex"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? 'Mengekspor...' : 'Export Semua'}
          </Button>
          
          {/* Import Button */}
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            className="hidden sm:flex"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Import
          </Button>
          
          <AddInventoryItemDialog roomId={roomId} />
        </div>
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
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.photo_url && (
                          <div className="h-8 w-8 rounded bg-gray-100 overflow-hidden">
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
                    <TableCell className="font-mono text-sm">{item.inventory_code ?? '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell><Badge variant={cond?.variant}>{cond?.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(item.last_updated_at)}
                      {item.users?.name && (
                        <span className="block text-xs">oleh {item.users.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <InventoryItemActions item={item} />
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

// Helper function for buttonVariants
function buttonVariants({ variant, size }: { variant?: string; size?: string }) {
  const baseClass = "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
  
  const variantClasses: Record<string, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  }
  
  const sizeClasses: Record<string, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  }
  
  return `${baseClass} ${variantClasses[variant || 'default']} ${sizeClasses[size || 'default']}`
}
