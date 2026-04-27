import { createClient } from '@/lib/supabase/server'
import { BatchQRClient } from './BatchQRClient'

export default async function BatchQRPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assets } = await (supabase.from('assets') as any)
    .select('id, name, category, room_code, buildings(name)')
    .eq('is_active', true)
    .order('category')
    .order('name') as { data: Array<{ id: string; name: string; category: string; room_code: string | null; buildings: { name: string } | null }> | null }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return <BatchQRClient assets={assets ?? []} baseUrl={baseUrl} />
}
