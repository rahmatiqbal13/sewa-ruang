import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, DoorOpen, Boxes } from 'lucide-react'
import { AssetActions } from '../assets/AssetActions'
import { formatRupiah } from '@/lib/utils'

const conditionLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  good: { label: 'Baik', variant: 'default' },
  needs_repair: { label: 'Perlu Perbaikan', variant: 'outline' },
  damaged: { label: 'Rusak', variant: 'destructive' },
  lost: { label: 'Hilang', variant: 'destructive' },
}

export default async function RoomsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rooms } = await (supabase.from('assets') as any)
    .select('id, name, room_code, floor_number, capacity, rate_per_hour, current_condition, is_active, buildings(name, code)')
    .eq('category', 'room')
    .order('buildings(name)')
    .order('name') as {
      data: Array<{
        id: string; name: string; room_code: string | null; floor_number: number | null
        capacity: number | null; rate_per_hour: number | null; current_condition: string
        is_active: boolean; buildings: { name: string; code: string } | null
      }> | null
    }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ruangan</h1>
          <p className="text-muted-foreground text-sm">Kelola ruangan yang tersedia untuk peminjaman</p>
        </div>
        <Link href="/admin/assets/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Ruangan
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DoorOpen className="h-4 w-4" />
            Semua Ruangan ({rooms?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Ruangan</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Gedung / Lantai</TableHead>
                <TableHead>Kapasitas</TableHead>
                <TableHead>Tarif/Jam</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Belum ada ruangan. <Link href="/admin/assets/new" className="text-primary hover:underline">Tambah sekarang</Link>
                  </TableCell>
                </TableRow>
              )}
              {rooms?.map((room) => {
                const cond = conditionLabel[room.current_condition]
                const building = room.buildings as { name: string; code: string } | null
                return (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell>
                      {room.room_code
                        ? <span className="font-mono text-sm font-medium">{room.room_code}</span>
                        : <span className="text-muted-foreground text-sm">-</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {building?.name ?? '-'}
                      {room.floor_number && <span className="block text-xs">Lantai {room.floor_number}</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {room.capacity ? `${room.capacity} orang` : '-'}
                    </TableCell>
                    <TableCell>{room.rate_per_hour ? formatRupiah(room.rate_per_hour) : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={cond?.variant ?? 'secondary'}>{cond?.label ?? room.current_condition}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={room.is_active ? 'default' : 'secondary'}>
                        {room.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/inventory/${room.id}`}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          <Boxes className="h-3 w-3 mr-1" /> Inventaris
                        </Link>
                        <AssetActions id={room.id} isActive={room.is_active} />
                      </div>
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
