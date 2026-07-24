'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, RotateCcw, AlertTriangle, Package, Boxes, DoorOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { restoreItem, hardDeleteItem, hardDeleteMany, restoreMany } from './actions'

export type TrashItemType = 'equipment' | 'room' | 'inventory'

export interface TrashItem {
  id: string
  name: string
  code: string | null
  type: TrashItemType
  typeLabel: string
  deletedAt: string
  extra?: string | null
}

interface TrashClientProps {
  items: TrashItem[]
}

type ConfirmAction =
  | { kind: 'delete-one'; item: TrashItem }
  | { kind: 'delete-many'; selected: TrashItem[] }
  | { kind: 'restore-one'; item: TrashItem }
  | { kind: 'restore-many'; selected: TrashItem[] }

const TYPE_TABS: { key: TrashItemType | 'all'; label: string }[] = [
  { key: 'all',       label: 'Semua' },
  { key: 'inventory', label: 'Inventaris' },
  { key: 'equipment', label: 'Alat' },
  { key: 'room',      label: 'Ruangan' },
]

const TYPE_ICON: Record<TrashItemType, React.ReactNode> = {
  inventory: <Boxes   className="h-4 w-4 text-red-500" />,
  equipment: <Package className="h-4 w-4 text-red-500" />,
  room:      <DoorOpen className="h-4 w-4 text-red-500" />,
}

// Group array of items by their .type field
function groupByType(items: TrashItem[]): Record<TrashItemType, string[]> {
  const groups: Record<TrashItemType, string[]> = { inventory: [], equipment: [], room: [] }
  for (const item of items) groups[item.type].push(item.id)
  return groups
}

