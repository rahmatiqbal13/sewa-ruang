import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AssetForm } from '../../AssetForm'

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: asset }, { data: buildings }] = await Promise.all([
    supabase.from('assets').select('*').eq('id', id).single(),
    supabase.from('buildings').select('id, name, code, floor_count').eq('is_active', true).order('name'),
  ])
  if (!asset) notFound()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Aset</h1>
      <AssetForm asset={asset} buildings={buildings ?? []} />
    </div>
  )
}
