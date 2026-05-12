import { createClient } from '@/lib/supabase/server'
import { BookingForm } from './BookingForm'

export type RoomItem = {
  id: string
  name: string
  item_type: 'room'
  room_code: string | null
  current_condition: string
  rate_per_hour: number | null
  rate_per_day: number | null
  capacity: number | null
  photo_url: string | null
  building_name: string | null
}

export type EquipmentItem = {
  id: string
  name: string
  item_type: 'equipment'
  equipment_code: string | null
  current_condition: string
  merk: string | null
  photo_url: string | null
  // Rates will be fetched separately based on user category
  rates: Array<{
    user_category: string
    rate_per_day: number
    rate_per_hour: number | null
    requires_supervision: boolean
  }>
}

export type BookableItem = RoomItem | EquipmentItem

// User borrower_category from users table
export type UserBorrowerCategory = 'mahasiswa' | 'pascasarjana' | 'dosen_karyawan' | 'kerjasama' | 'umum'

// Equipment rates category
export type RateCategory = 'mahasiswa_s1' | 'mahasiswa_s2' | 'dosen' | 'mou_unesa' | 'umum'

// Map user category to rate category
export function mapUserToRateCategory(userCategory: UserBorrowerCategory | null): RateCategory {
  const map: Record<UserBorrowerCategory, RateCategory> = {
    'mahasiswa': 'mahasiswa_s1',
    'pascasarjana': 'mahasiswa_s2',
    'dosen_karyawan': 'dosen',
    'kerjasama': 'mou_unesa',
    'umum': 'umum',
  }
  return map[userCategory ?? 'mahasiswa'] ?? 'mahasiswa_s1'
}

export type UserProfile = {
  id: string
  name: string
  institution: string
  class_division: string
  borrower_category: UserBorrowerCategory | null
}

// Helper function to map user category to rate category
function getRateCategory(userCategory: UserBorrowerCategory | null): RateCategory {
  const map: Record<UserBorrowerCategory, RateCategory> = {
    'mahasiswa': 'mahasiswa_s1',
    'pascasarjana': 'mahasiswa_s2',
    'dosen_karyawan': 'dosen',
    'kerjasama': 'mou_unesa',
    'umum': 'umum',
  }
  return map[userCategory ?? 'mahasiswa'] ?? 'mahasiswa_s1'
}

export default async function NewBookingPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div className="text-center py-8">Silakan login terlebih dahulu</div>
  }

  // Fetch user profile
  const { data: profile } = await sb.from('users')
    .select('id, name, institution, class_division, borrower_category')
    .eq('id', user.id)
    .single() as { data: UserProfile | null }

  const borrowerCategory: UserBorrowerCategory = profile?.borrower_category ?? 'mahasiswa'
  const rateCategory = getRateCategory(borrowerCategory)

  // Fetch rooms with building info
  const { data: rooms } = await sb.from('rooms')
    .select(`
      id,
      name,
      room_code,
      current_condition,
      rate_per_hour,
      rate_per_day,
      capacity,
      photo_url,
      buildings!inner(name)
    `)
    .eq('is_active', true)
    .eq('is_for_rent', true)
    .order('name') as { data: Array<{
      id: string
      name: string
      room_code: string
      current_condition: string
      rate_per_hour: number | null
      rate_per_day: number | null
      capacity: number | null
      photo_url: string | null
      buildings: { name: string }
    }> | null }

  // Fetch equipment
  const { data: equipment } = await sb.from('equipment')
    .select(`
      id,
      name,
      equipment_code,
      current_condition,
      merk,
      photo_url
    `)
    .eq('is_active', true)
    .eq('ketersediaan', 'tersedia')
    .order('name') as { data: Array<{
      id: string
      name: string
      equipment_code: string
      current_condition: string
      merk: string | null
      photo_url: string | null
    }> | null }

  // Fetch equipment rates for the user's category
  const equipmentIds = equipment?.map(e => e.id) ?? []
  const { data: equipmentRates } = equipmentIds.length > 0
    ? await sb.from('equipment_rates')
        .select('equipment_id, user_category, rate_per_day, rate_per_hour, requires_supervision')
        .in('equipment_id', equipmentIds)
        .eq('user_category', rateCategory) as { data: Array<{
          equipment_id: string
          user_category: string
          rate_per_day: number
          rate_per_hour: number | null
          requires_supervision: boolean
        }> | null }
    : { data: [] }

  // Transform rooms
  const roomItems: RoomItem[] = (rooms ?? []).map(r => ({
    id: r.id,
    name: r.name,
    item_type: 'room' as const,
    room_code: r.room_code,
    current_condition: r.current_condition,
    rate_per_hour: r.rate_per_hour,
    rate_per_day: r.rate_per_day,
    capacity: r.capacity,
    photo_url: r.photo_url,
    building_name: r.buildings?.name ?? null,
  }))

  // Transform equipment with rates
  const ratesMap = new Map(equipmentRates?.map(r => [r.equipment_id, r]))
  const equipmentItems: EquipmentItem[] = (equipment ?? []).map(e => ({
    id: e.id,
    name: e.name,
    item_type: 'equipment' as const,
    equipment_code: e.equipment_code,
    current_condition: e.current_condition,
    merk: e.merk,
    photo_url: e.photo_url,
    rates: ratesMap.get(e.id) ? [ratesMap.get(e.id)!] : [],
  }))

  const items: BookableItem[] = [...roomItems, ...equipmentItems]

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ajukan Peminjaman</h1>
          <p className="text-sm text-muted-foreground">Pilih ruangan atau alat yang ingin dipinjam</p>
        </div>
      </div>
      <BookingForm 
        items={items} 
        profile={profile} 
        borrowerCategory={borrowerCategory}
      />
    </div>
  )
}
