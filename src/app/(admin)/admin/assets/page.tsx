import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Package } from 'lucide-react'
import { AssetActions } from './AssetActions'
import { formatRupiah } from '@/lib/utils'

const conditionLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  good: { label: 'Baik', variant: 'default' },
  needs_repair: { label: 'Perlu Perbaikan', variant: 'outline' },
  damaged: { label: 'Rusak', variant: 'destructive' },
  lost: { label: 'Hilang', variant: 'destructive' },
}

export default async function AssetsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assets } = await (supabase.from('assets') as any)
    .select('*, buildings(name, code)')
    .order('category')
    .order('name') as { data: Array<{id:string;name:string;category:string;room_code:string|null;current_condition:string;rate_per_hour:number|null;is_active:boolean;buildings:{name:string;code:string}|null}> | null }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aset</h1>
          <p className="text-muted-foreground text-sm">Kelola ruang dan peralatan</p>
        </div>
        <Link href="/admin/assets/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Aset
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Semua Aset ({assets?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Kode / Gedung</TableHead>
                <TableHead>Tarif/Jam</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Belum ada data aset
                  </TableCell>
                </TableRow>
              )}
              {assets?.map((a) => {
                const cond = conditionLabel[a.current_condition]
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>
                      <Badge variant={a.category === 'room' ? 'default' : 'secondary'}>
                        {a.category === 'room' ? 'Ruang' : 'Alat'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.room_code
                        ? <span className="font-mono font-medium text-foreground">{a.room_code}</span>
                        : (a.buildings as {name:string}|null)?.name ?? '-'}
                    </TableCell>
                    <TableCell>{a.rate_per_hour ? formatRupiah(a.rate_per_hour) : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={cond.variant}>{cond.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.is_active ? 'default' : 'secondary'}>
                        {a.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AssetActions id={a.id} isActive={a.is_active} />
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
