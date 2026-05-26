import { createClient } from '@supabase/supabase-js'
import { createAdminDbClient } from '@/lib/supabase/server'
import { CatalogClient } from './CatalogClient'
import { PublicHeader, PublicFooter } from '@/components/shared/PublicLayout'

interface Building {
  id: string;
  name: string;
  code: string;
}

interface RoomRate {
  usage_category: string;
  rate_per_hour: number | null;
  rate_per_day: number;
}

interface Room {
  id: string;
  name: string;
  building_id: string;
  capacity: number;
  current_condition: string;
  room_code: string;
  floor_number: number | null;
  photo_url: string | null;
  is_active: boolean;
  is_for_rent: boolean;
  room_rates: RoomRate[];
}

// Equipment interface (for future use when filtering equipment)
// interface Equipment {
//   id: string;
//   name: string;
//   description: string;
//   current_condition: string;
//   ketersediaan: string;
//   merk: string;
//   is_active: boolean;
//   photo_url: string;
// }

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

  // Fetch institution profile and data in parallel
  // Use admin client for equipment to bypass RLS on equipment_rates
  const adminDb = createAdminDbClient()

  const [institution, { data: buildingsData }, { data: roomsData }, { data: equipmentData, error: equipmentError }] = await Promise.all([
    getInstitutionProfile(),
    supabase
      .from('buildings')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('rooms')
      .select('id, name, building_id, capacity, current_condition, room_code, floor_number, photo_url, is_active, is_for_rent, room_rates(usage_category, rate_per_hour, rate_per_day)')
      .eq('is_active', true)
      .eq('is_for_rent', true)
      .order('name'),
    adminDb
      .from('equipment')
      .select(`
        id, name, description, category, current_condition, ketersediaan, merk, is_active, photo_url,
        equipment_rates(user_category, rate_per_day, rate_per_hour, requires_supervision)
      `)
      .eq('is_active', true)
      .eq('current_condition', 'good')
      .neq('ketersediaan', 'tidak_tersedia')
      .order('name'),
  ] as const)

  if (equipmentError) {
    console.error('Error fetching equipment:', equipmentError)
  }

  // Exclude equipment with active bookings
  const now = new Date().toISOString()
  const equipmentIds = (equipmentData ?? []).map(e => e.id)
  let activeBookingEquipIds: string[] = []

  if (equipmentIds.length > 0) {
    // Check equipment_booking_slots
    const { data: activeSlots } = await adminDb
      .from('equipment_booking_slots')
      .select('equipment_id')
      .in('equipment_id', equipmentIds)
      .gte('slot', `["${now}"]`)

    const slotIds = new Set((activeSlots ?? []).map(s => s.equipment_id))

    // Fallback: check booking_items for legacy bookings
    // First get active booking IDs
    const { data: activeBookings } = await adminDb
      .from('bookings')
      .select('id')
      .in('status', ['pending', 'approved', 'paid', 'active'])
      .gte('end_datetime', now)

    const activeBookingIds = (activeBookings ?? []).map(b => b.id)

    let legacyIds = new Set<string>()
    if (activeBookingIds.length > 0) {
      const { data: legacyItems } = await adminDb
        .from('booking_items')
        .select('equipment_id')
        .in('equipment_id', equipmentIds)
        .eq('item_type', 'equipment')
        .in('booking_id', activeBookingIds)

      legacyIds = new Set((legacyItems ?? []).map(i => i.equipment_id).filter((id): id is string => id !== null))
    }

    activeBookingEquipIds = Array.from(new Set([...slotIds, ...legacyIds]))
  }

  const availableEquipment = (equipmentData ?? []).filter(
    e => !activeBookingEquipIds.includes(e.id)
  )

  // Transform data buildings untuk compatibility dengan CatalogClient
  const transformedBuildings = (buildingsData as unknown as Building[] | null)?.map((building) => ({
    id: building.id,
    name: building.name,
    code: building.code,
    assets: (roomsData as unknown as Room[] | null)?.filter((room) => room.building_id === building.id) || []
  })).filter((b) => b.assets.length > 0) || []

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      
      <main className="flex-1">
        <CatalogClient
          buildings={transformedBuildings}
          equipment={availableEquipment}
          institution={institution}
        />
      </main>
      
      <PublicFooter />
    </div>
  )
}
