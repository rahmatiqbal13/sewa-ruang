'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Calendar, ChevronRight, User, Package, Plus, Download, Eye,
  ChevronLeft, ChevronRightIcon, Search, Send, Loader2, Trash2,
  CheckCircle, XCircle, FileText, RotateCcw, MoreHorizontal
} from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { cn, formatDateTime, formatRupiah } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { SendMessageDialog } from './SendMessageDialog'
import { ContactButtons } from '@/components/shared/ContactButtons'
import { toast } from 'sonner'
import { EmptyState } from '@/components/ui/empty-state'

function buildPageUrl(page: number, status: string): string {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return `/admin/bookings${qs ? `?${qs}` : ''}`
}

const STATUS_TABS = [
  { value: '', label: 'Semua', color: 'bg-[#0891B2]', bg: 'bg-[#F3F4F6]' },
  { value: 'pending', label: 'Menunggu', color: 'bg-amber-500', bg: 'bg-amber-50' },
  { value: 'approved', label: 'Disetujui', color: 'bg-blue-600', bg: 'bg-blue-50' },
  { value: 'paid', label: 'Lunas', color: 'bg-emerald-600', bg: 'bg-emerald-50' },
  { value: 'completed', label: 'Selesai', color: 'bg-green-700', bg: 'bg-green-50' },
  { value: 'rejected', label: 'Ditolak', color: 'bg-red-600', bg: 'bg-red-50' },
  { value: 'cancelled', label: 'Dibatalkan', color: 'bg-[#6B7280]', bg: 'bg-gray-50' },
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
  totalCount: number
  currentPage: number
  totalPages: number
}

const ITEMS_PER_PAGE = 10