export function TrashClient({ items }: TrashClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab]   = useState<TrashItemType | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirm, setConfirm]       = useState<ConfirmAction | null>(null)
  const [loading, setLoading]       = useState(false)

  const filteredItems   = activeTab === 'all' ? items : items.filter(i => i.type === activeTab)
  const selectedInTab   = filteredItems.filter(i => selectedIds.has(i.id))
  const allTabSelected  = filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id))
  const partialSelected = selectedInTab.length > 0 && !allTabSelected
  const hasSelection    = selectedInTab.length > 0

  const countOf = (key: TrashItemType | 'all') =>
    key === 'all' ? items.length : items.filter(i => i.type === key).length

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  const toggleAll = () => {
    const ids = filteredItems.map(i => i.id)
    if (allTabSelected) {
      const next = new Set(selectedIds)
      ids.forEach(id => next.delete(id))
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      ids.forEach(id => next.add(id))
      setSelectedIds(next)
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  // Execute the confirmed action — handles mixed types by grouping
  async function executeConfirm() {
    if (!confirm) return
    setLoading(true)

    try {
      if (confirm.kind === 'delete-one') {
        const res = await hardDeleteItem(confirm.item.id, confirm.item.type)
        if (res?.error) throw new Error(res.error)
        toast.success(`"${confirm.item.name}" dihapus permanen`)

      } else if (confirm.kind === 'delete-many') {
        const groups = groupByType(confirm.selected)
        const results = await Promise.all(
          (Object.entries(groups) as [TrashItemType, string[]][])
            .filter(([, ids]) => ids.length > 0)
            .map(([type, ids]) => hardDeleteMany(ids, type))
        )
        const err = results.find(r => r?.error)
        if (err?.error) throw new Error(err.error)
        toast.success(`${confirm.selected.length} item dihapus permanen`)

      } else if (confirm.kind === 'restore-one') {
        const res = await restoreItem(confirm.item.id, confirm.item.type)
        if (res?.error) throw new Error(res.error)
        toast.success(`"${confirm.item.name}" berhasil direstore`)

      } else if (confirm.kind === 'restore-many') {
        const groups = groupByType(confirm.selected)
        const results = await Promise.all(
          (Object.entries(groups) as [TrashItemType, string[]][])
            .filter(([, ids]) => ids.length > 0)
            .map(([type, ids]) => restoreMany(ids, type))
        )
        const err = results.find(r => r?.error)
        if (err?.error) throw new Error(err.error)
        toast.success(`${confirm.selected.length} item berhasil direstore`)
      }

      clearSelection()
      router.refresh()
    } catch (e) {
      toast.error('Gagal: ' + (e instanceof Error ? e.message : 'Unknown error'))
    }

    setLoading(false)
    setConfirm(null)
  }

  const isDestructive = confirm?.kind.startsWith('delete') ?? false

  const confirmTitle = !confirm ? '' :
    confirm.kind === 'delete-one'    ? `Hapus permanen "${confirm.item.name}"?` :
    confirm.kind === 'delete-many'   ? `Hapus permanen ${confirm.selected.length} item?` :
    confirm.kind === 'restore-one'   ? `Restore "${confirm.item.name}"?` :
                                       `Restore ${confirm.selected.length} item?`

  const confirmDesc = !confirm ? '' :
    isDestructive
      ? 'Data akan dihapus permanen dari database dan tidak dapat dikembalikan.'
      : 'Item akan diaktifkan kembali dan muncul di sistem.'

  return (
    <>
      {/* Confirm Dialog */}
      <AlertDialog open={confirm !== null} onOpenChange={open => { if (!open && !loading) setConfirm(null) }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className={isDestructive ? 'bg-red-50' : 'bg-green-50'}>
              {isDestructive
                ? <AlertTriangle className="size-5 text-red-600" />
                : <RotateCcw   className="size-5 text-green-600" />}
            </AlertDialogMedia>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={isDestructive ? 'destructive' : 'default'}
              disabled={loading}
              onClick={executeConfirm}
            >
              {loading ? 'Memproses...' : isDestructive ? 'Hapus Permanen' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); clearSelection() }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-medium border transition-all',
              activeTab === tab.key
                ? 'bg-foreground text-white border-foreground'
                : 'bg-card border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {tab.label}
            <span className={cn(
              'text-xs rounded-full px-1.5 py-0.5 font-bold',
              activeTab === tab.key ? 'bg-white/20' : 'bg-muted'
            )}>
              {countOf(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Selection & Bulk Action Bar */}
      {filteredItems.length > 0 && (
        <div className={cn(
          'flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-[12px] border transition-colors',
          hasSelection ? 'bg-red-50 border-red-200' : 'bg-card border-border'
        )}>
          {/* Left: checkbox + status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allTabSelected}
              ref={el => { if (el) el.indeterminate = partialSelected }}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-border text-red-600 cursor-pointer"
            />
            <span className="text-sm">
              {allTabSelected
                ? <span className="font-medium text-red-700">Semua {filteredItems.length} item dipilih</span>
                : hasSelection
                  ? <span className="font-medium text-foreground">{selectedInTab.length} dari {filteredItems.length} item dipilih</span>
                  : <span className="text-muted-foreground">Pilih semua {filteredItems.length} item</span>
              }
            </span>
            {hasSelection && (
              <button
                onClick={clearSelection}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Batalkan pilihan
              </button>
            )}
          </div>

          {/* Right: bulk action buttons */}
          {hasSelection && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50 gap-1.5"
                onClick={() => setConfirm({ kind: 'restore-many', selected: selectedInTab })}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore ({selectedInTab.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-100 gap-1.5 font-medium"
                onClick={() => setConfirm({ kind: 'delete-many', selected: selectedInTab })}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Permanen ({selectedInTab.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Item List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-[14px]">
          <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Trash kosong</p>
          <p className="text-sm mt-1">
            {activeTab === 'all' ? 'Tidak ada item yang dihapus' : `Tidak ada ${TYPE_TABS.find(t => t.key === activeTab)?.label} yang dihapus`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => {
            const selected = selectedIds.has(item.id)
            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={cn(
                  'flex items-center justify-between p-4 rounded-[12px] border transition-colors cursor-pointer select-none',
                  selected
                    ? 'bg-red-50 border-red-200'
                    : 'bg-card border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(item.id)}
                    onClick={e => e.stopPropagation()}
                    className="h-4 w-4 rounded border-border text-red-600 shrink-0 cursor-pointer"
                  />
                  <div className="h-9 w-9 bg-red-100 rounded-[10px] flex items-center justify-center shrink-0">
                    {TYPE_ICON[item.type]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate max-w-[200px] sm:max-w-sm">
                        {item.name}
                      </p>
                      <Badge variant="outline" className="text-xs shrink-0">{item.typeLabel}</Badge>
                      {item.code && (
                        <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.extra && <span className="mr-2 text-foreground/60">{item.extra}</span>}
                      Dihapus {new Date(item.deletedAt).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Per-item actions */}
                <div
                  className="flex items-center gap-2 shrink-0 ml-3"
                  onClick={e => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => setConfirm({ kind: 'restore-one', item })}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Restore</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setConfirm({ kind: 'delete-one', item })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Hapus Permanen</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filteredItems.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          {filteredItems.length} item di trash
        </p>
      )}
    </>
  )
}
