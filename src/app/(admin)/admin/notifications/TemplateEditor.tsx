'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Mail, MessageSquare, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type Channel = 'email' | 'whatsapp' | 'telegram'

interface Template {
  id?: string
  event_type: string
  channel: Channel
  subject?: string | null
  body: string
  is_active: boolean
}

const EVENT_TYPES = [
  { key: 'booking_submitted', label: 'Pengajuan Baru', desc: 'Saat peminjam mengajukan peminjaman baru' },
  { key: 'booking_approved', label: 'Pengajuan Disetujui', desc: 'Saat admin menyetujui pengajuan' },
  { key: 'booking_rejected', label: 'Pengajuan Ditolak', desc: 'Saat admin menolak pengajuan' },
  { key: 'booking_cancelled', label: 'Pengajuan Dibatalkan', desc: 'Saat peminjam atau admin membatalkan' },
  { key: 'payment_received', label: 'Pembayaran Diterima', desc: 'Saat pembayaran dikonfirmasi oleh admin' },
  { key: 'booking_reminder', label: 'Pengingat Jadwal', desc: 'Pengingat H-1 sebelum jadwal peminjaman' },
]

const CHANNELS: { key: Channel; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'email', label: 'Email', icon: Mail, color: 'text-blue-600' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600' },
  { key: 'telegram', label: 'Telegram', icon: Send, color: 'text-sky-500' },
]

const VARIABLES = [
  { key: '{{nama}}', desc: 'Nama peminjam' },
  { key: '{{no_booking}}', desc: 'No. referensi booking' },
  { key: '{{ruangan}}', desc: 'Semua ruangan & alat (tergabung)' },
  { key: '{{daftar_ruangan}}', desc: 'Daftar ruangan saja (dengan nomor)' },
  { key: '{{daftar_alat}}', desc: 'Daftar alat saja (dengan nomor)' },
  { key: '{{jumlah_ruangan}}', desc: 'Jumlah ruangan (angka)' },
  { key: '{{jumlah_alat}}', desc: 'Jumlah alat (angka)' },
  { key: '{{tanggal_mulai}}', desc: 'Tanggal & jam mulai' },
  { key: '{{tanggal_selesai}}', desc: 'Tanggal & jam selesai' },
  { key: '{{status}}', desc: 'Status booking' },
  { key: '{{catatan_admin}}', desc: 'Catatan dari admin' },
]

