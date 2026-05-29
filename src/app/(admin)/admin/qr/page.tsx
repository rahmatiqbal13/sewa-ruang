'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { QRCodeDisplay } from './QRCodeDisplay'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DoorOpen, Package, Boxes, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function QRPage() {
  const [rooms, setRooms] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null)
  const [selectedInventory, setSelectedInventory] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('rooms')

  const [baseUrl, setBaseUrl] = useState(process.env.NEXT_PUBLIC_APP_URL || '')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin)
    }
  }, [])

  function createSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  }

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Check if super admin
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userProfile } = await (supabase.from('users') as any)
          .select('role')
          .eq('id', user.id)
          .single()
        setIsSuperAdmin(userProfile?.role === 'super_admin')
      }

      // Fetch rooms - all active rooms (no is_for_rent filter)
      const { data: roomsData, error: roomsError } = await (supabase as any)
        .from('rooms')
        .select('id, name, room_code, is_for_rent, is_active, buildings(name)')
        .eq('is_active', true)
        .order('name')
      
      console.log('Client QR Page - Rooms:', { 
        count: roomsData?.length || 0, 
        error: roomsError?.message,
        data: roomsData
      })

      setRooms(roomsData || [])

      // Fetch equipment
      const { data: equipmentData } = await (supabase as any)
        .from('equipment')
        .select('id, name, equipment_code, category')
        .eq('is_active', true)
        .order('name')

      setEquipment(equipmentData || [])

      // Fetch inventory
      if (user) {
        const { data: userProfile } = await (supabase.from('users') as any)
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (userProfile?.role === 'super_admin') {
          const { data: inv } = await (supabase as any)
            .from('room_inventories')
            .select('id, name, inventory_code, category, rooms(name, room_code)')
            .eq('is_active', true)
            .order('name')
          setInventory(inv || [])
        }
      }

      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            QR Code Generator
            {isSuperAdmin && <ShieldCheck className="h-6 w-6 text-purple-600" />}
          </h1>
          <p className="text-muted-foreground text-sm">
            Generate QR Code untuk Ruangan, Alat{isSuperAdmin && ', dan Inventaris'}
          </p>
        </div>
        <Link href="/admin/qr/batch" className={buttonVariants({ variant: 'outline', className: 'rounded-[10px]' })}>
          Cetak Label Massal
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 rounded-[10px]">
          <TabsTrigger value="rooms" className="flex items-center gap-2 rounded-[10px]">
            <DoorOpen className="h-4 w-4" />
            Ruangan
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2 rounded-[10px]">
            <Package className="h-4 w-4" />
            Alat
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="inventory" className="flex items-center gap-2 rounded-[10px]">
              <Boxes className="h-4 w-4" />
              Inventaris
            </TabsTrigger>
          )}
        </TabsList>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-2">
              <p className="text-sm font-medium text-foreground">Pilih Ruangan ({rooms.length})</p>
              <div className="border border-border rounded-[10px] overflow-hidden max-h-[500px] overflow-y-auto">
                {rooms.map((room: any) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`flex flex-col px-4 py-3 border-b border-border/60 text-sm hover:bg-muted transition-colors cursor-pointer ${
                      selectedRoom?.id === room.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{room.name}</span>
                      {room.is_for_rent ? (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Sewa</span>
                      ) : (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Inventaris</span>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {room.room_code} — {room.buildings?.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedRoom ? (
                <QRCodeDisplay
                  url={`${baseUrl}/scan?type=room&id=${createSlug(selectedRoom.name)}`}
                  name={selectedRoom.name}
                  code={selectedRoom.room_code}
                  type="room"
                  location={selectedRoom.buildings?.name}
                />
              ) : (
                <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-[10px] text-muted-foreground">
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
              <p className="text-sm font-medium text-foreground">Pilih Alat ({equipment.length})</p>
              <div className="border border-border rounded-[10px] overflow-hidden max-h-[500px] overflow-y-auto">
                {equipment.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEquipment(item)}
                    className={`flex flex-col px-4 py-3 border-b border-border/60 text-sm hover:bg-muted transition-colors cursor-pointer ${
                      selectedEquipment?.id === item.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {item.equipment_code} — {item.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedEquipment ? (
                <QRCodeDisplay
                  url={`${baseUrl}/scan?type=equipment&id=${createSlug(selectedEquipment.name)}`}
                  name={selectedEquipment.name}
                  code={selectedEquipment.equipment_code}
                  type="equipment"
                  category={selectedEquipment.category}
                />
              ) : (
                <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-[10px] text-muted-foreground">
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
                <p className="text-sm font-medium text-foreground">Pilih Inventaris ({inventory.length})</p>
                <div className="border border-border rounded-[10px] overflow-hidden max-h-[500px] overflow-y-auto">
                  {inventory.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedInventory(item)}
                      className={`flex flex-col px-4 py-3 border-b border-border/60 text-sm hover:bg-muted transition-colors cursor-pointer ${
                        selectedInventory?.id === item.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                      }`}
                    >
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {item.inventory_code} — {item.rooms?.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2">
                {selectedInventory ? (
                  <QRCodeDisplay
                    url={`${baseUrl}/scan?type=inventory&id=${selectedInventory.id}`}
                    name={selectedInventory.name}
                    code={selectedInventory.inventory_code}
                    type="inventory"
                    location={selectedInventory.rooms?.name}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-[10px] text-muted-foreground">
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
