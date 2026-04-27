import { createClient } from '@/lib/supabase/server'
import { CatalogClient } from './CatalogClient'

export const revalidate = 30

export default async function CatalogPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  type BuildingRow = {
    id: string; name: string; code: string
    assets: Array<{ id: string; name: string; capacity: number | null; rate_per_hour: number | null; rate_per_day: number | null; current_condition: string; room_code: string | null; is_active: boolean }>
  }
  type EquipmentRow = {
    id: string; name: string; description: string | null; rate_per_hour: number | null
    rate_per_day: number | null; current_condition: string; ketersediaan: string | null
    merk: string | null; is_active: boolean
  }

  const [{ data: buildings }, { data: equipment }] = await Promise.all([
    sb.from('buildings')
      .select('id, name, code, assets(id, name, capacity, rate_per_hour, rate_per_day, current_condition, room_code, is_active)')
      .eq('is_active', true)
      .order('name') as Promise<{ data: BuildingRow[] | null }>,
    sb.from('assets')
      .select('id, name, description, rate_per_hour, rate_per_day, current_condition, ketersediaan, merk, is_active')
      .eq('category', 'equipment')
      .eq('is_active', true)
      .order('name') as Promise<{ data: EquipmentRow[] | null }>,
  ])

  return (
    <CatalogClient
      buildings={buildings ?? []}
      equipment={equipment ?? []}
    />
  )
}
