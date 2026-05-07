'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Room {
  id: string
  name: string
}

interface RoomSelectProps {
  rooms: Room[] | null
  defaultValue?: string
  name?: string
}

export function RoomSelect({ rooms, defaultValue = '', name = 'storage_room_id' }: RoomSelectProps) {
  // Find selected room name for display
  const selectedRoom = rooms?.find(room => room.id === defaultValue)
  
  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger>
        <SelectValue placeholder="Pilih ruangan (opsional)">
          {selectedRoom?.name || 'Pilih ruangan (opsional)'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">
          <span className="text-muted-foreground">-- Tidak ada --</span>
        </SelectItem>
        {rooms?.map((room) => (
          <SelectItem key={room.id} value={room.id}>
            {room.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
