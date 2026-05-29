import { Suspense } from 'react'
import ScanPageClient from '@/components/scan/ScanPageClient'

export default function PublicScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    }>
      <ScanPageClient embedded={false} />
    </Suspense>
  )
}
