import { createAdminClient } from '@/lib/supabase/server'
import { getCourseSchedules } from '../rooms/[id]/course-schedules/actions'
import { CourseScheduleList } from '../rooms/[id]/course-schedules/CourseScheduleList'

export const revalidate = 60

export default async function GlobalCourseSchedulesPage() {
  const sb = await createAdminClient()
  const { data: schedules } = await getCourseSchedules()

  // Get all rooms for dropdown
  const { data: rooms } = await sb
    .from('rooms')
    .select('id, name, room_code')
    .eq('is_active', true)
    .order('name')

  // Get current user ID for actions
  const { data: { user } } = await sb.auth.getUser()
  const userId = user?.id || ''

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Semua Jadwal Kuliah</h1>
        <p className="text-muted-foreground">Kelola jadwal kuliah dari semua ruangan</p>
      </div>

      <CourseScheduleList
        roomId=""
        schedules={schedules || []}
        userId={userId}
        rooms={rooms || []}
      />
    </div>
  )
}
