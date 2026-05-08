import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  console.log('[Auth Callback] ==========================================')
  console.log('[Auth Callback] Origin:', origin)
  console.log('[Auth Callback] Next:', next)
  console.log('[Auth Callback] Code present:', !!code)

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    try {
      const { error, data } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('[Auth Callback] Exchange result:', {
        error: error?.message || null,
        hasSession: !!data.session,
        user: data.session?.user?.email || null,
      })
      
      if (!error && data.session) {
        const redirectUrl = `${origin}${next}`
        console.log('[Auth Callback] Success! Redirecting to:', redirectUrl)
        console.log('[Auth Callback] ==========================================')
        return NextResponse.redirect(redirectUrl)
      }
      
      if (error) {
        console.error('[Auth Callback] Exchange error:', error)
      }
    } catch (err) {
      console.error('[Auth Callback] Exception:', err)
    }
  } else {
    console.log('[Auth Callback] No code provided')
  }

  // If we get here, something went wrong
  console.log('[Auth Callback] Failed - redirecting to error page')
  console.log('[Auth Callback] ==========================================')
  return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`)
}
