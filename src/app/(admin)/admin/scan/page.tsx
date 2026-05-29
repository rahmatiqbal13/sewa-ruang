import { Suspense } from 'react'
import ScanPageClient from '@/components/scan/ScanPageClient'

export default function AdminScanPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    }>
      <ScanPageClient embedded={true} />
    </Suspense>
  )
}
