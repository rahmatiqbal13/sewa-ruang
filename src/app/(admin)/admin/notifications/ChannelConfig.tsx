'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, MessageSquare, Send, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { saveChannelConfig } from './actions'

interface ChannelData {
  id?: string
  channel: 'email' | 'whatsapp' | 'telegram'
  is_enabled: boolean
  config: Record<string, string>
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 font-mono text-sm rounded-[10px] border-border"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

const DEFAULTS: Record<string, Record<string, string>> = {
  email: { smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', from_name: 'Sewa Ruang & Alat', from_email: '' },
  whatsapp: { use_wame: 'true', admin_number: '', default_message: 'Halo, saya ingin bertanya tentang peminjaman ruangan/alat di Tim Admin USC.' },
  telegram: { bot_token: '', admin_chat_id: '' },
}

const CHANNEL_META = {
  email: { label: 'Email (SMTP)', icon: Mail, color: 'text-blue-600', desc: 'Kirim notifikasi via email menggunakan SMTP server.' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600', desc: 'Kirim notifikasi via WhatsApp menggunakan API gateway (Fonnte, WaBlas, dll.).' },
  telegram: { label: 'Telegram', icon: Send, color: 'text-sky-500', desc: 'Kirim notifikasi ke grup atau user via Telegram Bot.' },
}

export function ChannelConfig({ configs }: { configs: ChannelData[] }) {
  const channels = ['email', 'whatsapp', 'telegram'] as const

  const [states, setStates] = useState<Record<string, ChannelData>>(() => {
    const map: Record<string, ChannelData> = {
      email: { channel: 'email', is_enabled: false, config: { ...DEFAULTS.email } },
      whatsapp: { channel: 'whatsapp', is_enabled: false, config: { ...DEFAULTS.whatsapp } },
      telegram: { channel: 'telegram', is_enabled: false, config: { ...DEFAULTS.telegram } },
    }
    configs.forEach(c => {
      map[c.channel] = {
        ...c,
        config: { ...DEFAULTS[c.channel], ...(c.config as Record<string, string>) },
      }
    })
    return map
  })

  const [loading, setLoading] = useState<Record<string, boolean>>({})

  function set(channel: string, field: string, value: string) {
    setStates(p => ({ ...p, [channel]: { ...p[channel], config: { ...p[channel].config, [field]: value } } }))
  }

  function toggle(channel: string, enabled: boolean) {
    setStates(p => ({ ...p, [channel]: { ...p[channel], is_enabled: enabled } }))
  }

  async function save(channel: string) {
    setLoading(p => ({ ...p, [channel]: true }))
    const d = states[channel]
    
    const result = await saveChannelConfig({
      channel: d.channel,
      is_enabled: d.is_enabled,
      config: d.config
    })
    
    if (result.error) {
      toast.error('Gagal menyimpan: ' + result.error)
    } else {
      toast.success(`Konfigurasi ${CHANNEL_META[channel as keyof typeof CHANNEL_META].label} disimpan`)
    }
    
    setLoading(p => ({ ...p, [channel]: false }))
  }

  async function testChannel(channel: string) {
    const cfg = states[channel].config
    
    if (channel === 'email') {
      if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) {
        toast.error('Lengkapi konfigurasi email terlebih dahulu')
        return
      }

      setLoading(p => ({ ...p, [`${channel}_test`]: true }))
      
      try {
        const response = await fetch('/api/notifications/test-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              host: cfg.smtp_host,
              port: parseInt(cfg.smtp_port) || 587,
              user: cfg.smtp_user,
              pass: cfg.smtp_pass,
              from: cfg.from_email || cfg.smtp_user,
              fromName: cfg.from_name || 'Tim Admin USC'
            },
            testTo: cfg.smtp_user
          })
        })

        const result = await response.json()
        
        if (response.ok) {
          toast.success('Email test berhasil dikirim! Cek inbox Anda.')
        } else {
          toast.error('Gagal kirim email: ' + (result.error || 'Unknown error'))
        }
      } catch (err: any) {
        toast.error('Error: ' + err.message)
      }
      
