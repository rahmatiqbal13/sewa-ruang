'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CourseScheduleFormData, DAY_NAMES } from '@/lib/course-schedules'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CourseScheduleFormData) => void
  initialData?: CourseScheduleFormData
  title?: string
  rooms?: { id: string; name: string; room_code?: string | null }[]
  defaultRoomId?: string
}

export function CourseScheduleForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title = 'Tambah Jadwal Kuliah',
  rooms = [],
  defaultRoomId = '',
}: Props) {
  const [formData, setFormData] = useState<CourseScheduleFormData>(
    initialData || {
      room_id: defaultRoomId,
      mata_kuliah: '',
      dosen: '',
      fakultas: '',
      kelas: '',
      semester: '',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '10:00',
      start_date: '',
      end_date: '',
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {rooms.length > 0 && (
            <div className="space-y-2">
              <Label>Ruangan</Label>
              <select
                value={formData.room_id}
                onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Pilih ruangan...</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name} {room.room_code ? `(${room.room_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mata Kuliah</Label>
              <Input
                value={formData.mata_kuliah}
                onChange={e => setFormData({ ...formData, mata_kuliah: e.target.value })}
                placeholder="Contoh: Fisika Dasar"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Dosen</Label>
              <Input
                value={formData.dosen}
                onChange={e => setFormData({ ...formData, dosen: e.target.value })}
                placeholder="Contoh: Dr. Budi"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fakultas</Label>
              <Input
                value={formData.fakultas}
                onChange={e => setFormData({ ...formData, fakultas: e.target.value })}
                placeholder="Contoh: FMIPA"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Kelas</Label>
              <Input
                value={formData.kelas}
                onChange={e => setFormData({ ...formData, kelas: e.target.value })}
                placeholder="Contoh: Kelas A"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Semester</Label>
            <Input
              value={formData.semester}
              onChange={e => setFormData({ ...formData, semester: e.target.value })}
              placeholder="Contoh: Ganjil 2026"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Hari</Label>
              <select
                value={formData.day_of_week}
                onChange={e => setFormData({ ...formData, day_of_week: Number(e.target.value) })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {DAY_NAMES.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Jam Mulai</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Jam Selesai</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai Semester</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Akhir Semester</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit">
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
