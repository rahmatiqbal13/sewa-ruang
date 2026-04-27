import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BuildingForm } from '../../BuildingForm'

export default async function EditBuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: building } = await supabase.from('buildings').select('*').eq('id', id).single()
  if (!building) notFound()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Gedung</h1>
      <BuildingForm building={building} />
    </div>
  )
}
