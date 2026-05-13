import { createClient } from '@supabase/supabase-js'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { id } from 'date-fns/locale'
import { PublicHeader, PublicFooter } from '@/components/shared/PublicLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Building2, MapPin, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export const revalidate = 60 // Revalidate setiap 60 detik

interface BookingWithDetails {
  id: string
  start_datetime: string
  end_datetime: string
  status: string
  purpose: string
  user_id: string
  users: {
    name: string
    institution: string
  } | null
  booking_items: {
    id: string
    item_type: string
    room_id: string | null
    equipment_id: string | null
    rooms: {
      name: string
      room_code: string
      buildings: {
        name: string
      } | null
    } | null
    equipment: {
      name: string
      equipment_code: string
    } | null
  }[]
}

interface RoomSchedule {
  id: string
  name: string
  room_code: string
  building_name: string
  bookings: BookingWithDetails[]
}

// Server-side fetch institution profile
async function getInstitutionProfile() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return null
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    const { data, error } = await supabase
      .from('institution_profile')
      .select('*')
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching institution profile:', error)
    return null
  }
}

// Fetch approved bookings dengan detail
async function getPublicSchedule() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return []
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Ambil booking yang sudah approved untuk 3 bulan ke depan
    const startDate = format(new Date(), 'yyyy-MM-dd')
    const endDate = format(addMonths(new Date(), 3), 'yyyy-MM-dd')

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        start_datetime,
        end_datetime,
        status,
        purpose,
        user_id,
        users!user_id(name, institution),
        booking_items(
          id,
          item_type,
          room_id,
          equipment_id,
          rooms:room_id(name, room_code, buildings(name)),
          equipment:equipment_id(name, equipment_code)
        )
      `)
      .in('status', ['approved', 'active', 'completed'])
      .gte('start_datetime', startDate)
      .lte('start_datetime', endDate)
      .order('start_datetime', { ascending: true })

    if (error) {
      console.error('Error fetching schedule:', error)
      return []
    }

    // Group by room
    const roomMap = new Map<string, RoomSchedule>()

    bookings?.forEach((booking: any) => {
      booking.booking_items?.forEach((item: any) => {
        if (item.item_type === 'room' && item.rooms) {
          const roomKey = item.room_id
          if (!roomMap.has(roomKey)) {
            roomMap.set(roomKey, {
              id: item.room_id,
              name: item.rooms.name,
              room_code: item.rooms.room_code,
              building_name: item.rooms.buildings?.name || 'Unknown',
              bookings: []
            })
          }
          
          const room = roomMap.get(roomKey)!
          // Hindari duplicate booking
          if (!room.bookings.find(b => b.id === booking.id)) {
            room.bookings.push({
              ...booking,
              users: booking.users,
              booking_items: booking.booking_items
            })
          }
        }
      })
    })

    return Array.from(roomMap.values())
  } catch (error) {
    console.error('Error:', error)
    return []
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { class: string; label: string }> = {
    approved: { class: 'bg-green-100 text-green-700 border-green-200', label: 'Disetujui' },
    active: { class: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Berlangsung' },
    completed: { class: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Selesai' },
  }
  
  const variant = variants[status] || { class: 'bg-gray-100 text-gray-700', label: status }
  
  return (
    <Badge variant="outline" className={cn("text-xs", variant.class)}>
      {variant.label}
    </Badge>
  )
}

export default async function PublicSchedulePage() {
  const [institution, schedules] = await Promise.all([
    getInstitutionProfile(),
    getPublicSchedule()
  ])

  // Group bookings by date untuk timeline view
  const allBookings = schedules.flatMap(s => 
    s.bookings.map(b => ({ ...b, roomName: s.name, roomCode: s.room_code, buildingName: s.building_name }))
  )

  // Group by month
  const bookingsByMonth = allBookings.reduce((acc, booking) => {
    const monthKey = format(new Date(booking.start_datetime), 'yyyy-MM')
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(booking)
    return acc
  }, {} as Record<string, typeof allBookings>)

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <PublicHeader />
      
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-950 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Jadwal Peminjaman Ruangan</h1>
                <p className="text-blue-200 mt-1">
                  Lihat jadwal peminjaman ruangan yang telah disetujui
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-blue-200">Disetujui</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-blue-200">Berlangsung</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm text-blue-200">Selesai</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{schedules.length}</div>
                <div className="text-sm text-muted-foreground">Total Ruangan</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{allBookings.length}</div>
                <div className="text-sm text-muted-foreground">Total Peminjaman</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {allBookings.filter(b => b.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">Sedang Berlangsung</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-600">
                  {allBookings.filter(b => b.status === 'completed').length}
                </div>
                <div className="text-sm text-muted-foreground">Selesai</div>
              </CardContent>
            </Card>
          </div>

          {/* Schedule by Month */}
          {Object.keys(bookingsByMonth).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Belum ada jadwal peminjaman</h3>
                <p className="text-muted-foreground">
                  Tidak ada peminjaman ruangan yang disetujui untuk periode ini.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(bookingsByMonth)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([monthKey, bookings]) => (
                  <Card key={monthKey}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-blue-600" />
                        {format(new Date(monthKey + '-01'), 'MMMM yyyy', { locale: id })}
                        <Badge variant="secondary" className="ml-2">
                          {bookings.length} peminjaman
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {bookings
                          .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
                          .map((booking) => (
                            <div
                              key={booking.id}
                              className={cn(
                                "p-4 rounded-lg border transition-colors",
                                booking.status === 'active' && "bg-blue-50 border-blue-200",
                                booking.status === 'approved' && "bg-green-50 border-green-200",
                                booking.status === 'completed' && "bg-gray-50 border-gray-200"
                              )}
                            >
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                      <h4 className="font-semibold text-sm">{booking.purpose}</h4>
                                      <p className="text-xs text-muted-foreground">
                                        oleh {booking.users?.name || 'Unknown'} 
                                        {booking.users?.institution && ` (${booking.users.institution})`}
                                      </p>
                                    </div>
                                    <StatusBadge status={booking.status} />
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                    <div className="flex items-center gap-1.5">
                                      <Building2 className="h-4 w-4 text-muted-foreground" />
                                      <span>{booking.buildingName}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <span>{booking.roomName}</span>
                                      {booking.roomCode && (
                                        <span className="text-xs text-muted-foreground font-mono">
                                          ({booking.roomCode})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right md:text-left">
                                  <div className="text-sm font-medium">
                                    {format(new Date(booking.start_datetime), 'dd MMM yyyy', { locale: id })}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    s/d {format(new Date(booking.end_datetime), 'dd MMM yyyy', { locale: id })}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {Math.ceil((new Date(booking.end_datetime).getTime() - new Date(booking.start_datetime).getTime()) / (1000 * 60 * 60 * 24)) + 1} hari
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* Room List with Availability */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Daftar Ruangan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedules.map((room) => (
                  <div
                    key={room.id}
                    className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm">{room.name}</h4>
                        <p className="text-xs text-muted-foreground">{room.building_name}</p>
                      </div>
                      {room.room_code && (
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {room.room_code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant={room.bookings.length > 0 ? "default" : "secondary"} className="text-xs">
                        {room.bookings.length} peminjaman
                      </Badge>
                      {room.bookings.some(b => b.status === 'active') && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          Sedang dipakai
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <PublicFooter />
    </div>
  )
}
