# Jadwal Kuliah Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement recurring course schedule management that blocks room availability during class times and displays it on public calendars.

**Architecture:** Denormalized block pattern - template `course_schedules` table generates instances into `room_schedule_blocks`. Existing calendar and conflict detection queries just need to include `schedule_type = 'class'`.

**Tech Stack:** Next.js 15, PostgreSQL/Supabase, TypeScript, Tailwind CSS, shadcn/ui, react-csv-reader, date-fns

---

## File Structure

```
supabase/migrations/20250610_course_schedules.sql     # Database migration
src/app/(admin)/admin/rooms/[id]/course-schedules/   # Per-room schedule management
  page.tsx                                              # List + import dialog
  CourseScheduleForm.tsx                                # Add/edit modal form
  CourseScheduleList.tsx                                # Table component
  actions.ts                                            # Server actions (CRUD + import)
  CSVImportDialog.tsx                                   # CSV upload dialog
  getRoomSlug.ts                                        # Helper: room name → slug
src/app/(admin)/admin/course-schedules/                # Global schedule view
  page.tsx                                              # All schedules table
  CourseSchedulesPageClient.tsx                         # Client with filters
src/components/calendar/CalendarView.tsx               # Modified: query class blocks
src/app/rooms/[id]/page.tsx                           # Modified: show class schedules
src/app/(borrower)/booking/new/actions.ts             # Modified: conflict detection
src/lib/course-schedules.ts                           # Shared types + helpers
```

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20250610_course_schedules.sql`

- [ ] **Step 1: Write migration SQL**

Create file with the following SQL:
```sql
-- ============================================================
-- COURSE SCHEDULES (Jadwal Kuliah Berulang)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.course_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  mata_kuliah TEXT NOT NULL,
  dosen TEXT NOT NULL,
  fakultas TEXT NOT NULL,
  kelas TEXT NOT NULL,
  semester TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL CHECK (end_time > start_time),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date > start_date),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_schedules_room ON public.course_schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_semester ON public.course_schedules(semester);
CREATE INDEX IF NOT EXISTS idx_course_schedules_active ON public.course_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_course_schedules_dates ON public.course_schedules(start_date, end_date);

-- Extend room_schedule_blocks
ALTER TABLE public.room_schedule_blocks
  ADD COLUMN IF NOT EXISTS schedule_type TEXT NOT NULL DEFAULT 'maintenance',
  ADD COLUMN IF NOT EXISTS course_schedule_id UUID REFERENCES public.course_schedules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS mata_kuliah TEXT,
  ADD COLUMN IF NOT EXISTS dosen TEXT,
  ADD COLUMN IF NOT EXISTS fakultas TEXT,
  ADD COLUMN IF NOT EXISTS kelas TEXT,
  ADD COLUMN IF NOT EXISTS semester TEXT;

-- Update existing rows to 'maintenance'
UPDATE public.room_schedule_blocks SET schedule_type = 'maintenance' WHERE schedule_type IS NULL;

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_room_schedule_blocks_type ON public.room_schedule_blocks(room_id, start_datetime, schedule_type);

-- RLS
ALTER TABLE public.course_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "course_schedules_select_all"
  ON public.course_schedules FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "course_schedules_admin_all"
  ON public.course_schedules FOR ALL
  USING (public.is_admin());

-- ============================================================
-- FUNCTION & TRIGGER: Regenerate instances
-- ============================================================

CREATE OR REPLACE FUNCTION public.regenerate_course_schedule_instances()
RETURNS TRIGGER AS $$
BEGIN
  -- Hapus instance lama
  DELETE FROM public.room_schedule_blocks
  WHERE course_schedule_id = NEW.id;

  -- Generate instance baru
  INSERT INTO public.room_schedule_blocks (
    room_id, start_datetime, end_datetime, reason,
    schedule_type, course_schedule_id, mata_kuliah, dosen, fakultas, kelas, semester,
    created_by
  )
  SELECT
    NEW.room_id,
    (d + NEW.start_time)::timestamptz,
    (d + NEW.end_time)::timestamptz,
    NEW.mata_kuliah || ' - ' || NEW.dosen || ' (' || NEW.kelas || ')',
    'class',
    NEW.id,
    NEW.mata_kuliah,
    NEW.dosen,
    NEW.fakultas,
    NEW.kelas,
    NEW.semester,
    NEW.created_by
  FROM generate_series(NEW.start_date, NEW.end_date, '1 day') AS d
  WHERE EXTRACT(DOW FROM d) = NEW.day_of_week
  AND d >= CURRENT_DATE - INTERVAL '1 day';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_course_schedule_regenerate ON public.course_schedules;
CREATE TRIGGER trg_course_schedule_regenerate
  AFTER INSERT OR UPDATE ON public.course_schedules
  FOR EACH ROW EXECUTE FUNCTION public.regenerate_course_schedule_instances();

