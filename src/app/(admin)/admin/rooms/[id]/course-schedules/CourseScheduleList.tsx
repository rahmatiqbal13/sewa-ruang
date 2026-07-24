'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CourseSchedule, CourseScheduleFormData, getDayName, formatTime } from '@/lib/course-schedules'
import { CourseScheduleForm } from './CourseScheduleForm'
import { CSVImportDialog } from './CSVImportDialog'
import { createCourseSchedule, updateCourseSchedule, deleteCourseSchedule } from './actions'
import { Pencil, Trash2, Upload, GraduationCap, Clock, Calendar, User, Building, BookOpen, MapPin, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  roomId: string
  schedules: CourseSchedule[]
  userId: string
  userRole?: string
  rooms?: RoomOption[]
  buildings?: BuildingOption[]
  isGlobalPage?: boolean
}

export function CourseScheduleList({ roomId, schedules: initialSchedules, userId, userRole = '', rooms = [], buildings = [], isGlobalPage = false }: Props) {
  const canManage = ['admin', 'super_admin'].includes(userRole)
  const router = useRouter()
  const [schedules, setSchedules] = useState<CourseSchedule[]>(initialSchedules)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<CourseSchedule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CourseSchedule | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreate = async (data: CourseScheduleFormData) => {
    setIsSubmitting(true)
    const result = await createCourseSchedule(data, userId)
    setIsSubmitting(false)
    if (result.error) {
      toast.error('Gagal menambahkan jadwal: ' + result.error)
      return false
    }
    if (result.data) {
      setSchedules(prev => [...prev, result.data])
      toast.success('Jadwal berhasil ditambahkan')
    }
    setFormOpen(false)
    router.refresh()
    return true
  }

  const handleUpdate = async (data: CourseScheduleFormData) => {
    if (!editing) return false
    setIsSubmitting(true)
    const result = await updateCourseSchedule(editing.id, data)
    setIsSubmitting(false)
    if (result.error) {
      toast.error('Gagal memperbarui jadwal: ' + result.error)
      return false
    }
    setSchedules(prev => prev.map(s => s.id === editing.id ? { ...s, ...data } : s))
    toast.success('Jadwal berhasil diperbarui')
    setEditing(null)
    router.refresh()
    return true
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const result = await deleteCourseSchedule(deleteTarget.id)
    setIsDeleting(false)
    if (result.error) {
      toast.error('Gagal menghapus jadwal: ' + result.error)
    } else {
      setSchedules(prev => prev.filter(s => s.id !== deleteTarget.id))
      toast.success('Jadwal berhasil dihapus')
      router.refresh()
    }
    setDeleteTarget(null)
  }

  // Get room name for a schedule (used on global page)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getRoomName = (schedule: any) => {
    if (schedule.rooms) return `${schedule.rooms.name}${schedule.rooms.room_code ? ` (${schedule.rooms.room_code})` : ''}`
    const room = rooms.find(r => r.id === schedule.room_id)
    return room ? `${room.name}${room.room_code ? ` (${room.room_code})` : ''}` : null
  }

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={open => { if (!open && !isDeleting) setDeleteTarget(null) }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-red-50">
              <AlertTriangle className="size-5 text-red-600" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Hapus jadwal &quot;{deleteTarget?.mata_kuliah}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Jadwal kuliah ini akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-4">
        {canManage && (
          <div className="flex gap-3">
            <Button onClick={() => setFormOpen(true)}>
              + Tambah Jadwal
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </div>
        )}

        {schedules.length === 0 ? (
          <div className="text-center py-16 text-[#6B7280] border-2 border-dashed border-[#E5E7EB] rounded-[14px] bg-white">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-[#D1D5DB]" />
            <p className="font-medium">
              {isGlobalPage ? 'Belum ada jadwal kuliah.' : 'Belum ada jadwal kuliah untuk ruangan ini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map(schedule => {
              const roomName = isGlobalPage ? getRoomName(schedule) : null
              return (
                <div
                  key={schedule.id}
                  className="group bg-white border border-[#E5E7EB] rounded-[14px] p-4 hover:shadow-md transition-all duration-200 flex items-start justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <BookOpen className="h-4 w-4 text-[#0891B2] shrink-0" />
                      <h3 className="font-bold text-[#111827] truncate">{schedule.mata_kuliah}</h3>
                      <span className="text-[10px] bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded-full font-medium">
                        {schedule.semester}
                      </span>
                    </div>

                    {/* Room name — only on global page */}
                    {roomName && (
                      <div className="flex items-center gap-1.5 text-sm text-[#0891B2] font-medium">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{roomName}</span>
                      </div>
                    )}

                    {/* Dosen */}
                    <div className="flex items-center gap-1.5 text-sm text-[#6B7280]">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{schedule.dosen}</span>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-xs text-[#6B7280] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3 shrink-0" />
                        {schedule.fakultas}
                      </span>
                      <span className="text-[#D1D5DB]">•</span>
                      <span>{schedule.kelas}</span>
                    </div>

                    {/* Time row */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-[#0891B2] font-medium">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {getDayName(schedule.day_of_week)}
                      </span>
                      <span className="flex items-center gap-1 text-[#6B7280]">
                        <Clock className="h-3 w-3 shrink-0" />
                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      </span>
                    </div>

                    {/* Date range */}
                    <p className="text-[11px] text-[#9CA3AF]">
                      {schedule.start_date} s/d {schedule.end_date}
                    </p>
                  </div>

                  {/* Actions — admin & super_admin only */}
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditing(schedule)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(schedule)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg text-[#6B7280] hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {canManage && (
          <>
            <CourseScheduleForm
              open={formOpen || !!editing}
              onOpenChange={open => {
                setFormOpen(open)
                if (!open) setEditing(null)
              }}
              onSubmit={editing ? handleUpdate : handleCreate}
              initialData={editing || undefined}
              title={editing ? 'Edit Jadwal Kuliah' : 'Tambah Jadwal Kuliah'}
              rooms={rooms}
              buildings={buildings}
              defaultRoomId={roomId}
              isSubmitting={isSubmitting}
            />

            <CSVImportDialog
              open={importOpen}
              onOpenChange={setImportOpen}
              roomId={roomId}
              userId={userId}
            />
          </>
        )}
      </div>
    </>
  )
}
