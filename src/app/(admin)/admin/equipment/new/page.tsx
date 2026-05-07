import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EquipmentForm } from '../EquipmentForm'

export default async function NewEquipmentPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: userData } = await sb
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
    redirect('/admin/dashboard')
  }

  // Get buildings for location dropdown
  const { data: buildings } = await sb
    .from('buildings')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')

  // Get rooms for storage dropdown
  const { data: rooms } = await sb
    .from('rooms')
    .select('id, name, room_code')
    .eq('is_active', true)
    .order('name')

  // Generate next equipment code
  const { data: lastEquipment } = await sb
    .from('equipment')
    .select('equipment_code')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let nextCode = 'ALT-0001'
  if (lastEquipment?.equipment_code) {
    const match = lastEquipment.equipment_code.match(/ALT-(\d+)/)
    if (match) {
      const lastNum = parseInt(match[1])
      nextCode = `ALT-${String(lastNum + 1).padStart(4, '0')}`
    }
  }

  // Get all existing equipment names untuk cek duplikat
  const { data: existingNamesData } = await sb
    .from('equipment')
    .select('name')
    .order('name')

  const existingNames = existingNamesData?.map((e: { name: string }) => e.name) ?? []

  return (
    <div className="p-6">
      <EquipmentForm 
        buildings={buildings ?? []} 
        rooms={rooms ?? []}
        nextCode={nextCode}
        existingNames={existingNames}
      />
    </div>
  )
}
