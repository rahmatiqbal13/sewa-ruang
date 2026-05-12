import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createClient as createAdminAuthClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// POST /api/super-admin/users — create new user
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await createAdminClient()
    
    // Check if current user is super_admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await (admin
      .from('users') as any)
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

    // Check if email already exists in public.users table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingProfile } = await (admin
      .from('users') as any)
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle()
    
    if (existingProfile) {
      return NextResponse.json({ error: 'Email already exists in database' }, { status: 400 })
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Environment check:')
    console.log('- NEXT_PUBLIC_SUPABASE_URL exists:', !!supabaseUrl)
    console.log('- SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey)
    console.log('- URL starts with https:', supabaseUrl?.startsWith('https://'))
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables!')
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Supabase credentials. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' 
      }, { status: 500 })
    }

    // Create admin auth client
    const adminAuthClient = createAdminAuthClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Creating auth user with email:', email.toLowerCase())

    // Step 1: Create auth user
    const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { 
        name, 
        role,
        phone: phone || '',
        borrower_category: borrower_category || 'mahasiswa',
        institution: institution || '',
        class_division: class_division || '',
        identity_number: identity_number || '',
        telegram_username: telegram_username || ''
      },
    })
    
    // Log full auth response for debugging
    console.log('Auth response:')
    console.log('- Data:', authData ? 'exists' : 'null')
    console.log('- Error:', authError ? JSON.stringify(authError, null, 2) : 'null')
    
    if (authError) {
      console.error('Auth error occurred:', authError)
      
      // Extract all possible error info
      const errorDetails = authError as any
      console.error('Error details:')
      console.error('- message:', errorDetails.message)
      console.error('- code:', errorDetails.code)
      console.error('- status:', errorDetails.status)
      console.error('- name:', errorDetails.name)
      console.error('- full object:', JSON.stringify(errorDetails, Object.getOwnPropertyNames(errorDetails), 2))
      
      let errorMessage = errorDetails.message || 'Auth service error'
      let errorCode = errorDetails.code || 'unknown'
      
      if (errorCode === 'email_exists') {
        errorMessage = 'Email already registered'
      } else if (errorCode === 'weak_password') {
        errorMessage = 'Password is too weak'
      } else if (errorCode === 'unexpected_failure') {
        errorMessage = `Auth service error (unexpected_failure). This usually means:
1. SUPABASE_SERVICE_ROLE_KEY is invalid or expired
2. The Supabase Auth service is temporarily unavailable
3. Your Supabase project has restrictions on admin user creation

Please check your .env.local file and verify SUPABASE_SERVICE_ROLE_KEY is correct.`
      }
      
      return NextResponse.json({ 
        error: errorMessage, 
        code: errorCode,
        status: errorDetails.status,
      }, { status: 400 })
    }

    if (!authData || !authData.user) {
      console.error('No auth data returned despite no error')
      return NextResponse.json({ 
        error: 'Failed to create user - no user data returned from auth service' 
      }, { status: 500 })
    }

    console.log('Auth user created successfully:', authData.user.id)

    // Step 2: Wait for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 3: Check if user was created by trigger
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingUser, error: checkError } = await (admin
      .from('users') as any)
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing user:', checkError)
    }

    if (!existingUser) {
      console.log('User not found in public.users after trigger, inserting manually...')
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (admin
        .from('users') as any)
        .insert({
          id: authData.user.id,
          name: name || email.split('@')[0], 
          email: email.toLowerCase(), 
          role: role || 'borrower',
          phone: phone || '',
          borrower_category: borrower_category || 'mahasiswa',
          institution: institution || '',
          class_division: class_division || '',
          identity_number: identity_number || '',
          telegram_username: telegram_username || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Database insert error:', insertError)
        
        // Try to clean up auth user
        try {
          await adminAuthClient.auth.admin.deleteUser(authData.user.id)
        } catch (e) {
          console.error('Failed to cleanup auth user:', e)
        }
        
        return NextResponse.json({ 
          error: `Database error: ${insertError.message}`,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        }, { status: 500 })
      }
      
      console.log('User inserted manually successfully')
    } else {
      console.log('User was created by trigger, updating fields...')
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (admin
        .from('users') as any)
        .update({
          phone: phone || existingUser.phone || '',
          borrower_category: borrower_category || existingUser.borrower_category || 'mahasiswa',
          institution: institution || existingUser.institution || '',
          class_division: class_division || existingUser.class_division || '',
          identity_number: identity_number || existingUser.identity_number || '',
          telegram_username: telegram_username || existingUser.telegram_username || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id)

      if (updateError) {
        console.error('Error updating user details:', updateError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: { id: authData.user.id, email, name, role }
    })
    
  } catch (error: any) {
    console.error('Unexpected error in POST handler:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error.message || 'Unknown error'),
      stack: error.stack
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

    const admin = await createAdminClient()
    
    // Check if current user is super_admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (admin
      .from('users') as any)
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users, error } = await (admin
      .from('users') as any)
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
