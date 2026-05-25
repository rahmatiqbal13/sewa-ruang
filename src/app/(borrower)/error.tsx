'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Home } from 'lucide-react'
import Link from 'next/link'

export default function BorrowerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Borrower Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div>
        <h2 className="text-xl font-semibold text-foreground">Terjadi Kesalahan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Halaman ini mengalami error. Silakan coba lagi atau kembali ke beranda.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline">
          Coba Lagi
        </Button>
        <Button asChild>
          <Link href="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Beranda
          </Link>
        </Button>
      </div>
    </div>
  )
}
