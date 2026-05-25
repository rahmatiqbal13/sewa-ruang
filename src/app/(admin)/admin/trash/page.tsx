import { createAdminClient as createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isSuperAdmin } from '@/lib/permissions'
import { Trash2, AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function TrashPage() {
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

  // Sample deleted items - in production, this would come from a trash/recycle bin table
  const deletedItems = [
    { id: 1, name: 'Room A101', type: 'Room', deletedAt: new Date(Date.now() - 86400000).toISOString(), deletedBy: 'admin@example.com' },
    { id: 2, name: 'Projector Sony', type: 'Equipment', deletedAt: new Date(Date.now() - 172800000).toISOString(), deletedBy: 'staff@example.com' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trash / Recycle Bin</h1>
        <p className="text-muted-foreground mt-1">Kelola data yang telah dihapus (soft delete)</p>
      </div>

      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            Soft Delete Management
          </CardTitle>
        </CardHeader>
        <CardContent className="text-red-700">
          <p>Fitur ini memungkinkan Super Admin untuk:</p>
          <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
            <li>Melihat data yang telah dihapus (soft delete)</li>
            <li>Merestore data yang terhapus</li>
            <li>Menghapus data permanen (hard delete)</li>
            <li>Mengatur retention policy</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Deleted Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deletedItems.length > 0 ? (
            <div className="space-y-2">
              {deletedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-muted rounded-[10px] border border-border">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-red-100 rounded-[10px] flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.type} • Dihapus {new Date(item.deletedAt).toLocaleDateString('id-ID')} • oleh {item.deletedBy}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </Button>
                    <Button variant="destructive" size="sm">
                      Delete Permanently
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>Tidak ada item di trash</p>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-muted rounded-[10px] text-center">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Implementasi soft delete memerlukan modifikasi database.
              Hubungi developer untuk setup fitur ini.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
