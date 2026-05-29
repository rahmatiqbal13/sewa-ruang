import { createAdminDbClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { BellRing, Mail, Settings2, FileText } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { ChannelConfig } from './ChannelConfig'
import { TemplateEditor } from './TemplateEditor'

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'channels' } = await searchParams
  const sb = createAdminDbClient()

  const [{ data: channelConfigs }, { data: templates }, { data: notifications }] = await Promise.all([
    sb.from('notification_channel_configs').select('*'),
    sb.from('notification_templates').select('*'),
    sb.from('notifications').select('*, users!user_id(name, email)').order('created_at', { ascending: false }).limit(50),
  ]) as any

  const tabs = [
    { key: 'channels', label: 'Saluran', icon: Settings2 },
    { key: 'templates', label: 'Template Pesan', icon: FileText },
    { key: 'history', label: 'Riwayat', icon: BellRing },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifikasi</h1>
        <p className="text-muted-foreground text-sm">Konfigurasi channel, template pesan otomatis, dan riwayat notifikasi</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <a
              key={t.key}
              href={`?tab=${t.key}`}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-blue-950 text-blue-950'
                  : 'border-transparent text-muted-foreground hover:text-foreground/80'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </a>
          )
        })}
      </div>

      {/* Tab: Saluran */}
      {tab === 'channels' && (
        <div className="max-w-2xl space-y-2">
          <p className="text-sm text-muted-foreground mb-4">
            Aktifkan dan konfigurasi channel notifikasi. Notifikasi akan dikirim otomatis saat event terjadi (pengajuan, persetujuan, pembayaran, dll.).
          </p>
          <ChannelConfig configs={(channelConfigs ?? []) as Parameters<typeof ChannelConfig>[0]['configs']} />
        </div>
      )}

      {/* Tab: Template */}
      {tab === 'templates' && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Edit template pesan untuk setiap jenis event dan channel. Gunakan variabel yang tersedia untuk menyisipkan data dinamis.
          </p>
          <TemplateEditor templates={(templates ?? []) as Parameters<typeof TemplateEditor>[0]['templates']} />
        </div>
      )}

      {/* Tab: Riwayat */}
      {tab === 'history' && (
        <Card>
          <CardContent className="divide-y p-0">
            {notifications?.length === 0 && (
              <p className="text-center text-muted-foreground py-10 text-sm">Belum ada notifikasi</p>
            )}
            {notifications?.map((n: any) => (
              <div key={n.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <p className="font-medium text-sm truncate">{n.title}</p>
                    {!n.is_read && <Badge variant="secondary" className="text-xs shrink-0">Belum dibaca</Badge>}
                    {n.status && (
                      <Badge 
                        variant={n.status === 'sent' ? 'default' : 'destructive'} 
                        className="text-xs shrink-0 capitalize"
                      >
                        {n.status}
                      </Badge>
                    )}
                    {n.channel && (
                      <Badge variant="outline" className="text-xs shrink-0 capitalize">
                        {n.channel}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 pl-5">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1 pl-5">
                    Kepada: {(n.users as { name: string } | null)?.name ?? '-'} 
                    {n.recipient ? ` (${n.recipient})` : ''}
                    {' · '}
                    {formatDateTime(n.created_at)}
                    {n.error_message ? ` · Error: ${n.error_message}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs capitalize">{n.type.replace(/_/g, ' ')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
