import { createAdminDbClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, Building2, MapPin, Users, Package, 
  Plus, Edit, QrCode, ClipboardList
} from 'lucide-react'
import { SafeImage } from '@/components/shared/SafeImage'

interface Props {
  params: Promise<{ id: string }>
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  classroom: 'Ruang Kelas',
  meeting_room: 'Ruang Rapat',
  laboratory: 'Laboratorium',
  auditorium: 'Auditorium',
  library: 'Perpustakaan',
  office: 'Kantor',
  other: 'Lainnya',
}

const CONDITION_LABELS: Record<string, string> = {
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Kurang',
  damaged: 'Rusak',
}

const CONDITION_COLORS: Record<string, string> = {
  good: 'bg-green-100 text-green-700',
  fair: 'bg-yellow-100 text-yellow-700',
  poor: 'bg-orange-100 text-orange-700',
  damaged: 'bg-red-100 text-red-700',
}

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default async function RoomDetailPage({ params }: Props) {
  const { id: slug } = await params
  const sb = createAdminDbClient()

  // Find room by slug
  const { data: allRooms } = await sb.from('rooms').select('id, name')
  const matched = allRooms?.find((r: { id: string; name: string }) => createSlug(r.name) === slug)
  if (!matched) notFound()
  const id = matched.id

  // Get room data with building
  const { data: room } = await sb
    .from('rooms')
    .select(`
      id, name, building_id, floor_number, room_sequence, room_code, description, capacity,
      rate_per_hour, rate_per_day, is_active, is_for_rent, operating_hours, current_condition,
      photo_url, created_by, created_at, updated_at,
      buildings(id, name, code, floor_count)
    `)
    .eq('id', id)
    .single() as any

  if (!room) {
    notFound()
  }

  // Get inventory items for this room
  const { data: inventory } = await sb
    .from('room_inventory_items')
    .select('*')
    .eq('room_asset_id', id)
    .eq('is_active', true)
    .order('name')

  // Get equipment that can be rented (optional - for future QR feature)
  const { data: equipment } = await sb
    .from('equipment')
    .select('id, name, equipment_code, current_condition, ketersediaan')
    .eq('storage_room_id', id)
    .eq('is_active', true)
    .order('name')

  const building = room.buildings

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link 
            href="/admin/rooms"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Ruangan
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{room.name}</h1>
            <Badge variant={room.is_active ? 'default' : 'secondary'}>
              {room.is_active ? 'Aktif' : 'Nonaktif'}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono">{room.room_code}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="rounded-[10px]">
            <Link href={`/admin/rooms/${slug}/edit`}>
              <Edit className="h-4 w-4 mr-2" /> Edit Ruangan
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-[10px]">
            <Link href={`/admin/inventory/new?roomId=${id}`}>
              <Plus className="h-4 w-4 mr-2" /> Tambah Inventaris
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Room Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Photos */}
          <Card className="rounded-[14px] overflow-hidden">
            <div className="aspect-video bg-muted flex items-center justify-center relative">
              {room.photo_url ? (
                <SafeImage
                  src={room.photo_url}
                  alt={room.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="h-16 w-16 text-border" />
              )}
            </div>
            {room.door_photo_url && (
              <div className="border-t border-border">
                <div className="p-3 bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Foto Pintu</p>
                  <div className="aspect-[16/9] max-h-32 bg-muted rounded-[10px] overflow-hidden">
                    <SafeImage
                      src={room.door_photo_url}
                      alt={`Pintu ${room.name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Room Details */}
          <Card className="rounded-[14px]">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Informasi Ruangan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {building && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Gedung</p>
                    <p className="font-medium text-foreground">{building.name}</p>
                    <p className="text-sm text-muted-foreground/70">{building.code}</p>
                  </div>
                </div>
              )}

              {room.floor_number && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Lantai</p>
                    <p className="font-medium text-foreground">Lantai {room.floor_number}</p>
                  </div>
                </div>
              )}

              {room.capacity && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Kapasitas</p>
                    <p className="font-medium text-foreground">{room.capacity} orang</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Tipe Ruangan</p>
                  <p className="font-medium text-foreground">
                    {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Card - Future Feature */}
          <Card className="bg-blue-50 border-blue-200 rounded-[14px]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <QrCode className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Fitur QR Code</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Nantinya akan ada kartu inventaris dengan QR code untuk audit.
                    Auditor scan untuk melihat inventaris lengkap.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Inventory & Equipment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inventory Section */}
          <Card className="rounded-[14px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <ClipboardList className="h-5 w-5" />
                  Inventaris Ruangan
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {inventory?.length || 0} item inventaris
                </p>
              </div>
              <Button size="sm" asChild className="rounded-[10px]">
                <Link href={`/admin/inventory/new?roomId=${id}`}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Link>
              </Button>

            </CardHeader>
            <CardContent>
              {inventory && inventory.length > 0 ? (
                <div className="border border-border rounded-[10px] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-foreground">Nama Barang</th>
                        <th className="text-center px-4 py-3 font-medium text-foreground">Jumlah</th>
                        <th className="text-left px-4 py-3 font-medium text-foreground">Kondisi</th>
                        <th className="text-left px-4 py-3 font-medium text-foreground">Keterangan</th>
                        <th className="text-right px-4 py-3 font-medium text-foreground">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {inventory.map((item: any) => (
                        <tr key={item.id} className="hover:bg-muted">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{item.name}</p>
                            {item.inventory_code && (
                              <p className="text-xs text-muted-foreground/70 font-mono">
                                {item.inventory_code}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline">{item.quantity}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-[10px] text-xs ${CONDITION_COLORS[item.condition] || 'bg-muted'}`}>
                              {CONDITION_LABELS[item.condition] || item.condition}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.notes || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/inventory/${slug}/items/${item.id}/edit`}>
                                Edit
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-[10px]">
                  <Package className="h-12 w-12 text-border mx-auto mb-3" />
                  <p className="text-muted-foreground">Belum ada inventaris</p>
                  <Button variant="outline" size="sm" className="mt-3 rounded-[10px]" asChild>
                    <Link href={`/admin/inventory/new?roomId=${id}`}>
                      <Plus className="h-4 w-4 mr-1" /> Tambah Inventaris
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equipment Section (if any) */}
          {equipment && equipment.length > 0 && (
            <Card className="rounded-[14px]">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Alat Sewa di Ruangan Ini</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {equipment.length} alat yang tersimpan di ruangan ini
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {equipment.map((eq: any) => (
                    <div 
                      key={eq.id} 
                      className="flex items-center justify-between p-3 border border-border rounded-[10px] hover:bg-muted"
                    >
                      <div>
                        <p className="font-medium text-foreground">{eq.name}</p>
                        <p className="text-xs text-muted-foreground/70 font-mono">
                          {eq.equipment_code}
                        </p>
                      </div>
                      <Badge 
                        variant={eq.ketersediaan === 'tersedia' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {eq.ketersediaan}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
