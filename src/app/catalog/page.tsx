import { createClient } from '@supabase/supabase-js'
import { CatalogClient } from './CatalogClient'
import { PublicHeader, PublicFooter } from '@/components/shared/PublicLayout'

export const revalidate = 30

// Server-side fetch institution profile
async function getInstitutionProfile() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return null
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    const { data, error } = await supabase
      .from('institution_profile')
      .select('*')
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching institution profile:', error)
    return null
  }
}

export default async function CatalogPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  const sb = supabase as any

  // Fetch institution profile and data in parallel
  const [institution, { data: buildingsData }, { data: roomsData }, { data: equipmentData }] = await Promise.all([
    getInstitutionProfile(),
    sb.from('buildings')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name') as Promise<{ data: any[] | null }>,
    sb.from('rooms')
      .select('id, name, building_id, capacity, current_condition, room_code, is_active, is_for_rent, room_rates(usage_category, rate_per_hour, rate_per_day)')
      .eq('is_active', true)
      .eq('is_for_rent', true)
      .order('name') as Promise<{ data: any[] | null }>,
    sb.from('equipment')
      .select(`
        id, name, description, current_condition, ketersediaan, merk, is_active, photo_url,
        equipment_rates(user_category, rate_per_day, rate_per_hour, requires_supervision)
      `)
      .eq('is_active', true)
      .eq('current_condition', 'good')
      .neq('ketersediaan', 'tidak_tersedia')
      .order('name') as Promise<{ data: any[] | null }>,
  ])

  // Transform data buildings untuk compatibility dengan CatalogClient
  const transformedBuildings = buildingsData?.map((building: any) => ({
    id: building.id,
    name: building.name,
    code: building.code,
    assets: roomsData?.filter((room: any) => room.building_id === building.id) || []
  })).filter((b: any) => b.assets.length > 0) || []

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <PublicHeader />
      
      <main className="flex-1">
        <CatalogClient
          buildings={transformedBuildings}
          equipment={equipmentData ?? []}
          institution={institution}
        />
      </main>
      
      <PublicFooter />
    </div>
  )
}
