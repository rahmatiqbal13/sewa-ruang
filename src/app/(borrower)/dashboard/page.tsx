import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { CalendarDays, Package, Plus, Building2, Clock, ArrowRight } from 'lucide-react'

interface BookingWithItems {
  id: string
  reference_no: string
  status: string
  start_datetime: string
  total_amount: number
  booking_items: Array<{
    item_type: 'room' | 'equipment'
    rooms: { name: string; room_code: string | null } | null
    equipment: { name: string; equipment_code: string | null } | null
  }>
}

export default async function BorrowerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div className="text-center py-8">Silakan login terlebih dahulu</div>
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Fetch bookings with items
  const [{ data: bookings }, { data: profile }] = await Promise.all([
    sb.from('bookings')
      .select(`
        id, 
        reference_no, 
        status, 
        start_datetime, 
        total_amount, 
        booking_items(
          item_type,
          rooms(name, room_code),
          equipment(name, equipment_code)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5) as Promise<{ data: BookingWithItems[] | null }>,
    sb.from('users')
      .select('name, institution, class_division, borrower_category')
      .eq('id', user.id)
      .single() as Promise<{ data: { name: string; institution: string; class_division: string; borrower_category: string | null } | null }>,
  ])

  const pending = bookings?.filter(b => b.status === 'pending').length ?? 0
  const approved = bookings?.filter(b => ['approved', 'paid'].includes(b.status)).length ?? 0
  const completed = bookings?.filter(b => b.status === 'completed').length ?? 0

  // Get item name from booking
  function getItemName(booking: BookingWithItems): string {
    const items = booking.booking_items
    if (!items || items.length === 0) return 'Tidak ada item'
    
    const firstItem = items[0]
    if (firstItem.item_type === 'room' && firstItem.rooms) {
      return firstItem.rooms.name
    }
    if (firstItem.item_type === 'equipment' && firstItem.equipment) {
      return firstItem.equipment.name
    }
    return 'Item tidak diketahui'
  }

  // Get item type label
  function getItemTypeLabel(booking: BookingWithItems): string {
    const items = booking.booking_items
    if (!items || items.length === 0) return ''
    
    const firstItem = items[0]
    if (items.length > 1) {
      return firstItem.item_type === 'room' ? 'Ruang + lainnya' : 'Alat + lainnya'
    }
    return firstItem.item_type === 'room' ? 'Ruang' : 'Alat'
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Halo, {profile?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {profile?.institution} {profile?.class_division && `— ${profile.class_division}`}
          </p>
        </div>
        <Link href="/booking/new" className={buttonVariants({ size: 'lg' })}>
          <Plus className="mr-2 h-4 w-4" /> 
          <span className="hidden sm:inline">Ajukan Peminjaman</span>
          <span className="sm:hidden">Pinjam</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2.5 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-900">{pending}</p>
                <p className="text-sm text-amber-700">Menunggu</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2.5 rounded-lg">
                <CalendarDays className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-900">{approved}</p>
                <p className="text-sm text-green-700">Disetujui</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hidden lg:block">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2.5 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-900">{completed}</p>
                <p className="text-sm text-blue-700">Selesai</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-2 gap-3">
        <Link 
          href="/catalog" 
          className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:bg-zinc-50 transition-colors group"
        >
          <div className="bg-indigo-100 p-2 rounded-lg group-hover:bg-indigo-200 transition-colors">
            <Building2 className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Lihat Katalog</p>
            <p className="text-xs text-muted-foreground truncate">Ruang & Alat</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        
        <Link 
          href="/bookings" 
          className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:bg-zinc-50 transition-colors group"
        >
          <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200 transition-colors">
            <Package className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Semua Pengajuan</p>
            <p className="text-xs text-muted-foreground truncate">Riwayat lengkap</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Pengajuan Terbaru</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">5 pengajuan terakhir Anda</p>
          </div>
          <Link href="/bookings" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Lihat Semua
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookings?.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-lg">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Belum ada pengajuan peminjaman
              </p>
              <Link href="/booking/new" className="text-primary hover:underline text-sm mt-1 inline-block">
                Buat pengajuan pertama Anda
              </Link>
            </div>
          )}
          {bookings?.map((booking) => (
            <Link 
              key={booking.id} 
              href={`/bookings/${booking.id}`} 
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-zinc-50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm truncate">{getItemName(booking)}</p>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {getItemTypeLabel(booking)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(booking.start_datetime)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 ml-3">
                <BookingStatusBadge status={booking.status} />
                {booking.total_amount > 0 && (
                  <span className="text-xs font-medium text-green-600">
                    {formatRupiah(booking.total_amount)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
