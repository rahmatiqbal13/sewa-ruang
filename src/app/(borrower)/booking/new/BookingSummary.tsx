'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Building2, Wrench, Package, Loader2, Clock, CalendarDays } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import type { RoomItem, EquipmentItem } from './page'
import type { BorrowerCategory } from '@/lib/categories'
import { SafeImage } from '@/components/shared/SafeImage'

interface PriceBreakdownItem {
  name: string
  type: string
  price: number
  details: string
}

interface BookingSummaryProps {
  selectedRooms: RoomItem[]
  selectedEquipment: Array<EquipmentItem & { quantity: number }>
  priceBreakdown: PriceBreakdownItem[]
  estimatedTotal: number
  onSubmit: () => void
  loading: boolean
  isValid: boolean
  hasItems: boolean
  borrowerCategory: BorrowerCategory
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
}

export function BookingSummary({
  selectedRooms,
  selectedEquipment,
  priceBreakdown,
  estimatedTotal,
  onSubmit,
  loading,
  isValid,
  hasItems,
  borrowerCategory,
  startDate,
  endDate,
  startTime,
  endTime,
}: BookingSummaryProps) {
  const totalItems = selectedRooms.length + selectedEquipment.reduce((sum, e) => sum + e.quantity, 0)
  const hasSchedule = startDate && endDate

  return (
    <Card className="border-2 border-blue-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-600" />
          Ringkasan Peminjaman
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Schedule preview */}
        {hasSchedule && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p>
                {new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' — '}
                {new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {startTime && endTime && (
                <p className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {startTime} - {endTime}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Items count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Item</span>
          <Badge variant="secondary">{totalItems} item</Badge>
        </div>

        {/* Selected items list with thumbnails */}
        {totalItems > 0 && (
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {selectedRooms.map((room) => (
              <div key={room.id} className="flex items-center gap-2 text-sm">
                <SafeImage
                  src={room.photo_url}
                  alt={room.name}
                  className="w-8 h-8 rounded object-contain bg-muted shrink-0"
                  fallbackClassName="w-8 h-8 rounded shrink-0"
                  fallback={
                    <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-blue-500" />
                    </div>
                  }
                />
                <span className="truncate flex-1">{room.name}</span>
              </div>
            ))}
            {selectedEquipment.map((equip) => (
              <div key={equip.id} className="flex items-center gap-2 text-sm">
                <SafeImage
                  src={equip.photo_url}
                  alt={equip.name}
                  className="w-8 h-8 rounded object-contain bg-muted shrink-0"
                  fallbackClassName="w-8 h-8 rounded shrink-0"
                  fallback={
                    <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center shrink-0">
                      <Wrench className="h-4 w-4 text-amber-500" />
                    </div>
                  }
                />
                <span className="truncate flex-1">{equip.name}</span>
                {equip.quantity > 1 && (
                  <span className="text-muted-foreground text-xs">×{equip.quantity}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Price breakdown */}
        {priceBreakdown.length > 0 && (
          <div className="space-y-2">
            {priceBreakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {item.type === 'room' ? (
                    <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  ) : (
                    <Wrench className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="text-muted-foreground truncate">{item.name}</span>
                </div>
                <span className="font-medium shrink-0 ml-2">{formatRupiah(item.price)}</span>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total Estimasi</span>
          <span className="text-xl font-bold text-green-600">{formatRupiah(estimatedTotal)}</span>
        </div>

        {borrowerCategory === 'mahasiswa_s1' && (
          <p className="text-xs text-muted-foreground">
            *Mahasiswa S1 gratis untuk perkuliahan & tugas akhir
          </p>
        )}

        {/* Submit button */}
        <Button
          onClick={onSubmit}
          className="w-full h-12 text-base"
          disabled={loading || !isValid || !hasItems}
        >
          {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {loading ? 'Mengirim...' : hasItems ? 'Kirim Pengajuan' : 'Pilih Item Terlebih Dahulu'}
        </Button>
      </CardContent>
    </Card>
  )
}
