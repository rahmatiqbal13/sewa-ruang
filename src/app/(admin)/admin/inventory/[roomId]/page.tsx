import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'
import { AddInventoryItemDialog } from './AddInventoryItemDialog'
import { InventoryItemActions } from './InventoryItemActions'
import { formatDateTime, cn } from '@/lib/utils'

export default async function InventoryPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: room }, { data: items }] = await Promise.all([
    sb.from('assets').select('id, name, room_code, buildings(name)').eq('id', roomId).single() as Promise<{data:{id:string;name:string;room_code:string|null;buildings:{name:string}|null}|null}>,
    sb.from('room_inventory_items').select('*, users:last_updated_by(name)').eq('room_asset_id', roomId).eq('is_active', true).order('name') as Promise<{data:Array<{id:string;name:string;quantity:number;condition:string;inventory_code:string|null;notes:string|null;last_updated_at:string;users:{name:string}|null}>|null}>,
  ])

  if (!room) notFound()

  const conditionMap: Record<string, { label: string; variant: 'default'|'outline'|'destructive' }> = {
    good: { label: 'Baik', variant: 'default' },
    needs_repair: { label: 'Perlu Perbaikan', variant: 'outline' },
    damaged: { label: 'Rusak', variant: 'destructive' },
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/assets" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Inventaris Ruangan</h1>
          <p className="text-muted-foreground text-sm">
            {room.name} {room.room_code && `(${room.room_code})`} — {(room.buildings as {name:string}|null)?.name}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items?.length ?? 0} item inventaris</p>
        <AddInventoryItemDialog roomId={roomId} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Item</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Terakhir Diperbarui</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Belum ada item inventaris
                  </TableCell>
                </TableRow>
              )}
              {items?.map((item) => {
                const cond = conditionMap[item.condition]
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.inventory_code ?? '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell><Badge variant={cond?.variant}>{cond?.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(item.last_updated_at)}
                      {(item.users as {name:string}|null)?.name && (
                        <span className="block text-xs">oleh {(item.users as {name:string}).name}</span>
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
