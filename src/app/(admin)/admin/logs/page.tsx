import { createAdminClient as createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { isSuperAdmin } from '@/lib/permissions'
import { FileText, Clock, Database, User, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ActivityLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: any
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
  UPDATE: { label: 'Ubah', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Pencil },
  DELETE: { label: 'Hapus', color: 'bg-red-100 text-red-700 border-red-200', icon: Trash2 },
}

function ActionBadge({ action }: { action: keyof typeof ACTION_CONFIG }) {
  const config = ACTION_CONFIG[action]
  const Icon = config.icon
  
  return (
    <Badge variant="outline" className={cn("flex items-center gap-1", config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function getRecordName(log: ActivityLog): string {
  const data = log.new_data || log.old_data
  if (!data) return 'Unknown'
  
  // Try common name fields
  return data.name || data.title || data.purpose || data.email || log.record_id.substring(0, 8)
}

function getChangesSummary(log: ActivityLog): string {
  if (log.action === 'INSERT') {
    return `Membuat data baru`
  }
  
  if (log.action === 'DELETE') {
    return `Menghapus data`
  }
  
  if (log.action === 'UPDATE' && log.old_data && log.new_data) {
    const changes: string[] = []
    
    Object.keys(log.new_data).forEach(key => {
      if (log.old_data[key] !== log.new_data[key] && !key.startsWith('_')) {
        changes.push(key)
      }
    })
    
    if (changes.length === 0) return 'Tidak ada perubahan'
    if (changes.length === 1) return `Mengubah: ${changes[0]}`
    return `Mengubah: ${changes.slice(0, 2).join(', ')}${changes.length > 2 ? ` dan ${changes.length - 2} lainnya` : ''}`
  }
  
  return ''
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { page?: string; table?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const { data: profile } = await (supabase.from('users') as any)
    .select('role, name')
    .eq('id', user.id)
    .single()

  // Only super_admin can access
  if (!isSuperAdmin(profile?.role)) {
    redirect('/admin/dashboard')
  }

  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const offset = (page - 1) * limit
  const tableFilter = searchParams.table

  // Fetch activity logs
  let query = supabase
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('performed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tableFilter) {
    query = query.eq('table_name', tableFilter)
  }

  const { data: logs, count, error } = await query

  if (error) {
    console.error('Error fetching logs:', error)
  }

  const totalPages = Math.ceil((count || 0) / limit)

  // Get table counts for filter
  const { data: tableStats } = await supabase
    .from('activity_logs')
    .select('table_name')
    .then(({ data }) => {
      if (!data) return { data: [] }
      const counts = data.reduce((acc: Record<string, number>, log: any) => {
        acc[log.table_name] = (acc[log.table_name] || 0) + 1
        return acc
      }, {})
      return { data: Object.entries(counts).map(([name, count]) => ({ name, count })) }
    })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Activity Log</h1>
        <p className="text-slate-500 mt-1">Audit trail perubahan data sistem</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{count || 0}</div>
            <div className="text-sm text-muted-foreground">Total Aktivitas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {logs?.filter(l => l.action === 'INSERT').length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Penambahan</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {logs?.filter(l => l.action === 'UPDATE').length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Perubahan</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {logs?.filter(l => l.action === 'DELETE').length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Penghapusan</div>
          </CardContent>
        </Card>
      </div>

      {/* Table Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Filter Berdasarkan Tabel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <a
              href="/admin/logs"
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                !tableFilter ? 'bg-blue-950 text-white border-blue-950' : 'bg-white text-zinc-600 border-zinc-300 hover:border-blue-400'
              )}
            >
              Semua
            </a>
            {tableStats?.map((stat: any) => (
              <a
                key={stat.name}
                href={`/admin/logs?table=${stat.name}`}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                  tableFilter === stat.name ? 'bg-blue-950 text-white border-blue-950' : 'bg-white text-zinc-600 border-zinc-300 hover:border-blue-400'
                )}
              >
                {TABLE_LABELS[stat.name] || stat.name}
                <span className="ml-1 text-xs opacity-70">({stat.count})</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs */}
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
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-slate-50 transition-colors"
                >
                  <ActionBadge action={log.action} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {TABLE_LABELS[log.table_name] || log.table_name}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-sm text-slate-700 truncate max-w-[200px]">
                        {getRecordName(log)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {getChangesSummary(log)}
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <User className="h-3 w-3" />
                      {log.user_name || 'System'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.performed_at), 'dd MMM yyyy HH:mm', { locale: id })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Belum ada aktivitas tercatat</p>
              <p className="text-sm mt-1">Activity log akan muncul setelah ada perubahan data</p>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <a
                href={`/admin/logs?page=${Math.max(1, page - 1)}${tableFilter ? `&table=${tableFilter}` : ''}`}
                className={cn(
                  'p-2 rounded border transition-colors',
                  page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </a>
              
              <span className="text-sm text-slate-600">
                Halaman {page} dari {totalPages}
              </span>
              
              <a
                href={`/admin/logs?page=${Math.min(totalPages, page + 1)}${tableFilter ? `&table=${tableFilter}` : ''}`}
                className={cn(
                  'p-2 rounded border transition-colors',
                  page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="text-xs text-slate-400 text-center">
        <p>Activity log mencatat perubahan pada: Bookings, Users, Equipment, Rooms, Buildings, Payment Proofs</p>
      </div>
    </div>
  )
}
