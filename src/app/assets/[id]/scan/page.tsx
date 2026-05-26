import { createAdminDbClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default async function LegacyAssetScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const adminDb = createAdminDbClient()

  const { data: eq } = await adminDb
    .from('equipment')
    .select('name')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!eq) {
    // Try old assets table
    const { data: asset } = await adminDb
      .from('assets')
      .select('name')
      .eq('id', id)
      .single()

    if (!asset) notFound()
    redirect(`/admin/scan?type=equipment&id=${createSlug(asset.name)}`)
  }

  redirect(`/admin/scan?type=equipment&id=${createSlug(eq.name)}`)
}
