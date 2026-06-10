export interface CourseSchedule {
  id: string
  room_id: string
  mata_kuliah: string
  dosen: string
  fakultas: string
  kelas: string
  semester: string
  day_of_week: number
  start_time: string
  end_time: string
  start_date: string
  end_date: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || '-'
}

export function formatTime(time: string): string {
  return time.slice(0, 5) // "HH:MM:SS" → "HH:MM"
}

export interface CourseScheduleFormData {
  mata_kuliah: string
  dosen: string
  fakultas: string
  kelas: string
  semester: string
  day_of_week: number
  start_time: string
  end_time: string
  start_date: string
  end_date: string
}

export interface CSVRow {
  mata_kuliah: string
  dosen: string
  fakultas: string
  kelas: string
  semester: string
  ruangan: string
  hari: string
  jam_mulai: string
  jam_selesai: string
  tanggal_mulai: string
  tanggal_selesai: string
}

export const CSV_HEADERS = [
  'mata_kuliah', 'dosen', 'fakultas', 'kelas', 'semester',
  'ruangan', 'hari', 'jam_mulai', 'jam_selesai', 'tanggal_mulai', 'tanggal_selesai'
]

export const DAY_MAP: Record<string, number> = {
  'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3, 'kamis': 4, 'jumat': 5, 'sabtu': 6,
}
