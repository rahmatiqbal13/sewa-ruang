'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CourseScheduleFormData, DAY_NAMES } from '@/lib/course-schedules'
import { cn } from '@/lib/utils'

interface BuildingOption {
  id: string
  name: string
  code?: string | null
  floor_count: number
}

interface RoomOption {
  id: string
  name: string
  room_code?: string | null
  building_id?: string | null
  floor_number?: number | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CourseScheduleFormData) => Promise<boolean>
  initialData?: CourseScheduleFormData
  title?: string
  rooms?: RoomOption[]
  buildings?: BuildingOption[]
  defaultRoomId?: string
  isSubmitting?: boolean
}

export function CourseScheduleForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title = 'Tambah Jadwal Kuliah',
  rooms = [],
  buildings = [],
  defaultRoomId = '',
  isSubmitting = false,
}: Props) {
  const hasCascading = buildings.length > 0

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

  // Cascading state
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [selectedFloor, setSelectedFloor] = useState<number | ''>('')

  // Derive building & floor from room_id when editing or when defaultRoomId changes
  useEffect(() => {
    const roomId = formData.room_id
    if (!roomId || !hasCascading) {
      setSelectedBuildingId('')
      setSelectedFloor('')
      return
    }
    const room = rooms.find(r => r.id === roomId)
    if (room) {
      setSelectedBuildingId(room.building_id || '')
      setSelectedFloor(room.floor_number ?? '')
    }
  }, [formData.room_id, hasCascading, rooms])

  // Reset cascading when dialog opens/closes
  useEffect(() => {
    if (open && initialData?.room_id && hasCascading) {
      const room = rooms.find(r => r.id === initialData.room_id)
      if (room) {
        setSelectedBuildingId(room.building_id || '')
        setSelectedFloor(room.floor_number ?? '')
      }
    }
  }, [open, initialData, hasCascading, rooms])

  const selectedBuilding = useMemo(
    () => buildings.find(b => b.id === selectedBuildingId),
    [buildings, selectedBuildingId]
  )

  const floorOptions = useMemo(() => {
    if (!selectedBuilding) return []
    return Array.from({ length: selectedBuilding.floor_count }, (_, i) => i + 1)
  }, [selectedBuilding])

  const filteredRooms = useMemo(() => {
    if (!hasCascading) return rooms
    return rooms.filter(r => {
      if (selectedBuildingId && r.building_id !== selectedBuildingId) return false
      if (selectedFloor !== '' && r.floor_number !== selectedFloor) return false
      return true
    })
  }, [hasCascading, rooms, selectedBuildingId, selectedFloor])

  const handleBuildingChange = (buildingId: string | null) => {
    setSelectedBuildingId(buildingId || '')
    setSelectedFloor('')
    setFormData(prev => ({ ...prev, room_id: '' }))
  }

  const handleFloorChange = (floor: number | '') => {
    setSelectedFloor(floor)
    setFormData(prev => ({ ...prev, room_id: '' }))
  }

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(data: CourseScheduleFormData): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!data.room_id) errs.room_id = 'Ruangan wajib dipilih'
    if (!data.mata_kuliah.trim()) errs.mata_kuliah = 'Mata kuliah wajib diisi'
    if (!data.dosen.trim()) errs.dosen = 'Dosen wajib diisi'
    if (!data.fakultas.trim()) errs.fakultas = 'Fakultas wajib diisi'
    if (!data.kelas.trim()) errs.kelas = 'Kelas wajib diisi'
    if (!data.semester.trim()) errs.semester = 'Semester wajib diisi'
    if (!data.start_date) errs.start_date = 'Tanggal mulai wajib diisi'
    if (!data.end_date) errs.end_date = 'Tanggal akhir wajib diisi'
    if (data.start_date && data.end_date && data.start_date > data.end_date) {
      errs.end_date = 'Tanggal akhir harus setelah tanggal mulai'
    }
    if (data.start_time && data.end_time && data.start_time >= data.end_time) {
      errs.end_time = 'Jam selesai harus setelah jam mulai'
    }
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors = validate(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    const success = await onSubmit(formData)
    if (success) {
      // Reset form on success
      setFormData({
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
      })
      if (hasCascading) {
        setSelectedBuildingId('')
        setSelectedFloor('')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[#111827] text-lg font-bold">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Ruangan */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#111827] border-b border-[#E5E7EB] pb-2">1. Ruangan</h3>
            {hasCascading ? (
              <div className="space-y-3">
                {/* Building */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#6B7280]">Gedung <span className="text-red-500">*</span></Label>
                  <Select value={selectedBuildingId} onValueChange={handleBuildingChange}>
                    <SelectTrigger className={cn("h-10 rounded-[10px]", errors.room_id ? "border-red-300" : "border-[#E5E7EB]")}>
                      {(() => {
                        const b = buildings.find(x => x.id === selectedBuildingId)
                        return b ? (
                          <span className="text-[#111827]">{b.name} {b.code ? `(${b.code})` : ''}</span>
                        ) : (
                          <span className="text-[#9CA3AF]">Pilih gedung...</span>
                        )
                      })()}
                    </SelectTrigger>
                    <SelectContent className="rounded-[10px]">
                      {buildings.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} {b.code ? `(${b.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Floor */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#6B7280]">Lantai <span className="text-red-500">*</span></Label>
                  <Select
                    value={selectedFloor === '' ? '' : String(selectedFloor)}
                    onValueChange={(v) => handleFloorChange(v === '' ? '' : Number(v))}
                    disabled={!selectedBuildingId}
                  >
                    <SelectTrigger className={cn("h-10 rounded-[10px] border-[#E5E7EB]", !selectedBuildingId && "bg-[#F3F4F6] text-[#9CA3AF]")}>
                      <SelectValue placeholder={selectedBuildingId ? "Pilih lantai..." : "Pilih gedung dulu"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-[10px]">
                      {floorOptions.map(floor => (
                        <SelectItem key={floor} value={String(floor)}>Lantai {floor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Room */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#6B7280]">Ruangan <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.room_id}
                    onValueChange={(v) => setFormData({ ...formData, room_id: v || '' })}
                    disabled={!selectedBuildingId || selectedFloor === ''}
                  >
                    <SelectTrigger className={cn("h-10 rounded-[10px]", errors.room_id ? "border-red-300" : "border-[#E5E7EB]", (!selectedBuildingId || selectedFloor === '') && "bg-[#F3F4F6] text-[#9CA3AF]")}>
                      {(() => {
                        const r = rooms.find(x => x.id === formData.room_id)
                        return r ? (
                          <span className="text-[#111827]">{r.name} {r.room_code ? `(${r.room_code})` : ''}</span>
                        ) : (
                          <span className="text-[#9CA3AF]">
                            {!selectedBuildingId ? 'Pilih gedung dulu'
                              : selectedFloor === '' ? 'Pilih lantai dulu'
                                : filteredRooms.length === 0 ? 'Tidak ada ruangan'
                                  : 'Pilih ruangan...'}
                          </span>
                        )
                      })()}
                    </SelectTrigger>
                    <SelectContent className="rounded-[10px]">
                      {filteredRooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} {room.room_code ? `(${room.room_code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.room_id && <p className="text-xs text-red-500">{errors.room_id}</p>}
                </div>
              </div>
            ) : (
              rooms.length > 0 && (
                <div className="space-y-2">
                  <Label>Ruangan <span className="text-red-500">*</span></Label>
                  <Select value={formData.room_id} onValueChange={(v) => setFormData({ ...formData, room_id: v || '' })}>
                    <SelectTrigger className={cn("h-10 rounded-[10px]", errors.room_id ? "border-red-300" : "border-[#E5E7EB]")}>
                      {(() => {
                        const r = rooms.find(x => x.id === formData.room_id)
                        return r ? (
                          <span className="text-[#111827]">{r.name} {r.room_code ? `(${r.room_code})` : ''}</span>
                        ) : (
                          <span className="text-[#9CA3AF]">Pilih ruangan...</span>
                        )
                      })()}
                    </SelectTrigger>
                    <SelectContent className="rounded-[10px]">
                      {rooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} {room.room_code ? `(${room.room_code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.room_id && <p className="text-xs text-red-500">{errors.room_id}</p>}
                </div>
              )
            )}
          </div>

          {/* Section 2: Mata Kuliah */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#111827] border-b border-[#E5E7EB] pb-2">2. Mata Kuliah</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6B7280]">Mata Kuliah <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.mata_kuliah}
                  onChange={e => { setFormData({ ...formData, mata_kuliah: e.target.value }); if (errors.mata_kuliah) setErrors(prev => { const n = { ...prev }; delete n.mata_kuliah; return n }) }}
                  placeholder="Contoh: Fisika Dasar"
                  className={cn("h-10 rounded-[10px]", errors.mata_kuliah ? "border-red-300" : "border-[#E5E7EB]")}
                />
                {errors.mata_kuliah && <p className="text-xs text-red-500">{errors.mata_kuliah}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6B7280]">Dosen <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.dosen}
                  onChange={e => { setFormData({ ...formData, dosen: e.target.value }); if (errors.dosen) setErrors(prev => { const n = { ...prev }; delete n.dosen; return n }) }}
                  placeholder="Contoh: Dr. Budi"
                  className={cn("h-10 rounded-[10px]", errors.dosen ? "border-red-300" : "border-[#E5E7EB]")}
                />
                {errors.dosen && <p className="text-xs text-red-500">{errors.dosen}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6B7280]">Fakultas <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.fakultas}
                  onChange={e => { setFormData({ ...formData, fakultas: e.target.value }); if (errors.fakultas) setErrors(prev => { const n = { ...prev }; delete n.fakultas; return n }) }}
                  placeholder="Contoh: FMIPA"
                  className={cn("h-10 rounded-[10px]", errors.fakultas ? "border-red-300" : "border-[#E5E7EB]")}
                />
                {errors.fakultas && <p className="text-xs text-red-500">{errors.fakultas}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6B7280]">Kelas <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.kelas}
                  onChange={e => { setFormData({ ...formData, kelas: e.target.value }); if (errors.kelas) setErrors(prev => { const n = { ...prev }; delete n.kelas; return n }) }}
                  placeholder="Contoh: Kelas A"
                  className={cn("h-10 rounded-[10px]", errors.kelas ? "border-red-300" : "border-[#E5E7EB]")}
                />
                {errors.kelas && <p className="text-xs text-red-500">{errors.kelas}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#6B7280]">Semester <span className="text-red-500">*</span></Label>
              <Input
                value={formData.semester}
                onChange={e => { setFormData({ ...formData, semester: e.target.value }); if (errors.semester) setErrors(prev => { const n = { ...prev }; delete n.semester; return n }) }}
                placeholder="Contoh: Ganjil 2026"
                className={cn("h-10 rounded-[10px]", errors.semester ? "border-red-300" : "border-[#E5E7EB]")}
              />
              {errors.semester && <p className="text-xs text-red-500">{errors.semester}</p>}
            </div>
          </div>

          {/* Section 3: Waktu */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#111827] border-b border-[#E5E7EB] pb-2">3. Waktu</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6B7280]">Hari <span className="text-red-500">*</span></Label>
                <Select
                  value={String(formData.day_of_week)}
                  onValueChange={(v) => setFormData({ ...formData, day_of_week: Number(v) })}
                >
                  <SelectTrigger className="h-10 rounded-[10px] border-[#E5E7EB]">
                    <span className="text-[#111827]">{DAY_NAMES[formData.day_of_week]}</span>
                  </SelectTrigger>
                  <SelectContent className="rounded-[10px]">
                    {DAY_NAMES.map((name, i) => (
                      <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6B7280]">Jam Mulai <span className="text-red-500">*</span></Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={e => { setFormData({ ...formData, start_time: e.target.value }); if (errors.end_time) setErrors(prev => { const n = { ...prev }; delete n.end_time; return n }) }}
                  className="h-10 rounded-[10px] border-[#E5E7EB]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6B7280]">Jam Selesai <span className="text-red-500">*</span></Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={e => { setFormData({ ...formData, end_time: e.target.value }); if (errors.end_time) setErrors(prev => { const n = { ...prev }; delete n.end_time; return n }) }}
                  className={cn("h-10 rounded-[10px]", errors.end_time ? "border-red-300" : "border-[#E5E7EB]")}
                />
                {errors.end_time && <p className="text-xs text-red-500">{errors.end_time}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6B7280]">Tanggal Mulai <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={e => { setFormData({ ...formData, start_date: e.target.value }); if (errors.end_date) setErrors(prev => { const n = { ...prev }; delete n.end_date; return n }) }}
                  className="h-10 rounded-[10px] border-[#E5E7EB]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6B7280]">Tanggal Akhir <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={e => { setFormData({ ...formData, end_date: e.target.value }); if (errors.end_date) setErrors(prev => { const n = { ...prev }; delete n.end_date; return n }) }}
                  className={cn("h-10 rounded-[10px]", errors.end_date ? "border-red-300" : "border-[#E5E7EB]")}
                />
                {errors.end_date && <p className="text-xs text-red-500">{errors.end_date}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 rounded-[10px] border-[#E5E7EB]" disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" className="h-10 rounded-[10px] bg-[#0891B2] hover:bg-[#0891B2]/90 text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
