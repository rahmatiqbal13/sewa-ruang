import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BuildingForm } from '../../BuildingForm'

export default async function EditBuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  try {
    const { data: building, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', id)
      .single()
    
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
