import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin, isAdmin, UserRole } from './permissions'

interface AuthCheckResult {
  user: any | null
  profile: { role: UserRole; name: string } | null
  error: string | null
}

export async function checkAuth(requireAdmin: boolean = false): Promise<AuthCheckResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { user: null, profile: null, error: 'Unauthorized' }
  }

  const { data: profile } = await (supabase.from('users') as any)
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { user, profile: null, error: 'Profile not found' }
  }

  if (requireAdmin && !isAdmin(profile.role)) {
    return { user, profile, error: 'Forbidden: Admin access required' }
  }

  return { user, profile, error: null }
}

export async function requireSuperAdmin(): Promise<AuthCheckResult> {
  const result = await checkAuth()
  
  if (result.error) {
    return result
  }

  if (!isSuperAdmin(result.profile?.role)) {
    return { 
      user: result.user, 
      profile: result.profile, 
      error: 'Forbidden: Super Admin access required' 
    }
  }

  return result
}

export async function requireAdmin(): Promise<AuthCheckResult> {
  const result = await checkAuth()
  
  if (result.error) {
    return result
  }

  if (!isAdmin(result.profile?.role)) {
    return { 
      user: result.user, 
      profile: result.profile, 
      error: 'Forbidden: Admin access required' 
    }
  }

  return result
}
