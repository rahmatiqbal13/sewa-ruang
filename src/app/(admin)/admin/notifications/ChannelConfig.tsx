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
        className="pr-10 font-mono text-sm"
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
  whatsapp: { api_url: 'https://api.fonnte.com/send', api_token: '', sender_number: '' },
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
    const supabase = createClient()
    const d = states[channel]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('notification_channel_configs') as any).upsert(
      { channel: d.channel, is_enabled: d.is_enabled, config: d.config, updated_at: new Date().toISOString() },
      { onConflict: 'channel' }
    )
    if (error) toast.error('Gagal menyimpan: ' + error.message)
    else toast.success(`Konfigurasi ${CHANNEL_META[channel as keyof typeof CHANNEL_META].label} disimpan`)
    setLoading(p => ({ ...p, [channel]: false }))
  }

  return (
    <div className="space-y-4">
      {channels.map((ch) => {
        const meta = CHANNEL_META[ch]
        const state = states[ch]
        const cfg = state.config
        const Icon = meta.icon

        return (
          <Card key={ch} className={state.is_enabled ? 'border-blue-200 shadow-sm' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base font-semibold">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{meta.label}</p>
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
              <CardContent className="pt-2 space-y-3 border-t">
                {ch === 'email' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">SMTP Host</Label>
                        <Input placeholder="smtp.gmail.com" value={cfg.smtp_host} onChange={e => set(ch, 'smtp_host', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Port</Label>
                        <Input placeholder="587" value={cfg.smtp_port} onChange={e => set(ch, 'smtp_port', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Username</Label>
                        <Input placeholder="user@gmail.com" value={cfg.smtp_user} onChange={e => set(ch, 'smtp_user', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">App Password</Label>
                        <SecretInput value={cfg.smtp_pass} onChange={v => set(ch, 'smtp_pass', v)} placeholder="••••••••" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Nama Pengirim</Label>
                        <Input placeholder="Sewa Ruang & Alat" value={cfg.from_name} onChange={e => set(ch, 'from_name', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Email Pengirim</Label>
                        <Input type="email" placeholder="noreply@domain.com" value={cfg.from_email} onChange={e => set(ch, 'from_email', e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                {ch === 'whatsapp' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">API URL Provider</Label>
                      <Input placeholder="https://api.fonnte.com/send" value={cfg.api_url} onChange={e => set(ch, 'api_url', e.target.value)} />
                      <p className="text-xs text-muted-foreground">Mendukung Fonnte, WaBlas, atau endpoint custom.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">API Token</Label>
                        <SecretInput value={cfg.api_token} onChange={v => set(ch, 'api_token', v)} placeholder="token..." />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Nomor Pengirim</Label>
                        <Input placeholder="6281234567890" value={cfg.sender_number} onChange={e => set(ch, 'sender_number', e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                {ch === 'telegram' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Bot Token</Label>
                      <SecretInput value={cfg.bot_token} onChange={v => set(ch, 'bot_token', v)} placeholder="123456789:ABCdef..." />
                      <p className="text-xs text-muted-foreground">Buat bot via @BotFather, lalu salin token yang diberikan.</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Admin Chat ID</Label>
                      <Input placeholder="-1001234567890" value={cfg.admin_chat_id} onChange={e => set(ch, 'admin_chat_id', e.target.value)} />
                      <p className="text-xs text-muted-foreground">Chat ID grup atau user untuk menerima notifikasi. Cek via @userinfobot.</p>
                    </div>
                  </>
                )}

                <Button size="sm" onClick={() => save(ch)} disabled={loading[ch]}>
                  {loading[ch] && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Simpan Konfigurasi
                </Button>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
