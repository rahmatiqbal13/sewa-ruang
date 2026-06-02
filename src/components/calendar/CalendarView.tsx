'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns'
import { id } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookingSlot {
  id: string
  room_id?: string
  equipment_id?: string
  booking_date: string
  is_booked: boolean
  booking_id?: string
}

interface BookingItem {
  booking_id: string
  bookings: {
    id: string
    start_datetime: string
    end_datetime: string
    status: string
  } | null
}

interface CalendarViewProps {
  roomId?: string
  equipmentId?: string
  title?: string
  className?: string
  compact?: boolean
}

export function CalendarView({ roomId, equipmentId, title, className, compact = false }: CalendarViewProps) {
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const supabase = createClient()

  const fetchAvailability = useCallback(async () => {
    if (!roomId && !equipmentId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd')

      // Query bookings through booking_items (reliable — doesn't depend on slot tables)
      const targetId = roomId || equipmentId || ''
      const { data: items, error } = await supabase
        .from('booking_items')
        .select(`
          booking_id,
          bookings!booking_id(id, start_datetime, end_datetime, status)
        `)
        .eq(roomId ? 'room_id' : 'equipment_id', targetId)
        .eq('item_type', roomId ? 'room' : 'equipment')
        .in('bookings.status', ['pending', 'approved', 'paid', 'active'])
        .gte('bookings.start_datetime', `${startDate}T00:00:00`)
        .lte('bookings.start_datetime', `${endDate}T23:59:59`)

      if (error) {
        console.error('Error fetching bookings:', error)
        setSlots([])
        return
      }

      // Generate slot data from bookings
      const generatedSlots: BookingSlot[] = []
      const slotMap = new Map<string, boolean>()

      items?.forEach((item: BookingItem) => {
        const booking = item.bookings
        if (!booking) return

        // Extract all dates between start and end
        const start = new Date(booking.start_datetime)
        const end = new Date(booking.end_datetime)
        const days = eachDayOfInterval({ start, end })

        days.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          if (!slotMap.has(dateStr)) {
            slotMap.set(dateStr, true)
            generatedSlots.push({
              id: `${booking.id}-${dateStr}`,
              booking_date: dateStr,
              is_booked: true,
              booking_id: booking.id,
            })
          }
        })
      })

      setSlots(generatedSlots)
    } catch (error) {
      console.error('Error:', error)
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [roomId, equipmentId, currentDate, supabase])

  useEffect(() => {
    const id = setTimeout(() => fetchAvailability(), 0)
    return () => clearTimeout(id)
  }, [fetchAvailability])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  // Get slots for a specific date
  const getSlotsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return slots.filter(s => s.booking_date === dateStr)
  }

  // Get day status
  const getDayStatus = (date: Date) => {
    const daySlots = getSlotsForDate(date)
    if (daySlots.length === 0) return 'no-data'
    if (daySlots.every(s => s.is_booked)) return 'fully-booked'
    if (daySlots.some(s => !s.is_booked)) return 'available'
    return 'no-data'
  }

  // Week days header
  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className={cn("pb-3", compact && "p-4 pb-2")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            <CardTitle className={cn("text-lg", compact && "text-base")}>
              {title || 'Kalender'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className={cn("font-medium min-w-[100px] text-center", compact && "text-sm min-w-[80px]")}>
              {format(currentDate, 'MMMM yyyy', { locale: id })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {!compact && (
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Tersedia</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Penuh</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
              <span className="text-muted-foreground">Tidak ada data</span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className={cn("pt-0", compact && "p-4 pt-0")}>
        {/* Compact Calendar Grid */}
        <div className="border border-border rounded-[10px] overflow-hidden">
          {/* Week Headers */}
          <div className="grid grid-cols-7 bg-muted border-b">
            {weekDays.map(day => (
              <div 
                key={day} 
                className={cn(
                  "py-2 text-center font-medium text-muted-foreground",
                  compact ? "text-xs py-1.5" : "text-sm"
                )}
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              const status = getDayStatus(date)
              const isCurrentMonth = isSameMonth(date, currentDate)
              const isTodayDate = isToday(date)
              
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "border-b border-r relative cursor-pointer transition-colors hover:bg-muted",
                    compact ? "h-10" : "h-14",
                    (index + 1) % 7 === 0 && "border-r-0",
                    !isCurrentMonth && "bg-muted/50",
                    status === 'fully-booked' && "bg-red-50 hover:bg-red-100",
                    status === 'available' && "bg-green-50 hover:bg-green-100",
                    isTodayDate && "bg-blue-50"
                  )}
                >
                  <div className={cn(
                    "flex flex-col items-center justify-center h-full",
                    compact ? "p-1" : "p-1"
                  )}>
                    {/* Date Number */}
                    <span className={cn(
                      "font-medium",
                      compact ? "text-xs" : "text-sm",
                      !isCurrentMonth && "text-muted-foreground/70",
                      isTodayDate && "text-blue-600 font-bold"
                    )}>
                      {format(date, 'd')}
                    </span>
                    
                    {/* Status Indicator */}
                    {!compact && status !== 'no-data' && (
                      <div className="flex gap-0.5 mt-0.5">
                        {status === 'available' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        )}
                        {status === 'fully-booked' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                      </div>
                    )}
                    
                    {/* Compact Dot */}
                    {compact && status !== 'no-data' && (
                      <div className={cn(
                        "w-1 h-1 rounded-full mt-0.5",
                        status === 'available' && "bg-green-500",
                        status === 'fully-booked' && "bg-red-500"
                      )} />
                    )}
                  </div>
                  
                  {/* Today Indicator */}
                  {isTodayDate && (
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground text-xs">
                {slots.filter(s => !s.is_booked).length} tersedia
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground text-xs">
                {slots.filter(s => s.is_booked).length} terbooking
              </span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            Total: {slots.length} slot
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// Simple Mini Calendar for inline display
export function MiniCalendar({ roomId, equipmentId }: { roomId?: string; equipmentId?: string }) {
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const supabase = createClient()

  const fetchSlots = useCallback(async () => {
    if (!roomId && !equipmentId) return

    try {
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd')

      let query = supabase
        .from(roomId ? 'room_booking_slots' : 'equipment_booking_slots')
        .select('*')
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)

      if (roomId) query = query.eq('room_id', roomId)
      else if (equipmentId) query = query.eq('equipment_id', equipmentId)

      const { data } = await query
      setSlots(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }, [roomId, equipmentId, currentDate, supabase])

  useEffect(() => {
    const id = setTimeout(() => fetchSlots(), 0)
    return () => clearTimeout(id)
  }, [fetchSlots])

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const getDayStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const daySlots = slots.filter(s => s.booking_date === dateStr)
    if (daySlots.length === 0) return 'no-data'
    if (daySlots.every(s => s.is_booked)) return 'fully-booked'
    if (daySlots.some(s => !s.is_booked)) return 'available'
    return 'no-data'
  }

  const weekDays = ['M', 'S', 'S', 'R', 'K', 'J', 'S']

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">
          {format(currentDate, 'MMM yyyy', { locale: id })}
        </span>
        <div className="flex gap-0.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Mini Grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-[10px] overflow-hidden border border-border">
        {weekDays.map((day, i) => (
          <div key={i} className="bg-muted py-1 text-center text-[10px] font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {calendarDays.map((date) => {
          const status = getDayStatus(date)
          const isCurrentMonth = isSameMonth(date, currentDate)
          
          return (
            <div
              key={date.toISOString()}
              className={cn(
                "bg-card py-1 text-center text-[10px]",
                !isCurrentMonth && "bg-muted text-muted-foreground/70",
                status === 'fully-booked' && "bg-red-100",
                status === 'available' && "bg-green-100",
                isToday(date) && "bg-blue-100 font-bold text-blue-700"
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
