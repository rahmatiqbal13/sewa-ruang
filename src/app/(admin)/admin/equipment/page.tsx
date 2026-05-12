import { createAdminClient as createClient } from '@/lib/supabase/server'
import { EquipmentList } from './EquipmentList'

const ITEMS_PER_PAGE = 10

// Helper function to create slug from name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ ketersediaan?: string; category?: string; condition?: string; page?: string; search?: string; showInactive?: string; todayOnly?: string }>
}) {
  const { ketersediaan, category, condition, page, search, showInactive, todayOnly } = await searchParams
  const currentPage = parseInt(page || '1', 10)
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Check if user is super admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userProfile } = await (supabase.from('users') as any)
    .select('role')
    .eq('id', user!.id)
    .single()
  
  const isSuperAdmin = userProfile?.role === 'super_admin'
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Build base query for counting
  let countQuery = sb.from('equipment').select('*', { count: 'exact', head: true })
  
  // Only show active items by default, unless showInactive=true
  if (showInactive !== 'true') {
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

  if (search) {
    countQuery = countQuery.or(`name.ilike.%${search}%,equipment_code.ilike.%${search}%,merk.ilike.%${search}%`)
  }

  const { count: totalCount } = await countQuery

  // Get today's date for filtering
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()

  // Query from new 'equipment' table with pagination
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

  // Only show active items by default
  if (showInactive !== 'true') {
    query = query.eq('is_active', true)
  }

  // Filter for today only
  if (todayOnly === 'true') {
    query = query.gte('created_at', todayIso)
  }

  if (ketersediaan) {
    query = query.eq('ketersediaan', ketersediaan)
  }
  
  if (category) {
    query = query.eq('category', category)
  }

  if (condition) {
    query = query.eq('current_condition', condition)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,equipment_code.ilike.%${search}%,merk.ilike.%${search}%`)
  }

  const { data: equipment } = await query

  // Query ALL equipment for export (without pagination)
  let allEquipmentQuery = sb
    .from('equipment')
    .select(`
      id, name, equipment_code, description, merk, category,
      current_condition, ketersediaan, status_tindakan,
      is_active, photo_url, current_location, storage_room_id,
      equipment_rates(user_category, rate_per_day, rate_per_hour, requires_supervision)
    `)
    .order('name')

  // Apply same filters
  if (showInactive !== 'true') {
    allEquipmentQuery = allEquipmentQuery.eq('is_active', true)
  }
  if (todayOnly === 'true') {
    allEquipmentQuery = allEquipmentQuery.gte('created_at', todayIso)
  }
  if (ketersediaan) {
    allEquipmentQuery = allEquipmentQuery.eq('ketersediaan', ketersediaan)
  }
  if (category) {
    allEquipmentQuery = allEquipmentQuery.eq('category', category)
  }
  if (condition) {
    allEquipmentQuery = allEquipmentQuery.eq('current_condition', condition)
  }
  if (search) {
    allEquipmentQuery = allEquipmentQuery.or(`name.ilike.%${search}%,equipment_code.ilike.%${search}%,merk.ilike.%${search}%`)
  }

  const { data: allEquipmentForExport } = await allEquipmentQuery

  // Get categories for filter
  const { data: categories } = await sb
    .from('equipment')
    .select('category')
    .not('category', 'is', null)

  const uniqueCategories = [...new Set((categories as { category: string }[] | null)?.map(c => c.category).filter(Boolean) || [])]

  // Get counts for all availability (not just current page)
  let availabilityQuery = sb.from('equipment').select('ketersediaan')
  if (showInactive !== 'true') {
    availabilityQuery = availabilityQuery.eq('is_active', true)
  }
  if (todayOnly === 'true') {
    availabilityQuery = availabilityQuery.gte('created_at', todayIso)
  }
  const { data: availabilityData } = await availabilityQuery

  const availabilityCounts = {
    'tersedia': (availabilityData as { ketersediaan: string }[] | null)?.filter((e) => e.ketersediaan === 'tersedia').length ?? 0,
    'digunakan': (availabilityData as { ketersediaan: string }[] | null)?.filter((e) => e.ketersediaan === 'digunakan').length ?? 0,
    'hilang': (availabilityData as { ketersediaan: string }[] | null)?.filter((e) => e.ketersediaan === 'hilang').length ?? 0,
    'tidak_tersedia': (availabilityData as { ketersediaan: string }[] | null)?.filter((e) => e.ketersediaan === 'tidak_tersedia').length ?? 0,
  }

  // Check for duplicate names (from all equipment)
  const getDuplicateNames = () => {
    if (!allEquipmentForExport) return new Set<string>()
    const nameCounts = new Map<string, number>()
    const baseNames = new Set<string>()
    
    allEquipmentForExport.forEach((item: { name: string }) => {
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

  const totalItems = totalCount || 0
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

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
      searchParams={{ ketersediaan, category, condition, search, todayOnly }}
      isSuperAdmin={isSuperAdmin}
    />
  )
}
