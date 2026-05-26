import { createAdminDbClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function TrashPage() {
  const sb = createAdminDbClient()

  // Fetch soft-deleted equipment (is_active = false)
  const { data: deletedEquipment } = await sb
    .from('equipment')
    .select('id, name, equipment_code, updated_at')
    .eq('is_active', false)
    .order('updated_at', { ascending: false })
    .limit(50) as any

  const { data: deletedRooms } = await sb
    .from('rooms')
    .select('id, name, room_code, updated_at')
    .eq('is_active', false)
    .order('updated_at', { ascending: false })
    .limit(50)

  type DeletedItem = { id: string; name: string; code: string | null; type: string; deletedAt: string }

  const deletedItems: DeletedItem[] = [
    ...(deletedEquipment ?? []).map((e: { id: string; name: string; equipment_code: string | null; updated_at: string }) => ({
      id: e.id, name: e.name, code: e.equipment_code, type: 'Alat', deletedAt: e.updated_at,
    })),
    ...(deletedRooms ?? []).map((r: { id: string; name: string; room_code: string | null; updated_at: string }) => ({
      id: r.id, name: r.name, code: r.room_code, type: 'Ruangan', deletedAt: r.updated_at,
    })),
  ].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())

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
            Deleted Items ({deletedItems.length})
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
                        {item.type}
                        {item.code && ` • ${item.code}`}
                        {' • '}Dinonaktifkan {new Date(item.deletedAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" disabled>
                      <RotateCcw className="h-4 w-4" />
                      Restore
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
              <strong>Note:</strong> Restore dan hard delete memerlukan Server Action.
              Hubungi developer untuk mengaktifkan fitur ini.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
