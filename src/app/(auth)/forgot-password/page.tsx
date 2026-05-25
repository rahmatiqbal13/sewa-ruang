'use client'

import { useState, useActionState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { sendPasswordResetEmail } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Loader2, MailCheck, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [sentEmail, setSentEmail] = useState('')
  
  // Use useActionState for Server Actions (React 19 / Next.js 15)
  const [state, formAction, isPending] = useActionState(sendPasswordResetEmail, {
    success: false,
    message: '',
  })

  // Handle toast notifications based on action result
  useEffect(() => {
    if (state.message && !isPending) {
      if (state.success) {
        toast.success(state.message)
        if (state.email) {
          setSentEmail(state.email)
        }
      } else {
        toast.error(state.message)
      }
    }
  }, [state, isPending])

  // Show success state after email is sent
  if (state.success && sentEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F9FAFB]">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E5E7EB] p-8">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <MailCheck className="h-7 w-7 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-[#111827]">Email Terkirim!</h1>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                Link reset password telah dikirim ke{' '}
                <span className="font-medium text-[#111827]">{sentEmail}</span>.
                Silakan cek inbox atau folder spam Anda.
              </p>
              <p className="text-xs text-[#9CA3AF]">
                Link akan kadaluarsa dalam 1 jam.
              </p>
              <Link href="/login" className="block mt-2 text-sm text-[#1B3A8C] hover:underline font-medium">
                ← Kembali ke halaman masuk
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F9FAFB]">
      <div className="w-full max-w-md">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 font-bold text-[#1B3A8C] mb-8 justify-center">
          <div className="bg-[#1B3A8C] text-white p-1.5 rounded-[10px]">
            <Building2 className="h-4 w-4" />
          </div>
          Sewa Ruang & Alat USC
        </div>

        <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E5E7EB] p-8">
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Lupa Password</h1>
          <p className="text-[#6B7280] text-sm mb-7">
            Masukkan email akun Anda dan kami akan mengirimkan link untuk mereset password.
          </p>

          <form action={formAction} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-[#111827]">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nama@email.com"
                  className="h-11 rounded-lg border-[#E5E7EB] pl-10"
                  required
                  disabled={isPending}
                />
              </div>
            </div>
            
            {state.message && !state.success && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{state.message}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-[#1B3A8C] hover:bg-[#0F2A6B] text-white font-semibold rounded-lg" 
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Kirim Link Reset'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6B7280]">
            Ingat password?{' '}
            <Link href="/login" className="text-[#1B3A8C] font-medium hover:underline">
              Masuk sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
