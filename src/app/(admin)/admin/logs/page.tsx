import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isSuperAdmin } from '@/lib/permissions'
import { FileText, Info } from 'lucide-react'

export default async function LogsPage() {
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

  // Sample logs - in production, this would come from a logs table
  const sampleLogs = [
    { timestamp: new Date().toISOString(), level: 'INFO', message: 'System started successfully', user: 'System' },
    { timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'INFO', message: 'User login: admin@example.com', user: 'admin@example.com' },
    { timestamp: new Date(Date.now() - 7200000).toISOString(), level: 'WARN', message: 'Failed login attempt', user: 'unknown' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">System Logs</h1>
        <p className="text-slate-500 mt-1">Monitoring aktivitas dan log sistem</p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Info className="h-5 w-5" />
            System Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <p>Fitur ini memungkinkan Super Admin untuk melihat:</p>
          <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
            <li>Log aktivitas user</li>
            <li>Log error dan exception</li>
            <li>Log autentikasi</li>
            <li>Log perubahan data</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sampleLogs.map((log, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  log.level === 'ERROR' ? 'bg-red-100 text-red-700' :
                  log.level === 'WARN' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {log.level}
                </span>
                <span className="text-sm text-slate-500 w-40">
                  {new Date(log.timestamp).toLocaleString('id-ID')}
                </span>
                <span className="text-sm text-slate-700 flex-1">{log.message}</span>
                <span className="text-xs text-slate-400">{log.user}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-slate-100 rounded-lg text-center text-slate-500">
            <p className="text-sm">Modul logging sedang dalam pengembangan.</p>
            <p className="text-xs mt-1">Hubungi developer untuk setup sistem logging yang lengkap.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
