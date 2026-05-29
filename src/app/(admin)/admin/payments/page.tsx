import { createAdminDbClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/utils'
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
    <div className="admin-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pembayaran</h1>
          <p className="page-subtitle">Kelola transaksi dan metode pembayaran</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn('filter-pill', activeTab === t.key ? 'filter-pill-active' : 'filter-pill-inactive')}
          >
            <t.icon className="h-3 w-3" />
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
  const sb = createAdminDbClient()

  const [{ data: bookingsWithPayment }, { data: vaPaymentProofs }, { data: traditionalPayments }] = await Promise.all([
    (sb.from('bookings') as any)
      .select('id, reference_no, total_amount, status, payment_code, payment_verified_at, created_at, users!user_id(name, email)')
      .gt('total_amount', 0)
      .order('created_at', { ascending: false }),
    (sb.from('payment_proofs') as any)
      .select('*, bookings(id, reference_no, total_amount, users:user_id(name, email))')
      .order('created_at', { ascending: false }),
    (sb.from('payments') as any)
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
    pending:          { label: 'Pending',          color: 'bg-muted text-foreground' },
    approved:         { label: 'Disetujui',        color: 'bg-blue-100 text-blue-800' },
    pending_payment:  { label: 'Menunggu Bayar',   color: 'bg-orange-100 text-orange-800' },
    payment_uploaded: { label: 'Bukti Diupload',   color: 'bg-yellow-100 text-yellow-800' },
    paid:             { label: 'Lunas',            color: 'bg-green-100 text-green-800' },
    completed:        { label: 'Selesai',          color: 'bg-green-100 text-green-800' },
    rejected:         { label: 'Ditolak',          color: 'bg-red-100 text-red-800' },
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="mini-stat border-t-emerald-400">
          <p className="mini-stat-label">Total Terkumpul</p>
          <p className="text-lg font-bold text-emerald-600 font-mono">{formatRupiah(grandTotal)}</p>
        </div>
        <div className="mini-stat border-t-amber-400">
          <p className="mini-stat-label">Menunggu Pembayaran</p>
          <p className="mini-stat-value">{pendingBookings.length}</p>
          <p className="text-[10px] text-muted-foreground/70 font-mono">{formatRupiah(pendingBookings.reduce((s, b) => s + b.total_amount, 0))}</p>
        </div>
        <div className="mini-stat border-t-yellow-400">
          <p className="mini-stat-label">Menunggu Verifikasi</p>
          <p className="mini-stat-value">{pendingProofs.length}</p>
        </div>
        <div className="mini-stat border-t-blue-400">
          <p className="mini-stat-label">Terverifikasi</p>
          <p className="mini-stat-value">{paidBookings.length + (vaPaymentProofs?.filter(p => p.status === 'verified').length ?? 0)}</p>
        </div>
      </div>

      {/* Verify button */}
      <div className="flex justify-end">
        <Link href="/admin/payments/verify">
          <Button variant={pendingProofs.length > 0 ? 'default' : 'outline'} size="sm" className="gap-2 rounded-[10px]">
            <CheckCircle className="h-3.5 w-3.5" />
            Verifikasi Pembayaran
            {pendingProofs.length > 0 && (
              <span className="ml-1 bg-card/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingProofs.length}</span>
            )}
          </Button>
        </Link>
      </div>

      {/* All Transactions */}
      <div className="bg-card rounded-[14px] border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground/70" />
          <p className="text-sm font-semibold text-foreground">Semua Transaksi Pembayaran</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th scope="col">No. Referensi</th>
                <th scope="col">Peminjam</th>
                <th scope="col">Total Tagihan</th>
                <th scope="col">Kode Bayar</th>
                <th scope="col">Status</th>
                <th scope="col">Aksi</th>
                <th scope="col" className="w-10" />
              </tr>
            </thead>
            <tbody>
              {(!bookingsWithPayment || bookingsWithPayment.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center text-muted-foreground/70 py-10 text-sm">Belum ada transaksi</td>
                </tr>
              )}
              {bookingsWithPayment?.map((booking) => {
                const cfg = statusConfig[booking.status] ?? statusConfig.pending
                return (
                  <tr key={booking.id}>
                    <td className="font-mono text-xs text-indigo-700">{booking.reference_no}</td>
                    <td className="text-sm">{booking.users?.name ?? '-'}</td>
                    <td className="text-sm font-semibold text-foreground font-mono">{formatRupiah(booking.total_amount)}</td>
                    <td className="font-mono text-xs text-muted-foreground">{booking.payment_code ?? '-'}</td>
                    <td><span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', cfg.color)}>{cfg.label}</span></td>
                    <td>
                      <div className="flex gap-1.5">
                        <Link href={`/admin/bookings/${booking.id}`} className="icon-btn" aria-label="Lihat detail">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                    <td>
                      <DeleteTransactionButton
                        bookingId={booking.id}
                        referenceNo={booking.reference_no}
                        borrowerName={booking.users?.name ?? '-'}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* VA Proofs */}
      {vaPaymentProofs && vaPaymentProofs.length > 0 && (
        <div className="bg-card rounded-[14px] border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground/70" />
            <p className="text-sm font-semibold text-foreground">Bukti Transfer VA</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
            <thead>
              <tr>
                <th scope="col">No. Referensi</th>
                <th scope="col">Peminjam</th>
                <th scope="col">Bank</th>
                <th scope="col">Nominal</th>
                <th scope="col">Status</th>
                <th scope="col" className="w-10" />
              </tr>
            </thead>
              <tbody>
                {vaPaymentProofs.map((proof) => {
                  const colors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800', verified: 'bg-emerald-100 text-emerald-800', rejected: 'bg-red-100 text-red-800' }
                  const labels: Record<string, string> = { pending: 'Menunggu', verified: 'Terverifikasi', rejected: 'Ditolak' }
                  return (
                    <tr key={proof.id}>
                      <td className="font-mono text-xs text-indigo-700">{proof.bookings?.reference_no}</td>
                      <td className="text-sm">{proof.bookings?.users?.name ?? '-'}</td>
                      <td className="text-sm">{proof.bank_name ?? '-'}</td>
                      <td className="text-sm font-semibold font-mono">{formatRupiah(proof.transfer_amount)}</td>
                      <td><span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', colors[proof.status])}>{labels[proof.status]}</span></td>
                      <td>
                        <DeletePaymentButton
                          id={proof.id}
                          referenceNo={proof.bookings?.reference_no ?? '-'}
                          type="proof"
                          label="Bukti transfer"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Payments */}
      {traditionalPayments && traditionalPayments.length > 0 && (
        <div className="bg-card rounded-[14px] border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-sm font-semibold text-foreground">Pembayaran Manual (Admin Input)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
            <thead>
              <tr>
                <th scope="col">No. Referensi</th>
                <th scope="col">Metode</th>
                <th scope="col">Nominal</th>
                <th scope="col">Status</th>
                <th scope="col" className="w-10" />
              </tr>
            </thead>
              <tbody>
                {traditionalPayments.map((p) => {
                  const labels: Record<string, string> = { online: 'Online', manual_cash: 'Tunai', manual_transfer: 'Transfer' }
                  return (
                    <tr key={p.id}>
                      <td className="font-mono text-xs text-indigo-700">{p.bookings?.reference_no}</td>
                      <td className="text-sm">{labels[p.method] ?? p.method}</td>
                      <td className="text-sm font-semibold font-mono">{formatRupiah(p.amount)}</td>
                      <td>
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground')}>
                          {p.status === 'paid' ? 'Lunas' : p.status}
                        </span>
                      </td>
                      <td>
                        <DeletePaymentButton
                          id={p.id}
                          referenceNo={p.bookings?.reference_no ?? '-'}
                          label="Pembayaran manual"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
