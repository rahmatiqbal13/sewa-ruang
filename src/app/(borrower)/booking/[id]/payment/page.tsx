'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle, 
  Upload,
  Building2,
  CreditCard,
  AlertCircle,
  Copy,
  Check,
  Home,
  Box,
  Landmark,
  Receipt
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/utils'

interface PaymentMethod {
  id: string
  bankName: string
  bankCode: string
  virtualAccountNumber: string
  accountName: string
  category: 'room' | 'equipment' | 'general'
}

interface BookingData {
  id: string
  reference_no: string
  total_amount: number
  status: string
  payment_code: string | null
  created_at: string
  snapshot_rate: {
    borrower_category?: string
    event_type?: string
    hours?: number
    days?: number
    rooms?: Array<{
      id: string
      name: string
      rate_per_hour: number | null
      rate_per_day: number | null
    }>
    equipment?: Array<{
      id: string
      rate_per_day: number
      quantity: number
    }>
  } | null
}

interface BookingItemRow {
  item_type: 'room' | 'equipment'
  quantity: number
  room_id: string | null
  equipment_id: string | null
  rooms: { name: string } | null
  equipment: { name: string } | null
}

export default function PaymentPage() {
  const params = useParams()
  const bookingId = params.id as string
  
  const [booking, setBooking] = useState<BookingData | null>(null)
  const [roomMethods, setRoomMethods] = useState<PaymentMethod[]>([])
  const [equipmentMethods, setEquipmentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [gettingCode, setGettingCode] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('room')
  const [bookingItems, setBookingItems] = useState<BookingItemRow[]>([])
  const [hasRoom, setHasRoom] = useState(false)
  const [hasEquipment, setHasEquipment] = useState(false)

  const supabase = createClient()

  const fetchBookingAndPaymentMethods = async () => {
    try {
      setLoading(true)
      
      // Get booking with snapshot_rate
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bookingData, error: bookingError } = await (supabase.from('bookings') as any)
        .select('id, reference_no, total_amount, status, payment_code, created_at, snapshot_rate')
        .eq('id', bookingId)
        .single()

      if (bookingError) throw bookingError
      if (!bookingData) {
        toast.error('Booking tidak ditemukan')
        return
      }

      setBooking(bookingData)

      // Get booking items with names
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: itemsData } = await (supabase.from('booking_items') as any)
        .select('item_type, quantity, room_id, equipment_id, rooms(name), equipment(name)')
        .eq('booking_id', bookingId)

      const items: BookingItemRow[] = itemsData || []
      setBookingItems(items)

      const hasRoomItems = items.some((item: BookingItemRow) => item.item_type === 'room')
      const hasEquipmentItems = items.some((item: BookingItemRow) => item.item_type === 'equipment')
      setHasRoom(hasRoomItems)
      setHasEquipment(hasEquipmentItems)

      // Set active tab based on booking type
      if (hasRoomItems && !hasEquipmentItems) {
        setActiveTab('room')
      } else if (hasEquipmentItems && !hasRoomItems) {
        setActiveTab('equipment')
      }

      // Get payment methods
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: methodsData, error: methodsError } = await (supabase.from('bank_accounts') as any)
        .select('id, bank_name, bank_code, virtual_account_number, account_name, category, is_primary')
        .eq('is_active', true)
        .order('category')
        .order('is_primary', { ascending: false })

      if (methodsError) throw methodsError

      const formattedMethods = methodsData?.map((bank: {
        id: string;
        bank_name: string;
        bank_code: string;
        virtual_account_number: string;
        account_name: string;
        category: 'room' | 'equipment' | 'general';
      }) => ({
        id: bank.id,
        bankName: bank.bank_name,
        bankCode: bank.bank_code,
        virtualAccountNumber: bank.virtual_account_number,
        accountName: bank.account_name,
        category: bank.category
      })) || []

      // Separate by category and filter based on booking type
      const allRoomMethods = formattedMethods.filter((m: PaymentMethod) => m.category === 'room')
      const allEquipmentMethods = formattedMethods.filter((m: PaymentMethod) => m.category === 'equipment')
      const generalMethods = formattedMethods.filter((m: PaymentMethod) => m.category === 'general')

      setRoomMethods(hasRoomItems ? allRoomMethods : [])
      setEquipmentMethods(hasEquipmentItems ? allEquipmentMethods : [])
      
      // If general methods exist and booking has neither specific type, show general
      if (!hasRoomItems && !hasEquipmentItems && generalMethods.length > 0) {
        setRoomMethods(generalMethods)
      }
      
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = setTimeout(() => fetchBookingAndPaymentMethods(), 0)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const getPaymentCode = async () => {
    try {
      setGettingCode(true)
      
      const response = await fetch('/api/payments/get-va', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get payment info')
      }

      setBooking(prev => prev ? { ...prev, payment_code: data.paymentCode, status: 'pending_payment' } : null)
      
      if (data.paymentMethods) {
        const roomM = (data.paymentMethods.room || []).map((bank: Record<string, unknown>) => ({
          id: bank.id as string,
          bankName: bank.bankName as string,
          bankCode: bank.bankCode as string,
          virtualAccountNumber: bank.virtualAccountNumber as string,
          accountName: bank.accountName as string,
          category: bank.category as 'room' | 'equipment' | 'general',
        }))
        const equipM = (data.paymentMethods.equipment || []).map((bank: Record<string, unknown>) => ({
          id: bank.id as string,
          bankName: bank.bankName as string,
          bankCode: bank.bankCode as string,
          virtualAccountNumber: bank.virtualAccountNumber as string,
          accountName: bank.accountName as string,
          category: bank.category as 'room' | 'equipment' | 'general',
        }))
        setRoomMethods(hasRoom ? roomM : [])
        setEquipmentMethods(hasEquipment ? equipM : [])
      }
      
      toast.success('Kode pembayaran berhasil dibuat')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal membuat kode pembayaran')
    } finally {
      setGettingCode(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} disalin`)
    setTimeout(() => setCopied(null), 2000)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; color: string }> = {
      pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Disetujui', color: 'bg-blue-100 text-blue-800' },
      pending_payment: { label: 'Menunggu Pembayaran', color: 'bg-orange-100 text-orange-800' },
      payment_uploaded: { label: 'Bukti Diupload', color: 'bg-purple-100 text-purple-800' },
      paid: { label: 'Lunas', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-800' },
    }
    
    const variant = variants[status] || { label: status, color: 'bg-muted text-foreground' }
    return <Badge className={variant.color}>{variant.label}</Badge>
  }

  const formatVA = (vaNumber: string) => {
    // Format: 94220-022-022-04-0002
    if (vaNumber.length === 20) {
      return `${vaNumber.slice(0, 5)}-${vaNumber.slice(5, 8)}-${vaNumber.slice(8, 11)}-${vaNumber.slice(11, 13)}-${vaNumber.slice(13)}`
    }
    return vaNumber
  }

  const renderPriceBreakdown = () => {
    if (!booking?.snapshot_rate) return null
    const snap = booking.snapshot_rate
    const days = snap.days ?? 1
    const hours = snap.hours ?? 1

    const roomRows = (snap.rooms || []).map((room) => {
      const ratePerDay = room.rate_per_day ?? 0
      const ratePerHour = room.rate_per_hour ?? 0
      let subtotal = 0
      let rateText = ''
      if (hours > 12 && ratePerDay > 0) {
        subtotal = ratePerDay * days
        rateText = `${formatRupiah(ratePerDay)} x ${days} hari`
      } else if (ratePerHour > 0) {
        subtotal = ratePerHour * hours
        rateText = `${formatRupiah(ratePerHour)} x ${hours} jam`
      } else if (ratePerDay > 0) {
        subtotal = ratePerDay * days
        rateText = `${formatRupiah(ratePerDay)} x ${days} hari`
      }
      return { name: room.name, subtotal, rateText, type: 'room' as const }
    }).filter(r => r.subtotal > 0)

    const equipRows = (snap.equipment || []).map((eq) => {
      const foundItem = bookingItems.find(i => i.item_type === 'equipment' && i.equipment_id === eq.id)
      const itemName = foundItem?.equipment?.name ?? 'Alat'
      const subtotal = (eq.rate_per_day ?? 0) * days * (eq.quantity ?? 1)
      const rateText = `${formatRupiah(eq.rate_per_day)} x ${days} hari x ${eq.quantity} unit`
      return { name: itemName, subtotal, rateText, type: 'equipment' as const, quantity: eq.quantity }
    }).filter(r => r.subtotal > 0)

    const allRows = [...roomRows, ...equipRows]
    if (allRows.length === 0) return null

    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Rincian Harga
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allRows.map((row, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-[10px]">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${row.type === 'room' ? 'bg-indigo-100' : 'bg-amber-100'}`}>
                  {row.type === 'room' ? (
                    <Home className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <Box className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.rateText}</p>
                </div>
              </div>
              <span className="font-semibold text-sm">{formatRupiah(row.subtotal)}</span>
            </div>
          ))}
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-medium">Total</span>
            <span className="font-bold text-lg text-green-600">{formatRupiah(booking.total_amount)}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderVAMethod = (method: PaymentMethod) => (
    <Card key={method.id} className="overflow-hidden border-2">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Bank Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Landmark className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-bold text-xl">{method.bankName}</h3>
              <p className="text-muted-foreground">{method.accountName}</p>
            </div>
          </div>

          {/* VA Number - PROMINENT */}
          <div className="bg-muted p-6 rounded-[10px] text-center">
            <p className="text-sm text-muted-foreground mb-2">Nomor Virtual Account</p>
            <div className="flex items-center justify-center gap-3">
              <p className="text-3xl font-mono font-bold text-foreground tracking-wider">
                {formatVA(method.virtualAccountNumber)}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(method.virtualAccountNumber, 'VA')}
                className="h-10 px-3"
              >
                {copied === 'VA' ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Klik tombol copy untuk menyalin nomor VA
            </p>
          </div>

          {/* Total Amount */}
          <div className="bg-muted p-4 rounded-[10px] text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Pembayaran</p>
            <p className="text-3xl font-bold text-foreground">
              {booking && formatRupiah(booking.total_amount)}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-muted p-4 rounded-[10px] text-sm space-y-2">
            <p className="font-semibold text-foreground">Cara Pembayaran:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Buka aplikasi BTN Mobile / ATM BTN</li>
              <li>Pilih menu <strong>Pembayaran</strong> {'>'} <strong>Virtual Account</strong></li>
              <li>Masukkan nomor VA di atas</li>
              <li>Pastikan nama tujuan: <strong>{method.accountName}</strong></li>
              <li>Masukkan nominal: <strong>{booking && formatRupiah(booking.total_amount)}</strong></li>
              <li>Ikuti instruksi hingga pembayaran berhasil</li>
              <li>Simpan screenshot bukti pembayaran</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-xl font-semibold text-foreground">Booking tidak ditemukan</h1>
        <Link href="/bookings" className="mt-6">
          <Button>Kembali ke Daftar Booking</Button>
        </Link>
      </div>
    )
  }

  // Redirect if booking is free (no payment needed)
  if (booking && booking.total_amount === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted">
        <CheckCircle className="h-20 w-20 text-emerald-500 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Peminjaman Gratis</h1>
        <p className="text-muted-foreground mt-2">Peminjaman ini tidak dikenakan biaya</p>
        <div className="mt-6 flex gap-4">
          <Link href={`/bookings/${booking.reference_no}`}>
            <Button variant="outline">Lihat Detail Booking</Button>
          </Link>
          <Link href="/bookings">
            <Button>Kembali</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Redirect if already paid
  if (booking.status === 'paid') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted">
        <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Pembayaran Lunas!</h1>
        <p className="text-muted-foreground mt-2">Terima kasih, pembayaran Anda sudah diverifikasi</p>
        <div className="mt-6 flex gap-4">
          <Link href={`/bookings/${booking.reference_no}`}>
            <Button variant="outline">Lihat Detail Booking</Button>
          </Link>
          <Link href="/bookings">
            <Button>Kembali</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/bookings/${booking.reference_no}`} className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali ke Booking
          </Link>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status Pembayaran</p>
                <div className="mt-1">{getStatusBadge(booking.status)}</div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                <p className="text-2xl font-bold text-foreground">{formatRupiah(booking.total_amount)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">No. Referensi</span>
                <span className="font-mono font-medium">{booking.reference_no}</span>
              </div>
              {booking.payment_code && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kode Pembayaran</span>
                  <span className="font-mono font-medium text-blue-600">{booking.payment_code}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Price Breakdown */}
        {renderPriceBreakdown()}

        {/* Generate Payment Code Button */}
        {!booking.payment_code && (
          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <Landmark className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generate Kode Pembayaran</h3>
              <p className="text-muted-foreground mb-4">Klik tombol di bawah untuk mendapatkan instruksi pembayaran</p>
              <Button 
                onClick={getPaymentCode} 
                disabled={gettingCode}
                size="lg"
              >
                {gettingCode ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Tampilkan Instruksi Pembayaran
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* VA Payment Options */}
        {booking.payment_code && (
          <>
            {(roomMethods.length > 0 || equipmentMethods.length > 0) ? (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Pembayaran via Virtual Account
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Pilih VA sesuai jenis pemesanan Anda
                  </p>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      {roomMethods.length > 0 && (
                        <TabsTrigger value="room" className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Sewa Gedung
                        </TabsTrigger>
                      )}
                      {equipmentMethods.length > 0 && (
                        <TabsTrigger value="equipment" className="flex items-center gap-2">
                          <Box className="h-4 w-4" />
                          Sewa Alat
                        </TabsTrigger>
                      )}
                    </TabsList>

                    {roomMethods.length > 0 && (
                      <TabsContent value="room" className="mt-6 space-y-4">
                        <div className="bg-muted p-4 rounded-[10px] mb-4">
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <Home className="h-5 w-5" />
                            Virtual Account untuk Sewa Gedung
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Gunakan VA berikut untuk pembayaran sewa gedung/ruangan
                          </p>
                        </div>
                        {roomMethods.map(renderVAMethod)}
                      </TabsContent>
                    )}

                    {equipmentMethods.length > 0 && (
                      <TabsContent value="equipment" className="mt-6 space-y-4">
                        <div className="bg-muted p-4 rounded-[10px] mb-4">
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <Box className="h-5 w-5" />
                            Virtual Account untuk Sewa Alat
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Gunakan VA berikut untuk pembayaran sewa alat/peralatan
                          </p>
                        </div>
                        {equipmentMethods.map(renderVAMethod)}
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">Belum ada metode pembayaran yang tersedia</p>
                  <p className="text-sm text-muted-foreground/70 mt-2">Silakan hubungi admin</p>
                </CardContent>
              </Card>
            )}

            {/* Upload Button */}
            <Card className="mb-6">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Sudah transfer? Upload bukti pembayaran Anda
                </p>
                <Link href={`/booking/${bookingId}/upload-proof`}>
                  <Button size="lg" className="w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Bukti Transfer
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        )}

        {/* Help Section */}
        <Card className="bg-muted border-0">
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-2">Informasi Penting</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Pastikan transfer sesuai nominal yang tertera</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Verifikasi nama tujuan sebelum konfirmasi pembayaran</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Simpan screenshot bukti pembayaran</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Verifikasi oleh admin membutuhkan waktu 1x24 jam</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Hubungi admin jika ada kendala pembayaran</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
