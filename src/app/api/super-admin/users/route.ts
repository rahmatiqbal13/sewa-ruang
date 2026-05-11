import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }
  
  return createAdmin(url, key, { 
    auth: { autoRefreshToken: false, persistSession: false } 
  })
}

// POST /api/super-admin/users — create new user
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = adminClient()
    
    // Check if current user is super_admin
    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
    }
    
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      name, 
      email, 
      password, 
      role, 
      phone, 
      borrower_category, 
      institution, 
      class_division, 
      identity_number, 
      telegram_username 
    } = body

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check if email already exists
    const { data: existingUser, error: checkError } = await admin.auth.admin.listUsers()
    if (checkError) {
      console.error('Error checking existing users:', checkError)
    } else {
      const emailExists = existingUser.users.some((u: { email?: string }) => 
        u.email?.toLowerCase() === email.toLowerCase()
      )
      if (emailExists) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
      }
    }

    // Check if email exists in public.users table
    const { data: existingProfile } = await admin
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()
    
    if (existingProfile) {
      return NextResponse.json({ error: 'Email already exists in database' }, { status: 400 })
    }

    // Create auth user
    // Note: email_confirm dihapus karena untuk dummy email, 
    // supaya tidak perlu verifikasi email
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: false, // Jangan auto-confirm untuk menghindari error email
      user_metadata: { name, role },
    })
    
    if (authError) {
      console.error('Auth error:', authError)
      console.error('Auth error code:', (authError as any).code)
      console.error('Auth error status:', (authError as any).status)
      
      // Provide better error messages
      let errorMessage = authError.message
      if ((authError as any).code === 'email_exists') {
        errorMessage = 'Email already registered'
      } else if ((authError as any).code === 'unexpected_failure') {
        errorMessage = 'Auth service error. Please check Supabase dashboard or try again later.'
      }
      
      return NextResponse.json({ error: errorMessage, code: (authError as any).code }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Auto-confirm email supaya user bisa langsung login
    // meskipun email tidak valid (untuk dummy email)
    try {
      const { error: confirmError } = await admin.auth.admin.updateUserById(
        authData.user.id,
        { email_confirm: true }
      )
      if (confirmError) {
        console.error('Error confirming email:', confirmError)
        // Continue anyway, tidak fatal
      }
    } catch (confirmErr) {
      console.error('Exception confirming email:', confirmErr)
      // Continue anyway
    }

    // Insert into users table
    const { error: insertError } = await admin
      .from('users')
      .insert({
        id: authData.user.id,
        name, 
        email, 
        role: role || 'borrower',
        phone: phone || null,
        borrower_category: borrower_category || null,
        institution: institution || null,
        class_division: class_division || null,
        identity_number: identity_number || null,
        telegram_username: telegram_username || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Database error:', insertError)
      
      // Try to clean up auth user if database insert failed
      try {
        await admin.auth.admin.deleteUser(authData.user.id)
      } catch (deleteError) {
        console.error('Failed to cleanup auth user:', deleteError)
      }
      
      return NextResponse.json({ 
        error: 'Database error: ' + insertError.message,
        details: insertError
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user: { id: authData.user.id, email, name, role }
    })
    
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error.message || 'Unknown error')
    }, { status: 500 })
  }
}

// GET /api/super-admin/users — list all users
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = adminClient()
    
    // Check if current user is super_admin
    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: users, error } = await admin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users })
    
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
