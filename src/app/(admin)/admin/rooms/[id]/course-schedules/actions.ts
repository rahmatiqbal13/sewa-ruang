'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CourseScheduleFormData, CSVRow, DAY_MAP } from '@/lib/course-schedules'

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function createCourseSchedule(
  roomId: string,
  data: CourseScheduleFormData,
  userId: string
) {
  const sb = await createAdminClient()

  const { data: result, error } = await sb
    .from('course_schedules')
    .insert({
      room_id: roomId,
      ...data,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/rooms/${createSlug(data.mata_kuliah)}/course-schedules`)
  return { success: true, data: result }
}

export async function updateCourseSchedule(
  id: string,
  data: CourseScheduleFormData
) {
  const sb = await createAdminClient()

  const { error } = await sb
    .from('course_schedules')
    .update(data)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/rooms/[id]/course-schedules')
  return { success: true }
}

export async function deleteCourseSchedule(id: string) {
  const sb = await createAdminClient()

  const { error } = await sb
    .from('course_schedules')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/rooms/[id]/course-schedules')
  return { success: true }
}

export async function importCourseSchedulesFromCSV(
  rows: CSVRow[],
  userId: string
) {
  const sb = await createAdminClient()

  // Get all rooms for lookup
  const { data: rooms } = await sb
    .from('rooms')
    .select('id, name')
    .eq('is_active', true)

  const roomMap = new Map<string, string>()
  rooms?.forEach(r => {
    roomMap.set(r.name.toLowerCase(), r.id)
  })

  const results: { success: number; failed: number; errors: string[] } = {
    success: 0,
    failed: 0,
    errors: [],
  }

  for (const row of rows) {
    const roomId = roomMap.get(row.ruangan.toLowerCase())
    if (!roomId) {
      results.failed++
      results.errors.push(`Ruangan "${row.ruangan}" tidak ditemukan: ${row.mata_kuliah}`)
      continue
    }

    const dayOfWeek = DAY_MAP[row.hari.toLowerCase()]
    if (dayOfWeek === undefined) {
      results.failed++
      results.errors.push(`Hari "${row.hari}" tidak valid: ${row.mata_kuliah}`)
      continue
    }

    const { error } = await sb
      .from('course_schedules')
      .insert({
        room_id: roomId,
        mata_kuliah: row.mata_kuliah,
        dosen: row.dosen,
        fakultas: row.fakultas,
        kelas: row.kelas,
        semester: row.semester,
        day_of_week: dayOfWeek,
        start_time: row.jam_mulai,
        end_time: row.jam_selesai,
        start_date: row.tanggal_mulai,
        end_date: row.tanggal_selesai,
        created_by: userId,
      })

    if (error) {
      results.failed++
      results.errors.push(`${row.mata_kuliah}: ${error.message}`)
    } else {
      results.success++
    }
  }

  revalidatePath('/admin/rooms/[id]/course-schedules')
  return results
}

export async function getCourseSchedules(roomId?: string) {
  const sb = await createAdminClient()

  let query = sb
    .from('course_schedules')
    .select('*')
    .eq('is_active', true)
    .order('semester', { ascending: false })
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (roomId) {
    query = query.eq('room_id', roomId)
  }

  const { data, error } = await query

  if (error) {
    return { error: error.message }
  }

  return { data: data || [] }
}
