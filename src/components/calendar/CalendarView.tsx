'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, addMonths, subMonths, parseISO, isSameMonth,
  getDay,
} from 'date-fns'
import { id } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchPublicAvailabilityAction } from '@/app/catalog/actions'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingEntry {
  id: string
  reference_no: string
  start_datetime: string
  end_datetime: string
  status: string
}

interface ClassEntry {
  id: string
  mata_kuliah: string
  start_datetime: string
  end_datetime: string
}

interface DayData {
  bookings: BookingEntry[]
  classes: ClassEntry[]
}

type DayStatus = 'available' | 'pending' | 'booked' | 'completed' | 'class' | 'mixed'

interface CalendarViewProps {
  roomId?: string
  equipmentId?: string
  title?: string
  className?: string
  compact?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu Konfirmasi',
  approved: 'Disetujui',
  paid: 'Lunas',
  active: 'Sedang Digunakan',
  completed: 'Selesai',
}

const STATUS_DOT: Record<DayStatus, string> = {
  available: 'bg-green-500',
  pending: 'bg-amber-500',
  booked: 'bg-red-500',
  completed: 'bg-blue-400',
  class: 'bg-blue-500',
  mixed: 'bg-purple-500',
}

const STATUS_BG: Record<DayStatus, string> = {
  available: 'bg-green-50 hover:bg-green-100',
  pending: 'bg-amber-50 hover:bg-amber-100',
  booked: 'bg-red-50 hover:bg-red-100',
  completed: 'bg-blue-50 hover:bg-blue-100',
  class: 'bg-sky-50 hover:bg-sky-100',
  mixed: 'bg-purple-50 hover:bg-purple-100',
}

const BOOKING_STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-700 bg-amber-100',
  approved: 'text-red-700 bg-red-100',
  paid: 'text-red-800 bg-red-100',
  active: 'text-red-900 bg-red-100',
  completed: 'text-blue-700 bg-blue-100',
}

const BOOKING_DOT_COLOR: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-red-500',
  paid: 'bg-red-600',
  active: 'bg-red-700',
  completed: 'bg-blue-400',
}

// ─── CalendarView ─────────────────────────────────────────────────────────────