const DEFAULT_BODIES: Record<string, Record<Channel, { subject?: string; body: string }>> = {
  booking_submitted: {
    email: {
      subject: '{{nama}} - {{no_booking}} | Pengajuan Diterima',
      body: 'Halo {{nama}},\n\nPengajuan peminjaman Anda telah kami terima dengan detail:\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n⏰ Status: Menunggu Persetujuan\n\nKami akan segera memproses pengajuan Anda.\n\nTerima kasih,\nSport Center UNESA',
    },
    whatsapp: { body: 'Halo {{nama}}! Pengajuan peminjaman *{{ruangan}}* (Ref: {{no_booking}}) untuk {{tanggal_mulai}} s/d {{tanggal_selesai}} telah kami terima dan sedang diproses. Kami akan segera memberikan konfirmasi. Terima kasih!' },
    telegram: { body: '📋 Halo {{nama}}!\n\nPengajuan peminjaman *{{ruangan}}* (Ref: `{{no_booking}}`) telah diterima dan sedang diproses.\n\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nKami akan segera memberikan konfirmasi.' },
  },
  booking_approved: {
    email: {
      subject: '{{nama}} - {{no_booking}} | ✅ Disetujui',
      body: 'Halo {{nama}},\n\nSelamat! Pengajuan peminjaman Anda telah DISETUJUI.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n✅ Status: Disetujui\n\nSilakan lakukan pembayaran untuk mengkonfirmasi peminjaman.\n\nTerima kasih,\nSport Center UNESA',
    },
    whatsapp: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah DISETUJUI.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSilakan lakukan pembayaran untuk konfirmasi.' },
    telegram: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah *DISETUJUI*.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSilakan lakukan pembayaran untuk konfirmasi.' },
  },
  booking_rejected: {
    email: {
      subject: '{{nama}} - {{no_booking}} | Ditolak',
      body: 'Halo {{nama}},\n\nMohon maaf, pengajuan peminjaman Anda tidak dapat disetujui.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n\n{{catatan_admin}}\n\nSilakan hubungi kami untuk informasi lebih lanjut.\n\nTerima kasih,\nSport Center UNESA',
    },
    whatsapp: { body: 'Halo {{nama}}, mohon maaf pengajuan *{{no_booking}}* tidak dapat disetujui.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n\nSilakan hubungi admin untuk informasi lebih lanjut.' },
    telegram: { body: '❌ Halo {{nama}},\n\nPengajuan *{{no_booking}}* tidak dapat disetujui.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}' },
  },
  booking_cancelled: {
    email: {
      subject: '{{nama}} - {{no_booking}} | Dibatalkan',
      body: 'Halo {{nama}},\n\nPeminjaman Anda telah dibatalkan.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n\nJika Anda memiliki pertanyaan, silakan hubungi kami.\n\nTerima kasih,\nSport Center UNESA',
    },
    whatsapp: { body: 'Halo {{nama}}, peminjaman *{{no_booking}}* telah dibatalkan.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}' },
    telegram: { body: '🚫 Peminjaman *{{no_booking}}* telah dibatalkan.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}' },
  },
  payment_received: {
    email: {
      subject: '{{nama}} - {{no_booking}} | 💳 Lunas',
      body: 'Halo {{nama}},\n\nPembayaran untuk peminjaman Anda telah kami terima.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n💳 Status: LUNAS & DIKONFIRMASI\n\nPeminjaman Anda telah dikonfirmasi. Harap datang tepat waktu.\n\nTerima kasih,\nSport Center UNESA',
    },
    whatsapp: { body: '💳 Halo {{nama}}! Pembayaran untuk *{{no_booking}}* telah diterima.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nPeminjaman dikonfirmasi. Harap datang tepat waktu!' },
    telegram: { body: '💳 Halo {{nama}}!\n\nPembayaran *{{no_booking}}* telah diterima.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\n✅ Peminjaman dikonfirmasi.' },
  },
  booking_reminder: {
    email: {
      subject: '{{nama}} - {{no_booking}} | ⏰ Pengingat',
      body: 'Halo {{nama}},\n\nIni adalah pengingat bahwa peminjaman Anda akan segera dimulai:\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Mulai: {{tanggal_mulai}}\n📅 Selesai: {{tanggal_selesai}}\n\nHarap datang tepat waktu sesuai jadwal.\n\nTerima kasih,\nSport Center UNESA',
    },
    whatsapp: { body: '⏰ *Pengingat Peminjaman*\n\nHalo {{nama}}! Peminjaman *{{no_booking}}* akan dimulai:\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}}\n\nHarap datang tepat waktu!' },
    telegram: { body: '⏰ *Pengingat Peminjaman*\n\nHalo {{nama}}!\n\nPeminjaman *{{no_booking}}* dimulai {{tanggal_mulai}}.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n\nHarap datang tepat waktu!' },
  },
}

