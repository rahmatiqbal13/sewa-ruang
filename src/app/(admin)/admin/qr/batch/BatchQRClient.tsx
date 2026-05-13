'use client'

import { useState, useRef } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Printer, DoorOpen, Package, Boxes, Filter, CheckSquare, Square } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Room {
  id: string
  name: string
  room_code: string | null
  building_name: string
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

interface BatchQRClientProps {
  rooms: Room[]
  equipment: Equipment[]
  inventory: Inventory[]
  baseUrl: string
  isSuperAdmin: boolean
}

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function BatchQRClient({
  rooms,
  equipment,
  inventory,
  baseUrl,
  isSuperAdmin
}: BatchQRClientProps) {
  // Debug log
  console.log('BatchQRClient - Props received:', {
    roomsCount: rooms.length,
    roomsList: rooms.map(r => ({ id: r.id, name: r.name })),
    equipmentCount: equipment.length,
    inventoryCount: inventory.length
  })
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('rooms')
  const printRef = useRef<HTMLDivElement>(null)

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
    const items: Array<{ id: string; name: string; code: string | null; type: string; url: string; meta?: string }> = []
    
    rooms.forEach(r => {
      if (selectedItems.has(r.id)) {
        items.push({
          id: r.id,
          name: r.name,
          code: r.room_code,
          type: 'room',
          url: `${baseUrl}/rooms/${createSlug(r.name)}`,
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
          url: `${baseUrl}/equipment/${createSlug(e.name)}/scan`,
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
            url: `${baseUrl}/inventory/${i.id}`,
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

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Label QR Code - ${items.length} Item</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              background: white;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e2e8f0;
            }
            .header h1 {
              font-size: 28px;
              color: #1e293b;
              margin-bottom: 8px;
            }
            .header p {
              color: #64748b;
              font-size: 14px;
            }
            .grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 20px; 
            }
            .label { 
              border: 2px solid #e2e8f0; 
              border-radius: 12px; 
              padding: 20px; 
              text-align: center; 
              page-break-inside: avoid;
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .label-type {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              padding: 4px 12px;
              border-radius: 20px;
              margin-bottom: 12px;
              display: inline-block;
            }
            .label-type.room { background: #f3e8ff; color: #7c3aed; }
            .label-type.equipment { background: #dbeafe; color: #2563eb; }
            .label-type.inventory { background: #fef3c7; color: #d97706; }
            .label-qr {
              background: white;
              padding: 16px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              margin-bottom: 16px;
              display: inline-block;
            }
            .label-qr img {
              width: 120px;
              height: 120px;
            }
            .label-code {
              font-family: 'Courier New', monospace;
              font-size: 13px;
              color: #64748b;
              background: #f8fafc;
              padding: 4px 12px;
              border-radius: 4px;
              margin-bottom: 8px;
              display: inline-block;
              font-weight: 600;
            }
            .label-name {
              font-size: 15px;
              font-weight: 700;
              color: #1e293b;
              line-height: 1.4;
              margin-bottom: 4px;
              min-height: 42px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .label-meta {
              font-size: 12px;
              color: #94a3b8;
              font-style: italic;
            }
            @media print {
              @page { 
                size: A4; 
                margin: 15mm;
              }
              body { padding: 0; }
              .header { 
                margin-bottom: 20px;
                border-bottom-color: #000;
              }
              .grid { 
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
              }
              .label {
                box-shadow: none;
                border-color: #000;
                break-inside: avoid;
              }
            }
            @media (max-width: 768px) {
              .grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Label QR Code</h1>
            <p>Total: ${items.length} item | RentSpace System</p>
          </div>
          <div class="grid">
            ${items.map(item => `
              <div class="label">
                <div class="label-type ${item.type}">
                  ${item.type === 'room' ? 'Ruangan' : item.type === 'equipment' ? 'Alat' : 'Inventaris'}
                </div>
                <div class="label-qr">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(item.url)}&size=120x120" alt="QR" />
                </div>
                ${item.code ? `<div class="label-code">${item.code}</div>` : ''}
                <div class="label-name">${item.name}</div>
                ${item.meta ? `<div class="label-meta">${item.meta}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  const selectedCount = getSelectedItems().length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cetak Label QR Massal</h1>
          <p className="text-muted-foreground text-sm">
            Pilih item untuk generate QR Code sekaligus
          </p>
        </div>
        <Button 
          onClick={handlePrint} 
          disabled={selectedCount === 0}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Cetak {selectedCount > 0 && `(${selectedCount})`}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
          <p className="text-purple-600 text-sm font-medium">Ruangan</p>
          <p className="text-2xl font-bold text-purple-900">{rooms.length}</p>
          <p className="text-xs text-purple-500">
            {rooms.filter(r => selectedItems.has(r.id)).length} dipilih
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-blue-600 text-sm font-medium">Alat</p>
          <p className="text-2xl font-bold text-blue-900">{equipment.length}</p>
          <p className="text-xs text-blue-500">
            {equipment.filter(e => selectedItems.has(e.id)).length} dipilih
          </p>
        </div>
        {isSuperAdmin && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <p className="text-amber-600 text-sm font-medium">Inventaris</p>
            <p className="text-2xl font-bold text-amber-900">{inventory.length}</p>
            <p className="text-xs text-amber-500">
              {inventory.filter(i => selectedItems.has(i.id)).length} dipilih
            </p>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
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

        {/* Rooms */}
        <TabsContent value="rooms" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toggleAll(rooms)}
            >
              {rooms.every(r => selectedItems.has(r.id)) ? (
                <><CheckSquare className="h-4 w-4 mr-2" /> Batal Pilih Semua</>
              ) : (
                <><Square className="h-4 w-4 mr-2" /> Pilih Semua</>
              )}
            </Button>
            <Badge variant="secondary">
              {rooms.filter(r => selectedItems.has(r.id)).length} / {rooms.length} dipilih
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {rooms.map(room => (
              <div 
                key={room.id} 
                onClick={() => toggleSelection(room.id)}
                className={`border rounded-xl p-3 text-center cursor-pointer transition-all hover:shadow-md ${
                  selectedItems.has(room.id) 
                    ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200' 
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-center mb-2">
                  <QRCode value={`${baseUrl}/rooms/${createSlug(room.name)}`} size={60} level="L" />
                </div>
                <Badge variant="outline" className="font-mono text-[10px] mb-1">
                  {room.room_code || 'No Code'}
                </Badge>
                <p className="text-xs font-semibold leading-tight line-clamp-2">{room.name}</p>
                <p className="text-[10px] text-muted-foreground">{room.building_name}</p>
                {selectedItems.has(room.id) && (
                  <div className="mt-2">
                    <Badge className="bg-purple-600 text-[10px]">Dipilih</Badge>
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
            >
              {equipment.every(e => selectedItems.has(e.id)) ? (
                <><CheckSquare className="h-4 w-4 mr-2" /> Batal Pilih Semua</>
              ) : (
                <><Square className="h-4 w-4 mr-2" /> Pilih Semua</>
              )}
            </Button>
            <Badge variant="secondary">
              {equipment.filter(e => selectedItems.has(e.id)).length} / {equipment.length} dipilih
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {equipment.map(item => (
              <div 
                key={item.id} 
                onClick={() => toggleSelection(item.id)}
                className={`border rounded-xl p-3 text-center cursor-pointer transition-all hover:shadow-md ${
                  selectedItems.has(item.id) 
                    ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-center mb-2">
                  <QRCode value={`${baseUrl}/equipment/${createSlug(item.name)}/scan`} size={60} level="L" />
                </div>
                <Badge variant="outline" className="font-mono text-[10px] mb-1">
                  {item.equipment_code || 'No Code'}
                </Badge>
                <p className="text-xs font-semibold leading-tight line-clamp-2">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{item.category}</p>
                {selectedItems.has(item.id) && (
                  <div className="mt-2">
                    <Badge className="bg-blue-600 text-[10px]">Dipilih</Badge>
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
              >
                {inventory.every(i => selectedItems.has(i.id)) ? (
                  <><CheckSquare className="h-4 w-4 mr-2" /> Batal Pilih Semua</>
                ) : (
                  <><Square className="h-4 w-4 mr-2" /> Pilih Semua</>
                )}
              </Button>
              <Badge variant="secondary">
                {inventory.filter(i => selectedItems.has(i.id)).length} / {inventory.length} dipilih
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {inventory.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => toggleSelection(item.id)}
                  className={`border rounded-xl p-3 text-center cursor-pointer transition-all hover:shadow-md ${
                    selectedItems.has(item.id) 
                      ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' 
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    <QRCode value={`${baseUrl}/inventory/${item.id}`} size={60} level="L" />
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] mb-1">
                    {item.inventory_code || 'No Code'}
                  </Badge>
                  <p className="text-xs font-semibold leading-tight line-clamp-2">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.room_name}</p>
                  {selectedItems.has(item.id) && (
                    <div className="mt-2">
                      <Badge className="bg-amber-600 text-[10px]">Dipilih</Badge>
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
        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Preview ({selectedCount} item)</h3>
          <div ref={printRef} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {getSelectedItems().slice(0, 12).map(item => (
              <div key={item.id} className="border rounded p-2 text-center bg-white">
                <QRCode value={item.url} size={50} level="L" />
                <p className="text-[8px] font-mono mt-1 truncate">{item.code}</p>
                <p className="text-[8px] truncate">{item.name}</p>
              </div>
            ))}
            {selectedCount > 12 && (
              <div className="border rounded p-2 text-center bg-slate-50 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">+{selectedCount - 12} lainnya</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
