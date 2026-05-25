import { createAdminClient as createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isSuperAdmin } from '@/lib/permissions'
import { 
  Database, 
  AlertTriangle,
  Users,
  HardDrive,
  Activity
} from 'lucide-react'

async function getInstitutionProfile() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) return null
    
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    const { data } = await supabase.from('institution_profile').select('*').single()
    return data
  } catch {
    return null
  }
}

export default async function DatabasePage() {
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

  // Get database stats
  const sb = supabase as any
  const [
    { count: usersCount },
    { count: bookingsCount },
    { count: roomsCount },
    { count: equipmentCount },
  ] = await Promise.all([
    sb.from('users').select('*', { count: 'exact', head: true }),
    sb.from('bookings').select('*', { count: 'exact', head: true }),
    sb.from('rooms').select('*', { count: 'exact', head: true }),
    sb.from('equipment').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Total Users', value: usersCount || 0, icon: Users },
    { label: 'Total Bookings', value: bookingsCount || 0, icon: Activity },
    { label: 'Total Rooms', value: roomsCount || 0, icon: Database },
    { label: 'Total Equipment', value: equipmentCount || 0, icon: HardDrive },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Database Management</h1>
        <p className="text-muted-foreground mt-1">Kelola dan monitoring database sistem</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-purple-100 rounded-[14px] flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Fitur Database Management
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700 space-y-4">
          <p>Fitur ini memungkinkan Super Admin untuk:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Backup dan restore database</li>
            <li>Melihat statistik tabel</li>
            <li>Mengeksekusi query kustom (read-only)</li>
            <li>Monitoring performance</li>
            <li>Mengelola indexes</li>
          </ul>
          <div className="p-4 bg-card rounded-[10px] border border-amber-200 mt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Status:</strong> Modul ini sedang dalam pengembangan. 
              Hubungi developer untuk fitur advanced database management.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
