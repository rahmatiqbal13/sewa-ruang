'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

import {
  Mail, Phone, Building2, Hash, MessageCircle,
  Calendar, ShieldCheck, Eye, EyeOff, Info, Loader2, ExternalLink, RotateCcw, Check,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { formatDateTime, formatRupiah } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UserData {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  institution: string | null
  class_division: string | null
  identity_number: string | null
  telegram_username: string | null
  created_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BookingRow = any

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'bg-purple-100 text-purple-800 border border-purple-200' },
  admin:       { label: 'Admin',       className: 'bg-blue-100 text-blue-800 border border-blue-200' },
  staff:       { label: 'Staff',       className: 'bg-muted text-muted-foreground border border-border' },
  borrower:    { label: 'Peminjam',    className: 'bg-green-100 text-green-800 border border-green-200' },
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-blue-100 text-blue-700',
  paid:      'bg-emerald-100 text-emerald-700',
  completed: 'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-muted text-muted-foreground',
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Pending',
  approved:  'Disetujui',
  paid:      'Lunas',
  completed: 'Selesai',
  rejected:  'Ditolak',
  cancelled: 'Dibatalkan',
}

export function UserDetailSheet({ user }: { user: UserData }) {
  const [open, setOpen] = useState(false)
  const [bookings, setBookings] = useState<BookingRow[] | null>(null)
  const [loadingBookings, setLoadingBookings] = useState(false)

  // inline reset password
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleOpen() {
    setOpen(true)
    if (bookings === null) {
      setLoadingBookings(true)
      try {
        const res = await fetch(`/api/super-admin/users/${user.id}/bookings`)
        if (res.ok) {
          const data = await res.json()
          setBookings(data.bookings ?? [])
        } else {
          setBookings([])
        }
      } catch {
        setBookings([])
      } finally {
        setLoadingBookings(false)
      }
    }
  }

  function handleClose(val: boolean) {
    setOpen(val)
    if (!val) {
      setShowNewPassword(false)
      setNewPassword('')
    }
  }

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch(`/api/super-admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const json = await res.json()
      if (res.ok) {
        toast.success(`Password ${user.name} berhasil diperbarui`)
        setNewPassword('')
        setShowNewPassword(false)
      } else {
        toast.error(json.error || 'Gagal mengubah password')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSavingPassword(false)
    }
  }

  const badge = ROLE_BADGE[user.role]
  const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleOpen}
        title="Lihat detail pengguna"
        className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-indigo-600 hover:bg-indigo-50"
      >
        <Info className="h-3.5 w-3.5" />
      </Button>

      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="w-[400px] sm:max-w-[400px] overflow-y-auto p-0">
          {/* Header */}
          <div className="bg-indigo-600 px-6 py-5">
            <SheetHeader>
              <SheetTitle className="text-white">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-card/20 flex items-center justify-center text-white font-bold text-base shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-base truncate">{user.name}</p>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-0.5',
                      badge?.className ?? 'bg-white/20 text-white'
                    )}>
                      {badge?.label ?? user.role}
                    </span>
                  </div>
                </div>
              </SheetTitle>
            </SheetHeader>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Info section */}
            <div className="space-y-3">
              <SectionTitle>Informasi Akun</SectionTitle>
              <InfoRow icon={Mail}         label="Email"        value={user.email}            mono />
              <InfoRow icon={Phone}        label="WhatsApp"     value={user.phone} />
              <InfoRow icon={MessageCircle} label="Telegram"   value={user.telegram_username} />
              <InfoRow icon={Building2}    label="Instansi"     value={user.institution} />
              <InfoRow icon={Hash}         label="Kelas / Divisi" value={user.class_division} />
              <InfoRow icon={Hash}         label="No. Identitas"  value={user.identity_number} mono />
              <InfoRow icon={Calendar}     label="Terdaftar"    value={formatDateTime(user.created_at)} />
            </div>

            {/* Password section */}
            <div className="space-y-2">
              <SectionTitle icon={<ShieldCheck className="h-3.5 w-3.5 text-purple-500" />}>
                Password — Super Admin Only
              </SectionTitle>

              {/* Reset password form */}
              <div className="border border-dashed border-border rounded-[14px] p-3 space-y-2">
                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                  Set Password Baru
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      className="h-8 text-sm pr-8"
                      disabled={savingPassword}
                      onKeyDown={e => { if (e.key === 'Enter') handleResetPassword() }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(v => !v)}
                      aria-label={showNewPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={handleResetPassword}
                    disabled={savingPassword || !newPassword}
                    className="h-8 px-3 rounded-[10px] bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {savingPassword
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Check className="h-3.5 w-3.5" />}
                    Simpan
                  </button>
                </div>
              </div>
            </div>

            {/* Booking history */}
            <div className="space-y-2">
              <SectionTitle>Riwayat Peminjaman</SectionTitle>

              {loadingBookings && (
                <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Memuat...</span>
                </div>
              )}

              {!loadingBookings && bookings?.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground bg-muted rounded-[14px] border border-dashed">
                  Belum ada riwayat peminjaman
                </div>
              )}

              {!loadingBookings && bookings && bookings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {bookings.length} peminjaman total
                  </p>
                  {bookings.slice(0, 6).map((b: BookingRow) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const firstItem = (b.booking_items as any[])?.[0]
                    const assetName = firstItem
                      ? (firstItem.item_type === 'room' ? firstItem.rooms?.name : firstItem.equipment?.name)
                      : null
                    const extraItems = (b.booking_items?.length ?? 0) - 1

                    return (
                      <a
                        key={b.id}
                        href={`/admin/bookings/${b.reference_no}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start justify-between gap-2 rounded-[14px] border p-3 hover:bg-muted transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-mono text-xs text-muted-foreground">{b.reference_no}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground/30 group-hover:text-indigo-400 transition-colors" />
                          </div>
                          {assetName && (
                            <p className="text-xs text-muted-foreground truncate">
                              {assetName}{extraItems > 0 && ` +${extraItems} lainnya`}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(b.start_datetime)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                            STATUS_COLORS[b.status] ?? 'bg-muted text-muted-foreground'
                          )}>
                            {STATUS_LABELS[b.status] ?? b.status}
                          </span>
                          {b.total_amount > 0 && (
                            <span className="text-xs font-medium text-foreground/80">
                              {formatRupiah(b.total_amount)}
                            </span>
                          )}
                        </div>
                      </a>
                    )
                  })}

                  {bookings.length > 6 && (
                    <p className="text-xs text-center text-muted-foreground pt-1">
                      +{bookings.length - 6} peminjaman lainnya
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
      {icon}
      {children}
    </p>
  )
}

function InfoRow({
  icon: Icon, label, value, mono,
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={cn(
          'text-sm',
          mono && 'font-mono',
          !value && 'text-muted-foreground italic text-xs'
        )}>
          {value ?? '-'}
        </p>
      </div>
    </div>
  )
}
