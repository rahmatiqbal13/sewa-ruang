'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CourseSchedule, CourseScheduleFormData, getDayName, formatTime } from '@/lib/course-schedules'
import { CourseScheduleForm } from './CourseScheduleForm'
import { CSVImportDialog } from './CSVImportDialog'
import { createCourseSchedule, updateCourseSchedule, deleteCourseSchedule } from './actions'
import { Pencil, Trash2, Upload, GraduationCap } from 'lucide-react'

interface Props {
  roomId: string
  schedules: CourseSchedule[]
  userId: string
  rooms?: { id: string; name: string; room_code?: string | null }[]
}

export function CourseScheduleList({ roomId, schedules, userId, rooms = [] }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<CourseSchedule | null>(null)

  const handleCreate = async (data: CourseScheduleFormData) => {
    await createCourseSchedule(data, userId)
    window.location.reload()
  }

  const handleUpdate = async (data: CourseScheduleFormData) => {
    if (editing) {
      await updateCourseSchedule(editing.id, data)
      setEditing(null)
      window.location.reload()
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Hapus jadwal kuliah ini? Semua instance akan dihapus.')) {
      await deleteCourseSchedule(id)
      window.location.reload()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Button onClick={() => setFormOpen(true)}>
          + Tambah Jadwal
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Belum ada jadwal kuliah untuk ruangan ini.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map(schedule => (
            <Card key={schedule.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{schedule.mata_kuliah}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{schedule.semester}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {schedule.dosen} • {schedule.fakultas} • {schedule.kelas}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getDayName(schedule.day_of_week)}, {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {schedule.start_date} s/d {schedule.end_date}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(schedule)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(schedule.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
        defaultRoomId={roomId}
      />

      <CSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        roomId={roomId}
        userId={userId}
      />
    </div>
  )
}
