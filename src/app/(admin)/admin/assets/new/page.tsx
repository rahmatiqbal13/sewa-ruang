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
      <h1 className="text-2xl font-bold mb-6">Tambah Aset</h1>
      <AssetForm buildings={buildings ?? []} />
    </div>
  )
}
