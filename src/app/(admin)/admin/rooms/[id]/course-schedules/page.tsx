import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getCourseSchedules } from './actions'
import { CourseScheduleList } from './CourseScheduleList'

export const revalidate = 60

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default async function RoomCourseSchedulesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: slug } = await params
  const sb = await createAdminClient()

  // Find room by slug
  const { data: allRooms } = await sb
    .from('rooms')
    .select('id, name')
    .eq('is_active', true)

  const matched = allRooms?.find((r: { id: string; name: string }) => createSlug(r.name) === slug)
  if (!matched) notFound()

  const roomId = matched.id
  const { data: schedules } = await getCourseSchedules(roomId)

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Jadwal Kuliah - {matched.name}</h1>
          <p className="text-[#6B7280]">Kelola jadwal kuliah berulang per semester</p>
        </div>
      </div>

      <CourseScheduleList
        roomId={roomId}
        schedules={schedules || []}
        userId={userId}
        rooms={rooms || []}
      />
    </div>
  )
}