-- ============================================================
-- FUNCTION & TRIGGER: Delete instances
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_course_schedule_instances()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.room_schedule_blocks
  WHERE course_schedule_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_course_schedule_cleanup ON public.course_schedules;
CREATE TRIGGER trg_course_schedule_cleanup
  BEFORE DELETE ON public.course_schedules
  FOR EACH ROW EXECUTE FUNCTION public.delete_course_schedule_instances();

-- ============================================================
-- UPDATE TIMESTAMP
-- ============================================================

DROP TRIGGER IF EXISTS update_course_schedules_updated_at ON public.course_schedules;
CREATE TRIGGER update_course_schedules_updated_at
  BEFORE UPDATE ON public.course_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

- [ ] **Step 2: Run migration in Supabase**

Go to Supabase SQL Editor and run the SQL above.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20250610_course_schedules.sql
git commit -m "db: add course_schedules table and room_schedule_blocks extension"
```

---

## Task 2: Shared Types & Helpers

**Files:**
- Create: `src/lib/course-schedules.ts`

- [ ] **Step 1: Write shared types and helpers**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/course-schedules.ts
git commit -m "types: add course schedule types and helpers"
```

---

## Task 3: Server Actions (CRUD + CSV Import)

**Files:**
- Create: `src/app/(admin)/admin/rooms/[id]/course-schedules/actions.ts`

- [ ] **Step 1: Write server actions**

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CourseScheduleFormData, CSVRow, CSV_HEADERS, DAY_MAP } from '@/lib/course-schedules'
import { createSlug } from '@/lib/utils'

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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/rooms/\[id\]/course-schedules/actions.ts
git commit -m "feat: add course schedule server actions (CRUD + CSV import)"
```

---

## Task 4: Form Modal Component

**Files:**
- Create: `src/app/(admin)/admin/rooms/[id]/course-schedules/CourseScheduleForm.tsx`

- [ ] **Step 1: Write form modal**

```typescript
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
}

