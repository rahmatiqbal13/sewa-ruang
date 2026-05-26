import { createAdminDbClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BuildingForm } from '../../BuildingForm'

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default async function EditBuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const sb = createAdminDbClient()

  try {
    const { data: allBuildings } = await sb.from('buildings').select('id, name')
    const matched = allBuildings?.find((b: { id: string; name: string }) => createSlug(b.name) === slug)
    if (!matched) notFound()

    const { data: building, error } = await sb.from('buildings').select('*').eq('id', matched.id).single()
    if (error || !building) {
      console.error('Error fetching building:', error)
      notFound()
    }

    return (
      <div className="p-6">
        <BuildingForm building={building} />
      </div>
    )
  } catch (error) {
    console.error('Error in EditBuildingPage:', error)
    notFound()
  }
}
