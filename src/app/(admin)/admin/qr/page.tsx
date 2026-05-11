import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { QRCodeDisplay } from './QRCodeDisplay'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DoorOpen, Package, Boxes, ShieldCheck } from 'lucide-react'

export default async function QRPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ id?: string; type?: string; itemType?: string }> 
}) {
  const { id, type, itemType = 'rooms' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Check if super admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userProfile } = await (supabase.from('users') as any)
    .select('role')
    .eq('id', user!.id)
    .single()
  
  const isSuperAdmin = userProfile?.role === 'super_admin'

  // Fetch rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, room_code, buildings(name)')
    .eq('is_active', true)
    .eq('is_for_rent', true)
    .order('name')

  // Fetch equipment
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name, equipment_code, category')
    .eq('is_active', true)
    .order('name')

  // Fetch inventory (only for super admin)
  let inventory: any[] = []
  if (isSuperAdmin) {
    const { data: inv } = await supabase
      .from('room_inventories')
      .select('id, name, inventory_code, category, rooms(name, room_code)')
      .eq('is_active', true)
      .order('name')
    inventory = inv || []
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  
  // Get selected item based on type
  let selectedItem: any = null
  let url: string | null = null
  
  if (id && type) {
    if (type === 'room') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selectedItem = (rooms as any[] | null)?.find(r => r.id === id)
      url = selectedItem ? `${baseUrl}/rooms/${selectedItem.id}` : null
    } else if (type === 'equipment') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selectedItem = (equipment as any[] | null)?.find(e => e.id === id)
      url = selectedItem ? `${baseUrl}/equipment/${selectedItem.id}/scan` : null
    } else if (type === 'inventory' && isSuperAdmin) {
      selectedItem = inventory.find(i => i.id === id)
      url = selectedItem ? `${baseUrl}/inventory/${selectedItem.id}` : null
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            QR Code Generator
            {isSuperAdmin && <ShieldCheck className="h-6 w-6 text-purple-600" />}
          </h1>
          <p className="text-muted-foreground text-sm">
            Generate QR Code untuk Ruangan, Alat{isSuperAdmin && ', dan Inventaris'}
          </p>
        </div>
        <Link href="/admin/qr/batch" className={buttonVariants({ variant: 'outline' })}>
          Cetak Label Massal
        </Link>
      </div>

      <Tabs defaultValue={itemType} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4" />
            Ruangan
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Alat
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Boxes className="h-4 w-4" />
              Inventaris
            </TabsTrigger>
          )}
        </TabsList>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-2">
              <p className="text-sm font-medium">Pilih Ruangan ({(rooms as any[] | null)?.length ?? 0})</p>
              <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(rooms as any[] | null)?.map((room: any) => (
                  <a
                    key={room.id}
                    href={`/admin/qr?id=${room.id}&type=room&itemType=rooms`}
                    className={`flex flex-col px-4 py-3 border-b text-sm hover:bg-zinc-50 transition-colors ${
                      id === room.id && type === 'room' ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <span className="font-medium">{room.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {room.room_code} — {(room as any).buildings?.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedItem && type === 'room' && url ? (
                <QRCodeDisplay
                  url={url}
                  name={selectedItem.name}
                  code={selectedItem.room_code}
                  type="room"
                  location={(selectedItem as any).buildings?.name}
                />
              ) : (
                <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
                  Pilih ruangan dari daftar untuk generate QR Code
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-2">
              <p className="text-sm font-medium">Pilih Alat ({(equipment as any[] | null)?.length ?? 0})</p>
              <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(equipment as any[] | null)?.map((item: any) => (
                  <a
                    key={item.id}
                    href={`/admin/qr?id=${item.id}&type=equipment&itemType=equipment`}
                    className={`flex flex-col px-4 py-3 border-b text-sm hover:bg-zinc-50 transition-colors ${
                      id === item.id && type === 'equipment' ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {item.equipment_code} — {item.category}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedItem && type === 'equipment' && url ? (
                <QRCodeDisplay
                  url={url}
                  name={selectedItem.name}
                  code={selectedItem.equipment_code}
                  type="equipment"
                  category={selectedItem.category}
                />
              ) : (
                <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
                  Pilih alat dari daftar untuk generate QR Code
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Inventory Tab (Super Admin Only) */}
        {isSuperAdmin && (
          <TabsContent value="inventory" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-2">
                <p className="text-sm font-medium">Pilih Inventaris ({inventory.length})</p>
                <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                  {inventory.map((item) => (
                    <a
                      key={item.id}
                      href={`/admin/qr?id=${item.id}&type=inventory&itemType=inventory`}
                      className={`flex flex-col px-4 py-3 border-b text-sm hover:bg-zinc-50 transition-colors ${
                        id === item.id && type === 'inventory' ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                      }`}
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {item.inventory_code} — {(item as any).rooms?.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2">
                {selectedItem && type === 'inventory' && url ? (
                  <QRCodeDisplay
                    url={url}
                    name={selectedItem.name}
                    code={selectedItem.inventory_code}
                    type="inventory"
                    location={(selectedItem as any).rooms?.name}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
                    Pilih inventaris dari daftar untuk generate QR Code
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
