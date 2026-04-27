import { createClient } from '@/lib/supabase/server'
import { AssetForm } from '../../assets/AssetForm'

export default async function NewRoomPage() {
  const supabase = await createClient()
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name, code, floor_count')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Tambah Ruangan</h1>
      <p className="text-muted-foreground text-sm mb-6">Isi data ruangan yang akan ditambahkan ke sistem</p>
      <AssetForm buildings={buildings ?? []} lockedCategory="room" />
    </div>
  )
}
