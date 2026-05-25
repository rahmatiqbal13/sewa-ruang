'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Image as ImageIcon,
  RefreshCw,
  AlertCircle
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

  useEffect(() => {
    fetchProofs()
  }, [activeTab])

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

  const handleVerify = async (status: 'verified' | 'rejected') => {
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

      toast.success(status === 'verified' ? 'Pembayaran diverifikasi!' : 'Pembayaran ditolak')
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

                        {proof.transfer_amount !== proof.bookings.total_amount && (
                          <div className="bg-red-50 border border-red-200 rounded-[10px] p-2 text-sm text-red-800">
                            <AlertCircle className="h-4 w-4 inline mr-1" />
                            Nominal transfer tidak sesuai!
                          </div>
                        )}

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
        <DialogContent className="max-w-2xl rounded-[14px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Verifikasi Pembayaran</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Periksa bukti transfer sebelum melakukan verifikasi
            </DialogDescription>
          </DialogHeader>

          {selectedProof && (
            <div className="space-y-4">
              {/* Large Image Preview */}
              <div className="border border-border rounded-[10px] overflow-hidden">
                <img 
                  src={selectedProof.proof_url} 
                  alt="Bukti Transfer" 
                  className="w-full max-h-96 object-contain bg-muted"
                />
              </div>

              {/* Comparison */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-[10px]">
                <div>
                  <p className="text-sm text-muted-foreground">Total yang Harus Dibayar</p>
                  <p className="text-xl font-bold text-foreground">{formatRupiah(selectedProof.bookings.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jumlah Transfer</p>
                  <p className={`text-xl font-bold ${
                    selectedProof.transfer_amount === selectedProof.bookings.total_amount
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {formatRupiah(selectedProof.transfer_amount)}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Kode Pembayaran:</span>
                  <span className="ml-2 font-mono text-foreground">{selectedProof.bookings.payment_code}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Bank:</span>
                  <span className="ml-2 text-foreground">{selectedProof.bank_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Atas Nama:</span>
                  <span className="ml-2 text-foreground">{selectedProof.account_name || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tanggal Transfer:</span>
                  <span className="ml-2 text-foreground">{selectedProof.transfer_date || '-'}</span>
                </div>
              </div>

              {selectedProof.notes && (
                <div className="bg-yellow-50 p-3 rounded-[10px] text-sm">
                  <span className="font-medium">Catatan:</span> {selectedProof.notes}
                </div>
              )}

              {/* Rejection Reason */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Alasan Penolakan (jika menolak)</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Nominal tidak sesuai, bukti tidak jelas, dll"
                  className="rounded-[10px] border-border"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              disabled={processing}
              className="rounded-[10px]"
            >
              Batal
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleVerify('rejected')}
              disabled={processing || !rejectionReason.trim()}
              className="rounded-[10px]"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Tolak
            </Button>
            <Button 
              onClick={() => handleVerify('verified')}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 rounded-[10px]"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Verifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
