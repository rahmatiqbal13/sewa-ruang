'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { KeyRound, Loader2 } from 'lucide-react'

export function ResetPasswordButton({ email, userName }: { email: string; userName: string }) {
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    setLoading(true)
    const supabase = createClient()
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    })
    if (error) {
      toast.error('Gagal mengirim: ' + error.message)
    } else {
      toast.success(`Link reset password dikirim ke ${userName} (${email})`)
    }
    setLoading(false)
  }

  return (
    <Button size="sm" variant="outline" onClick={handleReset} disabled={loading} title="Kirim reset password">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
    </Button>
  )
}
