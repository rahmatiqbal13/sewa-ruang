import { createAdminDbClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Building2, MapPin, Users, Package, 
  Plus, Edit, ClipboardList, BookOpen, DoorOpen,
  Layers, Tag, EyeOff
} from 'lucide-react'
import { SafeImage } from '@/components/shared/SafeImage'
import { ConditionBadge } from '@/components/shared/ConditionBadge'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default async function RoomDetailPage({ params }: Props) {
  const { id: slug } = await params
  const sb = createAdminDbClient()

  // Find room by slug (with UUID fallback for legacy URLs)
  const { data: allRooms } = await sb.from('rooms').select('id, name')
  let matched = allRooms?.find((r: { id: string; name: string }) => createSlug(r.name) === slug)
  // Fallback: if slug looks like a UUID, try matching by ID directly
  if (!matched && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
    matched = allRooms?.find((r: { id: string; name: string }) => r.id === slug)
  }
  if (!matched) notFound()
  const id = matched.id

  // Get room data with building
  const { data: room } = await sb
    .from('rooms')
    .select(`
      id, name, building_id, floor_number, room_sequence, room_code, description, capacity,
      rate_per_hour, rate_per_day, is_active, is_for_rent, operating_hours, current_condition,
      photo_url, door_photo_url, created_by, created_at, updated_at,
      buildings(id, name, code, floor_count)
    `)
    .eq('id', id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .single() as any

  if (!room) {
    notFound()
  }

  // Get inventory items for this room
  const { data: inventory } = await sb
    .from('room_inventories')
    .select('*')
    .eq('room_id', id)
    .eq('is_active', true)
    .order('name')

  // Get equipment that can be rented
  const { data: equipment } = await sb
    .from('equipment')
    .select('id, name, equipment_code, current_condition, ketersediaan, photo_url')
    .eq('storage_room_id', id)
    .eq('is_active', true)
    .order('name')

  const building = room.buildings
  const isForRent = room.is_for_rent !== false

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <Link 
            href="/admin/rooms"
            className="text-sm text-[#6B7280] hover:text-[#111827] flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Ruangan
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#111827]">{room.name}</h1>
            <Badge className={cn(
              "text-xs font-medium border-0",
              room.is_active ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            )}>
              {room.is_active ? 'Aktif' : 'Nonaktif'}
            </Badge>
            {isForRent ? (
              <span className="bg-[#0891B2] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Tag className="h-3 w-3" /> Disewakan
              </span>
            ) : (
              <span className="bg-[#6B7280] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <EyeOff className="h-3 w-3" /> Tidak Disewakan
              </span>
            )}
          </div>
          <p className="text-[#6B7280] font-mono text-sm mt-1">{room.room_code}</p>
          {room.description && (
            <p className="text-sm text-[#6B7280] mt-2 max-w-2xl">{room.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button variant="outline" asChild className="rounded-[10px] border-[#E5E7EB] h-9">
            <Link href={`/admin/rooms/${slug}/course-schedules`}>
              <BookOpen className="h-4 w-4 mr-2" /> Jadwal
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-[10px] border-[#E5E7EB] h-9">
            <Link href={`/admin/rooms/${slug}/edit`}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Link>
          </Button>
          <Button asChild className="rounded-[10px] bg-[#0891B2] hover:bg-[#0891B2]/90 text-white h-9">
            <Link href={`/admin/inventory/new?roomId=${id}`}>
              <Plus className="h-4 w-4 mr-2" /> Inventaris
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Room Info */}
        <div className="lg:col-span-1 space-y-5">
          {/* Photos */}
          <div className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden">
            <div className="aspect-video bg-[#F3F4F6] flex items-center justify-center relative">
              {room.photo_url ? (
                <SafeImage
                  src={room.photo_url}
                  alt={room.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <DoorOpen className="h-16 w-16 text-[#D1D5DB]" />
              )}
            </div>
            {room.door_photo_url && (
              <div className="border-t border-[#E5E7EB]">
                <div className="p-3">
                  <p className="text-xs font-medium text-[#6B7280] mb-2">Foto Pintu</p>
                  <div className="aspect-[16/9] max-h-32 bg-[#F3F4F6] rounded-[10px] overflow-hidden">
                    <SafeImage
                      src={room.door_photo_url}
                      alt={`Pintu ${room.name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Room Details */}
          <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 space-y-4">
            <h3 className="font-bold text-[#111827] text-base">Informasi Ruangan</h3>
            
            {building && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-[#9CA3AF] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[#6B7280]">Gedung</p>
                  <p className="font-medium text-[#111827]">{building.name}</p>
                  <p className="text-xs text-[#9CA3AF] font-mono">{building.code}</p>
                </div>
              </div>
            )}

            {room.floor_number && (
              <div className="flex items-start gap-3">
                <Layers className="h-5 w-5 text-[#9CA3AF] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[#6B7280]">Lantai</p>
                  <p className="font-medium text-[#111827]">Lantai {room.floor_number}</p>
                </div>
              </div>
            )}

            {room.capacity && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-[#9CA3AF] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[#6B7280]">Kapasitas</p>
                  <p className="font-medium text-[#111827]">{room.capacity} orang</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-[#9CA3AF] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-[#6B7280]">Nomor Urut</p>
                <p className="font-medium text-[#111827]">{room.room_sequence}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={cn("w-5 h-5 rounded-full mt-0.5 shrink-0",
                room.current_condition === 'good' ? "bg-emerald-500" :
                room.current_condition === 'needs_repair' ? "bg-amber-500" :
                "bg-red-500"
              )} />
              <div>
                <p className="text-xs text-[#6B7280]">Kondisi</p>
                <p className="font-medium text-[#111827]">
                  {room.current_condition === 'good' ? 'Baik' :
                   room.current_condition === 'needs_repair' ? 'Perlu Perbaikan' :
                   room.current_condition === 'damaged' ? 'Rusak' : 'Hilang'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Inventory & Equipment */}
        <div className="lg:col-span-2 space-y-5">
          {/* Inventory Section */}
          <div className="bg-white border border-[#E5E7EB] rounded-[14px]">
            <div className="p-5 border-b border-[#E5E7EB] flex flex-row items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#111827] flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-[#0891B2]" />
                  Inventaris Ruangan
                </h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  {inventory?.length || 0} item inventaris
                </p>
              </div>
              <Button size="sm" asChild className="rounded-[10px] bg-[#0891B2] hover:bg-[#0891B2]/90 text-white h-9">
                <Link href={`/admin/inventory/new?roomId=${id}`}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Link>
              </Button>
            </div>
            <div className="p-5">
              {inventory && inventory.length > 0 ? (
                <div className="border border-[#E5E7EB] rounded-[10px] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-[#374151] text-xs">Barang</th>
                        <th className="text-center px-4 py-3 font-semibold text-[#374151] text-xs">Jumlah</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#374151] text-xs">Kondisi</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#374151] text-xs">Keterangan</th>
                        <th className="text-right px-4 py-3 font-semibold text-[#374151] text-xs">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]/60">
                      {inventory.map((item) => (
                        <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {item.photo_url ? (
                                <div className="h-10 w-10 rounded-lg bg-[#F3F4F6] overflow-hidden shrink-0">
                                  <SafeImage src={item.photo_url} alt={item.name} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0">
                                  <Package className="h-4 w-4 text-[#D1D5DB]" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-[#111827]">{item.name}</p>
                                {item.inventory_code && (
                                  <p className="text-[10px] text-[#9CA3AF] font-mono">
                                    {item.inventory_code}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-semibold text-[#111827]">{item.quantity}</span>
                          </td>
                          <td className="px-4 py-3">
                            <ConditionBadge condition={item.condition} />
                          </td>
                          <td className="px-4 py-3 text-[#6B7280]">
                            {item.notes || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" asChild className="h-8 text-[#0891B2] hover:bg-[#0891B2]/10">
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
                <div className="text-center py-12 border-2 border-dashed border-[#E5E7EB] rounded-[10px]">
                  <Package className="h-12 w-12 text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-[#6B7280]">Belum ada inventaris</p>
                  <Button variant="outline" size="sm" className="mt-3 rounded-[10px] border-[#E5E7EB]" asChild>
                    <Link href={`/admin/inventory/new?roomId=${id}`}>
                      <Plus className="h-4 w-4 mr-1" /> Tambah Inventaris
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Equipment Section (if any) */}
          {equipment && equipment.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-[14px]">
              <div className="p-5 border-b border-[#E5E7EB]">
                <h3 className="text-base font-bold text-[#111827]">Alat Sewa di Ruangan Ini</h3>
                <p className="text-sm text-[#6B7280]">
                  {equipment.length} alat yang tersimpan di ruangan ini
                </p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {equipment.map((eq) => (
                    <div 
                      key={eq.id} 
                      className="flex items-center gap-3 p-3 border border-[#E5E7EB] rounded-[10px] hover:shadow-sm transition-all bg-white"
                    >
                      {eq.photo_url ? (
                        <div className="h-12 w-12 rounded-lg bg-[#F3F4F6] overflow-hidden shrink-0">
                          <SafeImage src={eq.photo_url} alt={eq.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-[#D1D5DB]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#111827] truncate">{eq.name}</p>
                        <p className="text-xs text-[#9CA3AF] font-mono truncate">
                          {eq.equipment_code}
                        </p>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-medium border-0 shrink-0",
                        eq.ketersediaan === 'tersedia' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                      )}>
                        {eq.ketersediaan === 'tersedia' ? 'Tersedia' : 'Tidak Tersedia'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
