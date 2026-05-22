'use client'

import dynamic from 'next/dynamic'

const DashboardAnalytics = dynamic(
  () => import('./DashboardAnalytics').then(m => ({ default: m.DashboardAnalytics })),
  { ssr: false }
)

export function DashboardAnalyticsLoader() {
  return <DashboardAnalytics />
}