export function TemplateEditor({ templates }: { templates: Template[] }) {
  const [selectedEvent, setSelectedEvent] = useState(EVENT_TYPES[0].key)
  const [activeChannel, setActiveChannel] = useState<Channel>('email')
  const [loading, setLoading] = useState(false)

  const [data, setData] = useState<Record<string, Record<Channel, { subject: string; body: string }>>>(() => {
    const map: Record<string, Record<Channel, { subject: string; body: string }>> = {}
    EVENT_TYPES.forEach(e => {
      map[e.key] = {} as Record<Channel, { subject: string; body: string }>
      CHANNELS.forEach(ch => {
        const defaults = DEFAULT_BODIES[e.key]?.[ch.key]
        map[e.key][ch.key] = { subject: defaults?.subject ?? '', body: defaults?.body ?? '' }
      })
    })
    templates.forEach(t => {
      if (!map[t.event_type]) return
      map[t.event_type][t.channel] = { subject: t.subject ?? '', body: t.body }
    })
    return map
  })

  function insertVariable(v: string) {
    const key = `${selectedEvent}-${activeChannel}`
    const ta = document.getElementById(key) as HTMLTextAreaElement | null
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const current = data[selectedEvent][activeChannel].body
    const next = current.slice(0, start) + v + current.slice(end)
    setData(p => ({ ...p, [selectedEvent]: { ...p[selectedEvent], [activeChannel]: { ...p[selectedEvent][activeChannel], body: next } } }))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + v.length, start + v.length) }, 10)
  }

  async function save() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const current = data[selectedEvent][activeChannel]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('notification_templates') as any).upsert(
      {
        event_type: selectedEvent,
        channel: activeChannel,
        subject: activeChannel === 'email' ? current.subject : null,
        body: current.body,
        is_active: true,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      },
      { onConflict: 'event_type,channel' }
    )
    if (error) toast.error('Gagal menyimpan: ' + error.message)
    else toast.success('Template disimpan')
    setLoading(false)
  }

  const eventMeta = EVENT_TYPES.find(e => e.key === selectedEvent)!
  const current = data[selectedEvent]?.[activeChannel] ?? { subject: '', body: '' }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
      {/* Event list */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 mb-2">Jenis Event</p>
        {EVENT_TYPES.map(e => (
          <button
            key={e.key}
            onClick={() => setSelectedEvent(e.key)}
            className={cn(
              'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors',
              selectedEvent === e.key
                ? 'bg-blue-950 text-white font-medium'
                : 'text-zinc-600 hover:bg-zinc-100'
            )}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Template editor */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">{eventMeta.label}</h3>
          <p className="text-sm text-muted-foreground">{eventMeta.desc}</p>
        </div>

        {/* Channel tabs */}
        <div className="flex gap-1 border-b">
          {CHANNELS.map(ch => {
            const Icon = ch.icon
            return (
              <button
                key={ch.key}
                onClick={() => setActiveChannel(ch.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeChannel === ch.key
                    ? 'border-blue-950 text-blue-950'
                    : 'border-transparent text-muted-foreground hover:text-zinc-700'
                )}
              >
                <Icon className={cn('h-4 w-4', activeChannel === ch.key ? ch.color : '')} />
                {ch.label}
              </button>
            )
          })}
        </div>

        {/* Subject (email only) */}
        {activeChannel === 'email' && (
          <div className="space-y-1.5">
            <Label className="text-sm">Subject Email</Label>
            <Input
              placeholder="Subject email..."
              value={current.subject}
              onChange={e => setData(p => ({ ...p, [selectedEvent]: { ...p[selectedEvent], [activeChannel]: { ...current, subject: e.target.value } } }))}
            />
          </div>
        )}

        {/* Body */}
        <div className="space-y-1.5">
          <Label className="text-sm">Isi Pesan</Label>
          <Textarea
            id={`${selectedEvent}-${activeChannel}`}
            rows={10}
            placeholder="Tulis pesan notifikasi di sini..."
            value={current.body}
            onChange={e => setData(p => ({ ...p, [selectedEvent]: { ...p[selectedEvent], [activeChannel]: { ...current, body: e.target.value } } }))}
            className="font-mono text-sm resize-none"
          />
        </div>

        {/* Variable chips */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Klik variabel untuk menyisipkan ke posisi kursor:</p>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map(v => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                title={v.desc}
                className="text-xs font-mono bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded transition-colors"
              >
                {v.key}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1">
            {VARIABLES.map(v => (
              <p key={v.key} className="text-xs text-muted-foreground"><span className="font-mono text-zinc-600">{v.key}</span> = {v.desc}</p>
            ))}
          </div>
        </div>

        <Button onClick={save} disabled={loading} className="bg-blue-950 hover:bg-blue-900">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Template
        </Button>
      </div>
    </div>
  )
}