export function CalendarView({
  roomId,
  equipmentId,
  title,
  className,
  compact = false,
}: CalendarViewProps) {
  const [dayDataMap, setDayDataMap] = useState<Map<string, DayData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchAvailability = useCallback(async () => {
    if (!roomId && !equipmentId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setSelectedDay(null)
    try {
      const type = roomId ? ('room' as const) : ('equipment' as const)
      const id = roomId || equipmentId || ''
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1

      const days = await fetchPublicAvailabilityAction(type, id, year, month)

      const map = new Map<string, DayData>()
      for (const day of days) {
        map.set(day.date, { bookings: day.bookings, classes: day.classes })
      }
      setDayDataMap(map)
    } catch (err) {
      console.error('CalendarView fetch error:', err)
      setDayDataMap(new Map())
    } finally {
      setLoading(false)
    }
  }, [roomId, equipmentId, currentDate])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  // ── Calendar grid ──────────────────────────────────────────────────────────

  const { calendarDays, paddingStart } = useMemo(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    // getDay() = 0 (Sun) … 6 (Sat) — matches our weekday header order
    return { calendarDays: eachDayOfInterval({ start, end }), paddingStart: getDay(start) }
  }, [currentDate])

  const getDayStatus = useCallback((date: Date): DayStatus => {
    const data = dayDataMap.get(format(date, 'yyyy-MM-dd'))
    if (!data) return 'available'

    const hasClass = data.classes.length > 0
    const hasConfirmed = data.bookings.some(b => ['approved', 'paid', 'active'].includes(b.status))
    const hasPending = data.bookings.some(b => b.status === 'pending')
    const hasCompleted = data.bookings.some(b => b.status === 'completed') && !hasConfirmed && !hasPending

    if (hasClass && (hasConfirmed || hasPending)) return 'mixed'
    if (hasClass) return 'class'
    if (hasConfirmed) return 'booked'
    if (hasPending) return 'pending'
    if (hasCompleted) return 'completed'
    return 'available'
  }, [dayDataMap])

  // ── Stats ──────────────────────────────────────────────────────────────────

  const { availableCount, bookedCount, pendingCount } = useMemo(() => {
    let avail = 0, booked = 0, pend = 0
    calendarDays.forEach(d => {
      const s = getDayStatus(d)
      if (s === 'available') avail++
      else if (s === 'booked') booked++
      else if (s === 'pending') pend++
    })
    return { availableCount: avail, bookedCount: booked, pendingCount: pend }
  }, [calendarDays, getDayStatus])

  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-muted-foreground">Memuat jadwal…</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      {/* ── Header ── */}
      <CardHeader className={cn('pb-3', compact && 'p-4 pb-2')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            <CardTitle className={cn('text-lg', compact && 'text-base')}>
              {title || 'Kalender Ketersediaan'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className={cn('font-medium min-w-[110px] text-center', compact && 'text-sm min-w-[90px]')}>
              {format(currentDate, 'MMMM yyyy', { locale: id })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
          {[
            { color: 'bg-green-500', label: 'Tersedia' },
            { color: 'bg-amber-500', label: 'Menunggu Konfirmasi' },
            { color: 'bg-red-500',   label: 'Sudah Dipesan' },
            { color: 'bg-blue-400',  label: 'Selesai' },
            { color: 'bg-sky-500',   label: 'Jadwal Kuliah' },
            { color: 'bg-purple-500',label: 'Booking + Kuliah' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={cn('w-2.5 h-2.5 rounded-full', color)} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className={cn('pt-0', compact && 'p-4 pt-0')}>
        {/* ── Calendar grid ── */}
        <div className="border border-border rounded-[10px] overflow-hidden">
          {/* Week header */}
          <div className="grid grid-cols-7 bg-muted border-b">
            {weekDays.map(day => (
              <div key={day} className={cn(
                'py-2 text-center font-medium text-muted-foreground',
                compact ? 'text-xs py-1.5' : 'text-sm'
              )}>
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {/* Padding cells for first day alignment */}
            {Array.from({ length: paddingStart }).map((_, i) => (
              <div key={`pad-${i}`} className={cn(
                'border-b border-r bg-muted/30',
                compact ? 'h-10' : 'h-16',
                i === 6 && 'border-r-0'
              )} />
            ))}

            {calendarDays.map((date, index) => {
              const status = getDayStatus(date)
              const isTodayDate = isToday(date)
              const dateStr = format(date, 'yyyy-MM-dd')
              const isSelected = selectedDay === dateStr
              const colIndex = (paddingStart + index) % 7

              return (
                <div
                  key={dateStr}
                  role="button"
                  aria-label={`${format(date, 'd MMMM yyyy', { locale: id })} — ${status}`}
                  className={cn(
                    'border-b border-r relative transition-colors cursor-pointer select-none',
                    compact ? 'h-10' : 'h-16',
                    colIndex === 6 && 'border-r-0',
                    STATUS_BG[status],
                    isTodayDate && 'ring-2 ring-inset ring-blue-400',
                    isSelected && 'ring-2 ring-inset ring-blue-600 z-10'
                  )}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                >
                  <div className="flex flex-col items-center justify-start h-full pt-2 px-1">
                    <span className={cn(
                      'font-medium leading-none',
                      compact ? 'text-xs' : 'text-sm',
                      isTodayDate && 'text-blue-600 font-bold'
                    )}>
                      {format(date, 'd')}
                    </span>

                    {/* Status dot */}
                    <div className={cn(
                      'rounded-full mt-1',
                      compact ? 'w-1 h-1' : 'w-1.5 h-1.5',
                      STATUS_DOT[status]
                    )} />

                    {/* Non-compact: show time range of first booking */}
                    {!compact && (() => {
                      const data = dayDataMap.get(dateStr)
                      const firstBooking = data?.bookings[0]
                      if (!firstBooking) return null
                      return (
                        <span className="text-[9px] text-muted-foreground mt-0.5 leading-none">
                          {format(parseISO(firstBooking.start_datetime), 'HH:mm')}–{format(parseISO(firstBooking.end_datetime), 'HH:mm')}
                        </span>
                      )
                    })()}
                  </div>

                  {/* Today bubble */}
                  {isTodayDate && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Detail panel (click a day) ── */}
        {selectedDay && (() => {
          const data = dayDataMap.get(selectedDay)
          const selDate = parseISO(selectedDay)
          const hasData = data && (data.bookings.length > 0 || data.classes.length > 0)

          return (
            <div className="mt-3 rounded-[10px] border border-border bg-card overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
                <p className="text-sm font-semibold">
                  {format(selDate, 'EEEE, d MMMM yyyy', { locale: id })}
                </p>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 space-y-2">
                {!hasData && (
                  <div className="flex items-center gap-2 py-2 text-sm text-green-700">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span>Tidak ada peminjaman — hari ini <strong>tersedia</strong></span>
                  </div>
                )}

                {/* Bookings */}
                {data?.bookings.map((booking, i) => (
                  <div key={`${booking.id}-${i}`} className="flex items-start gap-3 py-2 border-b last:border-0 border-border/50">
                    <div className={cn('mt-1 w-2 h-2 rounded-full shrink-0', BOOKING_DOT_COLOR[booking.status] ?? 'bg-gray-400')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-indigo-700">
                          {booking.reference_no}
                        </span>
                        <span className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                          BOOKING_STATUS_COLOR[booking.status] ?? 'bg-muted text-muted-foreground'
                        )}>
                          {STATUS_LABEL[booking.status] ?? booking.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          {format(parseISO(booking.start_datetime), 'HH:mm')}
                          {' – '}
                          {format(parseISO(booking.end_datetime), 'HH:mm')}
                          {' '}
                          {format(parseISO(booking.start_datetime), '(d MMM)', { locale: id })}
                          {' s/d '}
                          {format(parseISO(booking.end_datetime), '(d MMM)', { locale: id })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Class schedules */}
                {data?.classes.map((cls, i) => (
                  <div key={`${cls.id}-${i}`} className="flex items-start gap-3 py-2 border-b last:border-0 border-border/50">
                    <div className="mt-1 w-2 h-2 rounded-full shrink-0 bg-sky-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-sky-800">
                          {cls.mata_kuliah || 'Jadwal Kuliah'}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-sky-700 bg-sky-100">
                          Jadwal Kuliah
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          {format(parseISO(cls.start_datetime), 'HH:mm')}
                          {' – '}
                          {format(parseISO(cls.end_datetime), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── Summary stats ── */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{availableCount} hari tersedia</span>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{pendingCount} hari pending</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>{bookedCount} hari dipesan</span>
            </div>
          </div>
          <span>{format(currentDate, 'MMMM yyyy', { locale: id })}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── MiniCalendar (inline, compact variant) ───────────────────────────────────

export function MiniCalendar({ roomId, equipmentId }: { roomId?: string; equipmentId?: string }) {
  const [dayDataMap, setDayDataMap] = useState<Map<string, DayData>>(new Map())
  const [currentDate, setCurrentDate] = useState(new Date())

  const fetchSlots = useCallback(async () => {
    if (!roomId && !equipmentId) return
    try {
      const type = roomId ? ('room' as const) : ('equipment' as const)
      const id = roomId || equipmentId || ''
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1

      const days = await fetchPublicAvailabilityAction(type, id, year, month)
      const map = new Map<string, DayData>()
      for (const day of days) {
        map.set(day.date, { bookings: day.bookings, classes: day.classes })
      }
      setDayDataMap(map)
    } catch { /* silent */ }
  }, [roomId, equipmentId, currentDate])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  const { calendarDays, paddingStart } = useMemo(() => ({
    calendarDays: eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }),
    paddingStart: getDay(startOfMonth(currentDate)),
  }), [currentDate])

  const getDayStatus = (date: Date): DayStatus => {
    const data = dayDataMap.get(format(date, 'yyyy-MM-dd'))
    if (!data) return 'available'
    if (data.bookings.some(b => ['approved', 'paid', 'active'].includes(b.status))) return 'booked'
    if (data.bookings.some(b => b.status === 'pending')) return 'pending'
    return 'available'
  }

  const weekDays = ['M', 'S', 'S', 'R', 'K', 'J', 'S']

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">
          {format(currentDate, 'MMM yyyy', { locale: id })}
        </span>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="h-5 w-5"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-[8px] overflow-hidden border border-border">
        {weekDays.map((day, i) => (
          <div key={i} className="bg-muted py-1 text-center text-[10px] font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        {Array.from({ length: paddingStart }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-muted/40 py-1" />
        ))}

        {calendarDays.map(date => {
          const status = getDayStatus(date)
          return (
            <div
              key={date.toISOString()}
              className={cn(
                'bg-card py-1 text-center text-[10px]',
                status === 'booked' && 'bg-red-100 text-red-800',
                status === 'pending' && 'bg-amber-100 text-amber-800',
                status === 'available' && 'bg-green-50',
                isToday(date) && 'bg-blue-100 font-bold text-blue-700'
              )}
            >
              {format(date, 'd')}
            </div>
          )
        })}
      </div>
    </div>
  )
}