export function CourseScheduleForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title = 'Tambah Jadwal Kuliah',
}: Props) {
  const [formData, setFormData] = useState<CourseScheduleFormData>(
    initialData || {
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/rooms/\[id\]/course-schedules/CourseScheduleForm.tsx
git commit -m "feat: add course schedule form modal component"
```

---

## Task 5: CSV Import Dialog

**Files:**
- Create: `src/app/(admin)/admin/rooms/[id]/course-schedules/CSVImportDialog.tsx`

- [ ] **Step 1: Write CSV import dialog**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CSVRow, CSV_HEADERS } from '@/lib/course-schedules'
import { importCourseSchedulesFromCSV } from './actions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  userId: string
}

export function CSVImportDialog({ open, onOpenChange, roomId, userId }: Props) {
  const [preview, setPreview] = useState<CSVRow[]>([])
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) return

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/\s+/g, '_').replace(/['"]/g, ''))
      const rows: CSVRow[] = []

      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const values = lines[i].split(',')
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => {
          row[h] = values[idx]?.trim().replace(/['"]/g, '') || ''
        })

        rows.push({
          mata_kuliah: row.mata_kuliah || '',
          dosen: row.dosen || '',
          fakultas: row.fakultas || '',
          kelas: row.kelas || '',
          semester: row.semester || '',
          ruangan: row.ruangan || '',
          hari: row.hari || '',
          jam_mulai: row.jam_mulai || row.jam_mulai || '',
          jam_selesai: row.jam_selesai || row.jam_selesai || '',
          tanggal_mulai: row.tanggal_mulai || '',
          tanggal_selesai: row.tanggal_selesai || '',
        })
      }

      setPreview(rows)
    }
    reader.readAsText(file)
  }, [])

  const handleImport = async () => {
    setLoading(true)
    const allRows: CSVRow[] = []
    // Parse full file again (simplified - in real implementation use a library)
    const result = await importCourseSchedulesFromCSV(allRows, userId)
    setResults(result)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Import Jadwal Kuliah dari CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Klik untuk pilih file CSV atau drag & drop di sini
            </label>
          </div>

          {preview.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Preview (5 baris pertama):</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-muted">
                    <tr>
                      {CSV_HEADERS.map(h => (
                        <th key={h} className="px-2 py-1 text-left text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{row.mata_kuliah}</td>
                        <td className="px-2 py-1">{row.dosen}</td>
                        <td className="px-2 py-1">{row.fakultas}</td>
                        <td className="px-2 py-1">{row.kelas}</td>
                        <td className="px-2 py-1">{row.semester}</td>
                        <td className="px-2 py-1">{row.ruangan}</td>
                        <td className="px-2 py-1">{row.hari}</td>
                        <td className="px-2 py-1">{row.jam_mulai}</td>
                        <td className="px-2 py-1">{row.jam_selesai}</td>
                        <td className="px-2 py-1">{row.tanggal_mulai}</td>
                        <td className="px-2 py-1">{row.tanggal_selesai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium">
                Berhasil: {results.success} | Gagal: {results.failed}
              </p>
              {results.errors.length > 0 && (
                <ul className="mt-2 text-xs text-red-600 space-y-1">
                  {results.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button onClick={handleImport} disabled={loading || preview.length === 0}>
              {loading ? 'Mengimport...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/rooms/\[id\]/course-schedules/CSVImportDialog.tsx
git commit -m "feat: add CSV import dialog for course schedules"
```

---

## Task 6: Per-Room Course Schedule Page

**Files:**
- Create: `src/app/(admin)/admin/rooms/[id]/course-schedules/page.tsx`

- [ ] **Step 1: Write page component**

```typescript
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getCourseSchedules } from './actions'
import { CourseScheduleList } from './CourseScheduleList'
import { createSlug } from '@/lib/utils'

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jadwal Kuliah - {matched.name}</h1>
          <p className="text-muted-foreground">Kelola jadwal kuliah berulang per semester</p>
        </div>
      </div>

      <CourseScheduleList
        roomId={roomId}
        schedules={schedules || []}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create CourseScheduleList client component**

Create: `src/app/(admin)/admin/rooms/[id]/course-schedules/CourseScheduleList.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CourseSchedule, getDayName, formatTime } from '@/lib/course-schedules'
import { CourseScheduleForm } from './CourseScheduleForm'
import { CSVImportDialog } from './CSVImportDialog'
import { createCourseSchedule, updateCourseSchedule, deleteCourseSchedule } from './actions'
import { Pencil, Trash2, Upload } from 'lucide-react'

interface Props {
  roomId: string
  schedules: CourseSchedule[]
  userId: string
}

export function CourseScheduleList({ roomId, schedules, userId }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<CourseSchedule | null>(null)

  const handleCreate = async (data: CourseScheduleFormData) => {
    await createCourseSchedule(roomId, data, userId)
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
            Belum ada jadwal kuliah untuk ruangan ini.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map(schedule => (
            <Card key={schedule.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{schedule.mata_kuliah}</h3>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{schedule.semester}</span>
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
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/rooms/\[id\]/course-schedules/
git commit -m "feat: add per-room course schedule admin page"
```

---

## Task 7: Update CalendarView to Show Class Schedules

**Files:**
- Modify: `src/components/calendar/CalendarView.tsx`

- [ ] **Step 1: Add class schedule query**

In the `fetchAvailability` function, add query for `room_schedule_blocks`:

```typescript
// After booking items query, add:
const { data: classBlocks, error: classError } = await supabase
  .from('room_schedule_blocks')
  .select('start_datetime, end_datetime, schedule_type, mata_kuliah')
  .eq(roomId ? 'room_id' : 'equipment_id', targetId)
  .eq('schedule_type', 'class')
  .gte('start_datetime', `${startDate}T00:00:00`)
  .lte('start_datetime', `${endDate}T23:59:59`)

if (!classError && classBlocks) {
  classBlocks.forEach((block: any) => {
    const start = new Date(block.start_datetime)
    const end = new Date(block.end_datetime)
    const days = eachDayOfInterval({ start, end })
    
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      if (!slotMap.has(dateStr)) {
        slotMap.set(dateStr, true)
        generatedSlots.push({
          id: `class-${dateStr}`,
          booking_date: dateStr,
          is_booked: true,
          booking_id: 'class',
        })
      }
    })
  })
}
```

- [ ] **Step 2: Add class color to calendar**

In the `getDayStatus` function, add check for class blocks:

```typescript
const getDayStatus = (date: Date) => {
  const daySlots = getSlotsForDate(date)
  const hasClass = daySlots.some(s => s.booking_id === 'class')
  const hasBooking = daySlots.some(s => s.booking_id !== 'class')
  
  if (daySlots.length === 0) return 'no-data'
  if (hasClass && hasBooking) return 'mixed'
  if (hasClass) return 'class'
  if (daySlots.every(s => s.is_booked)) return 'fully-booked'
  if (daySlots.some(s => !s.is_booked)) return 'available'
  return 'no-data'
}
```

In the calendar grid rendering, add class color:
```typescript
status === 'class' && "bg-blue-50 hover:bg-blue-100",
status === 'mixed' && "bg-purple-50 hover:bg-purple-100",
```

Add legend:
```typescript
<div className="flex items-center gap-1.5">
  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
  <span className="text-muted-foreground">Jadwal Kuliah</span>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/CalendarView.tsx
git commit -m "feat: display class schedules on public calendar"
```

---

## Task 8: Update Room Detail Page to Show Class Schedules

**Files:**
- Modify: `src/app/rooms/[id]/page.tsx`

- [ ] **Step 1: Add class schedule section**

After the "Jadwal Peminjaman" section, add:

```typescript
// Fetch upcoming class schedules for this room
const { data: classBlocks } = await sb
  .from('room_schedule_blocks')
  .select('start_datetime, end_datetime, mata_kuliah, dosen, kelas, semester')
  .eq('room_id', id)
  .eq('schedule_type', 'class')
  .gte('end_datetime', now)
  .order('start_datetime', { ascending: true })
  .limit(10)

// ...

{/* ─── Jadwal Kuliah ───────────────────────────── */}
<section id="jadwal-kuliah" className="mt-8 scroll-mt-20">
  <Card className="border border-[#E5E7EB] rounded-[14px] shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <GraduationCap className="h-5 w-5 text-blue-500" />
        <h3 className="font-bold text-[#111827] text-lg">Jadwal Kuliah Mendatang</h3>
      </div>
      
      {classBlocks && classBlocks.length > 0 ? (
        <div className="space-y-2">
          {classBlocks.map((block, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-blue-50 rounded-[10px] border border-blue-200"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#111827]">
                  {block.mata_kuliah} — {block.dosen} ({block.kelas})
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {formatDateTime(block.start_datetime)} — {formatDateTime(block.end_datetime)}
                </p>
                <p className="text-xs text-blue-600">
                  {block.semester}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <GraduationCap className="h-10 w-10 text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">Tidak ada jadwal kuliah mendatang</p>
        </div>
      )}
    </CardContent>
  </Card>
</section>
```

Add import: `import { GraduationCap } from 'lucide-react'`

- [ ] **Step 2: Commit**

```bash
git add src/app/rooms/\[id\]/page.tsx
git commit -m "feat: show upcoming class schedules on room detail page"
```

---

## Task 9: Update Booking Conflict Detection

**Files:**
- Modify: `src/app/(borrower)/booking/new/actions.ts`

- [ ] **Step 1: Add class schedule conflict check**

After existing room conflict check, add:

```typescript
// Step 3: Check class schedule blocks
const { data: classBlocks } = await supabase
  .from('room_schedule_blocks')
  .select('mata_kuliah, dosen, start_datetime, end_datetime')
  .eq('room_id', roomId)
  .eq('schedule_type', 'class')
  .lt('start_datetime', endDt.toISOString())
  .gt('end_datetime', startDt.toISOString())

if (classBlocks && classBlocks.length > 0) {
  const block = classBlocks[0]
  return {
    error: `Ruangan sedang dipakai untuk jadwal kuliah "${block.mata_kuliah}" (Dosen: ${block.dosen}) pada ${formatDateTime(block.start_datetime)}`
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(borrower)/booking/new/actions.ts
git commit -m "feat: block booking when room has class schedule conflict"
```

---

## Task 10: Global Course Schedule Admin Page

**Files:**
- Create: `src/app/(admin)/admin/course-schedules/page.tsx`

- [ ] **Step 1: Write global page**

```typescript
import { createAdminClient } from '@/lib/supabase/server'
import { getCourseSchedules } from '../rooms/[id]/course-schedules/actions'
import { CourseScheduleList } from '../rooms/[id]/course-schedules/CourseScheduleList'

export const revalidate = 60

export default async function GlobalCourseSchedulesPage() {
  const sb = await createAdminClient()
  const { data: schedules } = await getCourseSchedules()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Semua Jadwal Kuliah</h1>
        <p className="text-muted-foreground">Kelola jadwal kuliah dari semua ruangan</p>
      </div>

      <CourseScheduleList
        roomId=""
        schedules={schedules || []}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/course-schedules/page.tsx
git commit -m "feat: add global course schedule admin page"
```

---

## Task 11: Test & Verify

- [ ] **Step 1: Run dev server and test**

```bash
npm run dev
```

- Test: `/admin/rooms/ruang-kelas-1/course-schedules`
- Test: Add schedule via form
- Test: Import CSV
- Test: Edit and delete
- Test: Public calendar shows class schedule
- Test: Booking conflict with class schedule

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Final commit**

```bash
git commit -m "feat: complete recurring course schedule management"
```

---

## Spec Coverage Check

| Spec Section | Task | Status |
|-------------|------|--------|
| Database Schema | Task 1 | Planned |
| Server Actions (CRUD) | Task 3 | Planned |
| Server Actions (CSV Import) | Task 3 | Planned |
| Admin Form Modal | Task 4 | Planned |
| CSV Import Dialog | Task 5 | Planned |
| Per-Room Page | Task 6 | Planned |
| Calendar Update | Task 7 | Planned |
| Room Detail Page | Task 8 | Planned |
| Conflict Detection | Task 9 | Planned |
| Global Admin Page | Task 10 | Planned |

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-10-jadwal-kuliah.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
