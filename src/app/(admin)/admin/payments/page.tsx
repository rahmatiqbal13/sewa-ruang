import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import Link from 'next/link'
import { Eye, CheckCircle, Clock, Wallet } from 'lucide-react'

export default async function PaymentsPage() {
  const supabase = await createAdminClient()
  
  // Get bookings with payment info (treat as pending transactions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookingsWithPayment } = await (supabase.from('bookings') as any)
    .select(`
      id,
      reference_no,
      total_amount,
      status,
      payment_code,
      payment_verified_at,
      created_at,
      users!user_id(name, email)
    `)
    .gt('total_amount', 0)  // Only bookings with payment amount
    .order('created_at', { ascending: false }) as { 
      data: Array<{
        id:string;
        reference_no:string;
        total_amount:number;
        status:string;
        payment_code:string|null;
        payment_verified_at:string|null;
        created_at:string;
        users:{name:string;email:string}|null;
      }> | null 
    }

  // Get VA payment proofs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vaPaymentProofs } = await (supabase.from('payment_proofs') as any)
    .select(`
      *,
      bookings(
        id,
        reference_no, 
        total_amount,
        users:user_id(name, email)
      )
    `)
    .order('created_at', { ascending: false }) as { 
      data: Array<{
        id:string;
        status:'pending'|'verified'|'rejected';
        transfer_amount:number;
        bank_name:string;
        created_at:string;
        verified_at:string|null;
        bookings:{
          id:string;
          reference_no:string;
          total_amount:number;
          users:{name:string;email:string}|null;
        }|null;
      }> | null 
    }

  // Get traditional payments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: traditionalPayments } = await (supabase.from('payments') as any)
    .select('*, bookings(reference_no, users(name))')
    .order('created_at', { ascending: false }) as { 
      data: Array<{
        id:string;
        status:string;
        amount:number;
        method:string;
        paid_at:string|null;
        bookings:{
          reference_no:string;
          users:{name:string}|null;
        }|null;
      }> | null 
    }

  // Calculate stats
  const pendingBookings = bookingsWithPayment?.filter(b => 
    b.status === 'pending_payment' || b.status === 'payment_uploaded'
  ) ?? []
  
  const paidBookings = bookingsWithPayment?.filter(b => 
    b.status === 'paid' || b.status === 'completed'
  ) ?? []
  
  const pendingProofs = vaPaymentProofs?.filter(p => p.status === 'pending') ?? []
  const totalPaid = paidBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
  const totalVerifiedVA = vaPaymentProofs?.filter(p => p.status === 'verified').reduce((sum, p) => sum + (p.transfer_amount || 0), 0) ?? 0
  const totalTraditional = traditionalPayments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pembayaran</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Total terkumpul: <strong className="text-green-600">{formatRupiah(totalPaid + totalVerifiedVA + totalTraditional)}</strong>
          </p>
        </div>
        <Link href="/admin/payments/verify">
          <Button variant={pendingProofs.length > 0 ? "default" : "outline"} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Verifikasi Pembayaran
            {pendingProofs.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingProofs.length} menunggu</Badge>
            )}
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Terkumpul</p>
            <p className="text-xl font-bold text-green-600">{formatRupiah(totalPaid + totalVerifiedVA + totalTraditional)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Menunggu Pembayaran</p>
            <p className="text-xl font-bold text-orange-600">{pendingBookings.length}</p>
            <p className="text-xs text-muted-foreground">{formatRupiah(pendingBookings.reduce((s, b) => s + b.total_amount, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Menunggu Verifikasi</p>
            <p className="text-xl font-bold text-yellow-600">{pendingProofs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Terverifikasi</p>
            <p className="text-xl font-bold text-blue-600">
              {paidBookings.length + (vaPaymentProofs?.filter(p => p.status === 'verified').length || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* All Transactions - From Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Semua Transaksi Pembayaran
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Daftar semua peminjaman yang memerlukan pembayaran
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Referensi</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Total Tagihan</TableHead>
                <TableHead>Kode Bayar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!bookingsWithPayment || bookingsWithPayment.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Belum ada transaksi pembayaran
                  </TableCell>
                </TableRow>
              )}
              {bookingsWithPayment?.map((booking) => {
                const statusConfig: Record<string, {label: string; color: string}> = {
                  'pending': { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
                  'approved': { label: 'Disetujui', color: 'bg-blue-100 text-blue-800' },
                  'pending_payment': { label: 'Menunggu Bayar', color: 'bg-orange-100 text-orange-800' },
                  'payment_uploaded': { label: 'Bukti Diupload', color: 'bg-yellow-100 text-yellow-800' },
                  'paid': { label: 'Lunas', color: 'bg-green-100 text-green-800' },
                  'completed': { label: 'Selesai', color: 'bg-green-100 text-green-800' },
                  'rejected': { label: 'Ditolak', color: 'bg-red-100 text-red-800' },
                }
                const config = statusConfig[booking.status] || statusConfig['pending']
                
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-sm">{booking.reference_no}</TableCell>
                    <TableCell>{booking.users?.name || '-'}</TableCell>
                    <TableCell className="font-medium">{formatRupiah(booking.total_amount)}</TableCell>
                    <TableCell className="font-mono text-xs">{booking.payment_code || '-'}</TableCell>
                    <TableCell>
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/bookings/${booking.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Detail
                          </Button>
                        </Link>
                        {booking.status === 'pending_payment' && (
                          <Link href={`/admin/payments/verify`}>
                            <Button variant="outline" size="sm">
                              Verifikasi
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* VA Payment Proofs */}
      {vaPaymentProofs && vaPaymentProofs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Bukti Transfer VA yang Diupload
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Referensi</TableHead>
                  <TableHead>Peminjam</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Nominal Transfer</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaPaymentProofs.map((proof) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-yellow-100 text-yellow-800',
                    verified: 'bg-green-100 text-green-800',
                    rejected: 'bg-red-100 text-red-800'
                  }
                  return (
                    <TableRow key={proof.id}>
                      <TableCell className="font-mono text-sm">{proof.bookings?.reference_no}</TableCell>
                      <TableCell>{proof.bookings?.users?.name || '-'}</TableCell>
                      <TableCell>{proof.bank_name || '-'}</TableCell>
                      <TableCell className="font-medium">{formatRupiah(proof.transfer_amount)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[proof.status]}>
                          {proof.status === 'pending' ? 'Menunggu' : proof.status === 'verified' ? 'Terverifikasi' : 'Ditolak'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Traditional Payments */}
      {traditionalPayments && traditionalPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pembayaran Manual (Admin Input)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Referensi</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {traditionalPayments.map((payment) => {
                  const methodLabel: Record<string, string> = { 
                    online: 'Online', 
                    manual_cash: 'Tunai', 
                    manual_transfer: 'Transfer' 
                  }
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">{payment.bookings?.reference_no}</TableCell>
                      <TableCell>{methodLabel[payment.method] ?? payment.method}</TableCell>
                      <TableCell>{formatRupiah(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                          {payment.status === 'paid' ? 'Lunas' : payment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