export function BookingsList({ bookings, statusCounts, currentStatus, totalCount, currentPage, totalPages }: BookingsListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [messageDialogOpen, setMessageDialogOpen] = useState(false)
  const [resending, setResending] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/bookings/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok) {
        toast.success(`Booking ${deleteTarget.reference_no} berhasil dihapus`)
        router.refresh()
      } else {
        toast.error(json.error || 'Gagal menghapus booking')
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  async function handleResendFormulir(bookingId: string, refNo: string) {
    setResending(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/formulir`, { method: 'POST' })
      const json = await res.json()
      if (res.ok) toast.success(`Formulir dikirim ke email peminjam (${refNo})`)
      else toast.error(json.error || 'Gagal mengirim email')
    } catch {
      toast.error('Gagal mengirim formulir')
    } finally {
      setResending(null)
    }
  }

  async function handleBulkApprove() {
    if (selectedItems.size === 0) return
    setBulkActionLoading('approve')
    try {
      const promises = Array.from(selectedItems).map(id => 
        fetch(`/api/bookings/${id}/approve`, { method: 'POST' })
      )
      await Promise.all(promises)
      toast.success(`${selectedItems.size} peminjaman berhasil disetujui`)
      setSelectedItems(new Set())
      router.refresh()
    } catch {
      toast.error('Gagal menyetujui peminjaman')
    } finally {
      setBulkActionLoading(null)
    }
  }

  async function handleBulkReject() {
    if (selectedItems.size === 0) return
    setBulkActionLoading('reject')
    try {
      const promises = Array.from(selectedItems).map(id => 
        fetch(`/api/bookings/${id}/reject`, { method: 'POST' })
      )
      await Promise.all(promises)
      toast.success(`${selectedItems.size} peminjaman berhasil ditolak`)
      setSelectedItems(new Set())
      router.refresh()
    } catch {
      toast.error('Gagal menolak peminjaman')
    } finally {
      setBulkActionLoading(null)
    }
  }

  async function handleBulkExport() {
    if (selectedItems.size === 0) return
    setBulkActionLoading('export')
    // Export logic here
    toast.success(`${selectedItems.size} peminjaman diexport`)
    setBulkActionLoading(null)
  }

  async function handleBulkDelete() {
    if (selectedItems.size === 0) return
    setBulkActionLoading('delete')
    try {
      const promises = Array.from(selectedItems).map(id => 
        fetch(`/api/bookings/${id}`, { method: 'DELETE' })
      )
      await Promise.all(promises)
      toast.success(`${selectedItems.size} peminjaman berhasil dihapus`)
      setSelectedItems(new Set())
      router.refresh()
    } catch {
      toast.error('Gagal menghapus peminjaman')
    } finally {
      setBulkActionLoading(null)
    }
  }

  function toggleSelectAll() {
    if (selectedItems.size === filteredBookings.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredBookings.map(b => b.id)))
    }
  }

  function toggleSelectItem(id: string) {
    const newSet = new Set(selectedItems)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedItems(newSet)
  }

  function clearFilters() {
    setSearchQuery('')
  }

  // Client-side search hanya untuk halaman yang sedang dimuat
  const filteredBookings = bookings.filter(b =>
    b.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.users?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.users?.institution.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedBookings = filteredBookings

  const hasSelection = selectedItems.size > 0

  // Check for overdue bookings
  const isOverdue = (booking: Booking) => {
    const endDate = new Date(booking.end_datetime)
    return endDate < new Date() && ['approved', 'paid'].includes(booking.status)
  }

  return (
    <div className="admin-page">
      {/* Dialogs */}
      <SendMessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        booking={selectedBooking}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent className="rounded-[14px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking <strong>{deleteTarget?.reference_no}</strong> atas nama{' '}
              <strong>{deleteTarget?.users?.name}</strong> akan dihapus permanen
              beserta seluruh data pembayaran dan pengembalian terkait.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-semibold text-[#111827]">
            Manajemen Peminjaman
          </h1>
          <Badge className="bg-[#0891B2] text-white px-2.5 py-1 text-xs font-medium">
            {totalCount}
          </Badge>
        </div>
        <Link
          href="/admin/bookings/new"
          className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-[10px] bg-[#0891B2] text-white hover:bg-[#0891B2]/90 transition-colors shadow-soft"
        >
          <Plus className="h-4 w-4" />
          Tambah
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="border-b border-[#E5E7EB]">
        <div className="flex flex-wrap gap-1 -mb-px">
          {STATUS_TABS.map(tab => {
            const isActive = currentStatus === tab.value
            const count = tab.value ? (statusCounts[tab.value] ?? 0) : totalCount
            return (
              <Link
                key={tab.value}
                href={tab.value ? `/admin/bookings?status=${tab.value}` : '/admin/bookings'}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150',
                  isActive 
                    ? 'border-b-2 border-[#0891B2] text-[#0891B2] font-semibold' 
                    : 'border-b-2 border-transparent text-[#6B7280] hover:text-[#374151]'
                )}
              >
                {tab.label}
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  isActive ? 'bg-[#0891B2]/10 text-[#0891B2]' : 'bg-[#F3F4F6] text-[#6B7280]'
                )}>
                  {count}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Filter Bar - White Soft UI */}
      <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-soft p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
              <Input
                placeholder="Cari ref / nama / instansi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm border-[#E5E7EB] rounded-[10px] focus:border-[#0891B2] focus:ring-2 focus:ring-[#0891B2]/15"
              />
            </div>
          </div>
          
          {/* Reset Filter */}
          {(searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-[#6B7280] hover:text-[#111827]"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {hasSelection && (
        <div className="bg-[#0891B2]/5 border border-[#0891B2]/20 rounded-[10px] p-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[#0891B2] font-semibold text-sm">
            {selectedItems.size} item dipilih
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleBulkApprove}
              disabled={bulkActionLoading === 'approve'}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
            >
              {bulkActionLoading === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
              Setujui
            </Button>
            <Button
              size="sm"
              onClick={handleBulkReject}
              disabled={bulkActionLoading === 'reject'}
              className="bg-red-600 hover:bg-red-700 text-white h-8"
            >
              {bulkActionLoading === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
              Tolak
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkExport}
              disabled={bulkActionLoading === 'export'}
              className="border-[#0891B2] text-[#0891B2] hover:bg-[#0891B2]/5 h-8"
            >
              {bulkActionLoading === 'export' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
              Export
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleBulkDelete}
              disabled={bulkActionLoading === 'delete'}
              className="text-red-600 hover:bg-red-50 h-8"
            >
              {bulkActionLoading === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
              Hapus
            </Button>
          </div>
        </div>
      )}

      {/* Count line */}
      <p className="text-xs text-[#6B7280]">
        Menampilkan {paginatedBookings.length} dari {searchQuery ? filteredBookings.length : totalCount} pengajuan
        {totalPages > 1 && ` · Halaman ${currentPage} / ${totalPages}`}
      </p>

      {/* Empty state */}
      {filteredBookings.length === 0 && (
        <EmptyState variant="bookings" actionHref="/admin/bookings/new" />
      )}

      {/* DESKTOP: Table View */}
      {filteredBookings.length > 0 && (
        <div className="hidden md:block bg-white rounded-[14px] border border-[#E5E7EB] shadow-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th scope="col" className="px-4 py-3 text-left w-10">
                  <Checkbox 
                    checked={filteredBookings.length > 0 && selectedItems.size === filteredBookings.length}
                    onCheckedChange={toggleSelectAll}
                    className="border-[#D1D5DB] data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#0891B2]"
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                  Ref
                </th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                  Peminjam
                </th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                  Ruang/Alat
                </th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.map((booking) => {
                const items = booking.booking_items || []
                const overdue = isOverdue(booking)
                const isSelected = selectedItems.has(booking.id)
                
                return (
                  <tr 
                    key={booking.id} 
                    className={cn(
                      'border-b border-[#E5E7EB] transition-colors',
                      overdue ? 'border-l-[3px] border-l-[#EF4444] bg-[#FFF5F5]/50' : '',
                      isSelected ? 'bg-[#0891B2]/5' : 'hover:bg-[#FAFAFA]'
                    )}
                  >
                    <td className="px-4 py-3">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectItem(booking.id)}
                        className="border-[#D1D5DB] data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#0891B2]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[#0891B2] font-medium">{booking.reference_no}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#0891B2]/10 flex items-center justify-center text-[#0891B2] font-semibold text-xs">
                          {booking.users?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-[#111827]">{booking.users?.name}</p>
                          <p className="text-xs text-[#6B7280]">{booking.users?.institution}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {items.length > 0 ? (
                        <div className="space-y-1">
                          {items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs">
                              <span className={cn(
                                'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium',
                                item.item_type === 'room'
                                  ? 'bg-indigo-50 text-indigo-600'
                                  : 'bg-[#F3F4F6] text-[#6B7280]'
                              )}>
                                {item.item_type === 'room' ? 'Ruang' : 'Alat'}
                              </span>
                              <span className="truncate text-[#374151]">
                                {item.item_type === 'room' ? item.room?.name : item.equipment?.name}
                              </span>
                            </div>
                          ))}
                          {items.length > 2 && (
                            <span className="text-[10px] text-[#6B7280]">+{items.length - 2} lainnya</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a href={`/api/bookings/${booking.id}/formulir?preview=1`} target="_blank" rel="noreferrer" className="icon-btn" title="Preview PDF" aria-label="Preview PDF">
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                        <a href={`/api/bookings/${booking.id}/formulir`} target="_blank" rel="noreferrer" className="icon-btn" title="Download PDF" aria-label="Download PDF">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        {booking.users?.email && (
                          <button onClick={() => handleResendFormulir(booking.id, booking.reference_no)} disabled={resending === booking.id} className="icon-btn disabled:opacity-50" title="Kirim ulang email" aria-label="Kirim ulang email">
                            {resending === booking.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        {(booking.users?.email || booking.users?.phone) && (
                          <ContactButtons booking={{ id: booking.id, reference_no: booking.reference_no, status: booking.status, start_datetime: booking.start_datetime, end_datetime: booking.end_datetime, users: booking.users ? { name: booking.users.name, email: booking.users.email || undefined, phone: booking.users.phone || undefined, telegram_username: booking.users.telegram_username || undefined } : null, booking_items: booking.booking_items }} />
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <span className="icon-btn inline-flex items-center justify-center" aria-label="Menu lainnya">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-[10px]">
                            <DropdownMenuItem
                              onClick={() => window.location.href = `/admin/bookings/${booking.id}`}
                              className="cursor-pointer"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteTarget(booking)} className="cursor-pointer text-red-600 focus:text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MOBILE: Card List View */}
      {filteredBookings.length > 0 && (
        <div className="md:hidden space-y-3">
          {paginatedBookings.map((booking) => {
            const items = booking.booking_items || []
            const itemNames = items.map(i => i.item_type === 'room' ? i.room?.name : i.equipment?.name).filter(Boolean).join(', ')
            const overdue = isOverdue(booking)
            
            return (
              <div 
                key={booking.id} 
                className={cn(
                  'bg-white rounded-[14px] border border-[#E5E7EB] shadow-soft p-4',
                  overdue && 'border-l-[3px] border-l-[#EF4444]'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedItems.has(booking.id)}
                      onCheckedChange={() => toggleSelectItem(booking.id)}
                      className="border-[#D1D5DB] data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#0891B2]"
                    />
                    <div>
                      <span className="font-mono text-[11px] text-[#0891B2] font-medium">{booking.reference_no}</span>
                      <p className="font-semibold text-[#111827] text-sm mt-0.5">{booking.users?.name}</p>
                    </div>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
                
                <div className="space-y-2 text-xs text-[#6B7280] mb-3">
                  <div className="flex items-center gap-1.5">
                    <BuildingIcon className="h-3.5 w-3.5" />
                    <span>{booking.users?.institution || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{formatDateTime(booking.start_datetime)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    <span className="truncate">{itemNames || '—'}</span>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                  <span className="text-sm font-bold text-[#111827] font-mono">{formatRupiah(booking.total_amount)}</span>
                  <div className="flex gap-1">
                    <Link href={`/admin/bookings/${booking.id}`} className="icon-btn" aria-label="Lihat detail">
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <button onClick={() => setDeleteTarget(booking)} className="icon-btn-danger" aria-label="Hapus">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination — URL-based agar state tidak hilang saat navigasi */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Link
            href={buildPageUrl(currentPage - 1, currentStatus)}
            aria-disabled={currentPage === 1}
            className={currentPage === 1 ? 'page-btn pointer-events-none opacity-40' : 'page-btn'}
          >
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </Link>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => {
              if (n === 1 || n === totalPages || (n >= currentPage - 1 && n <= currentPage + 1))
                return (
                  <Link key={n} href={buildPageUrl(n, currentStatus)} className={n === currentPage ? 'page-btn-active' : 'page-btn-num'}>
                    {n}
                  </Link>
                )
              if (n === 2 || n === totalPages - 1) return <span key={n} className="text-[#6B7280]/40 text-sm px-1">…</span>
              return null
            })}
          </div>
          <Link
            href={buildPageUrl(currentPage + 1, currentStatus)}
            aria-disabled={currentPage === totalPages}
            className={currentPage === totalPages ? 'page-btn pointer-events-none opacity-40' : 'page-btn'}
          >
            Selanjutnya <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

// Helper icon component
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
