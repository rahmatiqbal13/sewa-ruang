import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Boxes, ChevronRight } from 'lucide-react'

export default async function InventoryIndexPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: rooms } = await sb
    .from('assets')
    .select('id, name, room_code, buildings(name), room_inventory_items(id)')
    .eq('category', 'room')
    .eq('is_active', true)
    .order('name') as {
      data: Array<{
        id: string; name: string; room_code: string | null
        buildings: { name: string } | null
        room_inventory_items: Array<{ id: string }>
      }> | null
    }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventaris Ruangan</h1>
        <p className="text-muted-foreground text-sm">Pilih ruangan untuk melihat dan mengelola inventarisnya</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Daftar Ruangan ({rooms?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ruangan</TableHead>
                <TableHead>Gedung</TableHead>
                <TableHead>Jumlah Item</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Belum ada ruangan aktif
                  </TableCell>
                </TableRow>
              )}
              {rooms?.map((room) => {
                const itemCount = room.room_inventory_items?.length ?? 0
                return (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">
                      {room.name}
                      {room.room_code && (
                        <span className="ml-2 font-mono text-xs text-muted-foreground">({room.room_code})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(room.buildings as { name: string } | null)?.name ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={itemCount > 0 ? 'default' : 'secondary'}>
                        {itemCount} item
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/inventory/${room.id}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Kelola <ChevronRight className="ml-1 h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
