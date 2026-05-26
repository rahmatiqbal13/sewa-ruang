import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock, Database, User, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ActivityLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old_data: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new_data: any
  performed_by: string
  performed_at: string
  user_name: string
}

const TABLE_LABELS: Record<string, string> = {
  bookings: 'Peminjaman',
  users: 'Pengguna',
  equipment: 'Alat',
  rooms: 'Ruangan',
  buildings: 'Gedung',
  payment_proofs: 'Bukti Pembayaran',
}

const ACTION_CONFIG = {
  INSERT: { label: 'Tambah', color: 'bg-green-100 text-green-700 border-green-200', icon: Plus },
  UPDATE: { label: 'Ubah',   color: 'bg-blue-100 text-blue-700 border-blue-200',   icon: Pencil },
  DELETE: { label: 'Hapus',  color: 'bg-red-100 text-red-700 border-red-200',       icon: Trash2 },
}

function ActionBadge({ action }: { action: keyof typeof ACTION_CONFIG }) {
  const config = ACTION_CONFIG[action]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={cn('flex items-center gap-1', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function getRecordName(log: ActivityLog): string {
  const data = log.new_data || log.old_data
  if (!data) return 'Unknown'
  return data.name || data.title || data.purpose || data.email || log.record_id.substring(0, 8)
}

function getChangesSummary(log: ActivityLog): string {
  if (log.action === 'INSERT') return 'Membuat data baru'
  if (log.action === 'DELETE') return 'Menghapus data'
  if (log.action === 'UPDATE' && log.old_data && log.new_data) {
    const changes = Object.keys(log.new_data).filter(
      key => log.old_data[key] !== log.new_data[key] && !key.startsWith('_')
    )
    if (changes.length === 0) return 'Tidak ada perubahan'
    if (changes.length === 1) return `Mengubah: ${changes[0]}`
    return `Mengubah: ${changes.slice(0, 2).join(', ')}${changes.length > 2 ? ` dan ${changes.length - 2} lainnya` : ''}`
  }
  return ''
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; table?: string }>
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createAdminClient()) as any

  const { page: pageParam, table: tableFilter } = await searchParams
  const page = parseInt(pageParam ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('performed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tableFilter) query = query.eq('table_name', tableFilter)

  const { data: logs, count, error } = await query as {
    data: ActivityLog[] | null; count: number | null; error: unknown
  }

  if (error) console.error('Error fetching logs:', error)

  const totalPages = Math.ceil((count ?? 0) / limit)

  const { data: tableStats } = await supabase
    .from('activity_logs')
    .select('table_name')
    .then(({ data }: { data: Array<{ table_name: string }> | null }) => {
      if (!data) return { data: [] }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const counts = data.reduce((acc: Record<string, number>, log: any) => {
        acc[log.table_name] = (acc[log.table_name] || 0) + 1
        return acc
      }, {})
      return { data: Object.entries(counts).map(([name, count]) => ({ name, count })) }
    })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activity Log</h1>
        <p className="text-muted-foreground mt-1">Audit trail perubahan data sistem</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Aktivitas', value: count ?? 0, color: 'text-blue-600' },
          { label: 'Penambahan',  value: logs?.filter(l => l.action === 'INSERT').length ?? 0, color: 'text-green-600' },
          { label: 'Perubahan',   value: logs?.filter(l => l.action === 'UPDATE').length ?? 0, color: 'text-blue-600' },
          { label: 'Penghapusan', value: logs?.filter(l => l.action === 'DELETE').length ?? 0, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Filter Berdasarkan Tabel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <a href="/super-admin/logs" className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
              !tableFilter ? 'bg-blue-950 text-white border-blue-950' : 'bg-card text-muted-foreground border-border hover:border-blue-400'
            )}>Semua</a>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {tableStats?.map((stat: any) => (
              <a key={stat.name} href={`/super-admin/logs?table=${stat.name}`}
                className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                  tableFilter === stat.name ? 'bg-blue-950 text-white border-blue-950' : 'bg-card text-muted-foreground border-border hover:border-blue-400'
                )}>
                {TABLE_LABELS[stat.name] || stat.name}
                <span className="ml-1 text-xs opacity-70">({stat.count})</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Riwayat Aktivitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log: ActivityLog) => (
                <div key={log.id} className="flex items-start gap-4 p-4 rounded-[10px] border hover:bg-muted transition-colors">
                  <ActionBadge action={log.action} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{TABLE_LABELS[log.table_name] || log.table_name}</span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="text-sm text-foreground/80 truncate max-w-[200px]">{getRecordName(log)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{getChangesSummary(log)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />{log.user_name || 'System'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.performed_at), 'dd MMM yyyy HH:mm', { locale: id })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>Belum ada aktivitas tercatat</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <a href={`/super-admin/logs?page=${Math.max(1, page - 1)}${tableFilter ? `&table=${tableFilter}` : ''}`}
                className={cn('p-2 rounded border transition-colors', page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted')}>
                <ChevronLeft className="h-4 w-4" />
              </a>
              <span className="text-sm text-muted-foreground">Halaman {page} dari {totalPages}</span>
              <a href={`/super-admin/logs?page=${Math.min(totalPages, page + 1)}${tableFilter ? `&table=${tableFilter}` : ''}`}
                className={cn('p-2 rounded border transition-colors', page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted')}>
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground/70 text-center">
        <p>Activity log mencatat perubahan pada: Bookings, Users, Equipment, Rooms, Buildings, Payment Proofs</p>
      </div>
    </div>
  )
}
