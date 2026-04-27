import { createClient } from '@/lib/supabase/server'
import { AssetForm } from '../AssetForm'

export default async function NewAssetPage() {
  const supabase = await createClient()
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name, code, floor_count')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Tambah Alat / Peralatan</h1>
      <p className="text-muted-foreground text-sm mb-6">Isi data alat yang akan ditambahkan ke sistem</p>
      <AssetForm buildings={buildings ?? []} lockedCategory="equipment" />
    </div>
  )
}
