'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Admin Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div>
        <h2 className="text-xl font-semibold text-foreground">Terjadi Kesalahan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {process.env.NODE_ENV === 'development' ? error.message : 'Halaman ini mengalami error. Silakan coba lagi.'}
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        Coba Lagi
      </Button>
    </div>
  )
}
