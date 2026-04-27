import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Building2, Layers } from 'lucide-react'
import { BuildingActions } from './BuildingActions'

export default async function BuildingsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: buildings } = await (supabase.from('buildings') as any)
    .select('*, assets(count)')
    .order('name') as { data: Array<{id:string;name:string;code:string;floor_count:number;is_active:boolean;assets:{count:number}[]}> | null }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gedung</h1>
          <p className="text-muted-foreground text-sm">Kelola data gedung dan lantai</p>
        </div>
        <Link href="/admin/buildings/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Gedung
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Daftar Gedung ({buildings?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Gedung</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Lantai</TableHead>
                <TableHead>Ruang Aktif</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Belum ada data gedung
                  </TableCell>
                </TableRow>
              )}
              {buildings?.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{b.code}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3 text-muted-foreground" />
                      {b.floor_count} lantai
                    </span>
                  </TableCell>
                  <TableCell>{(b.assets as {count: number}[])?.[0]?.count ?? 0} ruang</TableCell>
                  <TableCell>
                    <Badge variant={b.is_active ? 'default' : 'secondary'}>
                      {b.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <BuildingActions id={b.id} isActive={b.is_active} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
