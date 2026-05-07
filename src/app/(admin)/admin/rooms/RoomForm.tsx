'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { PhotoUpload } from '@/components/shared/PhotoUpload'

const USAGE_CATEGORIES = [
  { value: 'perkuliahan',     label: 'Perkuliahan',     bg: 'bg-blue-50/50',   text: 'text-blue-800'   },
  { value: 'event_mahasiswa', label: 'Event Mahasiswa', bg: 'bg-purple-50/50', text: 'text-purple-800' },
  { value: 'event_umum',      label: 'Event Umum',      bg: 'bg-orange-50/50', text: 'text-orange-800' },
]

interface Building { id: string; name: string; code: string; floor_count: number }
interface RoomRate { usage_category: string; rate_per_hour: number | null; rate_per_day: number | null }
interface Room {
  id: string; name: string; building_id: string; floor_number: number; room_sequence: number
  description: string | null; capacity: number | null; is_for_rent: boolean
  photo_url: string | null; room_rates: RoomRate[]
}

type RateState = Record<string, { rate_per_hour: string; rate_per_day: string }>

export function RoomForm({ room, buildings }: { room?: Room; buildings: Building[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(room?.name ?? '')
  const [buildingId, setBuildingId] = useState(room?.building_id ?? '')
  const [floorNumber, setFloorNumber] = useState(room?.floor_number?.toString() ?? '')
  const [roomSequence, setRoomSequence] = useState(room?.room_sequence?.toString() ?? '')
  const [description, setDescription] = useState(room?.description ?? '')
  const [capacity, setCapacity] = useState(room?.capacity?.toString() ?? '')
  const [isForRent, setIsForRent] = useState(room?.is_for_rent ?? true)
  const [photoUrl, setPhotoUrl] = useState(room?.photo_url ?? '')
  const [rates, setRates] = useState<RateState>(() => {
    const initial: RateState = {}
    USAGE_CATEGORIES.forEach(cat => {
      const existing = room?.room_rates?.find(r => r.usage_category === cat.value)
      initial[cat.value] = {
        rate_per_hour: existing?.rate_per_hour?.toString() ?? '',
        rate_per_day: existing?.rate_per_day?.toString() ?? '',
      }
    })
    return initial
  })

  const selectedBuilding = buildings.find(b => b.id === buildingId)

  function updateRate(category: string, field: 'rate_per_hour' | 'rate_per_day', value: string) {
    setRates(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !buildingId || !floorNumber || !roomSequence) {
      toast.error('Lengkapi data ruangan: nama, gedung, lantai, dan nomor urut')
      return
    }
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as any

    const roomPayload = {
      name: name.trim(),
      building_id: buildingId,
      floor_number: parseInt(floorNumber),
      room_sequence: parseInt(roomSequence),
      description: description.trim() || null,
      capacity: capacity ? parseInt(capacity) : null,
      is_for_rent: isForRent,
      photo_url: photoUrl || null,
    }

    let roomId = room?.id
    if (room) {
      const { error } = await sb.from('rooms').update(roomPayload).eq('id', room.id)
      if (error) { toast.error(error.message); setLoading(false); return }
    } else {
      const { data: { user } } = await sb.auth.getUser()
      const { data: newRoom, error } = await sb.from('rooms')
        .insert({ ...roomPayload, created_by: user.id })
        .select('id').single()
      if (error || !newRoom) { toast.error(error?.message ?? 'Gagal membuat ruangan'); setLoading(false); return }
      roomId = newRoom.id
    }

    if (isForRent) {
      for (const cat of USAGE_CATEGORIES) {
        const rateHour = parseFloat(rates[cat.value].rate_per_hour) || null
        const rateDay = parseFloat(rates[cat.value].rate_per_day) || null
        if (rateHour || rateDay) {
          await sb.from('room_rates').upsert(
            { room_id: roomId, usage_category: cat.value, rate_per_hour: rateHour, rate_per_day: rateDay },
            { onConflict: 'room_id,usage_category' }
          )
        }
      }
    }

    toast.success(room ? 'Ruangan diperbarui' : 'Ruangan ditambahkan')
    router.push('/admin/rooms')
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Ruangan</CardTitle>
          <CardDescription>Data identitas dan lokasi ruangan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Ruangan *</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Ruang Seminar A" />
          </div>

          <div className="space-y-2">
            <Label>Gedung *</Label>
            <Select value={buildingId} onValueChange={v => { setBuildingId(v); setFloorNumber('') }}>
              <SelectTrigger><SelectValue placeholder="Pilih gedung..." /></SelectTrigger>
              <SelectContent>
                {buildings.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lantai *</Label>
              <Select value={floorNumber} onValueChange={setFloorNumber}>
                <SelectTrigger><SelectValue placeholder="Pilih lantai..." /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: selectedBuilding?.floor_count ?? 10 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={n.toString()}>Lantai {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nomor Urut *</Label>
              <Input required type="number" min={1} max={99} value={roomSequence}
                onChange={e => setRoomSequence(e.target.value)} placeholder="1" />
              <p className="text-xs text-muted-foreground">Kode ruang digenerate otomatis</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Kapasitas (orang)</Label>
            <Input type="number" min={1} value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="30" />
          </div>

          <div className="flex items-center gap-3 py-1">
            <Switch id="is_for_rent" checked={isForRent} onCheckedChange={setIsForRent} />
            <Label htmlFor="is_for_rent" className="cursor-pointer">Ruangan ini dapat disewakan</Label>
          </div>

          <div className="space-y-2">
            <Label>Foto Ruangan</Label>
            <PhotoUpload value={photoUrl} onChange={url => setPhotoUrl(url ?? '')} folder="rooms" />
          </div>

          <div className="space-y-2">
            <Label>Deskripsi (opsional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Fasilitas, keterangan tambahan..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {isForRent && (
        <Card>
          <CardHeader>
            <CardTitle>Tarif Sewa per Kategori</CardTitle>
            <CardDescription>Atur harga per kategori penggunaan (kosongkan jika tidak tersedia)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {USAGE_CATEGORIES.map(cat => (
              <div key={cat.value} className={`border rounded-lg p-4 ${cat.bg}`}>
                <h4 className={`font-semibold mb-3 ${cat.text}`}>{cat.label}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tarif per Jam (Rp)</Label>
                    <Input type="number" min={0} placeholder="0"
                      value={rates[cat.value].rate_per_hour}
                      onChange={e => updateRate(cat.value, 'rate_per_hour', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarif per Hari (Rp)</Label>
                    <Input type="number" min={0} placeholder="0"
                      value={rates[cat.value].rate_per_day}
                      onChange={e => updateRate(cat.value, 'rate_per_day', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {room ? 'Simpan Perubahan' : 'Tambah Ruangan'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
      </div>
    </form>
  )
}
