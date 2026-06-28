/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminDbClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BookingStatusBadge } from '@/components/shared/BookingStatusBadge'
import { ApprovalButtons } from './ApprovalButtons'
import { RecordPaymentButton } from '../../payments/RecordPaymentButton'
import { formatDateTime, formatRupiah, cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { 
  ArrowLeft, User, Mail, Phone, Building2, 
  Package, CreditCard, FileText, Receipt, Clock,
  MessageSquare, Download, MapPin, GraduationCap, CheckCircle2,
  Clock3, AlertCircle
} from 'lucide-react'
import { getBorrowerCategoryLabel, getEventTypeLabel, isFreeBooking, migrateBorrowerCategory } from '@/lib/categories'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function BookingDetailPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  const sb = createAdminDbClient()

  // Try fetch by reference_no (case-insensitive) first, then fallback to id
  const { data: byRef } = await (sb.from('bookings') as any)
    .select(`
      id, reference_no, status, start_datetime, end_datetime,
      total_amount, purpose, created_at, admin_notes, snapshot_rate,
      users!user_id(id, name, email, phone, telegram_username, institution, class_division, role, borrower_category)
    `)
    .ilike('reference_no', ref)
    .maybeSingle() as { data: any | null }

  let booking: any = null
  let bookingId = ''

  if (byRef) {
    booking = byRef
    bookingId = byRef.id
    if (UUID_REGEX.test(ref) && byRef.reference_no !== ref) {
      redirect(`/admin/bookings/${byRef.reference_no}`)
    }
  } else if (UUID_REGEX.test(ref)) {
    // Fallback: legacy UUID direct lookup
    const { data: byId } = await (sb.from('bookings') as any)
      .select(`
        id, reference_no, status, start_datetime, end_datetime,
        total_amount, purpose, created_at, admin_notes, snapshot_rate,
        users!user_id(id, name, email, phone, telegram_username, institution, class_division, role, borrower_category)
      `)
      .eq('id', ref)
      .single() as { data: any | null }

    if (!byId) notFound()
    redirect(`/admin/bookings/${byId.reference_no}`)
  }

  if (!booking || !bookingId) notFound()

  // Fetch booking items separately
  const { data: bookingItemsData } = await (sb.from('booking_items') as any)
    .select(`
      id, item_type, quantity, room_id, equipment_id
    `)
    .eq('booking_id', bookingId)

  // Fetch rooms data for items
  const roomIds = (bookingItemsData || [])
    .filter((item: any) => item.room_id)
    .map((item: any) => item.room_id)
  
  let roomsData: any[] = []
  if (roomIds.length > 0) {
    const { data: rooms } = await (sb.from('rooms') as any)
      .select('id, name, room_code, building_id, buildings(name)')
      .in('id', roomIds)
    roomsData = rooms || []
  }

  // Fetch equipment data for items
  const equipmentIds = (bookingItemsData || [])
    .filter((item: any) => item.equipment_id)
    .map((item: any) => item.equipment_id)
  
  let equipmentData: any[] = []
  if (equipmentIds.length > 0) {
    const { data: equipment } = await (sb.from('equipment') as any)
      .select('id, name, equipment_code')
      .in('id', equipmentIds)
    equipmentData = equipment || []
  }

  // Merge items with room/equipment data
  const bookingItems = (bookingItemsData || []).map((item: any) => {
    if (item.item_type === 'room' && item.room_id) {
      return {
        ...item,
        room: roomsData.find((r: any) => r.id === item.room_id)
      }
    } else if (item.item_type === 'equipment' && item.equipment_id) {
      return {
        ...item,
        equipment: equipmentData.find((e: any) => e.id === item.equipment_id)
      }
    }
    return item
  })

  // Fetch payments
  const { data: payments } = await (sb.from('payments') as any)
    .select('id, method, amount, status, paid_at, proof_url')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })

  const borrower = booking.users

  // Get borrower category: users table is source of truth, fallback to snapshot_rate
  const snapshotRate = booking.snapshot_rate || {}
  const rawCategory = borrower?.borrower_category ||
                      (snapshotRate as any).borrower_category ||
                      (snapshotRate as any).member_type ||
                      'mahasiswa_s1'
  const borrowerCategory = migrateBorrowerCategory(rawCategory)

  const eventType = booking.event_type || 'lainnya'
  const isGratis = isFreeBooking(borrowerCategory, eventType, booking.purpose || '')

  // Calculate duration
  const startDate = new Date(booking.start_datetime)
  const endDate = new Date(booking.end_datetime)
  const durationMs = endDate.getTime() - startDate.getTime()
  const durationHours = Math.ceil(durationMs / (1000 * 60 * 60))
  const durationDays = Math.ceil(durationHours / 24)

  // Reconstruct prices from snapshot_rate when total_amount is 0 but not gratis
  const snapshotEquipment = ((snapshotRate as any).equipment || []) as Array<{ id: string; rate_per_day: number; quantity: number }>
  const snapshotRooms = ((snapshotRate as any).rooms || []) as Array<{ id: string; name: string; rate_per_hour: number | null; rate_per_day: number | null }>
  const snapshotHours = (snapshotRate as any).hours || durationHours
  const snapshotDays = (snapshotRate as any).days || durationDays

  let displayTotal = booking.total_amount
  const hasZeroTotal = booking.total_amount === 0 || booking.total_amount == null
  let currentRates: any[] = []
  let currentRoomRates: any[] = []

  if (hasZeroTotal && !isGratis) {
    // Try to reconstruct total from snapshot_rate
    let reconstructedTotal = 0
    bookingItems.forEach((item: any) => {
      if (item.item_type === 'equipment' && item.equipment_id) {
        const snap = snapshotEquipment.find((e: any) => e.id === item.equipment_id)
        const ratePerDay = snap?.rate_per_day ?? 0
        reconstructedTotal += ratePerDay * snapshotDays * item.quantity
      } else if (item.item_type === 'room' && item.room_id) {
        const snap = snapshotRooms.find((r: any) => r.id === item.room_id)
        const ratePerHour = snap?.rate_per_hour ?? 0
        reconstructedTotal += ratePerHour * snapshotHours
      }
    })

    // Fallback: if snapshot is incomplete, fetch current rates from DB
    if (reconstructedTotal === 0) {
      const eqIdsForFallback = bookingItems
        .filter((item: any) => item.item_type === 'equipment' && item.equipment_id)
        .map((item: any) => item.equipment_id)

      if (eqIdsForFallback.length > 0) {
        const { data: rates } = await (sb.from('equipment_rates') as any)
          .select('equipment_id, rate_per_day')
          .in('equipment_id', eqIdsForFallback)
          .eq('user_category', borrowerCategory)

        currentRates = rates || []
        const ratesMap = new Map(currentRates.map((r: any) => [r.equipment_id, Number(r.rate_per_day)]))

        bookingItems.forEach((item: any) => {
          if (item.item_type === 'equipment' && item.equipment_id) {
            const ratePerDay = ratesMap.get(item.equipment_id) ?? 0
            reconstructedTotal += ratePerDay * durationDays * item.quantity
          }
        })
      }

      // Also try rooms fallback
      const roomIdsForFallback = bookingItems
        .filter((item: any) => item.item_type === 'room' && item.room_id)
        .map((item: any) => item.room_id)

      if (roomIdsForFallback.length > 0) {
        const { data: rooms } = await (sb.from('rooms') as any)
          .select('id, rate_per_hour, rate_per_day')
          .in('id', roomIdsForFallback)

        currentRoomRates = rooms || []
        const roomRatesMap = new Map(currentRoomRates.map((r: any) => [r.id, r]))

        bookingItems.forEach((item: any) => {
          if (item.item_type === 'room' && item.room_id) {
            const room = roomRatesMap.get(item.room_id)
            if (room) {
              if (durationHours > 12 && room.rate_per_day != null) {
                reconstructedTotal += room.rate_per_day * durationDays
              } else {
                reconstructedTotal += (room.rate_per_hour ?? 0) * durationHours
              }
            }
          }
        })
      }
    }

    displayTotal = reconstructedTotal
  }

  // Calculate price per item for display
  const bookingItemsWithPrice = bookingItems.map((item: any) => {
    let itemTotal = 0
    let unitPrice = 0
    let rateLabel = ''

    if (hasZeroTotal && !isGratis) {
      // Use snapshot_rate for pricing first
      if (item.item_type === 'equipment' && item.equipment_id) {
        const snap = snapshotEquipment.find((e: any) => e.id === item.equipment_id)
        let ratePerDay = snap?.rate_per_day ?? 0
        // Fallback to current DB rate if snapshot missing
        if (ratePerDay === 0 && displayTotal > 0) {
          const fallback = (currentRates || []).find((r: any) => r.equipment_id === item.equipment_id)
          ratePerDay = fallback ? Number(fallback.rate_per_day) : 0
        }
        itemTotal = ratePerDay * snapshotDays * item.quantity
        unitPrice = ratePerDay * snapshotDays
        rateLabel = `${formatRupiah(ratePerDay)}/hari × ${snapshotDays} hari`
      } else if (item.item_type === 'room' && item.room_id) {
        const snap = snapshotRooms.find((r: any) => r.id === item.room_id)
        let ratePerHour = snap?.rate_per_hour ?? 0
        let ratePerDay = snap?.rate_per_day ?? null
        // Fallback to current DB rate if snapshot missing
        if (ratePerHour === 0 && displayTotal > 0) {
          const fallback = (currentRoomRates || []).find((r: any) => r.id === item.room_id)
          ratePerHour = fallback?.rate_per_hour ?? 0
          ratePerDay = fallback?.rate_per_day ?? null
        }
        if (durationHours > 12 && ratePerDay != null) {
          itemTotal = ratePerDay * durationDays
          unitPrice = ratePerDay * durationDays
          rateLabel = `${formatRupiah(ratePerDay)}/hari × ${durationDays} hari`
        } else {
          itemTotal = ratePerHour * snapshotHours
          unitPrice = ratePerHour * snapshotHours
          rateLabel = `${formatRupiah(ratePerHour)}/jam × ${snapshotHours} jam`
        }
      }
    } else {
      // Use total_amount split evenly
      itemTotal = booking.total_amount / bookingItems.length
      unitPrice = itemTotal / item.quantity
      rateLabel = `${formatRupiah(unitPrice)} / unit`
    }

    return {
      ...item,
      unitPrice,
      itemTotal,
      rateLabel
    }
  })

  // Status timeline steps
  const statusSteps = [
    { status: 'pending', label: 'Pengajuan Dibuat', icon: Clock3 },
    { status: 'approved', label: 'Disetujui Admin', icon: CheckCircle2 },
    { status: 'paid', label: 'Pembayaran Diterima', icon: CreditCard },
    { status: 'completed', label: 'Selesai', icon: CheckCircle2 },
  ]

  const currentStepIndex = statusSteps.findIndex(s => s.status === booking.status)

  return (
    <div className="admin-page max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/bookings"
            className="inline-flex items-center justify-center h-10 w-10 rounded-[10px] border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-colors shadow-soft"
          >
            <ArrowLeft className="h-5 w-5 text-[#374151]" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-semibold text-[#111827]">Detail Peminjaman</h1>
              <span className="font-mono text-sm text-[#0891B2] bg-[#0891B2]/10 px-2.5 py-1 rounded-full">
                {booking.reference_no}
              </span>
            </div>
            <p className="text-sm text-[#6B7280] mt-0.5">
              Dibuat pada {formatDateTime(booking.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BookingStatusBadge status={booking.status} />
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Peminjam Card */}
          <Card className="rounded-[14px] border-[#E5E7EB] shadow-soft overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <CardTitle className="text-sm flex items-center gap-2 text-[#374151]">
                <User className="h-4 w-4 text-[#0891B2]" />
                Data Peminjam
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-[#0891B2] rounded-full flex items-center justify-center text-white text-xl font-bold shadow-soft">
                    {borrower?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="sm:hidden">
                    <h3 className="font-semibold text-[#111827] text-lg">{borrower?.name}</h3>
                    <Badge variant="secondary" className="mt-1">
                      {borrower?.role || 'Peminjam'}
                    </Badge>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Nama Lengkap</p>
                    <p className="font-medium text-[#111827]">{borrower?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Kategori</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[#0891B2] border-[#0891B2]/30">
                        {getBorrowerCategoryLabel(borrowerCategory)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {getEventTypeLabel(eventType)}
                      </Badge>
                      {isGratis && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          Gratis
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Instansi</p>
                    <div className="flex items-center gap-1.5 text-[#111827]">
                      <Building2 className="h-3.5 w-3.5 text-[#6B7280]" />
                      {borrower?.institution || '-'}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Kelas/Divisi</p>
                    <p className="text-[#111827]">{borrower?.class_division || '-'}</p>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Contact Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {borrower?.email && (
                  <a 
                    href={`mailto:${borrower.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-blue-50 text-blue-700 text-sm hover:bg-blue-100 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </a>
                )}
                {borrower?.phone && (
                  <a 
                    href={`https://wa.me/${borrower.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-green-50 text-green-700 text-sm hover:bg-green-100 transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
                {borrower?.telegram_username && (
                  <a 
                    href={`https://t.me/${borrower.telegram_username.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-sky-50 text-sky-700 text-sm hover:bg-sky-100 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Telegram
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Item Card */}
          <Card className="rounded-[14px] border-[#E5E7EB] shadow-soft overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <CardTitle className="text-sm flex items-center gap-2 text-[#374151]">
                <Package className="h-4 w-4 text-[#0891B2]" />
                Ruang &amp; Alat yang Dipinjam
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3">
                {bookingItemsWithPrice.map((item: any, index: number) => (
                  <div 
                    key={index} 
                    className="p-4 border border-[#E5E7EB] rounded-[10px] hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="h-8 w-8 bg-[#0891B2]/10 rounded-full flex items-center justify-center text-sm font-semibold text-[#0891B2] flex-shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-[#111827]">
                            {item.item_type === 'room' 
                              ? item.room?.name 
                              : item.equipment?.name
                            }
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={item.item_type === 'room' ? 'default' : 'secondary'} 
                              className="text-[10px]"
                            >
                              {item.item_type === 'room' ? 'Ruang' : 'Alat'}
                            </Badge>
                            <span className="text-xs text-[#6B7280]">× {item.quantity} unit</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#6B7280] mt-1.5">
                            <MapPin className="h-3 w-3" />
                            {item.item_type === 'room' ? (
                              <>
                                {item.room?.room_code && `${item.room.room_code} · `}
                                {item.room?.buildings?.name}
                              </>
                            ) : (
                              <>
                                {item.equipment?.equipment_code && `Kode: ${item.equipment.equipment_code}`}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#111827]">
                          {item.itemTotal === 0 ? (
                            isGratis ? <span className="text-emerald-600">Gratis</span> : <span className="text-amber-600">Tarif tidak tersedia</span>
                          ) : formatRupiah(item.itemTotal)}
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          {item.rateLabel ? item.rateLabel : (
                            item.unitPrice === 0 ? (
                              isGratis ? 'Gratis / unit' : 'Tarif tidak tersedia / unit'
                            ) : `${formatRupiah(item.unitPrice)} / unit`
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Date Range */}
              <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-[10px]">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Durasi:</span>{' '}
                    {durationDays > 1 
                      ? `${durationDays} hari (${durationHours} jam)` 
                      : `${durationHours} jam`
                    }
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {formatDateTime(booking.start_datetime)} - {formatDateTime(booking.end_datetime)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pembayaran Card */}
          <Card className="rounded-[14px] border-[#E5E7EB] shadow-soft overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <CardTitle className="text-sm flex items-center gap-2 text-[#374151]">
                <CreditCard className="h-4 w-4 text-[#0891B2]" />
                Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {isGratis ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-[10px]">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">Peminjaman Gratis</p>
                      <p className="text-sm text-green-700">
                        Mahasiswa S1 untuk keperluan perkuliahan tidak dikenakan biaya.
                      </p>
                    </div>
                  </div>
                </div>
              ) : payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((payment: any) => (
                    <div 
                      key={payment.id} 
                      className="flex items-center justify-between p-3 border border-[#E5E7EB] rounded-[10px]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          payment.status === 'paid' ? 'bg-green-100' : 'bg-amber-100'
                        }`}>
                          <CreditCard className={`h-5 w-5 ${
                            payment.status === 'paid' ? 'text-green-600' : 'text-amber-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-[#111827]">{formatRupiah(payment.amount)}</p>
                          <p className="text-xs text-[#6B7280] capitalize">
                            {payment.method === 'manual_cash' ? 'Tunai' : 
                             payment.method === 'manual_transfer' ? 'Transfer Bank' : payment.method}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                          {payment.status === 'paid' ? 'Lunas' : 'Pending'}
                        </Badge>
                        {payment.paid_at && (
                          <p className="text-xs text-[#6B7280] mt-1">
                            {formatDateTime(payment.paid_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Payment Summary */}
                  <Separator />
                  <div className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-[10px]">
                    <span className="text-[#6B7280]">Total Tagihan</span>
                    <span className="font-semibold text-[#111827]">
                      {displayTotal === 0 ? (
                        isGratis ? <span className="text-emerald-600">Gratis</span> : <span className="text-amber-600">Tarif tidak tersedia</span>
                      ) : formatRupiah(displayTotal)}
                    </span>
                  </div>
                  {hasZeroTotal && !isGratis && displayTotal > 0 && (
                    <div className="p-3 bg-amber-50 rounded-[10px] text-xs text-amber-700">
                      <p><strong>Perhatian:</strong> Total asli di database adalah Rp 0, kemungkinan karena tarif tidak tersedia saat peminjaman dibuat.</p>
                      <p>Nominal di atas dihitung ulang dari data tarif saat ini: {formatRupiah(displayTotal)}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-[10px]">
                    <span className="text-[#6B7280]">Sudah Dibayar</span>
                    <span className="font-semibold text-green-600">
                      {formatRupiah((payments || [])
                        .filter((p: any) => p.status === 'paid')
                        .reduce((sum: number, p: any) => sum + p.amount, 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-[10px]">
                    <span className="text-amber-800 font-medium">Sisa Pembayaran</span>
                    <span className="font-bold text-amber-800">
                      {formatRupiah(Math.max(0, displayTotal - (payments || [])
                        .filter((p: any) => p.status === 'paid')
                        .reduce((sum: number, p: any) => sum + p.amount, 0)))}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-[#6B7280]">
                  <Receipt className="h-12 w-12 mx-auto mb-3 text-[#E5E7EB]" />
                  <p className="text-sm">Belum ada pembayaran tercatat</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card className="rounded-[14px] border-[#E5E7EB] shadow-soft overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <CardTitle className="text-sm flex items-center gap-2 text-[#374151]">
                <Clock className="h-4 w-4 text-[#0891B2]" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="relative">
                {statusSteps.map((step, index) => {
                  const StepIcon = step.icon
                  const isActive = index <= currentStepIndex
                  const isCurrent = index === currentStepIndex
                  
                  return (
                    <div key={step.status} className="flex gap-4 relative">
                      {/* Timeline line */}
                      {index < statusSteps.length - 1 && (
                        <div className="absolute left-[19px] top-8 bottom-0 w-0.5 bg-[#E5E7EB]" />
                      )}
                      
                      {/* Icon */}
                      <div className={cn(
                        'relative z-10 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                        isActive ? 'bg-[#0891B2] text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]'
                      )}>
                        <StepIcon className="h-5 w-5" />
                      </div>
                      
                      {/* Content */}
                      <div className={cn(
                        'pb-6',
                        !isActive && 'opacity-50'
                      )}>
                        <p className={cn(
                          'font-medium',
                          isCurrent ? 'text-[#0891B2]' : 'text-[#111827]'
                        )}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-[#6B7280] mt-0.5">
                            Status saat ini
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {booking.status === 'rejected' && (
                  <div className="flex gap-4 relative">
                    <div className="relative z-10 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-red-600">Ditolak</p>
                      {booking.admin_notes && (
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Alasan: {booking.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {booking.status === 'cancelled' && (
                  <div className="flex gap-4 relative">
                    <div className="relative z-10 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-600">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Dibatalkan</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Catatan Admin */}
          {booking.admin_notes && booking.status !== 'rejected' && (
            <Card className="rounded-[14px] border-amber-200 bg-amber-50 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                  <FileText className="h-4 w-4" />
                  Catatan Admin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-800">{booking.admin_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (1/3) - Action Card */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">
            {/* Action Card */}
            <Card className="rounded-[14px] border-[#E5E7EB] shadow-soft overflow-hidden">
              <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <CardTitle className="text-sm flex items-center gap-2 text-[#374151]">
                  Tindakan Cepat
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {/* Pending Actions */}
                {booking.status === 'pending' && (
                  <ApprovalButtons 
                    bookingId={bookingId} 
                    borrowerCategory={borrowerCategory}
                    purpose={booking.purpose || ''}
                    eventType={eventType}
                  />
                )}

                {/* Approved + Payment Proof Pending */}
                {booking.status === 'approved' && !isGratis && booking.total_amount > 0 && (
                  <>
                    <RecordPaymentButton 
                      bookingId={bookingId} 
                      totalAmount={booking.total_amount} 
                      paidAmount={(payments || [])
                        .filter((p: any) => p.status === 'paid')
                        .reduce((sum: number, p: any) => sum + p.amount, 0)}
                    />
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-[10px]">
                      <p className="text-xs text-amber-800">
                        Menunggu pembayaran dari peminjam.
                      </p>
                    </div>
                  </>
                )}

                {/* Paid - Record Return */}
                {(booking.status === 'approved' || booking.status === 'paid') && (
                  <Link 
                    href={`/admin/returns/${bookingId}`}
                    className={buttonVariants({ 
                      className: 'w-full rounded-[10px] bg-blue-600 hover:bg-blue-700' 
                    })}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Catat Pengembalian
                  </Link>
                )}

                {/* Contact Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {borrower?.phone && (
                    <a 
                      href={`https://wa.me/${borrower.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 h-10 rounded-[10px] bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">WA</span>
                    </a>
                  )}
                  {borrower?.email && (
                    <a 
                      href={`mailto:${borrower.email}`}
                      className="inline-flex items-center justify-center gap-1.5 h-10 rounded-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="hidden sm:inline">Email</span>
                    </a>
                  )}
                  <a 
                    href={`/api/bookings/${bookingId}/formulir`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 h-10 rounded-[10px] bg-[#0891B2]/10 text-[#0891B2] hover:bg-[#0891B2]/20 transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="rounded-[14px] border-[#E5E7EB] shadow-soft overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280]">No. Referensi</span>
                  <span className="font-mono text-[#0891B2] font-medium">{booking.reference_no}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280]">Tujuan</span>
                  <span className="text-[#111827] text-right max-w-[150px] truncate">{booking.purpose || '-'}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280]">Total</span>
                  <span className="font-semibold text-[#111827]">{formatRupiah(booking.total_amount)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// cn() imported from @/lib/utils - no duplicate needed
