'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  SplitSquareHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRupiah, formatDateTime } from '@/lib/utils'

interface PaymentProof {
  id: string
  proof_url: string
  bank_name: string
  account_name: string
  transfer_amount: number
  transfer_date: string
  notes: string
  status: 'pending' | 'verified' | 'rejected'
  rejection_reason: string | null
  created_at: string
  already_paid: number
  bookings: {
    id: string
    reference_no: string
    total_amount: number
    payment_code: string
    users: {
      name: string
      email: string
      phone: string
    }
  }
}

export default function PaymentVerificationPage() {
  const [proofs, setProofs] = useState<PaymentProof[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  
  // Dialog states
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchProofs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payments/verify?status=${activeTab}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch proofs')
      }

      setProofs(data.proofs || [])
    } catch (error) {
      console.error('Error fetching proofs:', error)
      toast.error('Gagal memuat data pembayaran')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = setTimeout(() => fetchProofs(), 0)
    return () => clearTimeout(id)
  }, [activeTab])

  const handleVerify = async (status: 'verified' | 'partial' | 'rejected') => {
    if (!selectedProof) return

    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Alasan penolakan wajib diisi')
      return
    }

    try {
      setProcessing(true)

      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedProof.bookings.id,
          status,
          rejectionReason: status === 'rejected' ? rejectionReason : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment')
      }

      toast.success(
        status === 'verified' ? 'Pembayaran lunas diverifikasi!' :
        status === 'partial' ? 'Pembayaran sebagian diterima!' :
        'Pembayaran ditolak'
      )
      setDialogOpen(false)
      setSelectedProof(null)
      setRejectionReason('')
      fetchProofs()

    } catch (error) {
      console.error('Verification error:', error)
      toast.error(error instanceof Error ? error.message : 'Gagal memverifikasi')
    } finally {
      setProcessing(false)
    }
  }

  const openVerifyDialog = (proof: PaymentProof) => {
    setSelectedProof(proof)
    setDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; color: string }> = {
      pending: { label: 'Menunggu Verifikasi', color: 'bg-yellow-100 text-yellow-800' },
      verified: { label: 'Terverifikasi', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-800' },
    }
    
    const variant = variants[status] || { label: status, color: 'bg-muted text-foreground' }
    return <Badge className={variant.color}>{variant.label}</Badge>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Verifikasi Pembayaran</h1>
          <p className="text-muted-foreground">Verifikasi bukti transfer dari peminjam</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchProofs}
          disabled={loading}
          className="rounded-[10px]"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="rounded-[14px]">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Menunggu Verifikasi</p>
            <p className="text-2xl font-bold text-yellow-600">
              {proofs.filter(p => p.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[14px]">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Terverifikasi Hari Ini</p>
            <p className="text-2xl font-bold text-green-600">
              {proofs.filter(p => p.status === 'verified').length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[14px]">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Pending</p>
            <p className="text-2xl font-bold text-blue-600">
              {proofs.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-[10px]">
          <TabsTrigger value="pending" className="rounded-[10px]">Menunggu</TabsTrigger>
          <TabsTrigger value="verified" className="rounded-[10px]">Terverifikasi</TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-[10px]">Ditolak</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : proofs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Tidak ada pembayaran {activeTab === 'pending' ? 'yang menunggu verifikasi' : ''}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {proofs.map((proof) => (
                <Card key={proof.id} className="overflow-hidden rounded-[14px]">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Image Preview */}
                      <div className="w-full md:w-48 h-48 bg-muted flex-shrink-0">
                        <img 
                          src={proof.proof_url} 
                          alt="Bukti Transfer" 
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg text-foreground">
                              {proof.bookings.reference_no}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {proof.bookings.users.name} ({proof.bookings.users.email})
                            </p>
                            {proof.bookings.users.phone && (
                              <p className="text-sm text-muted-foreground">
                                {proof.bookings.users.phone}
                              </p>
                            )}
                          </div>
                          <div>{getStatusBadge(proof.status)}</div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Booking</p>
                            <p className="font-semibold text-foreground">{formatRupiah(proof.bookings.total_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Jumlah Transfer</p>
                            <p className={`font-semibold ${
                              proof.transfer_amount === proof.bookings.total_amount 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {formatRupiah(proof.transfer_amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Bank</p>
                            <p className="font-semibold text-foreground">{proof.bank_name}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tanggal Upload</p>
                            <p className="font-semibold text-foreground">{formatDateTime(proof.created_at)}</p>
                          </div>
                        </div>

                        {(() => {
                          const remaining = proof.bookings.total_amount - proof.already_paid - proof.transfer_amount
                          if (remaining > 0) return (
                            <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-2 text-sm text-amber-800 space-y-0.5">
                              <div><AlertCircle className="h-4 w-4 inline mr-1" />Pembayaran kurang — sisa {formatRupiah(remaining)}</div>
                              {proof.already_paid > 0 && (
                                <div className="text-xs text-amber-700">Sudah terbayar sebelumnya: {formatRupiah(proof.already_paid)}</div>
                              )}
                            </div>
                          )
                          if (remaining < 0) return (
                            <div className="bg-red-50 border border-red-200 rounded-[10px] p-2 text-sm text-red-800">
                              <AlertCircle className="h-4 w-4 inline mr-1" />
                              Transfer melebihi tagihan sebesar {formatRupiah(Math.abs(remaining))}
                            </div>
                          )
                          return null
                        })()}

                        {proof.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => openVerifyDialog(proof)}
                              className="flex-1 rounded-[10px]"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Verifikasi
                            </Button>
                          </div>
                        )}

                        {proof.status === 'rejected' && proof.rejection_reason && (
                          <div className="bg-red-50 border border-red-200 rounded-[10px] p-3 text-sm">
                            <p className="font-medium text-red-900">Alasan Penolakan:</p>
                            <p className="text-red-700">{proof.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Verification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-[14px] p-6">
          <DialogHeader className="pb-0">
            <DialogTitle className="text-foreground text-lg">Verifikasi Pembayaran</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {selectedProof?.bookings.reference_no} · {selectedProof?.bookings.users.name}
            </DialogDescription>
          </DialogHeader>

          {selectedProof && (() => {
            const alreadyPaid = selectedProof.already_paid
            const thisTransfer = selectedProof.transfer_amount
            const total = selectedProof.bookings.total_amount
            const remaining = total - alreadyPaid - thisTransfer
            const isExact = remaining === 0
            const isPartial = remaining > 0

            return (
              <div className="space-y-4">
                {/* Row 1: image + summary */}
                <div className="flex gap-3">
                  {/* Proof image */}
                  <div className="w-40 h-40 flex-shrink-0 border border-border rounded-[12px] overflow-hidden bg-muted">
                    <img
                      src={selectedProof.proof_url}
                      alt="Bukti Transfer"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Payment rows */}
                  <div className="flex-1 divide-y divide-border border border-border rounded-[12px] overflow-hidden text-sm">
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
                      <span className="text-muted-foreground whitespace-nowrap">Total Tagihan</span>
                      <span className="font-bold text-foreground ml-3">{formatRupiah(total)}</span>
                    </div>
                    {alreadyPaid > 0 && (
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
                        <span className="text-muted-foreground whitespace-nowrap">Sudah Dibayar</span>
                        <span className="font-bold text-blue-600 ml-3">{formatRupiah(alreadyPaid)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
                      <span className="text-muted-foreground whitespace-nowrap">Transfer Ini</span>
                      <span className={`font-bold ml-3 ${isExact ? 'text-green-600' : isPartial ? 'text-amber-600' : 'text-red-600'}`}>
                        {formatRupiah(thisTransfer)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
                      <span className="text-muted-foreground whitespace-nowrap">{remaining >= 0 ? 'Sisa Tagihan' : 'Kelebihan'}</span>
                      <span className={`font-bold ml-3 ${remaining === 0 ? 'text-green-600' : remaining > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                        {formatRupiah(Math.abs(remaining))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warning banner */}
                {isPartial && (
                  <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-[10px] text-xs text-amber-800">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Pembayaran belum lunas. Gunakan <strong>Terima Sebagian</strong> agar peminjam bisa upload sisa bukti.</span>
                  </div>
                )}
                {!isPartial && !isExact && (
                  <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-[10px] text-xs text-red-800">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Transfer melebihi tagihan sebesar {formatRupiah(Math.abs(remaining))}.</span>
                  </div>
                )}

                {/* Transfer details */}
                <div className="divide-y divide-border border border-border rounded-[10px] overflow-hidden text-sm">
                  {[
                    { label: 'Bank', value: selectedProof.bank_name || '-' },
                    { label: 'Atas Nama', value: selectedProof.account_name || '-' },
                    { label: 'Tanggal Transfer', value: selectedProof.transfer_date || '-' },
                    { label: 'Kode Pembayaran', value: selectedProof.bookings.payment_code || '-', mono: true },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                      <span className="text-muted-foreground shrink-0">{label}</span>
                      <span className={`font-medium text-foreground text-right whitespace-nowrap ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
                    </div>
                  ))}
                </div>

                {selectedProof.notes && (
                  <div className="flex gap-2 bg-yellow-50 border border-yellow-200 p-2.5 rounded-[10px] text-xs text-yellow-800">
                    <span className="font-semibold shrink-0">Catatan:</span>
                    <span>{selectedProof.notes}</span>
                  </div>
                )}

                {/* Rejection reason */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Alasan Penolakan <span className="text-muted-foreground font-normal text-xs">(wajib jika menolak)</span>
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Contoh: Nominal tidak sesuai, bukti tidak jelas, dll"
                    rows={2}
                    className="rounded-[10px] border-border resize-none text-sm"
                  />
                </div>
              </div>
            )
          })()}

          {/* Footer */}
          <DialogFooter className="flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={processing}
              className="rounded-[10px]"
            >
              Batal
            </Button>
            <div className="flex-1" />
            <Button
              variant="destructive"
              onClick={() => handleVerify('rejected')}
              disabled={processing || !rejectionReason.trim()}
              className="rounded-[10px]"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
              Tolak
            </Button>
            {selectedProof && (selectedProof.bookings.total_amount - selectedProof.already_paid - selectedProof.transfer_amount) > 0 && (
              <Button
                onClick={() => handleVerify('partial')}
                disabled={processing}
                className="bg-amber-500 hover:bg-amber-600 rounded-[10px]"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <SplitSquareHorizontal className="h-4 w-4 mr-1" />}
                Terima Sebagian
              </Button>
            )}
            <Button
              onClick={() => handleVerify('verified')}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 rounded-[10px]"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Lunas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
