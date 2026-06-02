'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export interface InstitutionProfile {
  id?: string
  name: string
  short_name: string
  logo_url?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  description?: string | null
  operating_hours?: string | null
}

// Helper untuk create client dengan service role
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Konfigurasi server tidak lengkap')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function getInstitutionProfile(): Promise<InstitutionProfile | null> {
  try {
    const supabase = getServiceClient()
    
    const { data, error } = await supabase
      .from('institution_profile')
      .select('*')
      .single()
    
    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

export async function saveInstitutionProfile(data: InstitutionProfile) {
  try {
    const supabase = getServiceClient()
    
    // Check if profile exists
    const { data: existing } = await supabase
      .from('institution_profile')
      .select('id')
      .single()
    
    let result
    
    if (existing?.id) {
      // Update existing
      result = await supabase
        .from('institution_profile')
        .update({
          name: data.name,
          short_name: data.short_name,
          logo_url: data.logo_url,
          address: data.address,
          phone: data.phone,
          email: data.email,
          website: data.website,
          description: data.description,
          operating_hours: data.operating_hours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      // Insert new
      result = await supabase
        .from('institution_profile')
        .insert({
          name: data.name,
          short_name: data.short_name,
          logo_url: data.logo_url,
          address: data.address,
          phone: data.phone,
          email: data.email,
          website: data.website,
          description: data.description,
          operating_hours: data.operating_hours,
        })
    }
    
    if (result.error) {
      console.error('Error saving profile:', result.error)
      return { error: result.error.message }
    }
    
    revalidatePath('/admin/settings')
    return { success: true }
    
  } catch (error) {
    console.error('Server action error:', error)
    return { error: (error as Error).message || 'Terjadi kesalahan' }
  }
}
