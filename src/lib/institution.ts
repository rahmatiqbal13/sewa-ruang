import { createClient } from '@supabase/supabase-js'

export interface InstitutionProfile {
  id?: string
  name: string
  short_name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  operating_hours: string | null
}

// Cache untuk institution profile
let cachedProfile: InstitutionProfile | null = null
let cacheTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 menit

export async function getInstitutionProfile(): Promise<InstitutionProfile | null> {
  try {
    // Check cache
    if (cachedProfile && Date.now() - cacheTime < CACHE_DURATION) {
      return cachedProfile
    }

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
    
    // Update cache
    cachedProfile = data
    cacheTime = Date.now()
    
    return data
  } catch (error) {
    console.error('Error fetching institution profile:', error)
    return null
  }
}



// Format alamat lengkap
export function formatAddress(profile: InstitutionProfile | null): string {
  if (!profile?.address) return '-'
  return profile.address
}

// Format kontak lengkap
export function formatContact(profile: InstitutionProfile | null): string {
  if (!profile) return '-'
  
  const parts = []
  if (profile.phone) parts.push(`Telp: ${profile.phone}`)
  if (profile.email) parts.push(`Email: ${profile.email}`)
  
  return parts.join(' | ') || '-'
}
