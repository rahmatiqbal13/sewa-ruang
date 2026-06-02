'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

interface Building {
  id: string
  name: string
  code: string
  floor_count: number
}

interface Room {
  id: string
  name: string
  room_code: string
  building_id: string
  floor_number: number
}

interface LocationSelectProps {
  buildings: Building[]
  rooms: Room[]
  defaultBuildingId?: string | null
  defaultFloor?: number | null
  defaultRoomId?: string | null
}

export function LocationSelect({ 
  buildings, 
  rooms, 
  defaultBuildingId,
  defaultFloor,
  defaultRoomId
}: LocationSelectProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<string>(defaultBuildingId || '')
  const [selectedFloor, setSelectedFloor] = useState<string>(defaultFloor?.toString() || '')
  const [selectedRoom, setSelectedRoom] = useState<string>(defaultRoomId || '')

  // Get selected building details
  const selectedBuildingData = buildings.find(b => b.id === selectedBuilding)
  const floorCount = selectedBuildingData?.floor_count || 0

  // Filter rooms by building and floor
  const filteredRooms = rooms.filter(r => {
    if (selectedBuilding && r.building_id !== selectedBuilding) return false
    if (selectedFloor && r.floor_number !== parseInt(selectedFloor)) return false
    return true
  })

  // Reset floor and room when building changes
  useEffect(() => {
    if (selectedBuilding !== defaultBuildingId) {
      const id = setTimeout(() => {
        setSelectedFloor('')
        setSelectedRoom('')
      }, 0)
      return () => clearTimeout(id)
    }
  }, [selectedBuilding, defaultBuildingId])

  // Reset room when floor changes
  useEffect(() => {
    if (selectedFloor !== defaultFloor?.toString()) {
      const id = setTimeout(() => setSelectedRoom(''), 0)
      return () => clearTimeout(id)
    }
  }, [selectedFloor, defaultFloor])

  // Get selected room data
  const selectedRoomData = rooms.find(r => r.id === selectedRoom)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Building Select */}
      <div className="space-y-2 md:space-y-3 min-w-0">
        <Label htmlFor="building_id" className="text-foreground/80 text-sm font-medium block">
          Gedung <span className="text-xs text-muted-foreground/70 font-normal">(opsional)</span>
        </Label>
        <Select 
          name="building_id" 
          value={selectedBuilding}
          onValueChange={(value) => setSelectedBuilding(value || '')}
        >
          <SelectTrigger className="h-11 bg-card border-border hover:border-border transition-colors w-full">
            {selectedBuilding && selectedBuildingData ? (
              <span className="text-foreground font-medium">{selectedBuildingData.code}</span>
            ) : (
              <span className="text-muted-foreground/70">Pilih gedung...</span>
            )}
          </SelectTrigger>
          <SelectContent className="max-h-60 w-[320px]">
            <SelectItem value="" className="text-muted-foreground">Belum ada gedung</SelectItem>
            {buildings.map((b) => (
              <SelectItem key={b.id} value={b.id} className="py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-muted-foreground">Kode: {b.code} • {b.floor_count} lantai</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Floor Select */}
      <div className="space-y-2 md:space-y-3 min-w-0">
        <Label htmlFor="floor" className="text-foreground/80 text-sm font-medium block">
          Lantai <span className="text-xs text-muted-foreground/70 font-normal">(opsional)</span>
        </Label>
        <Select 
          name="floor" 
          value={selectedFloor}
          onValueChange={(value) => setSelectedFloor(value || '')}
          disabled={!selectedBuilding}
        >
          <SelectTrigger className="h-11 bg-card border-border hover:border-border transition-colors disabled:bg-muted disabled:text-muted-foreground/70 w-full">
            {selectedFloor ? (
              <span className="text-foreground">Lantai {selectedFloor}</span>
            ) : (
              <span className="text-muted-foreground/70">{selectedBuilding ? "Pilih lantai..." : "Pilih gedung dulu"}</span>
            )}
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="" className="text-muted-foreground">Belum ada lantai</SelectItem>
            {floorCount > 0 && 
              Array.from({ length: floorCount }, (_, i) => i + 1).map((floor) => (
                <SelectItem key={floor} value={floor.toString()}>
                  Lantai {floor}
                </SelectItem>
              ))
            }
          </SelectContent>
        </Select>
      </div>

      {/* Room Select */}
      <div className="space-y-2 md:space-y-3 min-w-0">
        <Label htmlFor="storage_room_id" className="text-foreground/80 text-sm font-medium block">
          Ruangan <span className="text-xs text-muted-foreground/70 font-normal">(opsional)</span>
        </Label>
        <Select 
          name="storage_room_id" 
          value={selectedRoom}
          onValueChange={(value) => setSelectedRoom(value || '')}
          disabled={!selectedBuilding}
        >
          <SelectTrigger className="h-11 bg-card border-border hover:border-border transition-colors disabled:bg-muted disabled:text-muted-foreground/70 w-full">
            {selectedRoom && selectedRoomData ? (
              <span className="text-foreground font-medium">{selectedRoomData.room_code}</span>
            ) : (
              <span className="text-muted-foreground/70">{selectedBuilding ? "Pilih ruangan..." : "Pilih gedung dulu"}</span>
            )}
          </SelectTrigger>
          <SelectContent className="max-h-60 w-[320px]">
            <SelectItem value="" className="text-muted-foreground">Belum ada ruangan</SelectItem>
            {filteredRooms.length === 0 && selectedBuilding && (
              <SelectItem value="" disabled className="text-muted-foreground/70 italic">
                Tidak ada ruangan di lantai ini
              </SelectItem>
            )}
            {filteredRooms.map((r) => (
              <SelectItem key={r.id} value={r.id} className="py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">Kode: {r.room_code}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