      setLoading(p => ({ ...p, [`${channel}_test`]: false }))
    }
    
    if (channel === 'whatsapp') {
      if (!cfg.admin_number) {
        toast.error('Masukkan nomor WhatsApp admin terlebih dahulu')
        return
      }

      // Buka wa.me link di tab baru
      const waLink = `https://wa.me/${cfg.admin_number}?text=${encodeURIComponent(cfg.default_message || '')}`
      window.open(waLink, '_blank')
      toast.success('WhatsApp Web/App dibuka! Pesan sudah terisi otomatis.')
    }

    if (channel === 'telegram') {
      if (!cfg.bot_token || !cfg.admin_chat_id) {
        toast.error('Lengkapi Bot Token dan Admin Chat ID terlebih dahulu')
        return
      }

      setLoading(p => ({ ...p, [`${channel}_test`]: true }))

      try {
        const response = await fetch('/api/notifications/test-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bot_token: cfg.bot_token, chat_id: cfg.admin_chat_id }),
        })

        const result = await response.json()

        if (response.ok) {
          toast.success('Pesan test Telegram berhasil dikirim! Cek grup/chat Anda.')
        } else {
          toast.error('Gagal kirim Telegram: ' + (result.error || 'Unknown error'))
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        toast.error('Error: ' + msg)
      }

      setLoading(p => ({ ...p, [`${channel}_test`]: false }))
    }
  }

  return (
    <div className="space-y-4">
      {channels.map((ch) => {
        const meta = CHANNEL_META[ch]
        const state = states[ch]
        const cfg = state.config
        const Icon = meta.icon

        return (
          <Card key={ch} className={`rounded-[14px] ${state.is_enabled ? 'border-blue-200 shadow-sm' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base font-semibold text-foreground">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-[10px] bg-muted flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                    <p className="text-xs font-normal text-muted-foreground">{meta.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {state.is_enabled && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  <Switch checked={state.is_enabled} onCheckedChange={(v) => toggle(ch, v)} />
                </div>
              </CardTitle>
            </CardHeader>

            {state.is_enabled && (
              <CardContent className="pt-2 space-y-3 border-t border-border/60">
                {ch === 'email' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">SMTP Host</Label>
                        <Input placeholder="smtp.gmail.com" value={cfg.smtp_host} onChange={e => set(ch, 'smtp_host', e.target.value)} className="rounded-[10px] border-border" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Port</Label>
                        <Input placeholder="587" value={cfg.smtp_port} onChange={e => set(ch, 'smtp_port', e.target.value)} className="rounded-[10px] border-border" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Username</Label>
                        <Input placeholder="user@gmail.com" value={cfg.smtp_user} onChange={e => set(ch, 'smtp_user', e.target.value)} className="rounded-[10px] border-border" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">App Password</Label>
                        <SecretInput value={cfg.smtp_pass} onChange={v => set(ch, 'smtp_pass', v)} placeholder="••••••••" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Nama Pengirim</Label>
                        <Input placeholder="Sewa Ruang & Alat" value={cfg.from_name} onChange={e => set(ch, 'from_name', e.target.value)} className="rounded-[10px] border-border" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Email Pengirim</Label>
                        <Input type="email" placeholder="noreply@domain.com" value={cfg.from_email} onChange={e => set(ch, 'from_email', e.target.value)} className="rounded-[10px] border-border" />
                      </div>
                    </div>
                  </>
                )}

                {ch === 'whatsapp' && (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-[10px] p-3 mb-3">
                      <p className="text-xs text-green-700">
                        <strong>Mode Gratis:</strong> Menggunakan wa.me link. Pengguna akan diarahkan ke WhatsApp Web/App dengan pesan otomatis.
                        Tidak perlu API key atau biaya.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nomor Admin WhatsApp</Label>
                      <Input placeholder="6281234567890" value={cfg.admin_number} onChange={e => set(ch, 'admin_number', e.target.value)} className="rounded-[10px] border-border" />
                      <p className="text-xs text-muted-foreground">Format: 62xxxxxxxxxx (tanpa tanda + atau spasi)</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pesan Default</Label>
                      <Input placeholder="Halo, saya ingin bertanya..." value={cfg.default_message} onChange={e => set(ch, 'default_message', e.target.value)} className="rounded-[10px] border-border" />
                      <p className="text-xs text-muted-foreground">Pesan yang akan muncul otomatis saat membuka WhatsApp.</p>
                    </div>
                    {cfg.admin_number && (
                      <div className="pt-2">
                        <a 
                          href={`https://wa.me/${cfg.admin_number}?text=${encodeURIComponent(cfg.default_message || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:text-green-700 underline"
                        >
                          Test link: Klik untuk preview →
                        </a>
                      </div>
                    )}
                  </>
                )}

                {ch === 'telegram' && (
                  <>
                    <div className="bg-sky-50 border border-sky-200 rounded-[10px] p-3 mb-1">
                      <p className="text-xs text-sky-700">
                        <strong>Cara setup:</strong> Buat bot via <strong>@BotFather</strong>, salin token. Tambahkan bot ke grup/channel lalu dapatkan Chat ID via <strong>@userinfobot</strong>.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Bot Token</Label>
                      <SecretInput value={cfg.bot_token} onChange={v => set(ch, 'bot_token', v)} placeholder="123456789:ABCdef..." />
                      <p className="text-xs text-muted-foreground">Token yang diberikan @BotFather saat membuat bot.</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Admin Chat ID</Label>
                      <Input placeholder="-1001234567890" value={cfg.admin_chat_id} onChange={e => set(ch, 'admin_chat_id', e.target.value)} className="rounded-[10px] border-border" />
                      <p className="text-xs text-muted-foreground">Chat ID grup atau user untuk menerima notifikasi. Cek via @userinfobot.</p>
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save(ch)} disabled={loading[ch]} className="rounded-[10px]">
                    {loading[ch] && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Simpan Konfigurasi
                  </Button>
                  {ch === 'email' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => testChannel(ch)}
                      disabled={loading[`${ch}_test`]}
                      className="rounded-[10px]"
                    >
                      {loading[`${ch}_test`] && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      Test Kirim Email
                    </Button>
                  )}
                  {ch === 'whatsapp' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testChannel(ch)}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 rounded-[10px]"
                    >
                      <MessageSquare className="mr-2 h-3.5 w-3.5" />
                      Test Buka WhatsApp
                    </Button>
                  )}
                  {ch === 'telegram' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testChannel(ch)}
                      disabled={loading[`${ch}_test`]}
                      className="bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 rounded-[10px]"
                    >
                      {loading[`${ch}_test`] && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      <Send className="mr-2 h-3.5 w-3.5" />
                      Test Kirim Telegram
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
