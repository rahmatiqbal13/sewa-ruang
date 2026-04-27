import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BellRing } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default async function NotificationsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notifications } = await (supabase.from('notifications') as any)
    .select('*, users(name, email)')
    .order('created_at', { ascending: false })
    .limit(100) as {
      data: Array<{
        id: string; title: string; body: string; type: string
        is_read: boolean; link: string | null; created_at: string
        users: { name: string; email: string } | null
      }> | null
    }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifikasi</h1>
        <p className="text-muted-foreground text-sm">Riwayat notifikasi sistem kepada pengguna</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            Notifikasi Terbaru ({notifications?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {notifications?.length === 0 && (
            <p className="text-center text-muted-foreground py-10 text-sm">
              Belum ada notifikasi
            </p>
          )}
          {notifications?.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-4 px-6 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{n.title}</p>
                  {!n.is_read && <Badge variant="secondary" className="text-xs">Belum dibaca</Badge>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kepada: {(n.users as { name: string } | null)?.name ?? '-'} · {formatDateTime(n.created_at)}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs capitalize">{n.type.replace(/_/g, ' ')}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
