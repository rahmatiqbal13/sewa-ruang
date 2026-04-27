import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Package } from 'lucide-react'
import { AssetActions } from './AssetActions'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { AvailabilityBadge } from '@/components/shared/AvailabilityBadge'
import { ActionStatusBadge } from '@/components/shared/ActionStatusBadge'
import { formatRupiah } from '@/lib/utils'

export default async function AssetsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assets } = await (supabase.from('assets') as any)
    .select('id, name, room_code, current_condition, rate_per_hour, is_active, merk, ketersediaan, status_tindakan, sumber, buildings(name)')
    .eq('category', 'equipment')
    .order('name') as {
      data: Array<{
        id: string; name: string; room_code: string | null
        current_condition: string; rate_per_hour: number | null; is_active: boolean
        merk: string | null; ketersediaan: string | null; status_tindakan: string | null
        sumber: string | null; buildings: { name: string } | null
      }> | null
    }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alat / Peralatan</h1>
          <p className="text-muted-foreground text-sm">Kelola inventaris peralatan yang dapat dipinjam</p>
        </div>
        <Link href="/admin/assets/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Alat
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Semua Alat ({assets?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Alat</TableHead>
                <TableHead>Merk</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Tarif/Jam</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Ketersediaan</TableHead>
                <TableHead>Status Tindakan</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Belum ada data alat. <Link href="/admin/assets/new" className="text-primary hover:underline">Tambah sekarang</Link>
                  </TableCell>
                </TableRow>
              )}
              {assets?.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-sm">{a.merk ?? <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell className="text-sm">{a.sumber ?? <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell>{a.rate_per_hour ? formatRupiah(a.rate_per_hour) : <span className="text-muted-foreground text-sm">-</span>}</TableCell>
                  <TableCell><ConditionBadge condition={a.current_condition} /></TableCell>
                  <TableCell><AvailabilityBadge status={(a.ketersediaan ?? 'tersedia') as 'tersedia' | 'digunakan' | 'hilang'} /></TableCell>
                  <TableCell><ActionStatusBadge status={(a.status_tindakan ?? 'normal') as 'normal' | 'perawatan' | 'menunggu_part' | 'afkir'} /></TableCell>
                  <TableCell>
                    <AssetActions id={a.id} isActive={a.is_active} />
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
