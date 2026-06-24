import { createClient, createAdminDbClient } from '@/lib/supabase/server'
import { EquipmentList } from './EquipmentList'

export const revalidate = 30

const ITEMS_PER_PAGE = 10



export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ ketersediaan?: string; category?: string; condition?: string; page?: string; search?: string; showInactive?: string; todayOnly?: string; inactiveOnly?: string }>
}) {
  const { ketersediaan, category, condition, page, search, showInactive, todayOnly, inactiveOnly } = await searchParams
  const currentPage = parseInt(page || '1', 10)
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const sb = createAdminDbClient()

  // Check if user is super admin
  const { data: userProfile } = await sb
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isSuperAdmin = userProfile?.role === 'super_admin'

  // Build base query for counting
  let countQuery = sb.from('equipment').select('*', { count: 'exact', head: true })

  // is_active filtering: inactiveOnly → false, showInactive → all, default → true
  if (inactiveOnly === 'true') {
    countQuery = countQuery.eq('is_active', false)
  } else if (showInactive !== 'true') {
    countQuery = countQuery.eq('is_active', true)
  }
  
  if (ketersediaan) {
    countQuery = countQuery.eq('ketersediaan', ketersediaan)
  }
  
  if (category) {
    countQuery = countQuery.eq('category', category)
  }

  if (condition) {
    countQuery = countQuery.eq('current_condition', condition)
  }

  const sanitizedSearch = search ? search.trim().slice(0, 100).replace(/[%_]/g, '\\$&') : undefined

  if (sanitizedSearch) {
    countQuery = countQuery.or(`name.ilike.%${sanitizedSearch}%,equipment_code.ilike.%${sanitizedSearch}%,merk.ilike.%${sanitizedSearch}%`)
  }

  // Get today's date for filtering
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()

  // Build paginated query
  let query = sb
    .from('equipment')
    .select(`
      id, name, equipment_code, description, merk, category,
      current_condition, ketersediaan, status_tindakan,
      is_active, photo_url, current_location, storage_room_id,
      equipment_rates(user_category, rate_per_day, rate_per_hour, requires_supervision)
    `)
    .order('name')
    .range(offset, offset + ITEMS_PER_PAGE - 1)

  if (inactiveOnly === 'true') query = query.eq('is_active', false)
  else if (showInactive !== 'true') query = query.eq('is_active', true)
  if (todayOnly === 'true') query = query.gte('created_at', todayIso)
  if (ketersediaan) query = query.eq('ketersediaan', ketersediaan)
  if (category) query = query.eq('category', category)
  if (condition) query = query.eq('current_condition', condition)
  if (sanitizedSearch) query = query.or(`name.ilike.%${sanitizedSearch}%,equipment_code.ilike.%${sanitizedSearch}%,merk.ilike.%${sanitizedSearch}%`)

  // Build export query (all items, no pagination)
  let allEquipmentQuery = sb
    .from('equipment')
    .select(`
      id, name, equipment_code, description, merk, category,
      current_condition, ketersediaan, status_tindakan,
      is_active, photo_url, current_location, storage_room_id,
      equipment_rates(user_category, rate_per_day, rate_per_hour, requires_supervision)
    `)
    .order('name')

  if (inactiveOnly === 'true') allEquipmentQuery = allEquipmentQuery.eq('is_active', false)
  else if (showInactive !== 'true') allEquipmentQuery = allEquipmentQuery.eq('is_active', true)
  if (todayOnly === 'true') allEquipmentQuery = allEquipmentQuery.gte('created_at', todayIso)
  if (ketersediaan) allEquipmentQuery = allEquipmentQuery.eq('ketersediaan', ketersediaan)
  if (category) allEquipmentQuery = allEquipmentQuery.eq('category', category)
  if (condition) allEquipmentQuery = allEquipmentQuery.eq('current_condition', condition)
  if (sanitizedSearch) allEquipmentQuery = allEquipmentQuery.or(`name.ilike.%${sanitizedSearch}%,equipment_code.ilike.%${sanitizedSearch}%,merk.ilike.%${sanitizedSearch}%`)

  // Build availability query
  let availabilityQuery = sb.from('equipment').select('ketersediaan')
  if (showInactive !== 'true') availabilityQuery = availabilityQuery.eq('is_active', true)
  if (todayOnly === 'true') availabilityQuery = availabilityQuery.gte('created_at', todayIso)

  // Jalankan semua 6 query secara paralel
   
  const [r0, r1, r2, r3, r4, r5] = await Promise.all([
    countQuery,
    query,
    allEquipmentQuery,
    sb.from('equipment').select('category').not('category', 'is', null),
    availabilityQuery,
    sb.from('equipment').select('*', { count: 'exact', head: true }).eq('is_active', false),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ]) as any[]
  const totalCount: number | null = r0.count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equipment: any[] | null = r1.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEquipmentForExport: any[] | null = r2.data
  const categories: { category: string }[] | null = r3.data
  const availabilityData: { ketersediaan: string }[] | null = r4.data
  const inactiveCount: number = r5.count ?? 0

  const uniqueCategories = [...new Set(categories?.map(c => c.category).filter(Boolean) || [])]

  const availabilityCounts = {
    'tersedia': availabilityData?.filter((e) => e.ketersediaan === 'tersedia').length ?? 0,
    'digunakan': availabilityData?.filter((e) => e.ketersediaan === 'digunakan').length ?? 0,
    'hilang': availabilityData?.filter((e) => e.ketersediaan === 'hilang').length ?? 0,
    'tidak_tersedia': availabilityData?.filter((e) => e.ketersediaan === 'tidak_tersedia').length ?? 0,
  }

  // Check for duplicate names (from all equipment)
  const getDuplicateNames = () => {
    if (!allEquipmentForExport) return new Set<string>()
    const nameCounts = new Map<string, number>()
    const baseNames = new Set<string>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allEquipmentForExport.forEach((item: any) => {
      const baseName = item.name.replace(/\s*\(\d+\)$/, '').toLowerCase().trim()
      nameCounts.set(baseName, (nameCounts.get(baseName) || 0) + 1)
      if (nameCounts.get(baseName)! > 1) {
        baseNames.add(baseName)
      }
    })
    
    return baseNames
  }

  const duplicateBaseNames = getDuplicateNames()
  const hasDuplicates = duplicateBaseNames.size > 0

  return (
    <EquipmentList
      equipment={equipment || []}
      allEquipment={allEquipmentForExport || []}
      totalItems={totalCount || 0}
      currentPage={currentPage}
      totalPages={Math.ceil((totalCount || 0) / ITEMS_PER_PAGE)}
      availabilityCounts={availabilityCounts}
      duplicateBaseNames={duplicateBaseNames}
      uniqueCategories={uniqueCategories}
      hasDuplicates={hasDuplicates}
      inactiveCount={inactiveCount}
      searchParams={{ ketersediaan, category, condition, search, todayOnly, inactiveOnly }}
      isSuperAdmin={isSuperAdmin}
    />
  )
}
