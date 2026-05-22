import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import Link from 'next/link'
import { Eye, CheckCircle, Clock, Wallet, Settings } from 'lucide-react'
import { PaymentMethodsPanel } from './PaymentMethodsPanel'
import { DeletePaymentButton } from './DeletePaymentButton'
import { DeleteTransactionButton } from './DeleteTransactionButton'
import { cn } from '@/lib/utils'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'metode' ? 'metode' : 'transaksi'

  const tabs = [
    { key: 'transaksi', label: 'Transaksi', icon: Wallet,   href: '/admin/payments' },
    { key: 'metode',    label: 'Metode Pembayaran', icon: Settings, href: '/admin/payments?tab=metode' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Pembayaran</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola transaksi dan metode pembayaran</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === 'metode' ? (
        <PaymentMethodsPanel />
      ) : (
        <TransaksiTab />
      )}
    </div>
  )
}

async function TransaksiTab() {
  const supabase = await createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: bookingsWithPayment }, { data: vaPaymentProofs }, { data: traditionalPayments }] = await Promise.all([
    (supabase.from('bookings') as any)
      .select('id, reference_no, total_amount, status, payment_code, payment_verified_at, created_at, users!user_id(name, email)')
      .gt('total_amount', 0)
      .order('created_at', { ascending: false }),
    (supabase.from('payment_proofs') as any)
      .select('*, bookings(id, reference_no, total_amount, users:user_id(name, email))')
      .order('created_at', { ascending: false }),
    (supabase.from('payments') as any)
      .select('*, bookings(reference_no, users!user_id(name))')
      .order('created_at', { ascending: false }),
  ]) as [
    { data: Array<{ id:string; reference_no:string; total_amount:number; status:string; payment_code:string|null; payment_verified_at:string|null; created_at:string; users:{name:string;email:string}|null }> | null },
    { data: Array<{ id:string; status:'pending'|'verified'|'rejected'; transfer_amount:number; bank_name:string; created_at:string; verified_at:string|null; bookings:{id:string;reference_no:string;total_amount:number;users:{name:string;email:string}|null}|null }> | null },
    { data: Array<{ id:string; status:string; amount:number; method:string; paid_at:string|null; bookings:{reference_no:string;users:{name:string}|null}|null }> | null },
  ]

  const pendingBookings = bookingsWithPayment?.filter(b => b.status === 'pending_payment' || b.status === 'payment_uploaded') ?? []
  const paidBookings   = bookingsWithPayment?.filter(b => b.status === 'paid' || b.status === 'completed') ?? []
  const pendingProofs  = vaPaymentProofs?.filter(p => p.status === 'pending') ?? []

  const totalPaid        = paidBookings.reduce((s, b) => s + (b.total_amount || 0), 0)
  const totalVerifiedVA  = vaPaymentProofs?.filter(p => p.status === 'verified').reduce((s, p) => s + (p.transfer_amount || 0), 0) ?? 0
  const totalTraditional = traditionalPayments?.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0) ?? 0
  const grandTotal       = totalPaid + totalVerifiedVA + totalTraditional

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending:          { label: 'Pending',          color: 'bg-gray-100 text-gray-800' },
    approved:         { label: 'Disetujui',        color: 'bg-blue-100 text-blue-800' },
    pending_payment:  { label: 'Menunggu Bayar',   color: 'bg-orange-100 text-orange-800' },
    payment_uploaded: { label: 'Bukti Diupload',   color: 'bg-yellow-100 text-yellow-800' },
    paid:             { label: 'Lunas',            color: 'bg-green-100 text-green-800' },
    completed:        { label: 'Selesai',          color: 'bg-green-100 text-green-800' },
    rejected:         { label: 'Ditolak',          color: 'bg-red-100 text-red-800' },
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Terkumpul</p>
            <p className="text-xl font-bold text-green-600">{formatRupiah(grandTotal)}</p>
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
              {paidBookings.length + (vaPaymentProofs?.filter(p => p.status === 'verified').length ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Verify button */}
      <div className="flex justify-end">
        <Link href="/admin/payments/verify">
          <Button variant={pendingProofs.length > 0 ? 'default' : 'outline'} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Verifikasi Pembayaran
            {pendingProofs.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingProofs.length} menunggu</Badge>
            )}
          </Button>
        </Link>
      </div>

      {/* All Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Semua Transaksi Pembayaran
          </CardTitle>
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
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!bookingsWithPayment || bookingsWithPayment.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada transaksi</TableCell>
                </TableRow>
              )}
              {bookingsWithPayment?.map((booking) => {
                const cfg = statusConfig[booking.status] ?? statusConfig.pending
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-sm">{booking.reference_no}</TableCell>
                    <TableCell>{booking.users?.name ?? '-'}</TableCell>
                    <TableCell className="font-medium">{formatRupiah(booking.total_amount)}</TableCell>
                    <TableCell className="font-mono text-xs">{booking.payment_code ?? '-'}</TableCell>
                    <TableCell><Badge className={cfg.color}>{cfg.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/bookings/${booking.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1" />Detail</Button>
                        </Link>
                        {booking.status === 'pending_payment' && (
                          <Link href="/admin/payments/verify">
                            <Button variant="outline" size="sm">Verifikasi</Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DeleteTransactionButton
                        bookingId={booking.id}
                        referenceNo={booking.reference_no}
                        borrowerName={booking.users?.name ?? '-'}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* VA Proofs */}
      {vaPaymentProofs && vaPaymentProofs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Bukti Transfer VA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Referensi</TableHead>
                  <TableHead>Peminjam</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaPaymentProofs.map((proof) => {
                  const colors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800', verified: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' }
                  const labels: Record<string, string> = { pending: 'Menunggu', verified: 'Terverifikasi', rejected: 'Ditolak' }
                  return (
                    <TableRow key={proof.id}>
                      <TableCell className="font-mono text-sm">{proof.bookings?.reference_no}</TableCell>
                      <TableCell>{proof.bookings?.users?.name ?? '-'}</TableCell>
                      <TableCell>{proof.bank_name ?? '-'}</TableCell>
                      <TableCell className="font-medium">{formatRupiah(proof.transfer_amount)}</TableCell>
                      <TableCell><Badge className={colors[proof.status]}>{labels[proof.status]}</Badge></TableCell>
                      <TableCell>
                        <DeletePaymentButton
                          id={proof.id}
                          referenceNo={proof.bookings?.reference_no ?? '-'}
                          type="proof"
                          label="Bukti transfer"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Manual Payments */}
      {traditionalPayments && traditionalPayments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pembayaran Manual (Admin Input)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Referensi</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {traditionalPayments.map((p) => {
                  const labels: Record<string, string> = { online: 'Online', manual_cash: 'Tunai', manual_transfer: 'Transfer' }
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.bookings?.reference_no}</TableCell>
                      <TableCell>{labels[p.method] ?? p.method}</TableCell>
                      <TableCell>{formatRupiah(p.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status === 'paid' ? 'Lunas' : p.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <DeletePaymentButton
                          id={p.id}
                          referenceNo={p.bookings?.reference_no ?? '-'}
                          label="Pembayaran manual"
                        />
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
