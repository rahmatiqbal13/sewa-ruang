'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, ChevronRight, User, Package, Plus, Download, 
  FileUp, CheckSquare, Pencil, MoreHorizontal, Trash2, LayoutGrid, 
  Table2, ChevronLeft, ChevronRightIcon, Search, Send, Eye, CheckCircle, XCircle
} from 'lucide-react'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { cn, formatDateTime, formatRupiah } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SendMessageDialog } from './SendMessageDialog'
import { ContactButtons } from '@/components/shared/ContactButtons'

const STATUS_TABS = [
  { value: '', label: 'Semua', color: 'bg-slate-800 text-white', bg: 'bg-slate-50' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-500 text-white', bg: 'bg-amber-50' },
  { value: 'approved', label: 'Disetujui', color: 'bg-blue-600 text-white', bg: 'bg-blue-50' },
  { value: 'paid', label: 'Lunas', color: 'bg-emerald-600 text-white', bg: 'bg-emerald-50' },
  { value: 'completed', label: 'Selesai', color: 'bg-green-700 text-white', bg: 'bg-green-50' },
  { value: 'rejected', label: 'Ditolak', color: 'bg-red-600 text-white', bg: 'bg-red-50' },
  { value: 'cancelled', label: 'Dibatalkan', color: 'bg-zinc-500 text-white', bg: 'bg-zinc-50' },
]

interface Booking {
  id: string
  reference_no: string
  status: string
  start_datetime: string
  end_datetime: string
  total_amount: number
  purpose: string
  created_at: string
  admin_notes?: string | null
  users: {
    name: string
    email: string
    phone: string | null
    telegram_username: string | null
    institution: string
    class_division: string
  } | null
  booking_items?: Array<{
    item_type: string
    room?: { name: string; room_code: string | null }
    equipment?: { name: string; equipment_code: string | null }
  }>
}

interface BookingsListProps {
  bookings: Booking[]
  statusCounts: Record<string, number>
  currentStatus: string
}

const ITEMS_PER_PAGE = 10

export function BookingsList({ bookings, statusCounts, currentStatus }: BookingsListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [messageDialogOpen, setMessageDialogOpen] = useState(false)

  // Filter bookings by search
  const filteredBookings = bookings.filter(b => 
    b.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.users?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.users?.institution.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const totalCount = bookings.length

  return (
    <div className="p-6 space-y-6">
      {/* Send Message Dialog */}
      <SendMessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        booking={selectedBooking}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Pengajuan</h1>
          <p className="text-muted-foreground text-sm">Kelola peminjaman ruangan dan alat</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Link 
            href="/admin/bookings/new" 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" /> Peminjaman Baru
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-blue-600 text-sm font-medium">Total Pengajuan</p>
          <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-amber-600 text-sm font-medium">Pending</p>
          <p className="text-2xl font-bold text-amber-900">{statusCounts['pending'] ?? 0}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-emerald-600 text-sm font-medium">Lunas/Selesai</p>
          <p className="text-2xl font-bold text-emerald-900">
            {(statusCounts['paid'] ?? 0) + (statusCounts['completed'] ?? 0)}
          </p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-red-600 text-sm font-medium">Ditolak/Batal</p>
          <p className="text-2xl font-bold text-red-900">
            {(statusCounts['rejected'] ?? 0) + (statusCounts['cancelled'] ?? 0)}
          </p>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map(tab => {
              const isActive = currentStatus === tab.value
              const count = tab.value ? (statusCounts[tab.value] ?? 0) : totalCount
              return (
                <Link
                  key={tab.value}
                  href={tab.value ? `/admin/bookings?status=${tab.value}` : '/admin/bookings'}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive ? tab.color : 'bg-white border text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    'text-xs rounded-full px-1.5 py-0.5 font-bold',
                    isActive ? 'bg-white/20' : 'bg-slate-100'
                  )}>
                    {count}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nomor ref/nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[250px]"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'table'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Table2 className="h-4 w-4" />
              Tabel
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'card'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Card
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan {paginatedBookings.length} dari {filteredBookings.length} pengajuan
          {totalPages > 1 && ` (Halaman ${currentPage} dari ${totalPages})`}
        </p>
      </div>

      {/* Empty State */}
      {filteredBookings.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Tidak ada data pengajuan</p>
          <Link href="/admin/bookings/new" className="text-blue-600 hover:underline"> Buat pengajuan baru</Link>
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && filteredBookings.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>No. Referensi</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Barang/Ruang yang Dipinjam</TableHead>
                <TableHead>Tanggal Peminjaman</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBookings.map((booking) => {
                const items = booking.booking_items || []
                const itemNames = items.length > 0
                  ? items.map(i => {
                      if (i.item_type === 'room' && i.room) {
                        return `${i.room.name} ${i.room.room_code ? `(${i.room.room_code})` : ''}`
                      } else if (i.item_type === 'equipment' && i.equipment) {
                        return `${i.equipment.name} ${i.equipment.equipment_code ? `(${i.equipment.equipment_code})` : ''}`
                      }
                      return null
                    }).filter(Boolean).join(', ')
                  : '-'
                
                return (
                  <TableRow key={booking.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm">{booking.reference_no}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{booking.users?.name}</p>
                        <p className="text-xs text-slate-400">{booking.users?.institution}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <div className="text-sm" title={itemNames}>
                        {itemNames !== '-' ? (
                          <div className="space-y-1">
                            {items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <Badge variant={item.item_type === 'room' ? 'default' : 'secondary'} className="text-[10px] px-1 py-0">
                                  {item.item_type === 'room' ? 'Ruang' : 'Alat'}
                                </Badge>
                                <span className="truncate">
                                  {item.item_type === 'room' 
                                    ? item.room?.name 
                                    : item.equipment?.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="space-y-1">
                        <div>
                          <span className="text-slate-400 text-xs">Mulai:</span>
                          <br />
                          {formatDateTime(booking.start_datetime)}
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs">Selesai:</span>
                          <br />
                          {formatDateTime(booking.end_datetime)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatRupiah(booking.total_amount)}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(booking.users?.email || booking.users?.phone) && (
                          <ContactButtons 
                            booking={{
                              id: booking.id,
                              reference_no: booking.reference_no,
                              status: booking.status,
                              start_datetime: booking.start_datetime,
                              end_datetime: booking.end_datetime,
                              users: booking.users,
                              booking_items: booking.booking_items,
                              admin_notes: booking.admin_notes
                            }}
                          />
                        )}
                        
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                          title="Lihat detail"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* CARD VIEW */}
      {viewMode === 'card' && filteredBookings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedBookings.map((booking) => {
            const items = booking.booking_items || []
            const itemNames = items
              .map(i => i.item_type === 'room' ? i.room?.name : i.equipment?.name)
              .filter(Boolean)
              .join(', ')
            
            return (
              <div 
                key={booking.id}
                className={cn(
                  "rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow",
                  booking.status === 'pending' && "bg-amber-50/30 border-amber-200",
                  booking.status === 'approved' && "bg-blue-50/30 border-blue-200",
                  booking.status === 'paid' && "bg-emerald-50/30 border-emerald-200",
                  booking.status === 'completed' && "bg-green-50/30 border-green-200",
                  booking.status === 'rejected' && "bg-red-50/30 border-red-200",
                )}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-sm text-slate-500">{booking.reference_no}</p>
                      <h3 className="font-semibold text-slate-900">{booking.users?.name}</h3>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="h-4 w-4" />
                      {booking.users?.institution}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-4 w-4" />
                      {formatDateTime(booking.start_datetime)}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Package className="h-4 w-4" />
                      <span className="truncate">{itemNames || '-'}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="font-semibold text-lg">{formatRupiah(booking.total_amount)}</span>
                    <div className="flex gap-1">
                      {(booking.users?.email || booking.users?.phone) && (
                        <ContactButtons 
                          booking={{
                            id: booking.id,
                            reference_no: booking.reference_no,
                            status: booking.status,
                            start_datetime: booking.start_datetime,
                            end_datetime: booking.end_datetime,
                            users: booking.users,
                            booking_items: booking.booking_items,
                            admin_notes: booking.admin_notes
                          }}
                        />
                      )}
                      
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="text-xs px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        Detail
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Sebelumnya
          </Button>
          <span className="text-sm text-slate-600">
            Halaman {currentPage} dari {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Selanjutnya <ChevronRightIcon className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
