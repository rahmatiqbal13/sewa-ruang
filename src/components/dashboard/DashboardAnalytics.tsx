'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Package, 
  Users, 
  DollarSign,
  Loader2
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { id } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DashboardStats {
  totalBookings: number
  totalBookingsChange: number
  activeBookings: number
  activeBookingsChange: number
  totalRevenue: number
  totalRevenueChange: number
  totalUsers: number
  totalUsersChange: number
  recentBookings: any[]
  bookingsByStatus: { name: string; value: number; color: string }[]
  dailyBookings: { date: string; bookings: number; revenue: number }[]
  topRooms: { name: string; bookings: number }[]
  topEquipment: { name: string; bookings: number }[]
}

const STATUS_COLORS = {
  pending: '#fbbf24',
  approved: '#34d399',
  active: '#60a5fa',
  completed: '#9ca3af',
  cancelled: '#f87171',
  rejected: '#ef4444',
}

export function DashboardAnalytics() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardStats()
  }, [timeRange])

  async function fetchDashboardStats() {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      // Calculate date range
      const endDate = new Date()
      const startDate = timeRange === '7d' ? subDays(endDate, 7) :
                       timeRange === '30d' ? subDays(endDate, 30) :
                       timeRange === '90d' ? subDays(endDate, 90) :
                       subDays(endDate, 365)

      // Fetch bookings dalam range
      const { data: bookings } = await sb
        .from('bookings')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Fetch bookings sebelumnya untuk comparison
      const prevStartDate = subDays(startDate, 
        timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
      )
      
      const { data: prevBookings } = await sb
        .from('bookings')
        .select('*')
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString())

      // Fetch all active bookings
      const { data: activeBookings } = await sb
        .from('bookings')
        .select('*')
        .in('status', ['approved', 'active'])

      // Fetch users
      const { data: users } = await sb
        .from('users')
        .select('*')

      // Calculate stats
      const totalBookings = bookings?.length || 0
      const prevTotalBookings = prevBookings?.length || 0
      const totalBookingsChange = prevTotalBookings > 0 
        ? ((totalBookings - prevTotalBookings) / prevTotalBookings) * 100 
        : 0

      const totalRevenue = (bookings as any[])?.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0
      const prevRevenue = (prevBookings as any[])?.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0
      const totalRevenueChange = prevRevenue > 0
        ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
        : 0

      // Bookings by status
      const statusCount = (bookings as any[])?.reduce((acc: Record<string, number>, b: any) => {
        acc[b.status] = (acc[b.status] || 0) + 1
        return acc
      }, {}) || {}

      const bookingsByStatus = Object.entries(statusCount).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count as number,
        color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#94a3b8',
      }))

      // Daily bookings data
      const days = eachDayOfInterval({ start: startDate, end: endDate })
      const dailyBookings = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayBookings = (bookings as any[])?.filter((b: any) =>
          format(new Date(b.created_at), 'yyyy-MM-dd') === dateStr
        ) || []

        return {
          date: format(day, 'dd MMM', { locale: id }),
          bookings: dayBookings.length,
          revenue: dayBookings.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0),
        }
      })

      // Recent bookings with user info
      const { data: recentBookingsData } = await sb
        .from('bookings')
        .select(`
          *,
          users!user_id(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      // Top rooms
      const { data: roomStats } = await sb
        .from('booking_items')
        .select(`
          room_id,
          rooms:room_id(name)
        `)
        .eq('item_type', 'room')
        .not('room_id', 'is', null)

      const roomCount = roomStats?.reduce((acc: Record<string, { name: string; count: number }>, item: any) => {
        const roomName = item.rooms?.name || 'Unknown'
        if (!acc[roomName]) {
          acc[roomName] = { name: roomName, count: 0 }
        }
        acc[roomName].count++
        return acc
      }, {}) || {}

      const topRooms = Object.values(roomCount)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5)
        .map((r: any) => ({ name: r.name, bookings: r.count }))

      // Top equipment
      const { data: equipmentStats } = await sb
        .from('booking_items')
        .select(`
          equipment_id,
          equipment:equipment_id(name)
        `)
        .eq('item_type', 'equipment')
        .not('equipment_id', 'is', null)

      const equipmentCount = equipmentStats?.reduce((acc: Record<string, { name: string; count: number }>, item: any) => {
        const equipName = item.equipment?.name || 'Unknown'
        if (!acc[equipName]) {
          acc[equipName] = { name: equipName, count: 0 }
        }
        acc[equipName].count++
        return acc
      }, {}) || {}

      const topEquipment = Object.values(equipmentCount)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5)
        .map((e: any) => ({ name: e.name, bookings: e.count }))

      setStats({
        totalBookings,
        totalBookingsChange,
        activeBookings: activeBookings?.length || 0,
        activeBookingsChange: 0,
        totalRevenue,
        totalRevenueChange,
        totalUsers: users?.length || 0,
        totalUsersChange: 0,
        recentBookings: recentBookingsData || [],
        bookingsByStatus,
        dailyBookings,
        topRooms,
        topEquipment,
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!stats) return null

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon,
    prefix = ''
  }: { 
    title: string
    value: number
    change: number
    icon: any
    prefix?: string
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">
              {prefix}{value.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-[10px]">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4">
          {change > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : change < 0 ? (
            <TrendingDown className="h-4 w-4 text-red-500" />
          ) : null}
          <span className={cn(
            "text-sm font-medium",
            change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-muted-foreground"
          )}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground">vs periode lalu</span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end gap-2">
        {(['7d', '30d', '90d', '1y'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={cn(
              'px-3 py-1.5 rounded-[10px] text-sm font-medium transition-colors',
              timeRange === range 
                ? 'bg-blue-950 text-white' 
                : 'bg-card border border-border text-muted-foreground hover:border-primary/30'
            )}
          >
            {range === '7d' ? '7 Hari' : 
             range === '30d' ? '30 Hari' : 
             range === '90d' ? '3 Bulan' : '1 Tahun'}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Peminjaman"
          value={stats.totalBookings}
          change={stats.totalBookingsChange}
          icon={Calendar}
        />
        <StatCard
          title="Peminjaman Aktif"
          value={stats.activeBookings}
          change={stats.activeBookingsChange}
          icon={Package}
        />
        <StatCard
          title="Total Pendapatan"
          value={stats.totalRevenue}
          change={stats.totalRevenueChange}
          icon={DollarSign}
          prefix="Rp "
        />
        <StatCard
          title="Total Pengguna"
          value={stats.totalUsers}
          change={stats.totalUsersChange}
          icon={Users}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Bookings Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tren Peminjaman Harian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                <LineChart data={stats.dailyBookings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bookings by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Peminjaman</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.bookingsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.bookingsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ruangan Paling Sering Dipinjam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topRooms} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    width={120}
                  />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Equipment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alat Paling Sering Dipinjam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topEquipment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    width={120}
                  />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Peminjaman Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentBookings.map((booking: any) => (
              <div 
                key={booking.id}
                className="flex items-center justify-between p-4 rounded-[10px] border border-border hover:bg-muted transition-colors"
              >
                <div>
                  <p className="font-medium">{booking.users?.name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.purpose}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={
                    booking.status === 'approved' ? 'default' :
                    booking.status === 'pending' ? 'secondary' :
                    booking.status === 'completed' ? 'outline' :
                    'destructive'
                  }>
                    {booking.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Rp {(booking.total_amount || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
