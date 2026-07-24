import { createAdminClient } from '@/lib/supabase/server'
import { getCourseSchedules } from '../rooms/[id]/course-schedules/actions'
import { CourseScheduleList } from '../rooms/[id]/course-schedules/CourseScheduleList'

export const revalidate = 60

export default async function GlobalCourseSchedulesPage() {
  const sb = await createAdminClient()
  const { data: schedules } = await getCourseSchedules()

  // Get buildings for cascading dropdown
  const { data: buildings } = await sb
    .from('buildings')
    .select('id, name, code, floor_count')
    .order('name')

  // Get all rooms with building & floor info for cascading dropdown
  const { data: rooms } = await sb
    .from('rooms')
    .select('id, name, room_code, building_id, floor_number')
    .eq('is_active', true)
    .order('name')

  // Get current user ID + role for actions
  const { data: { user } } = await sb.auth.getUser()
  const userId = user?.id || ''
  const { data: profile } = await sb
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  const userRole = (profile as { role: string } | null)?.role || ''

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
        userRole={userRole}
        rooms={rooms || []}
        buildings={buildings || []}
        isGlobalPage
      />
    </div>
  )
}
