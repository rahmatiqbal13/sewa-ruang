'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin route error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[14px] border border-red-100 shadow-soft p-8 text-center">
        <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-[#111827] mb-2">
          Terjadi Kesalahan
        </h2>
        <p className="text-sm text-[#6B7280] mb-6">
          Halaman admin tidak dapat dimuat. Silakan muat ulang atau hubungi tim teknis.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-50 rounded-lg p-3 mb-4 text-left">
            <p className="text-xs font-mono text-red-700 break-words">
              {error.message}
            </p>
          </div>
        )}
        <Button
          onClick={reset}
          className="bg-[#0891B2] hover:bg-[#0F2A6B] text-white"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Muat Ulang
        </Button>
      </div>
    </div>
  )
}
