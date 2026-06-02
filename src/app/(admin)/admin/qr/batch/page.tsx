'use client'

import { useState, useEffect, useRef } from 'react' // useRef dipakai di printRef (print preview)
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Printer, DoorOpen, Package, Boxes, CheckSquare, Square } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { PRINT_FORMATS, PrintFormat, PrintItem, buildPrintHtml, executePrint } from '../printUtils'

interface Room {
  id: string
  name: string
  room_code: string | null
  building_name: string
  is_for_rent?: boolean
}

interface Equipment {
  id: string
  name: string
  equipment_code: string | null
  category: string
}

interface Inventory {
  id: string
  name: string
  inventory_code: string | null
  category: string
  room_name: string
}

export default function BatchQRClientPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('rooms')
  const [printFormat, setPrintFormat] = useState<PrintFormat>('a4-3col')
  const printRef = useRef<HTMLDivElement>(null)

  const [baseUrl, setBaseUrl] = useState(process.env.NEXT_PUBLIC_APP_URL || '')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = setTimeout(() => setBaseUrl(window.location.origin), 0)
      return () => clearTimeout(id)
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: userProfile } = await (supabase.from('users') as any)
          .select('role')
          .eq('id', user.id)
          .single()
        setIsSuperAdmin(userProfile?.role === 'super_admin')
      }

      // Fetch rooms - all active rooms
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roomsData } = await (supabase as any)
        .from('rooms')
        .select('id, name, room_code, is_for_rent, buildings(name)')
        .eq('is_active', true)
        .order('name')
      
      console.log('Client QR - Rooms data:', { count: roomsData?.length, data: roomsData })

      const transformedRooms = ((roomsData || []) as Array<{
        id: string
        name: string
        room_code: string | null
        is_for_rent: boolean | undefined
        buildings: { name: string } | undefined
      }>).map((r) => ({
        id: r.id,
        name: r.name,
        room_code: r.room_code,
        building_name: r.buildings?.name || '-',
        is_for_rent: r.is_for_rent
      }))
      
      setRooms(transformedRooms)

      // Fetch equipment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: equipmentData } = await (supabase as any)
        .from('equipment')
        .select('id, name, equipment_code, category')
        .eq('is_active', true)
        .order('name')

      const transformedEquipment = ((equipmentData || []) as Array<{
        id: string
        name: string
        equipment_code: string | null
        category: string
      }>).map((e) => ({
        id: e.id,
        name: e.name,
        equipment_code: e.equipment_code,
        category: e.category
      }))
      
      setEquipment(transformedEquipment)

      // Fetch inventory
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inventoryData } = await (supabase as any)
        .from('room_inventories')
        .select('id, name, inventory_code, category, rooms(name)')
        .eq('is_active', true)
        .order('name')

      const transformedInventory = ((inventoryData || []) as Array<{
        id: string
        name: string
        inventory_code: string | null
        category: string
        rooms: { name: string } | undefined
      }>).map((i) => ({
        id: i.id,
        name: i.name,
        inventory_code: i.inventory_code,
        category: i.category,
        room_name: i.rooms?.name || '-'
      }))
      
      setInventory(transformedInventory)
      setLoading(false)
    }

    loadData()
  }, [])

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedItems)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedItems(newSet)
  }

  const toggleAll = (items: { id: string }[]) => {
    const allIds = items.map(i => i.id)
    const allSelected = allIds.every(id => selectedItems.has(id))
    
    const newSet = new Set(selectedItems)
    if (allSelected) {
      allIds.forEach(id => newSet.delete(id))
    } else {
      allIds.forEach(id => newSet.add(id))
    }
    setSelectedItems(newSet)
  }

  const getSelectedItems = () => {
    const items: PrintItem[] = []
    
    rooms.forEach(r => {
      if (selectedItems.has(r.id)) {
        items.push({
          id: r.id,
          name: r.name,
          code: r.room_code,
          type: 'room',
           url: `${baseUrl}/scan?type=room&id=${createSlug(r.name)}`,
          meta: r.building_name
        })
      }
    })
    
    equipment.forEach(e => {
      if (selectedItems.has(e.id)) {
        items.push({
          id: e.id,
          name: e.name,
          code: e.equipment_code,
          type: 'equipment',
          url: `${baseUrl}/scan?type=equipment&id=${createSlug(e.name)}`,
          meta: e.category
        })
      }
    })
    
    if (isSuperAdmin) {
      inventory.forEach(i => {
        if (selectedItems.has(i.id)) {
          items.push({
            id: i.id,
            name: i.name,
            code: i.inventory_code,
            type: 'inventory',
            url: `${baseUrl}/scan?type=inventory&id=${i.id}`,
            meta: i.room_name
          })
        }
      })
    }
    
    return items
  }

  function handlePrint() {
    const items = getSelectedItems()
    if (items.length === 0) return
    executePrint(buildPrintHtml(items, printFormat))
  }

  const selectedCount = getSelectedItems().length

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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cetak Label QR Massal</h1>
          <p className="text-muted-foreground text-sm">
            Pilih item untuk generate QR Code sekaligus
          </p>
        </div>
        <div className="flex flex-col gap-3 items-end">
          {/* Format selector */}
          <div className="flex flex-wrap gap-1.5">
            {PRINT_FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setPrintFormat(f.id)}
                title={f.desc}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  printFormat === f.id
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'bg-card hover:bg-muted border-border text-muted-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button
            onClick={handlePrint}
            disabled={selectedCount === 0}
            className="gap-2 rounded-[10px]"
          >
            <Printer className="h-4 w-4" />
            Cetak {selectedCount > 0 && `(${selectedCount})`}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-purple-50 border border-purple-100 rounded-[10px] p-4">
          <p className="text-purple-600 text-sm font-medium">Ruangan</p>
          <p className="text-2xl font-bold text-purple-900">{rooms.length}</p>
          <p className="text-xs text-purple-500">
            {rooms.filter(r => selectedItems.has(r.id)).length} dipilih
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-[10px] p-4">
          <p className="text-blue-600 text-sm font-medium">Alat</p>
          <p className="text-2xl font-bold text-blue-900">{equipment.length}</p>
          <p className="text-xs text-blue-500">
            {equipment.filter(e => selectedItems.has(e.id)).length} dipilih
          </p>
        </div>
        {isSuperAdmin && (
          <div className="bg-amber-50 border border-amber-100 rounded-[10px] p-4">
            <p className="text-amber-600 text-sm font-medium">Inventaris</p>
            <p className="text-2xl font-bold text-amber-900">{inventory.length}</p>
            <p className="text-xs text-amber-500">
              {inventory.filter(i => selectedItems.has(i.id)).length} dipilih
            </p>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3 rounded-[10px]">
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

        {/* Rooms */}
        <TabsContent value="rooms" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toggleAll(rooms)}
              className="rounded-[10px]"
            >
              {rooms.every(r => selectedItems.has(r.id)) ? (
                <><CheckSquare className="h-4 w-4 mr-2" /> Batal Pilih Semua</>
              ) : (
                <><Square className="h-4 w-4 mr-2" /> Pilih Semua</>
              )}
            </Button>
            <Badge variant="secondary" className="rounded-[10px]">
              {rooms.filter(r => selectedItems.has(r.id)).length} / {rooms.length} dipilih
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {rooms.map(room => (
              <div 
                key={room.id} 
                onClick={() => toggleSelection(room.id)}
                className={`border rounded-[14px] p-3 text-center cursor-pointer transition-all hover:shadow-md ${
                  selectedItems.has(room.id) 
                    ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200' 
                    : 'bg-card hover:bg-muted'
                }`}
              >
                <div className="flex justify-center mb-2">
                  <QRCode value={`${baseUrl}/scan?type=room&id=${createSlug(room.name)}`} size={60} level="L" />
                </div>
                <Badge variant="outline" className="font-mono text-[10px] mb-1 rounded-[10px]">
                  {room.room_code || 'No Code'}
                </Badge>
                <p className="text-xs font-semibold leading-tight line-clamp-2 text-foreground">{room.name}</p>
                <p className="text-[10px] text-muted-foreground">{room.building_name}</p>
                {room.is_for_rent ? (
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full mt-1 inline-block">Sewa</span>
                ) : (
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full mt-1 inline-block">Inventaris</span>
                )}
                {selectedItems.has(room.id) && (
                  <div className="mt-2">
                    <Badge className="bg-purple-600 text-[10px] rounded-[10px]">Dipilih</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Equipment */}
        <TabsContent value="equipment" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toggleAll(equipment)}
              className="rounded-[10px]"
            >
              {equipment.every(e => selectedItems.has(e.id)) ? (
                <><CheckSquare className="h-4 w-4 mr-2" /> Batal Pilih Semua</>
              ) : (
                <><Square className="h-4 w-4 mr-2" /> Pilih Semua</>
              )}
            </Button>
            <Badge variant="secondary" className="rounded-[10px]">
              {equipment.filter(e => selectedItems.has(e.id)).length} / {equipment.length} dipilih
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {equipment.map(item => (
              <div 
                key={item.id} 
                onClick={() => toggleSelection(item.id)}
                className={`border rounded-[14px] p-3 text-center cursor-pointer transition-all hover:shadow-md ${
                  selectedItems.has(item.id) 
                    ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                    : 'bg-card hover:bg-muted'
                }`}
              >
                <div className="flex justify-center mb-2">
                    <QRCode value={`${baseUrl}/scan?type=equipment&id=${createSlug(item.name)}`} size={60} level="L" />
                </div>
                <Badge variant="outline" className="font-mono text-[10px] mb-1 rounded-[10px]">
                  {item.equipment_code || 'No Code'}
                </Badge>
                <p className="text-xs font-semibold leading-tight line-clamp-2 text-foreground">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{item.category}</p>
                {selectedItems.has(item.id) && (
                  <div className="mt-2">
                    <Badge className="bg-blue-600 text-[10px] rounded-[10px]">Dipilih</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Inventory (Super Admin Only) */}
        {isSuperAdmin && (
          <TabsContent value="inventory" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => toggleAll(inventory)}
                className="rounded-[10px]"
              >
                {inventory.every(i => selectedItems.has(i.id)) ? (
                  <><CheckSquare className="h-4 w-4 mr-2" /> Batal Pilih Semua</>
                ) : (
                  <><Square className="h-4 w-4 mr-2" /> Pilih Semua</>
                )}
              </Button>
              <Badge variant="secondary" className="rounded-[10px]">
                {inventory.filter(i => selectedItems.has(i.id)).length} / {inventory.length} dipilih
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {inventory.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => toggleSelection(item.id)}
                  className={`border rounded-[14px] p-3 text-center cursor-pointer transition-all hover:shadow-md ${
                    selectedItems.has(item.id) 
                      ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' 
                      : 'bg-card hover:bg-muted'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    <QRCode value={`${baseUrl}/scan?type=inventory&id=${item.id}`} size={60} level="L" />
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] mb-1 rounded-[10px]">
                    {item.inventory_code || 'No Code'}
                  </Badge>
                  <p className="text-xs font-semibold leading-tight line-clamp-2 text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.room_name}</p>
                  {selectedItems.has(item.id) && (
                    <div className="mt-2">
                      <Badge className="bg-amber-600 text-[10px] rounded-[10px]">Dipilih</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Print Preview */}
      {selectedCount > 0 && (
        <div className="border-t border-border pt-6">
          <h3 className="font-semibold mb-4 text-foreground">Preview ({selectedCount} item)</h3>
          <div ref={printRef} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {getSelectedItems().slice(0, 12).map(item => (
              <div key={item.id} className="border border-border rounded p-2 text-center bg-card">
                <QRCode value={item.url} size={50} level="L" />
                <p className="text-[8px] font-mono mt-1 truncate">{item.code}</p>
                <p className="text-[8px] truncate text-foreground">{item.name}</p>
              </div>
            ))}
            {selectedCount > 12 && (
              <div className="border border-border rounded p-2 text-center bg-muted flex items-center justify-center">
                <p className="text-xs text-muted-foreground">+{selectedCount - 12} lainnya</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
